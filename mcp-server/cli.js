#!/usr/bin/env node

/**
 * Simple CLI interface for Tribal Gnosis MCP Server
 * Use this if you don't want to set up Claude Desktop
 */

import { TribalGnosisMonitor } from './dist/services/monitor.js';
import { RenderManager } from './dist/services/render.js';
import { HealthChecker } from './dist/services/health.js';
import { MetricsCollector } from './dist/services/metrics.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = {
  'health': async () => {
    const checker = new HealthChecker();
    return await checker.checkHealth('all');
  },
  
  'metrics': async () => {
    const collector = new MetricsCollector();
    return await collector.getMetrics('all', '1h');
  },
  
  'diagnostics': async () => {
    const monitor = new TribalGnosisMonitor();
    return await monitor.runDiagnostics(false);
  },
  
  'restart-backend': async () => {
    const render = new RenderManager();
    return await render.restartService('backend');
  },
  
  'restart-frontend': async () => {
    const render = new RenderManager();
    return await render.restartService('frontend');
  }
};

const command = process.argv[2];
if (!command || !commands[command]) {
  console.log('Available commands:', Object.keys(commands).join(', '));
  process.exit(1);
}

commands[command]()
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(error => console.error('Error:', error.message));