#!/usr/bin/env tsx
/**
 * Test Core 9 Features
 * 
 * Runs comprehensive tests for the 9 core MVP features:
 * 1. Bills
 * 2. Users
 * 3. Community
 * 4. Argument Intelligence
 * 5. Search
 * 6. Notifications
 * 7. Sponsors
 * 8. Analytics
 * 9. Advocacy
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CORE_FEATURES = [
  'bills',
  'users',
  'community',
  'argument-intelligence',
  'search',
  'notifications',
  'sponsors',
  'analytics',
  'advocacy',
];

interface TestResult {
  feature: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runCommand(command: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { shell: true });
    let output = '';
    
    proc.stdout?.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr?.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function testFeature(feature: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing ${feature.toUpperCase()} feature...`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  // Check if feature directory exists
  const featurePath = path.join('server', 'features', feature);
  if (!fs.existsSync(featurePath)) {
    return {
      feature,
      passed: false,
      duration: Date.now() - startTime,
      error: `Feature directory not found: ${featurePath}`,
    };
  }
  
  // Check for test files
  const testPatterns = [
    `server/features/${feature}/**/*.test.ts`,
    `server/features/${feature}/**/*.spec.ts`,
    `server/features/${feature}/__tests__/**/*.ts`,
  ];
  
  let hasTests = false;
  for (const pattern of testPatterns) {
    const { code } = await runCommand('ls', [pattern]);
    if (code === 0) {
      hasTests = true;
      break;
    }
  }
  
  if (!hasTests) {
    console.log(`⚠️  No tests found for ${feature}`);
    return {
      feature,
      passed: true, // Not a failure, just no tests yet
      duration: Date.now() - startTime,
      error: 'No tests found',
    };
  }
  
  // Run tests
  const { code, output } = await runCommand('npx', [
    'vitest',
    'run',
    `server/features/${feature}`,
  ]);
  
  const duration = Date.now() - startTime;
  
  if (code === 0) {
    console.log(`✅ ${feature} tests passed (${duration}ms)`);
    return { feature, passed: true, duration };
  } else {
    console.log(`❌ ${feature} tests failed (${duration}ms)`);
    return {
      feature,
      passed: false,
      duration,
      error: 'Tests failed',
    };
  }
}

async function checkIntegration(feature: string): Promise<{
  hasSharedTypes: boolean;
  hasValidation: boolean;
  hasClientApi: boolean;
}> {
  const checks = {
    hasSharedTypes: fs.existsSync(`shared/types/features/${feature}.ts`),
    hasValidation: fs.existsSync(`shared/validation/features/${feature}.ts`),
    hasClientApi: fs.existsSync(`client/src/features/${feature}/api`),
  };
  
  return checks;
}

async function main() {
  console.log('🧪 Testing Core 8 Features\n');
  console.log('Features to test:');
  CORE_FEATURES.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');
  
  // Test each feature
  for (const feature of CORE_FEATURES) {
    const result = await testFeature(feature);
    results.push(result);
  }
  
  // Check integration
  console.log(`\n${'='.repeat(80)}`);
  console.log('Checking Integration Status');
  console.log('='.repeat(80));
  
  for (const feature of CORE_FEATURES) {
    const integration = await checkIntegration(feature);
    console.log(`\n${feature.toUpperCase()}:`);
    console.log(`  Shared Types: ${integration.hasSharedTypes ? '✅' : '❌'}`);
    console.log(`  Validation: ${integration.hasValidation ? '✅' : '❌'}`);
    console.log(`  Client API: ${integration.hasClientApi ? '✅' : '❌'}`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const noTests = results.filter(r => r.error === 'No tests found').length;
  
  console.log(`\nTest Results:`);
  console.log(`  ✅ Passed: ${passed}/${CORE_FEATURES.length}`);
  console.log(`  ❌ Failed: ${failed}/${CORE_FEATURES.length}`);
  console.log(`  ⚠️  No Tests: ${noTests}/${CORE_FEATURES.length}`);
  
  console.log(`\nIntegration Status:`);
  let totalIntegration = 0;
  let completeIntegration = 0;
  
  for (const feature of CORE_FEATURES) {
    const integration = await checkIntegration(feature);
    const score = [
      integration.hasSharedTypes,
      integration.hasValidation,
      integration.hasClientApi,
    ].filter(Boolean).length;
    
    totalIntegration += 3;
    completeIntegration += score;
  }
  
  const integrationPercent = Math.round((completeIntegration / totalIntegration) * 100);
  console.log(`  Integration: ${completeIntegration}/${totalIntegration} (${integrationPercent}%)`);
  
  // Exit code
  if (failed > 0) {
    console.log(`\n❌ ${failed} feature(s) failed tests`);
    process.exit(1);
  } else if (noTests === CORE_FEATURES.length) {
    console.log(`\n⚠️  No tests found for any features`);
    process.exit(1);
  } else {
    console.log(`\n✅ All features with tests passed!`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
