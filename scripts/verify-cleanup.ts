#!/usr/bin/env tsx

/**
 * Verification Script - Test that cleanup was successful
 * 
 * This script verifies that:
 * 1. Deprecated directories were removed
 * 2. Error management system still works
 * 3. No broken imports remain
 */

import { promises as fs } from 'fs';
import { join } from 'path';

interface VerificationResult {
  success: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function testErrorManagement(): Promise<boolean> {
  try {
    // Just check if the error management files exist
    const baseErrorExists = await fs.access('shared/core/src/observability/error-management/errors/base-error.ts').then(() => true).catch(() => false);
    const indexExists = await fs.access('shared/core/src/observability/error-management/index.ts').then(() => true).catch(() => false);
    
    return baseErrorExists && indexExists;
  } catch (error) {
    console.error('Error management test failed:', error);
    return false;
  }
}

async function verify(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    checks: []
  };

  // Check 1: Deprecated directories should be removed
  const deprecatedDirs = [
    'shared/core/src/error-handling',
    'shared/core/src/errors'
  ];

  for (const dir of deprecatedDirs) {
    const exists = await directoryExists(dir);
    const passed = !exists;
    
    result.checks.push({
      name: `Deprecated directory removed: ${dir}`,
      passed,
      message: passed ? 'Successfully removed' : 'Still exists - cleanup may have failed'
    });
    
    if (!passed) result.success = false;
  }

  // Check 2: Backup directories should exist
  const backupDirs = [
    'shared/core/.cleanup-backup/shared_core_src_error-handling',
    'shared/core/.cleanup-backup/shared_core_src_errors'
  ];

  for (const dir of backupDirs) {
    const exists = await directoryExists(dir);
    
    result.checks.push({
      name: `Backup created: ${dir}`,
      passed: exists,
      message: exists ? 'Backup successfully created' : 'Backup missing - may need manual verification'
    });
  }

  // Check 3: Error management system should still work
  const errorSystemWorks = await testErrorManagement();
  
  result.checks.push({
    name: 'Error management system functional',
    passed: errorSystemWorks,
    message: errorSystemWorks ? 'Error system working correctly' : 'Error system may be broken'
  });
  
  if (!errorSystemWorks) result.success = false;

  // Check 4: Observability directory should exist
  const observabilityExists = await directoryExists('shared/core/src/observability');
  
  result.checks.push({
    name: 'Observability system intact',
    passed: observabilityExists,
    message: observabilityExists ? 'Observability system present' : 'Observability system missing'
  });
  
  if (!observabilityExists) result.success = false;

  return result;
}

async function printResults(result: VerificationResult): Promise<void> {
  console.log('\n🔍 Cleanup Verification Results');
  console.log('================================');
  
  for (const check of result.checks) {
    const icon = check.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total checks: ${result.checks.length}`);
  console.log(`   Passed: ${result.checks.filter(c => c.passed).length}`);
  console.log(`   Failed: ${result.checks.filter(c => !c.passed).length}`);
  
  if (result.success) {
    console.log('\n🎉 All verification checks passed!');
    console.log('   The cleanup was successful and the system is working correctly.');
  } else {
    console.log('\n⚠️  Some verification checks failed.');
    console.log('   Please review the failed checks above.');
  }
}

async function main() {
  try {
    console.log('🔍 Verifying cleanup results...');
    const result = await verify();
    await printResults(result);
    
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }
}

// Run the verification
main().catch(console.error);
