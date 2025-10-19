#!/usr/bin/env node

/**
 * Immediate memory cleanup script
 * Forces garbage collection and provides memory usage info
 */

console.log('🔧 Starting immediate memory cleanup...');

// Get initial memory usage
const initialMemory = process.memoryUsage();
console.log(`📊 Initial memory usage:`);
console.log(`   Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
console.log(`   Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
console.log(`   RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`);
console.log(`   External: ${(initialMemory.external / 1024 / 1024).toFixed(2)}MB`);

// Force garbage collection if available
if (global.gc) {
  console.log('🗑️  Running garbage collection...');
  global.gc();
  console.log('✅ Garbage collection completed');
} else {
  console.log('⚠️  Garbage collection not available (run with --expose-gc flag)');
}

// Clear require cache for non-essential modules
if (require.cache) {
  const cacheKeys = Object.keys(require.cache);
  const initialCacheSize = cacheKeys.length;
  
  console.log(`📦 Clearing module cache (${initialCacheSize} modules)...`);
  
  let cleared = 0;
  cacheKeys.forEach(key => {
    // Only clear non-core modules to avoid breaking the application
    if (key.includes('node_modules') && !key.includes('core') && !key.includes('tsx')) {
      delete require.cache[key];
      cleared++;
    }
  });
  
  console.log(`✅ Cleared ${cleared} cached modules`);
}

// Force another garbage collection
if (global.gc) {
  console.log('🗑️  Running final garbage collection...');
  global.gc();
}

// Get final memory usage
const finalMemory = process.memoryUsage();
const memoryFreed = initialMemory.heapUsed - finalMemory.heapUsed;

console.log(`📊 Final memory usage:`);
console.log(`   Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
console.log(`   Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
console.log(`   RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`);
console.log(`   External: ${(finalMemory.external / 1024 / 1024).toFixed(2)}MB`);

if (memoryFreed > 0) {
  console.log(`📉 Memory freed: ${(memoryFreed / 1024 / 1024).toFixed(2)}MB`);
} else {
  console.log(`📈 Memory usage increased by: ${Math.abs(memoryFreed / 1024 / 1024).toFixed(2)}MB`);
}

console.log('🎉 Memory cleanup completed');

// Provide recommendations
const heapUsagePercent = (finalMemory.heapUsed / finalMemory.heapTotal) * 100;
console.log(`\n💡 Recommendations:`);

if (heapUsagePercent > 80) {
  console.log('   ⚠️  Memory usage still high - consider restarting the application');
  console.log('   🔄 Run: npm run dev (to restart development server)');
} else if (heapUsagePercent > 60) {
  console.log('   👀 Monitor memory usage closely');
  console.log('   🔍 Check for memory leaks in application code');
} else {
  console.log('   ✅ Memory usage is now within acceptable limits');
}

console.log('   📊 To monitor ongoing memory usage, check system health endpoints');
console.log('   🛠️  For persistent issues, review cache warming and monitoring services');