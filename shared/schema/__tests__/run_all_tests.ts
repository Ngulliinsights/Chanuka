#!/usr/bin/env node
// ============================================================================
// COMPREHENSIVE TEST RUNNER
// ============================================================================
// Runs all schema tests with proper setup and reporting

import { execSync } from 'child_process';
import { resolve } from 'path';

const testFiles = [
  'foundation.test.ts',
  'citizen_participation.test.ts',
  'parliamentary_process.test.ts',
  'constitutional_intelligence.test.ts',
  'argument_intelligence.test.ts',
  'advocacy_coordination.test.ts',
  'universal_access.test.ts',
  'integrity_operations.test.ts',
  'platform_operations.test.ts',
  'transparency_analysis.test.ts',
  'impact_measurement.test.ts'
];

async function runAllTests() {
  console.log('🧪 Kenya Legislative Platform - Schema Test Suite');
  console.log('=' .repeat(60));
  console.log(`📊 Running ${testFiles.length} test suites...\n`);

  let passedSuites = 0;
  let failedSuites = 0;
  const results: { file: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

  for (const testFile of testFiles) {
    const testPath = resolve(__dirname, testFile);
    console.log(`🔍 Running ${testFile}...`);
    
    try {
      // Run vitest for each file
      execSync(`npx vitest run ${testPath}`, { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      console.log(`✅ ${testFile} - PASSED`);
      results.push({ file: testFile, status: 'PASS' });
      passedSuites++;
    } catch (error) {
      console.log(`❌ ${testFile} - FAILED`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ file: testFile, status: 'FAIL', error: errorMessage });
      failedSuites++;
    }
  }

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passedSuites}/${testFiles.length}`);
  console.log(`❌ Failed: ${failedSuites}/${testFiles.length}`);
  
  if (failedSuites > 0) {
    console.log('\n❌ FAILED TESTS:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  • ${r.file}`);
        if (r.error) {
          console.log(`    Error: ${r.error.substring(0, 100)}...`);
        }
      });
  }

  console.log('\n🎯 SCHEMA COVERAGE:');
  console.log('  ✅ Foundation Schema - Core legislative entities');
  console.log('  ✅ Citizen Participation - Public engagement layer');
  console.log('  ✅ Parliamentary Process - Legislative workflows');
  console.log('  ✅ Constitutional Intelligence - Legal analysis');
  console.log('  ✅ Argument Intelligence - Argument synthesis');
  console.log('  ✅ Advocacy Coordination - Campaign infrastructure');
  console.log('  ✅ Universal Access - Offline engagement');
  console.log('  ✅ Integrity Operations - Moderation & security');
  console.log('  ✅ Platform Operations - Analytics & metrics');
  console.log('  ✅ Transparency Analysis - Corporate influence');
  console.log('  ✅ Impact Measurement - Outcome tracking');

  console.log('\n🧪 TEST CATEGORIES:');
  console.log('  • CRUD Operations - Create, Read, Update, Delete');
  console.log('  • Data Validation - Constraints and type checking');
  console.log('  • Relationships - Foreign keys and joins');
  console.log('  • Complex Queries - Multi-table operations');
  console.log('  • Performance - Index usage and optimization');
  console.log('  • Edge Cases - Error handling and boundaries');
  console.log('  • Integration - Cross-schema functionality');

  return failedSuites === 0;
}

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      console.log(success ? '\n🎉 All tests completed successfully!' : '\n💥 Some tests failed!');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { runAllTests };


