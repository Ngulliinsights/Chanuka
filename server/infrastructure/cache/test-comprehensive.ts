/**
 * Comprehensive test for the caching system
 */

import { SimpleCacheFactory } from './factory';

async function testCachingSystem() {
  console.log('🧪 Testing caching system...');
  
  const factory = SimpleCacheFactory.getInstance();
  
  // Test 1: Create cache
  console.log('📝 Test 1: Creating cache...');
  const cache = factory.createCache('test-cache', {
    provider: 'memory',
    defaultTtlSec: 300,
    maxMemoryMB: 10,
    keyPrefix: 'test:'
  });
  
  // Test 2: Basic set/get
  console.log('📝 Test 2: Basic set/get operations...');
  await cache.set('key1', 'value1');
  const result1 = await cache.get('key1');
  console.log(`✅ Set/Get: ${result1 === 'value1' ? 'PASS' : 'FAIL'}`);
  
  // Test 3: TTL
  console.log('📝 Test 3: TTL operations...');
  await cache.set('key2', 'value2', 1); // 1 second TTL
  const result2 = await cache.get('key2');
  console.log(`✅ TTL Set: ${result2 === 'value2' ? 'PASS' : 'FAIL'}`);
  
  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 1100));
  const result3 = await cache.get('key2');
  console.log(`✅ TTL Expiry: ${result3 === null ? 'PASS' : 'FAIL'}`);
  
  // Test 4: Delete
  console.log('📝 Test 4: Delete operations...');
  await cache.set('key3', 'value3');
  const deleted = await cache.del('key3');
  const result4 = await cache.get('key3');
  console.log(`✅ Delete: ${deleted && result4 === null ? 'PASS' : 'FAIL'}`);
  
  // Test 5: Exists
  console.log('📝 Test 5: Exists operations...');
  await cache.set('key4', 'value4');
  const exists1 = await cache.exists('key4');
  const exists2 = await cache.exists('nonexistent');
  console.log(`✅ Exists: ${exists1 && !exists2 ? 'PASS' : 'FAIL'}`);
  
  // Test 6: Multiple operations
  console.log('📝 Test 6: Multiple operations...');
  const keys = ['multi1', 'multi2', 'multi3'];
  const values = ['value1', 'value2', 'value3'];
  
  // Set multiple
  for (let i = 0; i < keys.length; i++) {
    await cache.set(keys[i]!, values[i]);
  }
  
  // Get multiple
  const results = await cache.mget(keys);
  const multiGetPass = results.every((result, i) => result === values[i]);
  console.log(`✅ Multi Get: ${multiGetPass ? 'PASS' : 'FAIL'}`);
  
  // Delete multiple
  const deletedCount = await cache.mdel(keys);
  console.log(`✅ Multi Delete: ${deletedCount === keys.length ? 'PASS' : 'FAIL'}`);
  
  // Test 7: Metrics
  console.log('📝 Test 7: Metrics...');
  const metrics = cache.getMetrics?.() ?? { operations: 0, hits: 0, misses: 0, hitRate: 0 };
  console.log(`✅ Metrics: ${metrics.operations > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`   - Operations: ${metrics.operations}`);
  console.log(`   - Hits: ${metrics.hits}`);
  console.log(`   - Misses: ${metrics.misses}`);
  console.log(`   - Hit Rate: ${metrics.hitRate.toFixed(2)}%`);
  
  // Test 8: Health check
  console.log('📝 Test 8: Health check...');
  if ('healthCheck' in cache && typeof cache.healthCheck === 'function') {
    const health = await cache.healthCheck();
    console.log(`✅ Health: ${health.status === 'healthy' ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`✅ Health: SKIP (not implemented)`);
  }
  
  // Test 9: Clear cache
  console.log('📝 Test 9: Clear cache...');
  await cache.set('clear-test', 'value');
  await cache.clear?.();
  const clearResult = await cache.get('clear-test');
  console.log(`✅ Clear: ${clearResult === null ? 'PASS' : 'FAIL'}`);
  
  // Test 10: Factory operations
  console.log('📝 Test 10: Factory operations...');
  factory.createCache('test-cache-2', { provider: 'memory' });
  const cacheNames = factory.getCacheNames();
  const factoryPass = cacheNames.includes('test-cache') && cacheNames.includes('test-cache-2');
  console.log(`✅ Factory: ${factoryPass ? 'PASS' : 'FAIL'}`);
  
  // Cleanup
  await factory.shutdown();
  
  console.log('🎉 Caching system test completed!');
  return true;
}

export { testCachingSystem };


