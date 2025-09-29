import axios from 'axios';
import { Logger } from '../utils/logger.js';

interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

interface PerformanceMetrics {
  service: string;
  metrics: {
    response_time: MetricPoint[];
    uptime: MetricPoint[];
    error_rate: MetricPoint[];
    throughput: MetricPoint[];
  };
}

interface PerformanceReport {
  timestamp: string;
  time_range: string;
  services: Record<string, PerformanceMetrics>;
  recommendations: string[];
  summary: {
    overall_health: string;
    avg_response_time: number;
    uptime_percentage: number;
    total_requests: number;
    error_percentage: number;
  };
}

export class MetricsCollector {
  private logger: Logger;
  private isRunning: boolean = false;
  private metricsInterval?: NodeJS.Timeout;
  private apiUrl: string;
  private frontendUrl: string;
  private metrics: Map<string, MetricPoint[]> = new Map();

  constructor() {
    this.logger = new Logger('MetricsCollector');
    this.apiUrl = process.env.TRIBAL_GNOSIS_API_URL || 'https://tribal-gnosis-backend.onrender.com';
    this.frontendUrl = process.env.TRIBAL_GNOSIS_FRONTEND_URL || 'https://tribal-gnosis-frontend.onrender.com';
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Metrics collector is already running');
      return;
    }

    this.logger.info('Starting metrics collection service...');
    this.isRunning = true;

    // Collect initial metrics
    await this.collectMetrics();

    // Start periodic metrics collection
    const intervalMs = parseInt(process.env.MONITORING_INTERVAL || '30000');
    this.metricsInterval = setInterval(() => {
      this.collectMetrics().catch((error) => {
        this.logger.error('Metrics collection cycle failed', { error: error.message });
      });
    }, intervalMs);

    this.logger.info(`Metrics collection started with ${intervalMs}ms interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping metrics collection service...');
    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.logger.info('Metrics collection service stopped');
  }

  async getMetrics(service: 'backend' | 'frontend' | 'all' = 'all', timeRange: string = '1h'): Promise<any> {
    this.logger.debug('Retrieving metrics', { service, timeRange });

    const endTime = new Date();
    const startTime = this.calculateStartTime(endTime, timeRange);

    const results: any = {
      timestamp: new Date().toISOString(),
      time_range: timeRange,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      metrics: {},
    };

    try {
      if (service === 'all' || service === 'backend') {
        results.metrics.backend = await this.getServiceMetrics('backend', startTime, endTime);
      }

      if (service === 'all' || service === 'frontend') {
        results.metrics.frontend = await this.getServiceMetrics('frontend', startTime, endTime);
      }

      return results;
    } catch (error: any) {
      this.logger.error('Failed to retrieve metrics', { service, timeRange, error: error.message });
      results.error = error.message;
      return results;
    }
  }

  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();

    try {
      // Collect backend metrics
      const backendMetrics = await this.measureServicePerformance('backend');
      this.storeMetric('backend_response_time', {
        timestamp,
        value: backendMetrics.response_time,
        labels: { service: 'backend' },
      });

      this.storeMetric('backend_status', {
        timestamp,
        value: backendMetrics.success ? 1 : 0,
        labels: { service: 'backend' },
      });

      // Collect frontend metrics
      const frontendMetrics = await this.measureServicePerformance('frontend');
      this.storeMetric('frontend_response_time', {
        timestamp,
        value: frontendMetrics.response_time,
        labels: { service: 'frontend' },
      });

      this.storeMetric('frontend_status', {
        timestamp,
        value: frontendMetrics.success ? 1 : 0,
        labels: { service: 'frontend' },
      });

      // Clean up old metrics (keep only last 24 hours)
      this.cleanupOldMetrics();

    } catch (error: any) {
      this.logger.error('Metrics collection error', { error: error.message });
    }
  }

  private async measureServicePerformance(service: 'backend' | 'frontend'): Promise<any> {
    const url = service === 'backend' 
      ? `${this.apiUrl}/api/health`
      : this.frontendUrl;

    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
      });

      const responseTime = Date.now() - startTime;

      return {
        response_time: responseTime,
        status_code: response.status,
        success: response.status < 400,
        content_length: response.headers['content-length'] || 0,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        response_time: responseTime,
        status_code: 0,
        success: false,
        error: error.message,
      };
    }
  }

  private storeMetric(key: string, metric: MetricPoint): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only the last 1000 data points per metric
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  private getServiceMetrics(service: 'backend' | 'frontend', startTime: Date, endTime: Date): any {
    const responseTimeKey = `${service}_response_time`;
    const statusKey = `${service}_status`;

    const responseTimeMetrics = this.getMetricsBetween(responseTimeKey, startTime, endTime);
    const statusMetrics = this.getMetricsBetween(statusKey, startTime, endTime);

    const avgResponseTime = this.calculateAverage(responseTimeMetrics);
    const uptime = this.calculateUptime(statusMetrics);
    const errorRate = this.calculateErrorRate(statusMetrics);

    return {
      service,
      avg_response_time: avgResponseTime,
      uptime_percentage: uptime,
      error_rate: errorRate,
      data_points: responseTimeMetrics.length,
      raw_metrics: {
        response_time: responseTimeMetrics,
        status: statusMetrics,
      },
    };
  }

  private getMetricsBetween(key: string, startTime: Date, endTime: Date): MetricPoint[] {
    const metrics = this.metrics.get(key) || [];
    
    return metrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });
  }

  private calculateAverage(metrics: MetricPoint[]): number {
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return Math.round(sum / metrics.length);
  }

  private calculateUptime(statusMetrics: MetricPoint[]): number {
    if (statusMetrics.length === 0) return 0;
    
    const upCount = statusMetrics.filter(metric => metric.value === 1).length;
    return Math.round((upCount / statusMetrics.length) * 100);
  }

  private calculateErrorRate(statusMetrics: MetricPoint[]): number {
    if (statusMetrics.length === 0) return 0;
    
    const errorCount = statusMetrics.filter(metric => metric.value === 0).length;
    return Math.round((errorCount / statusMetrics.length) * 100);
  }

  private calculateStartTime(endTime: Date, timeRange: string): Date {
    const startTime = new Date(endTime);
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(startTime.getHours() - 6);
        break;
      case '24h':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      default:
        startTime.setHours(startTime.getHours() - 1);
    }
    
    return startTime;
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => {
        return new Date(metric.timestamp) >= cutoffTime;
      });
      
      this.metrics.set(key, filteredMetrics);
    }
  }

  async generatePerformanceReport(timeRange: string = '24h', includeRecommendations: boolean = true): Promise<PerformanceReport> {
    this.logger.info('Generating performance report', { timeRange, includeRecommendations });

    const endTime = new Date();
    const startTime = this.calculateStartTime(endTime, timeRange);

    const backendMetrics = this.getServiceMetrics('backend', startTime, endTime);
    const frontendMetrics = this.getServiceMetrics('frontend', startTime, endTime);

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      time_range: timeRange,
      services: {
        backend: {
          service: 'backend',
          metrics: {
            response_time: this.getMetricsBetween('backend_response_time', startTime, endTime),
            uptime: this.getMetricsBetween('backend_status', startTime, endTime),
            error_rate: [],
            throughput: [],
          },
        },
        frontend: {
          service: 'frontend',
          metrics: {
            response_time: this.getMetricsBetween('frontend_response_time', startTime, endTime),
            uptime: this.getMetricsBetween('frontend_status', startTime, endTime),
            error_rate: [],
            throughput: [],
          },
        },
      },
      recommendations: [],
      summary: {
        overall_health: this.calculateOverallHealth(backendMetrics, frontendMetrics),
        avg_response_time: Math.round((backendMetrics.avg_response_time + frontendMetrics.avg_response_time) / 2),
        uptime_percentage: Math.round((backendMetrics.uptime_percentage + frontendMetrics.uptime_percentage) / 2),
        total_requests: backendMetrics.data_points + frontendMetrics.data_points,
        error_percentage: Math.round((backendMetrics.error_rate + frontendMetrics.error_rate) / 2),
      },
    };

    if (includeRecommendations) {
      report.recommendations = this.generateRecommendations(backendMetrics, frontendMetrics);
    }

    return report;
  }

  private calculateOverallHealth(backendMetrics: any, frontendMetrics: any): string {
    const avgUptime = (backendMetrics.uptime_percentage + frontendMetrics.uptime_percentage) / 2;
    const avgResponseTime = (backendMetrics.avg_response_time + frontendMetrics.avg_response_time) / 2;

    if (avgUptime >= 99 && avgResponseTime < 500) {
      return 'excellent';
    } else if (avgUptime >= 95 && avgResponseTime < 1000) {
      return 'good';
    } else if (avgUptime >= 90 && avgResponseTime < 2000) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  private generateRecommendations(backendMetrics: any, frontendMetrics: any): string[] {
    const recommendations: string[] = [];

    if (backendMetrics.avg_response_time > 1000) {
      recommendations.push('Backend response times are high (>1s). Consider optimizing database queries and API endpoints.');
    }

    if (frontendMetrics.avg_response_time > 2000) {
      recommendations.push('Frontend load times are high (>2s). Consider optimizing bundle size and implementing CDN.');
    }

    if (backendMetrics.uptime_percentage < 99) {
      recommendations.push('Backend uptime is below 99%. Investigate recent outages and implement better error handling.');
    }

    if (frontendMetrics.uptime_percentage < 95) {
      recommendations.push('Frontend availability is below 95%. Check Render deployment settings and static asset delivery.');
    }

    if (backendMetrics.error_rate > 5) {
      recommendations.push('Backend error rate is high (>5%). Review application logs and implement better monitoring.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance looks good! Continue monitoring to maintain optimal performance.');
    }

    return recommendations;
  }
}