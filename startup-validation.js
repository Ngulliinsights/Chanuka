#!/usr/bin/env node

/**
 * Startup Validation Script for Chanuka Legislative Transparency Platform
 * 
 * This script validates that the application can start successfully and handle basic requests.
 * It checks dependencies, environment variables, database connectivity, and basic API functionality.
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  SERVER_PORT: process.env.PORT || 4200,
  CLIENT_PORT: 3000,
  TIMEOUT: 60000, // 60 seconds
  HEALTH_CHECK_RETRIES: 10,
  HEALTH_CHECK_INTERVAL: 2000, // 2 seconds
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
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

// Validation Results
const results = {
  dependencies: { passed: false, details: [] },
  environment: { passed: false, details: [] },
  database: { passed: false, details: [] },
  server: { passed: false, details: [] },
  client: { passed: false, details: [] },
  api: { passed: false, details: [] },
  overall: { passed: false, blockers: [] }
};

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  logInfo('Checking required files...');
  
  const requiredFiles = [
    'package.json',
    'server/index.ts',
    'client/index.html',
    'client/src/main.tsx',
    'shared/database/connection.ts',
    'vite.config.ts',
    'tsconfig.json'
  ];

  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    logError(`Missing required files: ${missingFiles.join(', ')}`);
    results.dependencies.details.push(`Missing files: ${missingFiles.join(', ')}`);
    return false;
  }

  logSuccess('All required files present');
  return true;
}

/**
 * Check package.json and dependencies
 */
function checkDependencies() {
  logInfo('Checking dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      logError('node_modules directory not found. Run "npm install" first.');
      results.dependencies.details.push('node_modules missing');
      return false;
    }

    // Check critical dependencies
    const criticalDeps = [
      'express', 'react', 'react-dom', 'vite', 'typescript', 
      'drizzle-orm', '@neondatabase/serverless', 'zod'
    ];

    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);

    if (missingDeps.length > 0) {
      logError(`Missing critical dependencies: ${missingDeps.join(', ')}`);
      results.dependencies.details.push(`Missing dependencies: ${missingDeps.join(', ')}`);
      return false;
    }

    logSuccess('Dependencies check passed');
    results.dependencies.passed = true;
    return true;
  } catch (error) {
    logError(`Error checking dependencies: ${error.message}`);
    results.dependencies.details.push(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  logInfo('Checking environment variables...');
  
  // Load .env file if it exists
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    });

    // Check critical environment variables
    const criticalEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SESSION_SECRET',
      'NODE_ENV',
      'PORT'
    ];

    const missingEnvVars = [];
    const weakSecrets = [];

    for (const envVar of criticalEnvVars) {
      const value = envVars[envVar] || process.env[envVar];
      
      if (!value) {
        missingEnvVars.push(envVar);
      } else if ((envVar.includes('SECRET') || envVar.includes('KEY')) && 
                 (value.includes('change-this') || value.includes('development') || value.length < 32)) {
        weakSecrets.push(envVar);
      }
    }

    if (missingEnvVars.length > 0) {
      logError(`Missing environment variables: ${missingEnvVars.join(', ')}`);
      results.environment.details.push(`Missing: ${missingEnvVars.join(', ')}`);
      return false;
    }

    if (weakSecrets.length > 0) {
      logWarning(`Weak secrets detected: ${weakSecrets.join(', ')}`);
      results.environment.details.push(`Weak secrets: ${weakSecrets.join(', ')}`);
    }

    logSuccess('Environment variables check passed');
    results.environment.passed = true;
    return true;
  } else {
    logError('.env file not found');
    results.environment.details.push('.env file missing');
    return false;
  }
}

/**
 * Test database connectivity
 */
function testDatabaseConnection() {
  return new Promise((resolve) => {
    logInfo('Testing database connection...');
    
    const testScript = `
      import { database } from './shared/database/connection.js';
      
      async function testConnection() {
        try {
          const result = await database.execute('SELECT 1 as test');
          console.log('Database connection successful');
          process.exit(0);
        } catch (error) {
          console.error('Database connection failed:', error.message);
          process.exit(1);
        }
      }
      
      testConnection();
    `;

    fs.writeFileSync('temp-db-test.js', testScript);
    
    const child = spawn('node', ['--loader', 'tsx/esm', 'temp-db-test.js'], {
      stdio: 'pipe',
      timeout: 10000
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      fs.unlinkSync('temp-db-test.js');
      
      if (code === 0) {
        logSuccess('Database connection test passed');
        results.database.passed = true;
        results.database.details.push('Connection successful');
      } else {
        logError('Database connection test failed');
        results.database.details.push(`Connection failed: ${output}`);
      }
      resolve(code === 0);
    });

    child.on('error', (error) => {
      fs.unlinkSync('temp-db-test.js');
      logError(`Database test error: ${error.message}`);
      results.database.details.push(`Test error: ${error.message}`);
      resolve(false);
    });
  });
}

/**
 * Start the server and test basic functionality
 */
function testServerStartup() {
  return new Promise((resolve) => {
    logInfo('Starting server...');
    
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: false
    });

    let serverOutput = '';
    let serverStarted = false;
    
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        logError('Server startup timeout');
        results.server.details.push('Startup timeout');
        serverProcess.kill();
        resolve(false);
      }
    }, CONFIG.TIMEOUT);

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Check for server startup indicators
      if (output.includes(`Server running on`) || 
          output.includes(`localhost:${CONFIG.SERVER_PORT}`) ||
          output.includes('ready in')) {
        serverStarted = true;
        clearTimeout(timeout);
        
        // Wait a bit for full initialization
        setTimeout(() => {
          testServerHealth(serverProcess).then(resolve);
        }, 3000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Check for critical errors
      if (output.includes('EADDRINUSE') || 
          output.includes('Cannot find module') ||
          output.includes('SyntaxError')) {
        clearTimeout(timeout);
        logError(`Server startup failed: ${output}`);
        results.server.details.push(`Startup error: ${output}`);
        serverProcess.kill();
        resolve(false);
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      logError(`Server process error: ${error.message}`);
      results.server.details.push(`Process error: ${error.message}`);
      resolve(false);
    });
  });
}

/**
 * Test server health and API endpoints
 */
function testServerHealth(serverProcess) {
  return new Promise((resolve) => {
    logInfo('Testing server health...');
    
    let attempts = 0;
    const maxAttempts = CONFIG.HEALTH_CHECK_RETRIES;
    
    const checkHealth = () => {
      attempts++;
      
      const req = http.get(`http://localhost:${CONFIG.SERVER_PORT}/api/frontend-health`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const healthData = JSON.parse(data);
            
            if (res.statusCode === 200 && healthData.status === 'ok') {
              logSuccess('Server health check passed');
              results.server.passed = true;
              results.server.details.push('Health check successful');
              
              // Test a few more endpoints
              testApiEndpoints(serverProcess).then(resolve);
            } else {
              throw new Error(`Health check failed: ${res.statusCode} ${data}`);
            }
          } catch (error) {
            handleHealthCheckError(error);
          }
        });
      });
      
      req.on('error', handleHealthCheckError);
      req.setTimeout(5000, () => {
        req.destroy();
        handleHealthCheckError(new Error('Health check timeout'));
      });
    };
    
    const handleHealthCheckError = (error) => {
      if (attempts < maxAttempts) {
        logInfo(`Health check attempt ${attempts}/${maxAttempts} failed, retrying...`);
        setTimeout(checkHealth, CONFIG.HEALTH_CHECK_INTERVAL);
      } else {
        logError(`Server health check failed after ${maxAttempts} attempts`);
        results.server.details.push(`Health check failed: ${error.message}`);
        serverProcess.kill();
        resolve(false);
      }
    };
    
    checkHealth();
  });
}

/**
 * Test basic API endpoints
 */
function testApiEndpoints(serverProcess) {
  return new Promise((resolve) => {
    logInfo('Testing API endpoints...');
    
    const endpoints = [
      '/api',
      '/api/service-status',
      '/api/system/health'
    ];
    
    let completedTests = 0;
    let passedTests = 0;
    
    endpoints.forEach((endpoint) => {
      const req = http.get(`http://localhost:${CONFIG.SERVER_PORT}${endpoint}`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          completedTests++;
          
          if (res.statusCode === 200) {
            passedTests++;
            logSuccess(`API endpoint ${endpoint} responded successfully`);
          } else {
            logWarning(`API endpoint ${endpoint} returned ${res.statusCode}`);
          }
          
          if (completedTests === endpoints.length) {
            if (passedTests > 0) {
              logSuccess(`API tests passed (${passedTests}/${endpoints.length})`);
              results.api.passed = true;
              results.api.details.push(`${passedTests}/${endpoints.length} endpoints working`);
            } else {
              logError('All API tests failed');
              results.api.details.push('No endpoints responding');
            }
            
            serverProcess.kill();
            resolve(passedTests > 0);
          }
        });
      });
      
      req.on('error', (error) => {
        completedTests++;
        logError(`API endpoint ${endpoint} failed: ${error.message}`);
        
        if (completedTests === endpoints.length) {
          results.api.details.push(`API errors: ${error.message}`);
          serverProcess.kill();
          resolve(false);
        }
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        completedTests++;
        logWarning(`API endpoint ${endpoint} timeout`);
        
        if (completedTests === endpoints.length) {
          serverProcess.kill();
          resolve(passedTests > 0);
        }
      });
    });
  });
}

/**
 * Generate final report
 */
function generateReport() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('STARTUP VALIDATION REPORT', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  const sections = [
    { name: 'Dependencies', result: results.dependencies },
    { name: 'Environment', result: results.environment },
    { name: 'Database', result: results.database },
    { name: 'Server', result: results.server },
    { name: 'API', result: results.api }
  ];
  
  sections.forEach(({ name, result }) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? colors.green : colors.red;
    
    log(`\n${name}: ${status}`, color);
    
    if (result.details.length > 0) {
      result.details.forEach(detail => {
        log(`  • ${detail}`, colors.reset);
      });
    }
    
    if (!result.passed) {
      results.overall.blockers.push(name);
    }
  });
  
  // Overall assessment
  log('\n' + '-'.repeat(60), colors.cyan);
  
  if (results.overall.blockers.length === 0) {
    results.overall.passed = true;
    log('🎉 OVERALL: READY FOR DEMO', colors.green);
    log('\nThe application can start successfully and handle basic requests.', colors.green);
    log('You can demonstrate this MVP to stakeholders.', colors.green);
  } else {
    log('🚫 OVERALL: NOT READY', colors.red);
    log(`\nBlockers found in: ${results.overall.blockers.join(', ')}`, colors.red);
    log('These issues must be resolved before demonstrating to stakeholders.', colors.red);
  }
  
  // Recommendations
  log('\n' + '-'.repeat(60), colors.cyan);
  log('RECOMMENDATIONS:', colors.cyan);
  
  if (!results.dependencies.passed) {
    log('• Run "npm install" to install dependencies', colors.yellow);
  }
  
  if (!results.environment.passed) {
    log('• Check .env file and ensure all required variables are set', colors.yellow);
    log('• Update weak secrets with strong, unique values', colors.yellow);
  }
  
  if (!results.database.passed) {
    log('• Verify DATABASE_URL is correct and database is accessible', colors.yellow);
    log('• Check network connectivity and database permissions', colors.yellow);
  }
  
  if (!results.server.passed) {
    log('• Check for port conflicts (try a different PORT in .env)', colors.yellow);
    log('• Review server logs for specific error messages', colors.yellow);
  }
  
  if (!results.api.passed) {
    log('• Verify server routes are properly configured', colors.yellow);
    log('• Check for middleware or CORS issues', colors.yellow);
  }
  
  log('\n' + '='.repeat(60), colors.cyan);
  
  return results.overall.passed;
}

/**
 * Main validation function
 */
async function runValidation() {
  log('🚀 Starting Chanuka Platform Startup Validation', colors.cyan);
  log('This will test if the application can start and handle basic requests.\n', colors.cyan);
  
  try {
    // Step 1: Check files and dependencies
    if (!checkRequiredFiles() || !checkDependencies()) {
      results.overall.blockers.push('Dependencies');
    }
    
    // Step 2: Check environment
    if (!checkEnvironmentVariables()) {
      results.overall.blockers.push('Environment');
    }
    
    // Step 3: Test database (optional - continue even if it fails)
    await testDatabaseConnection();
    
    // Step 4: Test server startup and API
    if (results.dependencies.passed && results.environment.passed) {
      const serverStarted = await testServerStartup();
      if (!serverStarted) {
        results.overall.blockers.push('Server');
      }
    } else {
      logWarning('Skipping server tests due to dependency/environment issues');
      results.server.details.push('Skipped due to earlier failures');
      results.api.details.push('Skipped due to earlier failures');
    }
    
  } catch (error) {
    logError(`Validation error: ${error.message}`);
    results.overall.blockers.push('Validation Error');
  }
  
  // Generate final report
  const success = generateReport();
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\nValidation interrupted by user', colors.yellow);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\nValidation terminated', colors.yellow);
  process.exit(1);
});

// Run validation
runValidation().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});