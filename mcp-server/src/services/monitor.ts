import axios from 'axios';
import { Logger } from '../utils/logger.js';

export class TribalGnosisMonitor {
  private logger: Logger;
  private apiUrl: string;
  private frontendUrl: string;
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.logger = new Logger('Monitor');
    this.apiUrl = process.env.TRIBAL_GNOSIS_API_URL || 'https://tribal-gnosis-backend.onrender.com';
    this.frontendUrl = process.env.TRIBAL_GNOSIS_FRONTEND_URL || 'https://tribal-gnosis-frontend.onrender.com';
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Monitor is already running');
      return;
    }

    this.logger.info('Starting Tribal Gnosis monitoring service...');
    this.isRunning = true;

    // Start periodic monitoring
    const intervalMs = parseInt(process.env.MONITORING_INTERVAL || '30000');
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle().catch((error) => {
        this.logger.error('Monitoring cycle failed', { error: error.message });
      });
    }, intervalMs);

    this.logger.info(`Monitoring started with ${intervalMs}ms interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping monitoring service...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logger.info('Monitoring service stopped');
  }

  private async performMonitoringCycle(): Promise<void> {
    this.logger.debug('Running monitoring cycle');

    try {
      // Check backend health
      await this.checkEndpoint(`${this.apiUrl}/api/health`, 'Backend API');
      
      // Check frontend availability
      await this.checkEndpoint(this.frontendUrl, 'Frontend');
      
      // Additional health checks could be added here
    } catch (error: any) {
      this.logger.error('Monitoring cycle error', { error: error.message });
    }
  }

  private async checkEndpoint(url: string, name: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500, // Accept any status < 500
      });
      const responseTime = Date.now() - startTime;

      this.logger.debug(`${name} health check`, {
        url,
        status: response.status,
        responseTime: `${responseTime}ms`,
      });

      return response.status < 400;
    } catch (error: any) {
      this.logger.error(`${name} health check failed`, {
        url,
        error: error.message,
      });
      return false;
    }
  }

  async runDiagnostics(deep: boolean = false): Promise<any> {
    this.logger.info('Running diagnostics', { deep });

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      type: deep ? 'deep' : 'basic',
      results: {},
    };

    try {
      // Basic health checks
      diagnostics.results.backend = await this.checkBackendHealth();
      diagnostics.results.frontend = await this.checkFrontendHealth();

      if (deep) {
        // Deep diagnostics
        diagnostics.results.api_endpoints = await this.testApiEndpoints();
        diagnostics.results.database_connectivity = await this.testDatabaseConnectivity();
        diagnostics.results.authentication = await this.testAuthentication();
      }

      diagnostics.overall_status = this.calculateOverallStatus(diagnostics.results);
      
      return diagnostics;
    } catch (error: any) {
      this.logger.error('Diagnostics failed', { error: error.message });
      diagnostics.error = error.message;
      diagnostics.overall_status = 'error';
      return diagnostics;
    }
  }

  private async checkBackendHealth(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/health`, {
        timeout: 5000,
      });

      return {
        status: 'healthy',
        response_time: response.headers['x-response-time'] || 'unknown',
        data: response.data,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkFrontendHealth(): Promise<any> {
    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: 5000,
      });

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        status_code: response.status,
        content_length: response.headers['content-length'] || 0,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async testApiEndpoints(): Promise<any> {
    const endpoints = [
      '/api/health',
      '/api/auth/validate-company',
      '/api/companies',
      '/api/subscription/tiers',
    ];

    const results: any = {};

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.apiUrl}${endpoint}`, {
          timeout: 3000,
          validateStatus: () => true, // Accept any status
        });

        results[endpoint] = {
          status: response.status,
          accessible: response.status < 500,
        };
      } catch (error: any) {
        results[endpoint] = {
          status: 'error',
          accessible: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  private async testDatabaseConnectivity(): Promise<any> {
    try {
      // Test database connectivity through a simple API call that would require DB access
      const response = await axios.post(`${this.apiUrl}/api/auth/validate-company`, {
        companyCode: 'TEST_CONNECTIVITY_CHECK',
      }, {
        timeout: 5000,
        validateStatus: () => true,
      });

      // If we get any response (even 404), database is likely accessible
      return {
        status: response.status === 500 ? 'error' : 'accessible',
        response_status: response.status,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  private async testAuthentication(): Promise<any> {
    try {
      // Test authentication endpoint
      const response = await axios.post(`${this.apiUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'invalid',
      }, {
        timeout: 5000,
        validateStatus: () => true,
      });

      return {
        status: 'functional',
        auth_endpoint_responding: true,
        response_status: response.status,
      };
    } catch (error: any) {
      return {
        status: 'error',
        auth_endpoint_responding: false,
        error: error.message,
      };
    }
  }

  private calculateOverallStatus(results: any): string {
    const statuses = Object.values(results).map((result: any) => result.status);
    
    if (statuses.includes('error') || statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  async analyzeErrors(service: 'backend' | 'frontend' | 'all', hours: number = 24): Promise<any> {
    this.logger.info('Analyzing errors', { service, hours });

    // This would typically integrate with logging services or error tracking
    // For now, we'll provide a simulated error analysis
    
    return {
      timestamp: new Date().toISOString(),
      service,
      analysis_period_hours: hours,
      summary: {
        total_errors: 0,
        error_rate: '0%',
        most_common_errors: [],
        recommendations: [
          'Monitor application logs for recent error patterns',
          'Check Render service health in the dashboard',
          'Verify database connectivity and performance',
          'Review recent deployments for potential issues',
        ],
      },
      note: 'Error analysis requires integration with logging services like Sentry, LogRocket, or Render logs',
    };
  }
}