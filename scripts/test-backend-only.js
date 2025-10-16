#!/usr/bin/env node

/**
 * Backend-only test runner script
 * This script helps you focus on backend and database testing
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'run';

const commands = {
  run: ['npm', ['run', 'test:backend']],
  watch: ['npm', ['run', 'test:backend:watch']],
  coverage: ['npm', ['run', 'test:backend:coverage']],
  database: ['npm', ['run', 'test:database']],
  performance: ['npm', ['run', 'test:backend:performance']],
  integration: ['npm', ['run', 'test:backend:integration']],
  help: () => {
    console.log(`
Backend Testing Commands:
  node scripts/test-backend-only.js run         - Run all backend tests
  node scripts/test-backend-only.js watch       - Watch mode for development
  node scripts/test-backend-only.js coverage    - Generate coverage report
  node scripts/test-backend-only.js database    - Run database tests only
  node scripts/test-backend-only.js performance - Run performance tests
  node scripts/test-backend-only.js integration - Run integration tests
  node scripts/test-backend-only.js help        - Show this help
    `);
    return;
  }
};

if (command === 'help' || !commands[command]) {
  commands.help();
  process.exit(0);
}

const [cmd, cmdArgs] = commands[command];

console.log(`🔧 Running backend tests: ${command}`);
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`⚡ Command: ${cmd} ${cmdArgs.join(' ')}\n`);

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Backend tests completed successfully!');
  } else {
    console.log(`\n❌ Backend tests failed with exit code ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start backend tests:', error);
  process.exit(1);
});