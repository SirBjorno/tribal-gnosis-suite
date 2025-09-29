#!/usr/bin/env node

// Simple wrapper to ensure proper environment loading
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from the mcp-server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Now import and start the main server
const { default: startServer } = await import('./dist/index.js');