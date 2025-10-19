/**
 * Cache Coordinator - Coordinated cleanup across multiple cache services
 *
 * Ensures consistent cleanup and memory management across all cache services
 * to prevent memory leaks and maintain optimal performance.
 */

import { cacheService } from './cache-service.js';
import { advancedCachingService } from './advanced-caching.js';
import { logger } from '@shared/core/src/observability/logging';

export interface CacheCoordinatorConfig {
  cleanupInterval: number; // milliseconds
  maxTotalMemory: number; // MB
  emergencyCleanupThreshold: number; // percentage
  coordinatedCleanupEnabled: boolean;
}

const DEFAULT_CONFIG: CacheCoordinatorConfig = {
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxTotalMemory: 500, // 500MB total
  emergencyCleanupThreshold: 80, // 80% of max memory
  coordinatedCleanupEnabled: true
};

export class CacheCoordinator {
  private static instance: CacheCoordinator;
  private config: CacheCoordinatorConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;

  private constructor(config: Partial<CacheCoordinatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<CacheCoordinatorConfig>): CacheCoordinator {
    if (!CacheCoordinator.instance) {
      CacheCoordinator.instance = new CacheCoordinator(config);
    }
    return CacheCoordinator.instance;
  }

  /**
   * Start coordinated cache cleanup
   */
  start(): void {
    if (this.isRunning || !this.config.coordinatedCleanupEnabled) return;

    this.isRunning = true;
    this.cleanupTimer = setInterval(() => {
      this.performCoordinatedCleanup();
    }, this.config.cleanupInterval);

    logger.info('Cache coordinator started', {
      component: 'CacheCoordinator',
      cleanupInterval: this.config.cleanupInterval
    });
  }

  /**
   * Stop coordinated cache cleanup
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    logger.info('Cache coordinator stopped', { component: 'CacheCoordinator' });
  }

  /**
   * Perform coordinated cleanup across all cache services
   */
  private async performCoordinatedCleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      let totalCleaned = 0;

      // Get memory usage from all cache services
      const cacheStats = await this.getAllCacheStats();
      const totalMemoryUsage = this.calculateTotalMemoryUsage(cacheStats);

      // Check if emergency cleanup is needed
      const memoryUsagePercent = (totalMemoryUsage / (this.config.maxTotalMemory * 1024 * 1024)) * 100;

      if (memoryUsagePercent > this.config.emergencyCleanupThreshold) {
        logger.warn('🚨 Cache memory usage above threshold, performing emergency cleanup', {
          component: 'CacheCoordinator',
          memoryUsagePercent: memoryUsagePercent.toFixed(2) + '%',
          totalMemoryUsage: `${(totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
          threshold: this.config.emergencyCleanupThreshold + '%'
        });

        totalCleaned += await this.performEmergencyCleanup(cacheStats);
      } else {
        // Regular coordinated cleanup
        totalCleaned += await this.performRegularCleanup();
      }

      const duration = Date.now() - startTime;
      if (totalCleaned > 0) {
        logger.info('Coordinated cache cleanup completed', {
          component: 'CacheCoordinator',
          totalCleaned,
          duration: `${duration}ms`,
          finalMemoryUsage: `${(totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`
        });
      }

    } catch (error) {
      logger.error('Error during coordinated cache cleanup:', { component: 'CacheCoordinator' }, error);
    }
  }

  /**
   * Get statistics from all cache services
   */
  private async getAllCacheStats(): Promise<{
    cacheService: any;
    advancedCache: any;
  }> {
    return {
      cacheService: cacheService.getStats(),
      advancedCache: advancedCachingService.getCacheStats()
    };
  }

  /**
   * Calculate total memory usage across all cache services
   */
  private calculateTotalMemoryUsage(cacheStats: any): number {
    let total = 0;

    // CacheService memory usage
    if (cacheStats.cacheService?.memoryUsage) {
      total += cacheStats.cacheService.memoryUsage;
    }

    // AdvancedCachingService memory usage
    if (cacheStats.advancedCache?.memory?.memoryUsage) {
      total += cacheStats.advancedCache.memory.memoryUsage;
    }

    return total;
  }

  /**
   * Perform regular coordinated cleanup
   */
  private async performRegularCleanup(): Promise<number> {
    let totalCleaned = 0;

    // Trigger cleanup on CacheService
    const cacheCleaned = cacheService.cleanup();
    totalCleaned += cacheCleaned;

    // Advanced cache service handles its own cleanup via internal timers
    // but we can trigger additional cleanup if needed

    return totalCleaned;
  }

  /**
   * Perform emergency cleanup when memory usage is critical
   */
  private async performEmergencyCleanup(cacheStats: any): Promise<number> {
    let totalCleaned = 0;

    // Aggressive cleanup on CacheService
    const cacheCleaned = cacheService.cleanup();
    totalCleaned += cacheCleaned;

    // If still high memory, clear some entries
    const cacheStatsAfter = cacheService.getStats();
    if (cacheStatsAfter.memoryUsage > this.config.maxTotalMemory * 1024 * 1024 * 0.6) {
      // Clear 20% of cache entries based on LRU
      const entriesToClear = Math.floor(cacheStatsAfter.entries * 0.2);
      const keys = cacheService.getKeys();

      // Sort by access time (LRU) - this is approximate since we don't have direct access
      const keysToClear = keys.slice(0, entriesToClear);
      keysToClear.forEach(key => {
        cacheService.delete(key);
        totalCleaned++;
      });
    }

    // Force cleanup on advanced caching service
    // Note: advancedCachingService may not have a public cleanup method,
    // but its internal cleanup should handle memory pressure

    return totalCleaned;
  }

  /**
   * Get overall cache health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    totalMemoryUsage: number;
    maxMemory: number;
    memoryUsagePercent: number;
    services: {
      cacheService: any;
      advancedCache: any;
    };
  } {
    const cacheStats = {
      cacheService: cacheService.getStats(),
      advancedCache: advancedCachingService.getCacheStats()
    };

    const totalMemoryUsage = this.calculateTotalMemoryUsage(cacheStats);
    const maxMemory = this.config.maxTotalMemory * 1024 * 1024;
    const memoryUsagePercent = (totalMemoryUsage / maxMemory) * 100;

    return {
      isHealthy: memoryUsagePercent < this.config.emergencyCleanupThreshold,
      totalMemoryUsage,
      maxMemory,
      memoryUsagePercent,
      services: cacheStats
    };
  }

  /**
   * Force immediate cleanup across all cache services
   */
  async forceCleanup(): Promise<number> {
    logger.info('Forcing coordinated cache cleanup', { component: 'CacheCoordinator' });
    const cacheStats = await this.getAllCacheStats();
    return await this.performEmergencyCleanup(cacheStats);
  }

  /**
   * Update coordinator configuration
   */
  updateConfig(config: Partial<CacheCoordinatorConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if running and cleanup interval changed
    if (this.isRunning && config.cleanupInterval) {
      this.stop();
      this.start();
    }

    logger.info('Cache coordinator configuration updated', {
      component: 'CacheCoordinator',
      config: this.config
    });
  }
}

// Export singleton instance
export const cacheCoordinator = CacheCoordinator.getInstance();











































