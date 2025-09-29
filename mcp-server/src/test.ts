#!/usr/bin/env node

/**
 * Simple test script for Tribal Gnosis MCP Server
 * Tests basic functionality without requiring full MCP client setup
 */

import { TribalGnosisMonitor } from './services/monitor.js';
import { RenderManager } from './services/render.js';
import { HealthChecker } from './services/health.js';
import { MetricsCollector } from './services/metrics.js';
import { Logger } from './utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
  const logger = new Logger('MCPTest');
  
  logger.info('Starting MCP Server functionality tests...');

  try {
    // Test Health Checker
    logger.info('Testing Health Checker...');
    const healthChecker = new HealthChecker();
    const healthResult = await healthChecker.checkHealth('all');
    logger.info('Health check result:', healthResult);

    // Test Monitor
    logger.info('Testing Monitor diagnostics...');
    const monitor = new TribalGnosisMonitor();
    const diagnostics = await monitor.runDiagnostics(false);
    logger.info('Diagnostics result:', diagnostics);

    // Test Metrics Collector
    logger.info('Testing Metrics Collector...');
    const metricsCollector = new MetricsCollector();
    const metrics = await metricsCollector.getMetrics('all', '1h');
    logger.info('Metrics result:', metrics);

    // Test Render Manager (if API key is configured)
    if (process.env.RENDER_API_KEY) {
      logger.info('Testing Render Manager...');
      const renderManager = new RenderManager();
      const deploymentStatus = await renderManager.getDeploymentStatus('all');
      logger.info('Deployment status:', deploymentStatus);
    } else {
      logger.warn('RENDER_API_KEY not configured - skipping Render API tests');
    }

    logger.info('All tests completed successfully!');
    
  } catch (error: any) {
    logger.error('Test failed:', { error: error.message });
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}