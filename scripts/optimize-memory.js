#!/usr/bin/env node

/**
 * Emergency memory optimization script
 * Run this when experiencing high memory usage
 */

import { memoryOptimizer } from '../server/infrastructure/monitoring/memory-optimizer.js';
import { systemHealthService } from '../server/infrastructure/monitoring/system-health.js';

async function optimizeMemory() {
  console.log('🔧 Starting emergency memory optimization...');
  
  try {
    // Get current memory status
    const beforeStats = await systemHealthService.getSystemMetrics();
    console.log(`📊 Current memory usage: ${beforeStats.memory.percentage.toFixed(2)}%`);
    
    // Check if optimization is needed
    if (memoryOptimizer.shouldOptimize()) {
      console.log('⚠️  High memory usage detected, running optimization...');
      
      const result = await memoryOptimizer.optimizeMemory();
      
      console.log('✅ Memory optimization completed!');
      console.log(`📉 Memory freed: ${(result.memoryFreed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🔧 Optimizations applied: ${result.optimizationsApplied.length}`);
      result.optimizationsApplied.forEach(opt => console.log(`   - ${opt}`));
      
      // Get updated stats
      const afterStats = await systemHealthService.getSystemMetrics();
      console.log(`📊 New memory usage: ${afterStats.memory.percentage.toFixed(2)}%`);
      
    } else {
      console.log('✅ Memory usage is within acceptable limits');
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