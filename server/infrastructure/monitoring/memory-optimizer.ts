import { systemHealthService } from './system-health.js';
import { cacheWarmingService } from '../cache/cache-warming.js';
import { logger } from '@shared/core/src/observability/logging';

export interface MemoryOptimizationResult {
  beforeMemoryUsage: number;
  afterMemoryUsage: number;
  memoryFreed: number;
  optimizationsApplied: string[];
  timestamp: Date;
}

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private isOptimizing = false;
  private lastOptimization: Date | null = null;

  public static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * Perform aggressive memory optimization when usage is high
   */
  async optimizeMemory(): Promise<MemoryOptimizationResult> {
    if (this.isOptimizing) {
      throw new Error('Memory optimization already in progress');
    }

    this.isOptimizing = true;
    const startTime = Date.now();
    const beforeMemory = this.getMemoryUsage();
    const optimizationsApplied: string[] = [];

    try {
      logger.info('[Memory Optimizer] Starting memory optimization...', { component: 'Chanuka' });

      // 1. Force garbage collection if available
      if (global.gc) {
        global.gc();
        optimizationsApplied.push('Forced garbage collection');
      }

      // 2. Clear system health metrics
      systemHealthService.clearOldMetrics();
      optimizationsApplied.push('Cleared system health metrics');

      // 3. Clean cache warming service memory
      cacheWarmingService['cleanupMemory']();
      optimizationsApplied.push('Cleaned cache warming memory');

      // 4. Clear Node.js internal caches
      if (require.cache) {
        const cacheKeys = Object.keys(require.cache);
        const oldCacheSize = cacheKeys.length;
        
        // Clear non-essential cached modules (be careful here)
        cacheKeys.forEach(key => {
          if (key.includes('node_modules') && !key.includes('core')) {
            delete require.cache[key];
          }
        });
        
        const newCacheSize = Object.keys(require.cache).length;
        if (oldCacheSize > newCacheSize) {
          optimizationsApplied.push(`Cleared ${oldCacheSize - newCacheSize} cached modules`);
        }
      }

      // 5. Force another garbage collection
      if (global.gc) {
        global.gc();
        optimizationsApplied.push('Final garbage collection');
      }

      const afterMemory = this.getMemoryUsage();
      const memoryFreed = beforeMemory - afterMemory;
      const duration = Date.now() - startTime;

      this.lastOptimization = new Date();

      const result: MemoryOptimizationResult = {
        beforeMemoryUsage: beforeMemory,
        afterMemoryUsage: afterMemory,
        memoryFreed,
        optimizationsApplied,
        timestamp: new Date()
      };

      logger.info(`[Memory Optimizer] Optimization completed in ${duration}ms`, {
        component: 'Chanuka',
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)}MB`,
        optimizations: optimizationsApplied.length
      });

      return result;

    } catch (error) {
      logger.error('[Memory Optimizer] Error during memory optimization:', { component: 'Chanuka' }, error);
      throw error;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Check if memory optimization is needed based on current usage
   */
  shouldOptimize(): boolean {
    const memoryUsage = this.getMemoryUsagePercentage();
    const timeSinceLastOptimization = this.lastOptimization 
      ? Date.now() - this.lastOptimization.getTime()
      : Infinity;

    // Optimize if memory usage > 80% and it's been at least 5 minutes since last optimization
    return memoryUsage > 80 && timeSinceLastOptimization > 300000; // 5 minutes
  }

  /**
   * Get current memory usage in bytes
   */
  private getMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed;
  }

  /**
   * Get current memory usage as percentage
   */
  private getMemoryUsagePercentage(): number {
    const memoryUsage = process.memoryUsage();
    return (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  }

  /**
   * Get optimization status
   */
  getStatus() {
    return {
      isOptimizing: this.isOptimizing,
      lastOptimization: this.lastOptimization,
      currentMemoryUsage: this.getMemoryUsagePercentage(),
      shouldOptimize: this.shouldOptimize()
    };
  }
}

export const memoryOptimizer = MemoryOptimizer.getInstance();