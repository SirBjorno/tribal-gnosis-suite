# MCP Server Deployment Guide

This guide explains how to deploy and use the Tribal Gnosis MCP Server for monitoring and managing your application.

## Quick Start

1. **Configure Environment**:
   ```bash
   cd mcp-server
   cp .env.example .env
   # Edit .env with your Render API credentials
   ```

2. **Install and Build**:
   ```bash
   npm install
   npm run build
   ```

3. **Test Functionality**:
   ```bash
   npm test
   ```

## Render Integration Setup

### Step 1: Get Render API Key

1. Login to [Render Dashboard](https://dashboard.render.com)
2. Go to Account Settings → API Keys
3. Create a new API key with appropriate permissions
4. Copy the API key for use in environment configuration

### Step 2: Find Service IDs

1. Navigate to your backend service in Render Dashboard
2. Service ID is in the URL: `https://dashboard.render.com/web/srv-XXXXXXXXXXXXX`
3. Copy the `srv-XXXXXXXXXXXXX` part
4. Repeat for frontend service

### Step 3: Configure Environment Variables

Update your `.env` file:
```env
RENDER_API_KEY=rnd_XXXXXXXXXXXXX
RENDER_SERVICE_ID_BACKEND=srv-XXXXXXXXXXXXX  
RENDER_SERVICE_ID_FRONTEND=srv-XXXXXXXXXXXXX
TRIBAL_GNOSIS_API_URL=https://tribal-gnosis-backend.onrender.com
TRIBAL_GNOSIS_FRONTEND_URL=https://tribal-gnosis-frontend.onrender.com
```

## MCP Client Integration

### Claude Desktop Integration

1. Locate Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add MCP server configuration:
   ```json
   {
     "mcpServers": {
       "tribal-gnosis": {
         "command": "node",
         "args": ["C:/path/to/tribal-gnosis-live/mcp-server/dist/index.js"],
         "env": {
           "RENDER_API_KEY": "your_api_key",
           "RENDER_SERVICE_ID_BACKEND": "srv_backend_id",
           "RENDER_SERVICE_ID_FRONTEND": "srv_frontend_id"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

### Custom MCP Client Integration

Use the provided `mcp-client-config.json` as a template for other MCP clients.

## Available Tools & Usage Examples

### 1. Health Monitoring

**Check overall health:**
```
Use the check_health tool to see if all services are running properly
```

**Run diagnostics:**
```
Use run_diagnostics with deep=true to get comprehensive system analysis
```

### 2. Performance Monitoring

**Get current metrics:**
```
Use get_metrics for backend service over the last 6 hours
```

**Generate performance report:**
```
Use get_performance_report for the last 7 days with recommendations
```

### 3. Deployment Management

**Check deployment status:**
```
Use get_deployment_status to see recent deployments for all services
```

**Restart a service:**
```
Use restart_service for the backend with reason "Performance optimization"
```

**Trigger new deployment:**
```
Use trigger_deployment for frontend service from main branch
```

### 4. Log Analysis

**Get recent logs:**
```
Use get_logs for backend service, last 200 lines, error level only
```

**Analyze errors:**
```
Use get_error_analysis for all services in the last 48 hours
```

## Monitoring Dashboard

Once running, the MCP server provides:

- **Real-time Health Checks**: Every 60 seconds
- **Performance Metrics**: Every 30 seconds  
- **Error Detection**: Automatic alerting
- **Deployment Tracking**: Status and history
- **Resource Monitoring**: CPU, memory, response times

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Run `npm install` and `npm run build`
   - Check Node.js version (>=18 required)

2. **API Key authentication errors**
   - Verify API key in Render dashboard
   - Check environment variable formatting
   - Ensure API key has proper permissions

3. **Service ID not found**
   - Double-check service IDs in Render dashboard
   - Ensure services are active and deployed

4. **Network connectivity issues**
   - Verify URLs are accessible from your network
   - Check firewall settings
   - Test with `curl` or browser

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug npm start
```

Check log files:
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

### Testing Without MCP Client

Use the test script to verify functionality:
```bash
npm test
```

Or test individual components:
```bash
node -e "
import('./dist/services/health.js').then(async ({HealthChecker}) => {
  const health = new HealthChecker();
  const result = await health.checkHealth('all');
  console.log(JSON.stringify(result, null, 2));
});
"
```

## Production Deployment

### Option 1: Local Server
Run the MCP server on your local machine or development server:

```bash
npm run build
npm start
```

### Option 2: Deploy to Render
Deploy the MCP server itself to Render for 24/7 monitoring:

1. Create new Render Web Service
2. Connect to your repository
3. Set build command: `cd mcp-server && npm install && npm run build`
4. Set start command: `cd mcp-server && npm start`
5. Add environment variables

### Option 3: Docker Deployment
Create a Docker container for the MCP server:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY mcp-server/package*.json ./
RUN npm ci --only=production
COPY mcp-server/ ./
RUN npm run build
CMD ["npm", "start"]
```

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables or secure vaults
   - Rotate keys regularly

2. **Access Control**
   - Limit API key permissions in Render
   - Use network firewalls if needed
   - Monitor API usage logs

3. **Data Privacy**
   - Logs may contain sensitive information
   - Implement log rotation and cleanup
   - Consider encryption for stored metrics

## Monitoring Best Practices

1. **Set up alerts** for critical metrics
2. **Regular health checks** during peak hours
3. **Performance baselines** for comparison
4. **Error tracking** with actionable insights
5. **Capacity planning** based on metrics trends

## Support & Maintenance

- **Regular Updates**: Keep dependencies updated
- **Log Monitoring**: Review error logs weekly
- **Performance Tuning**: Adjust intervals based on needs
- **Backup Configuration**: Keep environment configs backed up

For additional support, check:
1. MCP server logs
2. Render service status
3. Network connectivity
4. Environment configuration