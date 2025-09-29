import axios from 'axios';
import { Logger } from '../utils/logger.js';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  last_check: string;
  details?: any;
}

export class HealthChecker {
  private logger: Logger;
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private apiUrl: string;
  private frontendUrl: string;
  private lastResults: Map<string, HealthStatus> = new Map();

  constructor() {
    this.logger = new Logger('HealthChecker');
    this.apiUrl = process.env.TRIBAL_GNOSIS_API_URL || 'https://tribal-gnosis-backend.onrender.com';
    this.frontendUrl = process.env.TRIBAL_GNOSIS_FRONTEND_URL || 'https://tribal-gnosis-frontend.onrender.com';
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Health checker is already running');
      return;
    }

    this.logger.info('Starting health check service...');
    this.isRunning = true;

    // Perform initial health check
    await this.performHealthChecks();

    // Start periodic health checks
    const intervalMs = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000');
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        this.logger.error('Health check cycle failed', { error: error.message });
      });
    }, intervalMs);

    this.logger.info(`Health checks started with ${intervalMs}ms interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping health check service...');
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.logger.info('Health check service stopped');
  }

  async checkHealth(service: 'backend' | 'frontend' | 'all' = 'all'): Promise<any> {
    this.logger.debug('Performing health check', { service });

    const results: any = {
      timestamp: new Date().toISOString(),
      requested_service: service,
      results: {},
    };

    try {
      if (service === 'all' || service === 'backend') {
        results.results.backend = await this.checkBackendHealth();
      }

      if (service === 'all' || service === 'frontend') {
        results.results.frontend = await this.checkFrontendHealth();
      }

      // Calculate overall status
      results.overall_status = this.calculateOverallStatus(results.results);
      
      return results;
    } catch (error: any) {
      this.logger.error('Health check failed', { service, error: error.message });
      results.error = error.message;
      results.overall_status = 'error';
      return results;
    }
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const backendHealth = await this.checkBackendHealth();
      const frontendHealth = await this.checkFrontendHealth();

      this.lastResults.set('backend', backendHealth);
      this.lastResults.set('frontend', frontendHealth);

      // Log any status changes or issues
      if (backendHealth.status !== 'healthy') {
        this.logger.warn('Backend health issue detected', backendHealth);
      }

      if (frontendHealth.status !== 'healthy') {
        this.logger.warn('Frontend health issue detected', frontendHealth);
      }

    } catch (error: any) {
      this.logger.error('Health check cycle error', { error: error.message });
    }
  }

  private async checkBackendHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.apiUrl}/api/health`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'TribalGnosis-MCP-HealthChecker/1.0',
        },
      });

      const responseTime = Date.now() - startTime;

      return {
        service: 'backend',
        status: response.status === 200 ? 'healthy' : 'degraded',
        response_time: responseTime,
        last_check: new Date().toISOString(),
        details: {
          status_code: response.status,
          response_data: response.data,
          headers: {
            'content-type': response.headers['content-type'],
            'x-powered-by': response.headers['x-powered-by'],
          },
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'backend',
        status: 'unhealthy',
        response_time: responseTime,
        last_check: new Date().toISOString(),
        details: {
          error: error.message,
          error_code: error.code,
          timeout: error.code === 'ECONNABORTED',
        },
      };
    }
  }

  private async checkFrontendHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'TribalGnosis-MCP-HealthChecker/1.0',
        },
      });

      const responseTime = Date.now() - startTime;

      return {
        service: 'frontend',
        status: response.status === 200 ? 'healthy' : 'degraded',
        response_time: responseTime,
        last_check: new Date().toISOString(),
        details: {
          status_code: response.status,
          content_length: response.headers['content-length'] || 0,
          content_type: response.headers['content-type'],
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'frontend',
        status: 'unhealthy',
        response_time: responseTime,
        last_check: new Date().toISOString(),
        details: {
          error: error.message,
          error_code: error.code,
          timeout: error.code === 'ECONNABORTED',
        },
      };
    }
  }

  private calculateOverallStatus(results: any): string {
    const statuses = Object.values(results).map((result: any) => result.status);
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    } else if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  getLastResults(): Map<string, HealthStatus> {
    return this.lastResults;
  }

  async runDetailedHealthCheck(): Promise<any> {
    this.logger.info('Running detailed health check...');

    const results = {
      timestamp: new Date().toISOString(),
      checks: {
        backend: await this.runDetailedBackendCheck(),
        frontend: await this.runDetailedFrontendCheck(),
      },
    };

    return results;
  }

  private async runDetailedBackendCheck(): Promise<any> {
    const checks: any = {};

    // Health endpoint
    try {
      const response = await axios.get(`${this.apiUrl}/api/health`);
      checks.health_endpoint = {
        status: 'pass',
        response_time: response.headers['x-response-time'] || 'unknown',
        data: response.data,
      };
    } catch (error: any) {
      checks.health_endpoint = {
        status: 'fail',
        error: error.message,
      };
    }

    // Database connectivity (via company validation endpoint)
    try {
      const response = await axios.post(`${this.apiUrl}/api/auth/validate-company`, {
        companyCode: 'HEALTH_CHECK_TEST',
      }, {
        validateStatus: () => true,
      });
      
      checks.database_connectivity = {
        status: response.status !== 500 ? 'pass' : 'fail',
        response_status: response.status,
      };
    } catch (error: any) {
      checks.database_connectivity = {
        status: 'fail',
        error: error.message,
      };
    }

    // API responsiveness
    const apiTests = [
      '/api/subscription/tiers',
      '/api/companies',
    ];

    checks.api_endpoints = {};
    for (const endpoint of apiTests) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.apiUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true,
        });
        const responseTime = Date.now() - startTime;

        checks.api_endpoints[endpoint] = {
          status: response.status < 500 ? 'pass' : 'fail',
          response_time: responseTime,
          status_code: response.status,
        };
      } catch (error: any) {
        checks.api_endpoints[endpoint] = {
          status: 'fail',
          error: error.message,
        };
      }
    }

    return checks;
  }

  private async runDetailedFrontendCheck(): Promise<any> {
    const checks: any = {};

    // Main page accessibility
    try {
      const startTime = Date.now();
      const response = await axios.get(this.frontendUrl);
      const responseTime = Date.now() - startTime;

      checks.main_page = {
        status: 'pass',
        response_time: responseTime,
        content_length: response.headers['content-length'] || 0,
      };
    } catch (error: any) {
      checks.main_page = {
        status: 'fail',
        error: error.message,
      };
    }

    // Static assets (if we can detect them)
    try {
      const response = await axios.get(this.frontendUrl);
      const htmlContent = response.data;
      
      // Simple check for JS and CSS assets in the HTML
      const hasJS = htmlContent.includes('.js');
      const hasCSS = htmlContent.includes('.css');

      checks.static_assets = {
        status: hasJS && hasCSS ? 'pass' : 'partial',
        javascript_detected: hasJS,
        css_detected: hasCSS,
      };
    } catch (error: any) {
      checks.static_assets = {
        status: 'fail',
        error: error.message,
      };
    }

    return checks;
  }
}