#!/usr/bin/env tsx
/**
 * Server Startup Script
 * 
 * Properly initializes path aliases and starts the server
 */

// Register tsconfig paths before any imports
import { register } from 'tsconfig-paths';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load tsconfig and register paths
const tsconfigPath = resolve(__dirname, 'tsconfig.json');
const tsconfigContent = readFileSync(tsconfigPath, 'utf8');

// Strip comments from JSON (simple approach for tsconfig)
const jsonContent = tsconfigContent
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
  .replace(/\/\/.*/g, ''); // Remove // comments

const tsconfig = JSON.parse(jsonContent);

const baseUrl = resolve(__dirname, tsconfig.compilerOptions.baseUrl || '.');
register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths,
});

console.log('✅ Path aliases registered');

// Now import and start the server
import('./index.js').catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
