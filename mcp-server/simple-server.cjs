#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
require('dotenv').config();

class SimpleTribalGnosisMCP {
  constructor() {
    this.server = new Server(
      {
        name: 'tribal-gnosis-simple',
        version: '1.0.0',
        description: 'Simple MCP server for Tribal Gnosis monitoring',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiUrl = process.env.TRIBAL_GNOSIS_API_URL || 'https://tribal-gnosis-backend.onrender.com';
    this.frontendUrl = process.env.TRIBAL_GNOSIS_FRONTEND_URL || 'https://tribal-gnosis-frontend.onrender.com';

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'check_health',
            description: 'Check the health status of Tribal Gnosis services',
            inputSchema: {
              type: 'object',
              properties: {
                service: {
                  type: 'string',
                  enum: ['backend', 'frontend', 'all'],
                  description: 'Which service to check',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_status',
            description: 'Get simple status of both services',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'check_health':
            return await this.handleHealthCheck(args);
          case 'get_status':
            return await this.handleGetStatus();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleHealthCheck(args) {
    const service = args?.service || 'all';
    
    try {
      const results = {};

      if (service === 'backend' || service === 'all') {
        try {
          const response = await axios.get(`${this.apiUrl}/api/health`, { timeout: 5000 });
          results.backend = {
            status: 'healthy',
            response_time: response.status === 200 ? 'good' : 'slow',
            data: response.data,
          };
        } catch (error) {
          results.backend = {
            status: 'unhealthy',
            error: error.message,
          };
        }
      }

      if (service === 'frontend' || service === 'all') {
        try {
          const response = await axios.get(this.frontendUrl, { timeout: 5000 });
          results.frontend = {
            status: response.status === 200 ? 'healthy' : 'degraded',
            status_code: response.status,
          };
        } catch (error) {
          results.frontend = {
            status: 'unhealthy',
            error: error.message,
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Health check failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleGetStatus() {
    return {
      content: [
        {
          type: 'text',
          text: `Tribal Gnosis MCP Server is running!
          
Backend URL: ${this.apiUrl}
Frontend URL: ${this.frontendUrl}

Use 'check_health' to monitor your services.`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tribal Gnosis Simple MCP Server started');
  }
}

// Start the server
const server = new SimpleTribalGnosisMCP();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});