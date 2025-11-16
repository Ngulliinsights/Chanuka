#!/usr/bin/env node

/**
 * Development Environment Startup Script
 * Helps users start the development environment with proper error handling
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Chanuka Development Environment...\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
try {
  require(packageJsonPath);
} catch (error) {
  console.error('❌ Error: package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Function to start a process with proper error handling
function startProcess(command, args, name, color = '\x1b[36m') {
  console.log(`${color}Starting ${name}...\x1b[0m`);
  
  const process = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  process.on('error', (error) => {
    console.error(`❌ Failed to start ${name}:`, error.message);
  });

  process.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} exited with code ${code}`);
    }
  });

  return process;
}

// Check if user wants to start server only, client only, or both
const args = process.argv.slice(2);
const mode = args[0] || 'both';

switch (mode) {
  case 'server':
    console.log('📡 Starting server only...');
    startProcess('npm', ['run', 'dev:server'], 'Server', '\x1b[32m');
    break;
    
  case 'client':
    console.log('🌐 Starting client only...');
    startProcess('npm', ['run', 'dev:client'], 'Client', '\x1b[34m');
    break;
    
  case 'simple':
    console.log('🔧 Starting simple server...');
    startProcess('npm', ['run', 'dev:simple'], 'Simple Server', '\x1b[33m');
    break;
    
  case 'both':
  default:
    console.log('🔄 Starting both client and server...');
    startProcess('npm', ['run', 'dev'], 'Full Development Environment', '\x1b[35m');
    break;
}

console.log('\n📋 Available commands:');
console.log('  node start-dev.js        - Start both client and server');
console.log('  node start-dev.js server - Start server only');
console.log('  node start-dev.js client - Start client only');
console.log('  node start-dev.js simple - Start simple server');
console.log('\n🔧 Troubleshooting:');
console.log('  - Make sure you have run: npm install');
console.log('  - Check if ports 3000 and 5000 are available');
console.log('  - For database issues, run: npm run db:health');
console.log('\n✨ Happy coding!\n');