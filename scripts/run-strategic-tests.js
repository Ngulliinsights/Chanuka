#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎯 Running Strategic Playwright Migration Tests\n');

const testSuites = [
  {
    name: 'Database Performance API Tests',
    command: 'npm run test:performance:db',
    description: 'Tests database performance via API endpoints'
  },
  {
    name: 'External API Integration Tests',
    command: 'playwright test tests/api/external-api-integration.spec.ts',
    description: 'Tests external API management and integration'
  },
  {
    name: 'Database Performance UI Tests',
    command: 'playwright test tests/e2e/database-performance-ui.spec.ts',
    description: 'Tests database performance from user perspective'
  },
  {
    name: 'Slow Query Monitoring Integration',
    command: 'playwright test tests/integration/slow-query-monitoring.spec.ts',
    description: 'Tests complete slow query monitoring pipeline'
  }
];

let totalPassed = 0;
let totalFailed = 0;
const results = [];

console.log('📋 Test Suite Overview:');
testSuites.forEach((suite, index) => {
  console.log(`${index + 1}. ${suite.name}`);
  console.log(`   ${suite.description}`);
});
console.log('');

for (const suite of testSuites) {
  console.log(`🧪 Running: ${suite.name}`);
  console.log(`📝 ${suite.description}`);
  
  try {
    const startTime = Date.now();
    execSync(suite.command, { stdio: 'inherit' });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${suite.name} - PASSED (${Math.round(duration / 1000)}s)\n`);
    totalPassed++;
    results.push({ name: suite.name, status: 'PASSED', duration });
  } catch (error) {
    console.log(`❌ ${suite.name} - FAILED\n`);
    totalFailed++;
    results.push({ name: suite.name, status: 'FAILED', duration: 0 });
  }
}

console.log('📊 Strategic Migration Test Results:');
console.log('=' .repeat(50));

results.forEach(result => {
  const status = result.status === 'PASSED' ? '✅' : '❌';
  const duration = result.duration > 0 ? ` (${Math.round(result.duration / 1000)}s)` : '';
  console.log(`${status} ${result.name}${duration}`);
});

console.log('=' .repeat(50));
console.log(`📈 Summary: ${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed === 0) {
  console.log('🎉 All strategic migration tests passed!');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('1. Review test results in playwright-report/');
  console.log('2. Check performance metrics in test output');
  console.log('3. Consider migrating remaining Jest tests');
  console.log('4. Update CI/CD pipeline to include Playwright tests');
} else {
  console.log('⚠️  Some tests failed. Check the output above for details.');
  process.exit(1);
}