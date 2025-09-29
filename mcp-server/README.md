# Tribal Gnosis MCP Server

Model Context Protocol (MCP) server for monitoring, debugging, and managing the Tribal Gnosis application deployed on Render.

## Features

- **Real-time Application Monitoring**: Continuous health checks and performance monitoring
- **Render Integration**: Direct integration with Render API for deployment management
- **Health Checks**: Comprehensive health monitoring for backend and frontend services
- **Performance Metrics**: Collection and analysis of response times, uptime, and error rates
- **Diagnostics**: Deep diagnostic capabilities for troubleshooting
- **Deployment Management**: Trigger deployments, restart services, and scale resources

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   - `RENDER_API_KEY`: Your Render API key
   - `RENDER_SERVICE_ID_BACKEND`: Backend service ID from Render
   - `RENDER_SERVICE_ID_FRONTEND`: Frontend service ID from Render
   - `TRIBAL_GNOSIS_API_URL`: Backend API URL
   - `TRIBAL_GNOSIS_FRONTEND_URL`: Frontend URL

4. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Available MCP Tools

### Health Monitoring
- `check_health`: Check service health status
- `run_diagnostics`: Run comprehensive diagnostics
- `get_error_analysis`: Analyze recent errors and issues

### Performance & Metrics
- `get_metrics`: Retrieve performance metrics
- `get_performance_report`: Generate comprehensive performance reports

### Deployment Management
- `get_deployment_status`: Check deployment status and history
- `trigger_deployment`: Trigger new deployments
- `restart_service`: Restart services
- `scale_service`: Scale service instances

### Debugging & Logs
- `get_logs`: Retrieve service logs
- `get_error_analysis`: Analyze error patterns

## Tool Usage Examples

### Check Overall Health
```json
{
  "name": "check_health",
  "arguments": {
    "service": "all"
  }
}
```

### Get Performance Metrics
```json
{
  "name": "get_metrics",
  "arguments": {
    "service": "backend",
    "timeRange": "24h"
  }
}
```

### Restart Backend Service
```json
{
  "name": "restart_service",
  "arguments": {
    "service": "backend",
    "reason": "Performance optimization"
  }
}
```

### Generate Performance Report
```json
{
  "name": "get_performance_report",
  "arguments": {
    "timeRange": "7d",
    "includeRecommendations": true
  }
}
```

### Run Deep Diagnostics
```json
{
  "name": "run_diagnostics",
  "arguments": {
    "deep": true
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_PORT` | MCP server port | `3002` |
| `RENDER_API_KEY` | Render API key | Required |
| `RENDER_SERVICE_ID_BACKEND` | Backend service ID | Required |
| `RENDER_SERVICE_ID_FRONTEND` | Frontend service ID | Required |
| `TRIBAL_GNOSIS_API_URL` | Backend API URL | `https://tribal-gnosis-backend.onrender.com` |
| `TRIBAL_GNOSIS_FRONTEND_URL` | Frontend URL | `https://tribal-gnosis-frontend.onrender.com` |
| `MONITORING_INTERVAL` | Monitoring interval (ms) | `30000` |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `60000` |
| `LOG_LEVEL` | Logging level | `info` |

### Render API Setup

1. Go to your Render Dashboard
2. Navigate to Account Settings > API Keys
3. Generate a new API key
4. Find your service IDs in the service URLs (e.g., `srv-xxxxx`)

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── services/
│   │   ├── monitor.ts        # Application monitoring
│   │   ├── health.ts         # Health checks
│   │   ├── metrics.ts        # Metrics collection
│   │   └── render.ts         # Render API integration
│   └── utils/
│       └── logger.ts         # Logging utilities
├── dist/                     # Compiled JavaScript
├── logs/                     # Log files
└── package.json
```

## Integration with MCP Clients

This server implements the Model Context Protocol and can be used with any MCP-compatible client, including:

- Claude Desktop
- Custom MCP clients
- IDE extensions
- Command-line tools

### MCP Client Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "tribal-gnosis": {
      "command": "node",
      "args": ["/path/to/tribal-gnosis-mcp-server/dist/index.js"],
      "env": {
        "RENDER_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Monitoring Capabilities

### Health Checks
- **Backend Health**: API endpoint responsiveness
- **Frontend Health**: Static site availability
- **Database Connectivity**: Connection testing via API
- **API Endpoint Testing**: Individual endpoint validation

### Performance Metrics
- **Response Times**: Average and percentile response times
- **Uptime Tracking**: Service availability percentages
- **Error Rates**: HTTP error monitoring
- **Throughput**: Request volume tracking

### Alerting
- **Status Changes**: Automatic detection of service state changes
- **Performance Degradation**: Response time threshold monitoring
- **Error Spikes**: Unusual error rate detection

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Verify Render API key is correct
   - Ensure API key has proper permissions

2. **Service ID Issues**
   - Check service IDs in Render dashboard
   - Ensure services are properly deployed

3. **Network Connectivity**
   - Verify URLs are accessible
   - Check firewall settings

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging:
```bash
LOG_LEVEL=debug npm start
```

## Development

### Adding New Tools

1. Add tool definition to `getAvailableTools()` in `index.ts`
2. Add handler method for the tool
3. Implement the tool logic in appropriate service class

### Testing

Test individual tools using MCP client or direct API calls:

```bash
# Test health check
echo '{"method": "tools/call", "params": {"name": "check_health", "arguments": {}}}' | node dist/index.js
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs in the `logs/` directory
3. Verify Render service status
4. Check environment configuration