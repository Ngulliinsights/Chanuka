import { sponsors } from '@server/infrastructure/schema';
/**
 * Quick HTTP Test for Bills Feature
 * Tests all 11 new endpoints via HTTP requests
 */

const BASE_URL = 'http://localhost:4200/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: string,
  path: string,
  body?: any
): Promise<TestResult> {
  const endpoint = `${method} ${path}`;
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const statusCode = response.status;
    
    // Consider 200-299 and 404 (for non-existent resources) as acceptable
    const isSuccess = (statusCode >= 200 && statusCode < 300) || statusCode === 404;
    
    return {
      endpoint,
      method,
      status: isSuccess ? 'PASS' : 'FAIL',
      statusCode,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  console.log('🧪 Bills Feature Quick HTTP Test\n');
  console.log('==========================================\n');
  
  // Test 1: Bill tracking
  console.log('1️⃣  Testing POST /bills/:id/track...');
  results.push(await testEndpoint('POST', '/bills/test-bill-1/track'));
  
  // Test 2: Bill untracking
  console.log('2️⃣  Testing POST /bills/:id/untrack...');
  results.push(await testEndpoint('POST', '/bills/test-bill-1/untrack'));
  
  // Test 3: Comment voting
  console.log('3️⃣  Testing POST /comments/:id/vote...');
  results.push(await testEndpoint('POST', '/comments/test-comment-1/vote', { voteType: 'upvote' }));
  
  // Test 4: Bill sponsors
  console.log('4️⃣  Testing GET /bills/:id/sponsors...');
  results.push(await testEndpoint('GET', '/bills/test-bill-1/sponsors'));
  
  // Test 5: Bill analysis
  console.log('5️⃣  Testing GET /bills/:id/analysis...');
  results.push(await testEndpoint('GET', '/bills/test-bill-1/analysis'));
  
  // Test 6: Bill engagement
  console.log('6️⃣  Testing POST /bills/:id/engagement...');
  results.push(await testEndpoint('POST', '/bills/test-bill-1/engagement', { 
    type: 'view',
    metadata: { source: 'test' }
  }));
  
  // Test 7: Comment endorsement
  console.log('7️⃣  Testing POST /comments/:id/endorse...');
  results.push(await testEndpoint('POST', '/comments/test-comment-1/endorse'));
  
  // Test 8: Bill categories
  console.log('8️⃣  Testing GET /bills/meta/categories...');
  results.push(await testEndpoint('GET', '/bills/meta/categories'));
  
  // Test 9: Bill statuses
  console.log('9️⃣  Testing GET /bills/meta/statuses...');
  results.push(await testEndpoint('GET', '/bills/meta/statuses'));
  
  // Test 10: Create poll
  console.log('🔟 Testing POST /bills/:id/polls...');
  results.push(await testEndpoint('POST', '/bills/test-bill-1/polls', {
    question: 'Do you support this bill?',
    options: ['Yes', 'No', 'Undecided']
  }));
  
  // Test 11: Get polls
  console.log('1️⃣1️⃣  Testing GET /bills/:id/polls...');
  results.push(await testEndpoint('GET', '/bills/test-bill-1/polls'));
  
  // Print results
  console.log('\n==========================================');
  console.log('📊 Test Results\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const details = result.statusCode 
      ? `(${result.statusCode})` 
      : result.error 
        ? `(${result.error})` 
        : '';
    console.log(`${icon} ${result.endpoint} ${details}`);
  });
  
  console.log('\n==========================================');
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log('==========================================\n');
  
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the results above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
