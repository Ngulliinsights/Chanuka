#!/usr/bin/env node

/**
 * Emergency memory optimization script
 * Run this when experiencing high memory usage
 * Usage: node --expose-gc scripts/optimize-memory.js
 */

// Dynamic import for ESM modules
async function optimizeMemory() {
  console.log('🔧 Starting memory optimization...');
  
  try {
    // Get current memory status using built-in Node.js API
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    console.log(`📊 Current memory usage: ${heapPercent.toFixed(2)}%`);
    console.log(`   Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    
    // Attempt garbage collection if available
    if (global.gc) {
      console.log('⚠️  Running garbage collection...');
      global.gc();
      
      const afterGC = process.memoryUsage();
      const freedMemory = (memUsage.heapUsed - afterGC.heapUsed) / 1024 / 1024;
      const afterPercent = (afterGC.heapUsed / afterGC.heapTotal) * 100;
      
      console.log('✅ Garbage collection completed!');
      console.log(`📉 Memory freed: ${freedMemory.toFixed(2)}MB`);
      console.log(`📊 New memory usage: ${afterPercent.toFixed(2)}%`);
      console.log(`   Heap: ${(afterGC.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(afterGC.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    } else {
      console.log('⚠️  Garbage collection not available');
      console.log('💡 To enable GC, run with: node --expose-gc scripts/optimize-memory.js');
    }
    
  } catch (error) {
    console.error('❌ Error during memory optimization:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeMemory().then(() => {
    console.log('🎉 Memory optimization script completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { optimizeMemory };