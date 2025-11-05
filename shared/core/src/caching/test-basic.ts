/**
 * Basic test to verify caching system compilation
 */

import { MemoryAdapter } from './adapters/memory-adapter';

async function testBasicCaching() {
  const cache = new MemoryAdapter();
  
  // Test basic operations
  await cache.set('test', 'value');
  const result = await cache.get('test');
  console.log('Cache test result:', result);
  
  return result === 'value';
}

export { testBasicCaching };