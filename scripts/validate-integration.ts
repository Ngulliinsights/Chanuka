#!/usr/bin/env tsx

/**
 * Server-Client Integration Validation Script
 * 
 * This script validates that the server and client are properly integrated
 * by checking configuration, endpoints, and connectivity.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}

const results: ValidationResult[] = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addCheck(
  category: string,
  name: string,
  status: 'pass' | 'fail' | 'warn',
  message: string
) {
  let categoryResult = results.find(r => r.category === category);
  if (!categoryResult) {
    categoryResult = { category, checks: [] };
    results.push(categoryResult);
  }
  categoryResult.checks.push({ name, status, message });
}

// ============================================================================
// Configuration Checks
// ============================================================================

function checkServerConfig() {
  log('\n📋 Checking Server Configuration...', 'blue');
  
  // Check server .env file
  const serverEnvPath = join(process.cwd(), 'server', '.env');
  if (existsSync(serverEnvPath)) {
    addCheck('Configuration', 'Server .env file', 'pass', 'Found');
    
    const envContent = readFileSync(serverEnvPath, 'utf-8');
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        addCheck('Configuration', `${varName}`, 'pass', 'Configured');
      } else {
        addCheck('Configuration', `${varName}`, 'warn', 'Not found in .env');
      }
    });
  } else {
    addCheck('Configuration', 'Server .env file', 'fail', 'Not found');
  }
  
  // Check server package.json
  const serverPackagePath = join(process.cwd(), 'server', 'package.json');
  if (existsSync(serverPackagePath)) {
    addCheck('Configuration', 'Server package.json', 'pass', 'Found');
  } else {
    addCheck('Configuration', 'Server package.json', 'fail', 'Not found');
  }
}

function checkClientConfig() {
  log('\n📋 Checking Client Configuration...', 'blue');
  
  // Check client .env files
  const clientEnvDev = join(process.cwd(), 'client', '.env.development');
  const clientEnvProd = join(process.cwd(), 'client', '.env.production');
  
  if (existsSync(clientEnvDev)) {
    addCheck('Configuration', 'Client .env.development', 'pass', 'Found');
    
    const envContent = readFileSync(clientEnvDev, 'utf-8');
    if (envContent.includes('VITE_API_URL')) {
      addCheck('Configuration', 'VITE_API_URL', 'pass', 'Configured');
    } else {
      addCheck('Configuration', 'VITE_API_URL', 'warn', 'Not configured');
    }
  } else {
    addCheck('Configuration', 'Client .env.development', 'warn', 'Not found');
  }
  
  if (existsSync(clientEnvProd)) {
    addCheck('Configuration', 'Client .env.production', 'pass', 'Found');
  } else {
    addCheck('Configuration', 'Client .env.production', 'warn', 'Not found');
  }
  
  // Check client package.json
  const clientPackagePath = join(process.cwd(), 'client', 'package.json');
  if (existsSync(clientPackagePath)) {
    addCheck('Configuration', 'Client package.json', 'pass', 'Found');
  } else {
    addCheck('Configuration', 'Client package.json', 'fail', 'Not found');
  }
}

// ============================================================================
// File Structure Checks
// ============================================================================

function checkFileStructure() {
  log('\n📁 Checking File Structure...', 'blue');
  
  const criticalPaths = [
    { path: 'server/index.ts', name: 'Server entry point' },
    { path: 'client/src/main.tsx', name: 'Client entry point' },
    { path: 'client/src/infrastructure/api/index.ts', name: 'API infrastructure' },
    { path: 'server/features', name: 'Server features directory' },
    { path: 'client/src/features', name: 'Client features directory' },
  ];
  
  criticalPaths.forEach(({ path, name }) => {
    const fullPath = join(process.cwd(), path);
    if (existsSync(fullPath)) {
      addCheck('File Structure', name, 'pass', `Found at ${path}`);
    } else {
      addCheck('File Structure', name, 'fail', `Not found at ${path}`);
    }
  });
}

// ============================================================================
// API Endpoint Checks
// ============================================================================

function checkApiEndpoints() {
  log('\n🔌 Checking API Endpoints...', 'blue');
  
  const serverIndexPath = join(process.cwd(), 'server', 'index.ts');
  if (existsSync(serverIndexPath)) {
    const content = readFileSync(serverIndexPath, 'utf-8');
    
    const expectedRoutes = [
      { route: '/api/bills', name: 'Bills API' },
      { route: '/api/auth', name: 'Auth API' },
      { route: '/api/users', name: 'Users API' },
      { route: '/api/community', name: 'Community API' },
      { route: '/api/analytics', name: 'Analytics API' },
      { route: '/api/notifications', name: 'Notifications API' },
    ];
    
    expectedRoutes.forEach(({ route, name }) => {
      if (content.includes(route)) {
        addCheck('API Endpoints', name, 'pass', `Route ${route} registered`);
      } else {
        addCheck('API Endpoints', name, 'warn', `Route ${route} not found`);
      }
    });
  } else {
    addCheck('API Endpoints', 'Server index', 'fail', 'Cannot check - file not found');
  }
}

// ============================================================================
// Client API Services Checks
// ============================================================================

function checkClientApiServices() {
  log('\n🔧 Checking Client API Services...', 'blue');
  
  const expectedServices = [
    { path: 'client/src/features/bills/services/api.ts', name: 'Bills API Service' },
    { path: 'client/src/features/community/services/api.ts', name: 'Community API Service' },
    { path: 'client/src/features/analytics/services/api.ts', name: 'Analytics API Service' },
    { path: 'client/src/features/users/services/auth-service.ts', name: 'Auth Service' },
  ];
  
  expectedServices.forEach(({ path, name }) => {
    const fullPath = join(process.cwd(), path);
    if (existsSync(fullPath)) {
      addCheck('Client Services', name, 'pass', 'Found');
    } else {
      addCheck('Client Services', name, 'warn', 'Not found');
    }
  });
}

// ============================================================================
// Dependencies Checks
// ============================================================================

function checkDependencies() {
  log('\n📦 Checking Dependencies...', 'blue');
  
  // Check server node_modules
  const serverNodeModules = join(process.cwd(), 'server', 'node_modules');
  if (existsSync(serverNodeModules)) {
    addCheck('Dependencies', 'Server dependencies', 'pass', 'Installed');
  } else {
    addCheck('Dependencies', 'Server dependencies', 'fail', 'Not installed - run: cd server && npm install');
  }
  
  // Check client node_modules
  const clientNodeModules = join(process.cwd(), 'client', 'node_modules');
  if (existsSync(clientNodeModules)) {
    addCheck('Dependencies', 'Client dependencies', 'pass', 'Installed');
  } else {
    addCheck('Dependencies', 'Client dependencies', 'fail', 'Not installed - run: cd client && npm install');
  }
}

// ============================================================================
// TypeScript Configuration Checks
// ============================================================================

function checkTypeScriptConfig() {
  log('\n⚙️  Checking TypeScript Configuration...', 'blue');
  
  const serverTsConfig = join(process.cwd(), 'server', 'tsconfig.json');
  const clientTsConfig = join(process.cwd(), 'client', 'tsconfig.json');
  
  if (existsSync(serverTsConfig)) {
    addCheck('TypeScript', 'Server tsconfig.json', 'pass', 'Found');
  } else {
    addCheck('TypeScript', 'Server tsconfig.json', 'fail', 'Not found');
  }
  
  if (existsSync(clientTsConfig)) {
    addCheck('TypeScript', 'Client tsconfig.json', 'pass', 'Found');
  } else {
    addCheck('TypeScript', 'Client tsconfig.json', 'fail', 'Not found');
  }
}

// ============================================================================
// Security Checks
// ============================================================================

function checkSecurity() {
  log('\n🔒 Checking Security Configuration...', 'blue');
  
  const serverIndexPath = join(process.cwd(), 'server', 'index.ts');
  if (existsSync(serverIndexPath)) {
    const content = readFileSync(serverIndexPath, 'utf-8');
    
    const securityFeatures = [
      { feature: 'securityMiddleware', name: 'Security Middleware' },
      { feature: 'standardRateLimits', name: 'Rate Limiting' },
      { feature: 'csrf-token', name: 'CSRF Protection' },
    ];
    
    securityFeatures.forEach(({ feature, name }) => {
      if (content.includes(feature)) {
        addCheck('Security', name, 'pass', 'Implemented');
      } else {
        addCheck('Security', name, 'warn', 'Not found');
      }
    });
  }
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport() {
  log('\n' + '='.repeat(80), 'bold');
  log('INTEGRATION VALIDATION REPORT', 'bold');
  log('='.repeat(80) + '\n', 'bold');
  
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let warningChecks = 0;
  
  results.forEach(({ category, checks }) => {
    log(`\n${category}:`, 'bold');
    log('-'.repeat(80));
    
    checks.forEach(({ name, status, message }) => {
      totalChecks++;
      
      let icon = '';
      let color: keyof typeof colors = 'reset';
      
      if (status === 'pass') {
        icon = '✅';
        color = 'green';
        passedChecks++;
      } else if (status === 'fail') {
        icon = '❌';
        color = 'red';
        failedChecks++;
      } else {
        icon = '⚠️ ';
        color = 'yellow';
        warningChecks++;
      }
      
      log(`  ${icon} ${name}: ${message}`, color);
    });
  });
  
  log('\n' + '='.repeat(80), 'bold');
  log('SUMMARY', 'bold');
  log('='.repeat(80), 'bold');
  log(`Total Checks: ${totalChecks}`);
  log(`Passed: ${passedChecks}`, 'green');
  log(`Failed: ${failedChecks}`, failedChecks > 0 ? 'red' : 'reset');
  log(`Warnings: ${warningChecks}`, warningChecks > 0 ? 'yellow' : 'reset');
  
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, passedChecks === totalChecks ? 'green' : 'yellow');
  
  if (failedChecks > 0) {
    log('\n⚠️  Critical issues found. Please address failed checks before deployment.', 'red');
    process.exit(1);
  } else if (warningChecks > 0) {
    log('\n⚠️  Some warnings found. Review them before deployment.', 'yellow');
  } else {
    log('\n✅ All checks passed! Integration is properly configured.', 'green');
  }
  
  log('\n' + '='.repeat(80) + '\n', 'bold');
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  log('\n🚀 Starting Server-Client Integration Validation...', 'bold');
  
  try {
    checkServerConfig();
    checkClientConfig();
    checkFileStructure();
    checkApiEndpoints();
    checkClientApiServices();
    checkDependencies();
    checkTypeScriptConfig();
    checkSecurity();
    
    generateReport();
  } catch (error) {
    log('\n❌ Validation failed with error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
