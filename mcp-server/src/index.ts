#!/usr/bin/env node

/**
 * Tribal Gnosis MCP Server
 * 
 * Model Context Protocol server for monitoring, debugging, and managing
 * the Tribal Gnosis application deployed on Render.
 * 
 * Features:
 * - Real-time application monitoring
 * - Deployment management via Render API
 * - Health checks and alerting
 * - Performance metrics collection
 * - Debug tools and log analysis
 * - Resource usage tracking
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import dotenv from 'dotenv';
import { TribalGnosisMonitor } from './services/monitor.js';
import { RenderManager } from './services/render.js';
import { HealthChecker } from './services/health.js';
import { MetricsCollector } from './services/metrics.js';
import { Logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

class TribalGnosisMCPServer {
  private server: Server;
  private monitor: TribalGnosisMonitor;
  private renderManager: RenderManager;
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MCP-Server');
    
    this.server = new Server(
      {
        name: 'tribal-gnosis-mcp-server',
        version: '1.0.0',
        description: 'MCP server for Tribal Gnosis application monitoring and management',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.monitor = new TribalGnosisMonitor();
    this.renderManager = new RenderManager();
    this.healthChecker = new HealthChecker();
    this.metricsCollector = new MetricsCollector();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'check_health':
            return await this.handleHealthCheck(args);
          
          case 'get_metrics':
            return await this.handleGetMetrics(args);
          
          case 'restart_service':
            return await this.handleRestartService(args);
          
          case 'get_logs':
            return await this.handleGetLogs(args);
          
          case 'get_deployment_status':
            return await this.handleGetDeploymentStatus(args);
          
          case 'scale_service':
            return await this.handleScaleService(args);
          
          case 'run_diagnostics':
            return await this.handleRunDiagnostics(args);
          
          case 'get_performance_report':
            return await this.handleGetPerformanceReport(args);

          case 'trigger_deployment':
            return await this.handleTriggerDeployment(args);

          case 'get_error_analysis':
            return await this.handleGetErrorAnalysis(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        this.logger.error('Tool execution failed', { tool: name, error });
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'check_health',
        description: 'Check the health status of Tribal Gnosis services',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend', 'all'],
              description: 'Which service to check (backend, frontend, or all)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_metrics',
        description: 'Retrieve performance metrics for Tribal Gnosis services',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend', 'all'],
              description: 'Which service metrics to retrieve',
            },
            timeRange: {
              type: 'string',
              enum: ['1h', '6h', '24h', '7d'],
              description: 'Time range for metrics (default: 1h)',
            },
          },
          required: [],
        },
      },
      {
        name: 'restart_service',
        description: 'Restart a Tribal Gnosis service via Render API',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend'],
              description: 'Which service to restart',
            },
            reason: {
              type: 'string',
              description: 'Reason for restart (for logging)',
            },
          },
          required: ['service'],
        },
      },
      {
        name: 'get_logs',
        description: 'Retrieve recent logs from Tribal Gnosis services',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend', 'all'],
              description: 'Which service logs to retrieve',
            },
            lines: {
              type: 'number',
              description: 'Number of log lines to retrieve (default: 100)',
            },
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'debug', 'all'],
              description: 'Log level filter (default: all)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_deployment_status',
        description: 'Get current deployment status and history',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend', 'all'],
              description: 'Which service deployment status to check',
            },
          },
          required: [],
        },
      },
      {
        name: 'scale_service',
        description: 'Scale a service up or down (if supported by plan)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend'],
              description: 'Which service to scale',
            },
            instances: {
              type: 'number',
              description: 'Number of instances to scale to',
            },
          },
          required: ['service', 'instances'],
        },
      },
      {
        name: 'run_diagnostics',
        description: 'Run comprehensive diagnostics on Tribal Gnosis application',
        inputSchema: {
          type: 'object',
          properties: {
            deep: {
              type: 'boolean',
              description: 'Run deep diagnostics (may take longer)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_performance_report',
        description: 'Generate a comprehensive performance report',
        inputSchema: {
          type: 'object',
          properties: {
            timeRange: {
              type: 'string',
              enum: ['1h', '6h', '24h', '7d'],
              description: 'Time range for the report (default: 24h)',
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Include optimization recommendations',
            },
          },
          required: [],
        },
      },
      {
        name: 'trigger_deployment',
        description: 'Trigger a new deployment for a service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend'],
              description: 'Which service to deploy',
            },
            branch: {
              type: 'string',
              description: 'Git branch to deploy (default: main)',
            },
          },
          required: ['service'],
        },
      },
      {
        name: 'get_error_analysis',
        description: 'Analyze recent errors and provide insights',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['backend', 'frontend', 'all'],
              description: 'Which service to analyze',
            },
            hours: {
              type: 'number',
              description: 'Number of hours to look back (default: 24)',
            },
          },
          required: [],
        },
      },
    ];
  }

  // Tool handlers
  private async handleHealthCheck(args: any) {
    const service = args?.service || 'all';
    const result = await this.healthChecker.checkHealth(service);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetMetrics(args: any) {
    const service = args?.service || 'all';
    const timeRange = args?.timeRange || '1h';
    const metrics = await this.metricsCollector.getMetrics(service, timeRange);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metrics, null, 2),
        },
      ],
    };
  }

  private async handleRestartService(args: any) {
    const { service, reason = 'Manual restart via MCP' } = args;
    const result = await this.renderManager.restartService(service, reason);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetLogs(args: any) {
    const service = args?.service || 'all';
    const lines = args?.lines || 100;
    const level = args?.level || 'all';
    const logs = await this.renderManager.getLogs(service, lines, level);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(logs, null, 2),
        },
      ],
    };
  }

  private async handleGetDeploymentStatus(args: any) {
    const service = args?.service || 'all';
    const status = await this.renderManager.getDeploymentStatus(service);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  private async handleScaleService(args: any) {
    const { service, instances } = args;
    const result = await this.renderManager.scaleService(service, instances);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleRunDiagnostics(args: any) {
    const deep = args?.deep || false;
    const diagnostics = await this.monitor.runDiagnostics(deep);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
  }

  private async handleGetPerformanceReport(args: any) {
    const timeRange = args?.timeRange || '24h';
    const includeRecommendations = args?.includeRecommendations || true;
    const report = await this.metricsCollector.generatePerformanceReport(timeRange, includeRecommendations);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }

  private async handleTriggerDeployment(args: any) {
    const { service, branch = 'main' } = args;
    const result = await this.renderManager.triggerDeployment(service, branch);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetErrorAnalysis(args: any) {
    const service = args?.service || 'all';
    const hours = args?.hours || 24;
    const analysis = await this.monitor.analyzeErrors(service, hours);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  async start(): Promise<void> {
    this.logger.info('Starting Tribal Gnosis MCP Server...');
    
    // Start monitoring services
    await this.monitor.start();
    await this.healthChecker.start();
    await this.metricsCollector.start();
    
    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('MCP Server started and ready for connections');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Tribal Gnosis MCP Server...');
    
    await this.monitor.stop();
    await this.healthChecker.stop();
    await this.metricsCollector.stop();
    
    this.logger.info('MCP Server stopped');
  }
}

// Start the server
const server = new TribalGnosisMCPServer();

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});