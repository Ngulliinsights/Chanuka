/**
 * Pre-flight Checks for Server Startup
 * 
 * Validates environment and dependencies before starting the server
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { checkPort } from './port-manager.js';

export interface PreflightResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Run all pre-flight checks
 */
export async function runPreflightChecks(port: number): Promise<PreflightResult> {
  const result: PreflightResult = {
    success: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  
  if (majorVersion < 18) {
    result.errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    result.success = false;
  } else {
    result.info.push(`✅ Node.js version: ${nodeVersion}`);
  }

  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const optionalEnvVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'KEY_DERIVATION_SALT'];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      result.warnings.push(`Missing environment variable: ${varName}`);
    } else {
      result.info.push(`✅ ${varName} is set`);
    }
  }
  
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      result.warnings.push(`Optional environment variable not set: ${varName}`);
    }
  }

  // Check tsconfig.json exists
  const tsconfigPath = resolve(process.cwd(), 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    result.errors.push('tsconfig.json not found in server directory');
    result.success = false;
  } else {
    result.info.push('✅ tsconfig.json found');
  }

  // Check port availability
  try {
    const portInfo = await checkPort(port);
    if (!portInfo.available) {
      result.warnings.push(
        `Port ${port} is already in use${portInfo.pid ? ` by process ${portInfo.pid}` : ''}`
      );
      result.info.push('Server will attempt to find an available port automatically');
    } else {
      result.info.push(`✅ Port ${port} is available`);
    }
  } catch (error) {
    result.warnings.push(`Could not check port availability: ${error}`);
  }

  // Check critical directories
  const criticalDirs = [
    'infrastructure',
    'features',
    'middleware',
    'config',
  ];
  
  for (const dir of criticalDirs) {
    const dirPath = resolve(process.cwd(), dir);
    if (!existsSync(dirPath)) {
      result.errors.push(`Critical directory not found: ${dir}`);
      result.success = false;
    }
  }

  return result;
}

/**
 * Print pre-flight check results
 */
export function printPreflightResults(result: PreflightResult): void {
  console.log('\n🔍 Pre-flight Checks:\n');

  if (result.info.length > 0) {
    console.log('ℹ️  Information:');
    result.info.forEach(msg => console.log(`   ${msg}`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach(msg => console.log(`   ${msg}`));
    console.log();
  }

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(msg => console.log(`   ${msg}`));
    console.log();
  }

  if (result.success) {
    console.log('✅ All critical checks passed. Starting server...\n');
  } else {
    console.log('❌ Pre-flight checks failed. Please fix the errors above.\n');
  }
}

/**
 * Run pre-flight checks and exit if critical errors found
 */
export async function validateEnvironment(port: number): Promise<void> {
  const result = await runPreflightChecks(port);
  printPreflightResults(result);

  if (!result.success) {
    process.exit(1);
  }
}
