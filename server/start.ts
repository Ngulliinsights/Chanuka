#!/usr/bin/env node
/**
 * Server Startup Script with Path Alias Resolution
 * 
 * This script properly registers tsconfig-paths before importing the main server
 * to ensure @server/* path aliases resolve correctly.
 */

import { register } from 'tsconfig-paths';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load and parse tsconfig.json
const tsconfigPath = resolve(__dirname, 'tsconfig.json');
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

// Register path aliases
const baseUrl = resolve(__dirname, tsconfig.compilerOptions.baseUrl || '.');
register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths,
});

console.log('✅ Path aliases registered successfully');
console.log('📂 Base URL:', baseUrl);

// Import and start the server
import('./index.js').catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
