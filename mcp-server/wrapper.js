const { spawn } = require('child_process');
const path = require('path');

// Set working directory to the MCP server directory
const mcpDir = path.join(__dirname);
process.chdir(mcpDir);

// Load environment variables
require('dotenv').config({ path: path.join(mcpDir, '.env') });

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  cwd: mcpDir,
  env: {
    ...process.env,
    NODE_PATH: path.join(mcpDir, 'node_modules')
  }
});

serverProcess.on('error', (error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.error('MCP Server exited with code:', code);
  process.exit(code);
});