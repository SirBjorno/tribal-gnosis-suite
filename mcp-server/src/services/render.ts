import axios from 'axios';
import { Logger } from '../utils/logger.js';

interface RenderService {
  id: string;
  name: string;
  type: 'web_service' | 'static_site';
  repo: string;
  branch: string;
  buildCommand: string;
  startCommand: string;
  createdAt: string;
  updatedAt: string;
  suspended: boolean;
  autoDeploy: boolean;
}

interface RenderDeploy {
  id: string;
  commit: {
    id: string;
    message: string;
    createdAt: string;
  };
  status: 'created' | 'build_in_progress' | 'update_in_progress' | 'live' | 'deactivated' | 'build_failed' | 'update_failed';
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export class RenderManager {
  private logger: Logger;
  private apiKey: string;
  private backendServiceId: string;
  private frontendServiceId: string;
  private baseUrl = 'https://api.render.com/v1';

  constructor() {
    this.logger = new Logger('RenderManager');
    this.apiKey = process.env.RENDER_API_KEY || '';
    this.backendServiceId = process.env.RENDER_SERVICE_ID_BACKEND || '';
    this.frontendServiceId = process.env.RENDER_SERVICE_ID_FRONTEND || '';

    if (!this.apiKey) {
      this.logger.warn('RENDER_API_KEY not set - Render API functionality will be limited');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private getServiceId(service: 'backend' | 'frontend'): string {
    return service === 'backend' ? this.backendServiceId : this.frontendServiceId;
  }

  async restartService(service: 'backend' | 'frontend', reason: string) {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Restarting ${service} service`, { serviceId, reason });

      const response = await axios.post(
        `${this.baseUrl}/services/${serviceId}/restart`,
        { reason },
        { headers: this.getHeaders() }
      );

      this.logger.info(`Successfully initiated restart for ${service} service`);
      
      return {
        success: true,
        service,
        serviceId,
        reason,
        timestamp: new Date().toISOString(),
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to restart ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getLogs(service: 'backend' | 'frontend' | 'all', lines: number = 100, level: string = 'all') {
    try {
      const services = service === 'all' ? ['backend', 'frontend'] : [service];
      const logs: any = {};

      for (const svc of services) {
        const serviceId = this.getServiceId(svc as 'backend' | 'frontend');
        
        this.logger.debug(`Fetching logs for ${svc}`, { serviceId, lines, level });

        const response = await axios.get(
          `${this.baseUrl}/services/${serviceId}/logs`,
          {
            headers: this.getHeaders(),
            params: {
              limit: lines,
              level: level === 'all' ? undefined : level,
            },
          }
        );

        logs[svc] = response.data;
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        logs,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch logs`, { service, error: error.message });
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDeploymentStatus(service: 'backend' | 'frontend' | 'all') {
    try {
      const services = service === 'all' ? ['backend', 'frontend'] : [service];
      const deployments: any = {};

      for (const svc of services) {
        const serviceId = this.getServiceId(svc as 'backend' | 'frontend');
        
        this.logger.debug(`Fetching deployment status for ${svc}`, { serviceId });

        // Get service details
        const serviceResponse = await axios.get(
          `${this.baseUrl}/services/${serviceId}`,
          { headers: this.getHeaders() }
        );

        // Get recent deployments
        const deploysResponse = await axios.get(
          `${this.baseUrl}/services/${serviceId}/deploys`,
          { 
            headers: this.getHeaders(),
            params: { limit: 10 }
          }
        );

        deployments[svc] = {
          service: serviceResponse.data,
          deploys: deploysResponse.data,
        };
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        deployments,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch deployment status`, { service, error: error.message });
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async scaleService(service: 'backend' | 'frontend', instances: number) {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Scaling ${service} service`, { serviceId, instances });

      const response = await axios.patch(
        `${this.baseUrl}/services/${serviceId}`,
        {
          numInstances: instances,
        },
        { headers: this.getHeaders() }
      );

      this.logger.info(`Successfully scaled ${service} service to ${instances} instances`);
      
      return {
        success: true,
        service,
        serviceId,
        instances,
        timestamp: new Date().toISOString(),
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to scale ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        instances,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async triggerDeployment(service: 'backend' | 'frontend', branch: string = 'main') {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Triggering deployment for ${service} service`, { serviceId, branch });

      const response = await axios.post(
        `${this.baseUrl}/services/${serviceId}/deploys`,
        {
          clearCache: 'clear',
        },
        { headers: this.getHeaders() }
      );

      this.logger.info(`Successfully triggered deployment for ${service} service`);
      
      return {
        success: true,
        service,
        serviceId,
        branch,
        timestamp: new Date().toISOString(),
        deploy: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to trigger deployment for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        branch,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getServiceMetrics(service: 'backend' | 'frontend') {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.debug(`Fetching metrics for ${service} service`, { serviceId });

      // Note: Render API doesn't have metrics endpoint, so we simulate or use health checks
      const response = await axios.get(
        `${this.baseUrl}/services/${serviceId}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        service,
        serviceId,
        timestamp: new Date().toISOString(),
        metrics: {
          status: response.data.suspended ? 'suspended' : 'active',
          lastDeploy: response.data.updatedAt,
          autoDeploy: response.data.autoDeploy,
          repo: response.data.repo,
          branch: response.data.branch,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch metrics for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getEnvironmentVariables(service: 'backend' | 'frontend') {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Fetching environment variables for ${service} service`, { serviceId });

      const response = await axios.get(
        `${this.baseUrl}/services/${serviceId}/env-vars`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        service,
        serviceId,
        timestamp: new Date().toISOString(),
        envVars: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch environment variables for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async setEnvironmentVariable(service: 'backend' | 'frontend', key: string, value: string) {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Setting environment variable for ${service} service`, { serviceId, key });

      const response = await axios.post(
        `${this.baseUrl}/services/${serviceId}/env-vars`,
        {
          key,
          value
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        service,
        serviceId,
        key,
        timestamp: new Date().toISOString(),
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to set environment variable for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateEnvironmentVariable(service: 'backend' | 'frontend', key: string, value: string) {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Updating environment variable for ${service} service`, { serviceId, key });

      const response = await axios.put(
        `${this.baseUrl}/services/${serviceId}/env-vars/${key}`,
        { value },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        service,
        serviceId,
        key,
        timestamp: new Date().toISOString(),
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update environment variable for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteEnvironmentVariable(service: 'backend' | 'frontend', key: string) {
    try {
      const serviceId = this.getServiceId(service);
      
      this.logger.info(`Deleting environment variable for ${service} service`, { serviceId, key });

      const response = await axios.delete(
        `${this.baseUrl}/services/${serviceId}/env-vars/${key}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        service,
        serviceId,
        key,
        timestamp: new Date().toISOString(),
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to delete environment variable for ${service} service`, { error: error.message });
      return {
        success: false,
        service,
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}