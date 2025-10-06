/**
 * Race Condition Test Script
 * 
 * This script tests the race condition fixes by simulating concurrent operations
 */

import { AsyncLock, Semaphore, RateLimiter, CircuitBreaker } from './utils/race-condition-prevention.js';

// Test AsyncLock
async function testAsyncLock() {
  console.log('🔒 Testing AsyncLock...');
  const lock = new AsyncLock();
  let counter = 0;
  const results = [];

  // Simulate 10 concurrent operations that should be serialized
  const promises = Array.from({ length: 10 }, async (_, i) => {
    return lock.withLock('test-key', async () => {
      const currentValue = counter;
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 10));
      counter = currentValue + 1;
      results.push(counter);
      return counter;
    });
  });

  await Promise.all(promises);
  
  console.log(`✅ AsyncLock test completed. Final counter: ${counter}, Results: [${results.join(', ')}]`);
  console.log(`   Expected: 10, Got: ${counter}, Sequential: ${results.every((val, i) => val === i + 1)}`);
}

// Test Semaphore
async function testSemaphore() {
  console.log('🚦 Testing Semaphore...');
  const semaphore = new Semaphore(3); // Allow max 3 concurrent operations
  let activeOperations = 0;
  let maxConcurrent = 0;

  const promises = Array.from({ length: 10 }, async (_, i) => {
    return semaphore.withPermit(async () => {
      activeOperations++;
      maxConcurrent = Math.max(maxConcurrent, activeOperations);
      console.log(`   Operation ${i + 1} started (active: ${activeOperations})`);
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      activeOperations--;
      console.log(`   Operation ${i + 1} completed (active: ${activeOperations})`);
    });
  });

  await Promise.all(promises);
  
  console.log(`✅ Semaphore test completed. Max concurrent operations: ${maxConcurrent} (expected: 3)`);
}

// Test RateLimiter
async function testRateLimiter() {
  console.log('⏱️  Testing RateLimiter...');
  const rateLimiter = new RateLimiter(5, 2); // 5 tokens, refill 2 per second
  
  const startTime = Date.now();
  const results = [];
  
  // Try to consume 10 tokens rapidly
  for (let i = 0; i < 10; i++) {
    const consumed = await rateLimiter.consume();
    results.push({
      attempt: i + 1,
      consumed,
      time: Date.now() - startTime,
      tokens: rateLimiter.getTokenCount()
    });
    
    if (!consumed) {
      await rateLimiter.waitForToken();
      results[results.length - 1].consumed = true;
      results[results.length - 1].time = Date.now() - startTime;
    }
  }
  
  console.log('✅ RateLimiter test completed:');
  results.forEach(r => {
    console.log(`   Attempt ${r.attempt}: ${r.consumed ? 'SUCCESS' : 'FAILED'} at ${r.time}ms (tokens: ${r.tokens})`);
  });
}

// Test CircuitBreaker
async function testCircuitBreaker() {
  console.log('🔌 Testing CircuitBreaker...');
  const circuitBreaker = new CircuitBreaker(3, 1000, 500); // 3 failures, 1s timeout
  
  let callCount = 0;
  const failingFunction = async () => {
    callCount++;
    if (callCount <= 5) {
      throw new Error(`Simulated failure ${callCount}`);
    }
    return `Success on call ${callCount}`;
  };
  
  const results = [];
  
  // Test circuit breaker behavior
  for (let i = 0; i < 8; i++) {
    try {
      const result = await circuitBreaker.execute(failingFunction);
      results.push({ attempt: i + 1, result, state: circuitBreaker.getState() });
    } catch (error) {
      results.push({ attempt: i + 1, error: error.message, state: circuitBreaker.getState() });
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ CircuitBreaker test completed:');
  results.forEach(r => {
    if (r.result) {
      console.log(`   Attempt ${r.attempt}: SUCCESS - ${r.result} (state: ${r.state})`);
    } else {
      console.log(`   Attempt ${r.attempt}: FAILED - ${r.error} (state: ${r.state})`);
    }
  });
}

// Test database initialization race condition prevention
async function testDatabaseInitialization() {
  console.log('🗄️  Testing Database Initialization Race Condition Prevention...');
  
  // Simulate multiple concurrent database initialization attempts
  const { ensureInitialized } = await import('./db.js');
  
  const startTime = Date.now();
  const promises = Array.from({ length: 5 }, async (_, i) => {
    const start = Date.now();
    await ensureInitialized();
    const end = Date.now();
    return { id: i + 1, duration: end - start, timestamp: end - startTime };
  });
  
  const results = await Promise.all(promises);
  
  console.log('✅ Database initialization test completed:');
  results.forEach(r => {
    console.log(`   Init ${r.id}: ${r.duration}ms (at ${r.timestamp}ms)`);
  });
  
  // Check if all initializations completed around the same time (indicating proper synchronization)
  const maxTimestamp = Math.max(...results.map(r => r.timestamp));
  const minTimestamp = Math.min(...results.map(r => r.timestamp));
  const timeDiff = maxTimestamp - minTimestamp;
  
  console.log(`   Time difference between first and last completion: ${timeDiff}ms`);
  console.log(`   ${timeDiff < 100 ? '✅ PASS' : '❌ FAIL'}: Proper synchronization ${timeDiff < 100 ? 'detected' : 'NOT detected'}`);
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Race Condition Tests...\n');
  
  try {
    await testAsyncLock();
    console.log('');
    
    await testSemaphore();
    console.log('');
    
    await testRateLimiter();
    console.log('');
    
    await testCircuitBreaker();
    console.log('');
    
    await testDatabaseInitialization();
    console.log('');
    
    console.log('🎉 All race condition tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };