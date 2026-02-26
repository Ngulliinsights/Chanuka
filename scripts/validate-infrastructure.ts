#!/usr/bin/env tsx
/**
 * Infrastructure Validation Script
 * 
 * This script validates the infrastructure directory for:
 * - Type errors
 * - Circular dependencies
 * - Module boundary violations
 * - Build success
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  error?: string;
}

const results: ValidationResult[] = [];

function runValidation(name: string, command: string, cwd?: string): ValidationResult {
  console.log(`\n🔍 Running: ${name}...`);
  
  try {
    const output = execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(`✅ ${name} passed`);
    return {
      name,
      passed: true,
      message: output.trim(),
    };
  } catch (error: any) {
    console.error(`❌ ${name} failed`);
    return {
      name,
      passed: false,
      message: error.message,
      error: error.stdout || error.stderr,
    };
  }
}

async function validateInfrastructure() {
  console.log('🚀 Starting infrastructure validation...\n');
  console.log('=' .repeat(60));

  // 1. Type checking
  results.push(
    runValidation(
      'TypeScript Type Checking',
      'npm run type-check',
      path.join(process.cwd(), 'client')
    )
  );

  // 2. Circular dependency check
  results.push(
    runValidation(
      'Circular Dependency Check',
      'npm run analyze:infrastructure:circular'
    )
  );

  // 3. Linting
  results.push(
    runValidation(
      'ESLint',
      'npm run lint',
      path.join(process.cwd(), 'client')
    )
  );

  // 4. Build check
  results.push(
    runValidation(
      'Build Check',
      'npm run build',
      path.join(process.cwd(), 'client')
    )
  );

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Summary:\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error.substring(0, 200)}...`);
    }
  });

  console.log(`\n📈 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n❌ Infrastructure validation failed!');
    process.exit(1);
  }

  console.log('\n✅ All infrastructure validations passed!');
  process.exit(0);
}

// Run validation
validateInfrastructure().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
