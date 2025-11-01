import {
  debounce,
  throttle,
  retry,
  Mutex,
  Semaphore,
  globalMutex,
  apiSemaphore
} from './shared/core/src/utils/race-condition-prevention';

// Test debounce
console.log('=== Testing Debounce ===');
const debouncedLog = debounce((message: string) => {
  console.log(`Debounced: ${message} at ${new Date().toISOString()}`);
}, 1000);

// These calls will be debounced - only the last one should execute
debouncedLog('Call 1');
debouncedLog('Call 2');
debouncedLog('Call 3');

// Test throttle
console.log('\n=== Testing Throttle ===');
const throttledLog = throttle((message: string) => {
  console.log(`Throttled: ${message} at ${new Date().toISOString()}`);
}, 1000);

// These calls will be throttled - only first and potentially last will execute
throttledLog('Throttle 1');
throttledLog('Throttle 2');
throttledLog('Throttle 3');

// Test retry mechanism
console.log('\n=== Testing Retry ===');
async function testRetry() {
  let attempts = 0;
  
  try {
    const result = await retry(async () => {
      attempts++;
      console.log(`Attempt ${attempts}`);
      
      if (attempts < 3) {
        throw new Error(`Simulated failure on attempt ${attempts}`);
      }
      
      return `Success on attempt ${attempts}`;
    }, {
      maxAttempts: 5,
      baseDelay: 500,
      onRetry: (attempt, error, delay) => {
        console.log(`Retrying attempt ${attempt} after ${delay}ms due to: ${error.message}`);
      }
    });
    
    console.log(`Result: ${result}`);
  } catch (error) {
    console.error('Final error:', error);
  }
}

// Test Mutex
console.log('\n=== Testing Mutex ===');
async function testMutex() {
  const mutex = new Mutex();
  
  const task = async (id: number) => {
    console.log(`Task ${id} waiting for lock...`);
    await mutex.withLock(async () => {
      console.log(`Task ${id} acquired lock`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Task ${id} releasing lock`);
    });
  };
  
  // Start multiple tasks concurrently
  await Promise.all([
    task(1),
    task(2),
    task(3)
  ]);
}

// Test Semaphore
console.log('\n=== Testing Semaphore ===');
async function testSemaphore() {
  const semaphore = new Semaphore(2); // Allow 2 concurrent operations
  
  const task = async (id: number) => {
    console.log(`Task ${id} waiting for permit...`);
    await semaphore.withPermit(async () => {
      console.log(`Task ${id} acquired permit (${semaphore.getAvailablePermits()} remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`Task ${id} releasing permit`);
    });
  };
  
  // Start multiple tasks - only 2 should run concurrently
  await Promise.all([
    task(1),
    task(2),
    task(3),
    task(4)
  ]);
}

// Run all tests
async function runTests() {
  console.log('Starting race condition prevention tests...\n');
  
  // Wait a bit for debounce/throttle to show their effects
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testRetry();
  await testMutex();
  await testSemaphore();
  
  console.log('\nAll tests completed!');
}

runTests().catch(console.error);