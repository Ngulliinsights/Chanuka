#!/usr/bin/env node

/**
 * Frontend Serving Integration Test Runner
 * 
 * This script runs all integration tests for frontend serving functionality,
 * including server configuration, React initialization, API communication,
 * and end-to-end user flows.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Test configuration
const testConfig = {
  server: {
    name: 'Server Integration Tests',
    command: 'npm',
    args: ['run', 'test:frontend-serving:server'],
    cwd: rootDir,
    timeout: 60000
  },
  client: {
    name: 'Client Integration Tests',
    command: 'npm',
    args: ['run', 'test:frontend-serving:client'],
    cwd: rootDir,
    timeout: 60000
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  const border = '='.repeat(message.length + 4);
  log(border, colors.cyan);
  log(`  ${message}  `, colors.cyan);
  log(border, colors.cyan);
}

function logSection(message) {
  log(`\n${colors.bright}${message}${colors.reset}`);
  log('-'.repeat(message.length), colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Check if required dependencies are available
function checkDependencies() {
  logSection('Checking Dependencies');
  
  const requiredFiles = [
    'package.json',
    'jest.config.js',
    'jest.client.config.js',
    'vitest.config.ts',
    'server/tests/integration/frontend-serving.test.ts',
    'client/src/__tests__/integration/react-initialization.test.tsx',
    'client/src/__tests__/integration/api-communication.test.tsx',
    'client/src/__tests__/integration/end-to-end-flows.test.tsx'
  ];

  let allDependenciesPresent = true;

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Found ${file}`);
    } else {
      logError(`Missing ${file}`);
      allDependenciesPresent = false;
    }
  }

  if (!allDependenciesPresent) {
    logError('Some required files are missing. Please ensure all test files are present.');
    process.exit(1);
  }

  logSuccess('All dependencies are present');
  return true;
}

// Run a test suite
function runTestSuite(config) {
  return new Promise((resolve, reject) => {
    logSection(`Running ${config.name}`);
    logInfo(`Command: ${config.command} ${config.args.join(' ')}`);
    logInfo(`Working directory: ${config.cwd}`);

    const startTime = Date.now();
    const child = spawn(config.command, config.args, {
      cwd: config.cwd,
      stdio: 'pipe',
      shell: process.platform === 'win32'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Stream output in real-time for better debugging
      process.stdout.write(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Only show stderr if it contains actual errors (not warnings)
      if (output.toLowerCase().includes('error') && !output.toLowerCase().includes('warning')) {
        process.stderr.write(output);
      }
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);

      if (code === 0) {
        logSuccess(`${config.name} completed successfully in ${durationSeconds}s`);
        resolve({
          name: config.name,
          success: true,
          duration,
          stdout,
          stderr
        });
      } else {
        logError(`${config.name} failed with exit code ${code} after ${durationSeconds}s`);
        reject({
          name: config.name,
          success: false,
          exitCode: code,
          duration,
          stdout,
          stderr
        });
      }
    });

    child.on('error', (error) => {
      logError(`Failed to start ${config.name}: ${error.message}`);
      reject({
        name: config.name,
        success: false,
        error: error.message,
        stdout,
        stderr
      });
    });

    // Set timeout
    setTimeout(() => {
      child.kill('SIGTERM');
      logError(`${config.name} timed out after ${config.timeout}ms`);
      reject({
        name: config.name,
        success: false,
        error: 'Timeout',
        timeout: config.timeout,
        stdout,
        stderr
      });
    }, config.timeout);
  });
}

// Generate test report
function generateReport(results) {
  logSection('Test Report');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  log(`\nTotal Test Suites: ${totalTests}`);
  log(`Passed: ${passedTests}`, passedTests > 0 ? colors.green : colors.reset);
  log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.reset);
  log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (failedTests > 0) {
    logSection('Failed Tests Details');
    results.filter(r => !r.success).forEach(result => {
      logError(`${result.name}:`);
      if (result.exitCode) {
        log(`  Exit Code: ${result.exitCode}`, colors.red);
      }
      if (result.error) {
        log(`  Error: ${result.error}`, colors.red);
      }
      if (result.stderr && result.stderr.trim()) {
        log(`  Error Output:`, colors.red);
        log(`    ${result.stderr.trim().split('\n').join('\n    ')}`, colors.red);
      }
    });
  }

  // Generate JSON report for CI/CD
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      duration: totalDuration
    },
    results: results.map(r => ({
      name: r.name,
      success: r.success,
      duration: r.duration,
      exitCode: r.exitCode,
      error: r.error
    }))
  };

  const reportPath = path.join(rootDir, 'test-results', 'frontend-serving-integration-report.json');
  
  // Ensure test-results directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  logInfo(`JSON report saved to: ${reportPath}`);

  return {
    success: failedTests === 0,
    summary: jsonReport.summary
  };
}

// Main execution function
async function main() {
  const startTime = Date.now();
  
  logHeader('Frontend Serving Integration Tests');
  
  try {
    // Check dependencies
    checkDependencies();

    // Run test suites
    const results = [];
    
    // Run server tests
    try {
      const serverResult = await runTestSuite(testConfig.server);
      results.push(serverResult);
    } catch (error) {
      results.push(error);
    }

    // Run client tests
    try {
      const clientResult = await runTestSuite(testConfig.client);
      results.push(clientResult);
    } catch (error) {
      results.push(error);
    }

    // Generate report
    const report = generateReport(results);
    
    const totalDuration = Date.now() - startTime;
    logSection('Summary');
    log(`Total execution time: ${(totalDuration / 1000).toFixed(2)}s`);
    
    if (report.success) {
      logSuccess('All frontend serving integration tests passed! 🎉');
      process.exit(0);
    } else {
      logError('Some frontend serving integration tests failed! 💥');
      process.exit(1);
    }

  } catch (error) {
    logError(`Test runner failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logWarning('Test runner interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  logWarning('Test runner terminated');
  process.exit(143);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, runTestSuite, generateReport, checkDependencies };