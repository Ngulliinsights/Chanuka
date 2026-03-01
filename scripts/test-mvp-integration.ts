#!/usr/bin/env tsx
/**
 * MVP Integration Test Script
 * 
 * Tests core API endpoints to verify server-client integration
 */

import { logger } from '../server/infrastructure/observability/index.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4200/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail';
  statusCode?: number;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  expectedStatus: number = 200
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const status = response.status === expectedStatus ? 'pass' : 'fail';

    return {
      endpoint,
      method,
      status,
      statusCode: response.status,
      duration,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing MVP Integration\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Test health endpoints
  console.log('📊 Testing Health Endpoints...');
  results.push(await testEndpoint('/frontend-health'));
  results.push(await testEndpoint('/service-status'));
  results.push(await testEndpoint('/security/status'));

  // Test core feature endpoints
  console.log('📋 Testing Bills API...');
  results.push(await testEndpoint('/bills'));
  results.push(await testEndpoint('/bills/meta/categories'));
  results.push(await testEndpoint('/bills/meta/statuses'));

  console.log('👥 Testing Community API...');
  results.push(await testEndpoint('/community/health', 'GET', 200));

  console.log('🔔 Testing Notifications API...');
  results.push(await testEndpoint('/notifications/health', 'GET', 200));

  console.log('🔍 Testing Search API...');
  results.push(await testEndpoint('/search/health', 'GET', 200));

  // Test intelligence features
  console.log('🧠 Testing Intelligence APIs...');
  results.push(await testEndpoint('/pretext-detection/health', 'GET', 200));
  results.push(await testEndpoint('/constitutional-analysis/health', 'GET', 200));
  results.push(await testEndpoint('/argument-intelligence/health', 'GET', 200));

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Results\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    const statusCode = result.statusCode ? `[${result.statusCode}]` : '';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    const error = result.error ? `- ${result.error}` : '';

    console.log(`${icon} ${result.method} ${result.endpoint} ${statusCode} ${duration} ${error}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check server logs for details.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! MVP integration is working.');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
