/**
 * Concurrency Migration Router
 * 
 * Routes between legacy and new concurrency implementations based on feature flags
 */

import { ConcurrencyAdapter, Mutex as NewMutex, Semaphore as NewSemaphore } from '@shared/core/src/utils/concurrency-adapter.ts';
import {
  Mutex as LegacyMutex,
  Semaphore as LegacySemaphore,
  globalMutex as legacyGlobalMutex,
  apiMutex as legacyApiMutex,
  cacheMutex as legacyCacheMutex,
  apiSemaphore as legacyApiSemaphore,
  fileSemaphore as legacyFileSemaphore
} from './race-condition-prevention.js';
import type { FeatureFlagsService } from '@shared/core/src/caching/feature-flags.ts';

export interface MigrationMetrics {
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: Error;
  implementation: 'legacy' | 'new';
  operation: string;
}

export class ConcurrencyMigrationRouter {
  private featureFlagsService?: FeatureFlagsService | undefined;
  private metrics: MigrationMetrics[] = [];
  
  // New implementations
  private newGlobalMutex = new NewMutex();
  private newApiMutex = new NewMutex();
  private newCacheMutex = new NewMutex();
  private newApiSemaphore = new NewSemaphore(5);
  private newFileSemaphore = new NewSemaphore(3);
  private concurrencyAdapter = new ConcurrencyAdapter();

  constructor(featureFlagsService?: FeatureFlagsService) {
    this.featureFlagsService = featureFlagsService;
  }

  /**
   * Get mutex instance based on feature flag
   */
  async getMutex(type: 'global' | 'api' | 'cache' = 'global', user_id?: string): Promise<NewMutex | LegacyMutex> {
    const shouldUseMigration = await this.shouldUseMigration('utilities-concurrency-adapter', user_id);
    
    if (shouldUseMigration) {
      switch (type) {
        case 'api': return this.newApiMutex;
        case 'cache': return this.newCacheMutex;
        default: return this.newGlobalMutex;
      }
    } else {
      switch (type) {
        case 'api': return legacyApiMutex;
        case 'cache': return legacyCacheMutex;
        default: return legacyGlobalMutex;
      }
    }
  }

  /**
   * Get semaphore instance based on feature flag
   */
  async getSemaphore(type: 'api' | 'file' = 'api', user_id?: string): Promise<NewSemaphore | LegacySemaphore> {
    const shouldUseMigration = await this.shouldUseMigration('utilities-concurrency-adapter', user_id);
    
    if (shouldUseMigration) {
      switch (type) {
        case 'file': return this.newFileSemaphore;
        default: return this.newApiSemaphore;
      }
    } else {
      switch (type) {
        case 'file': return legacyFileSemaphore;
        default: return legacyApiSemaphore;
      }
    }
  }

  /**
   * Execute function with mutex, routing based on feature flag
   */
  async withMutexLock<T>(
    fn: () => Promise<T>, 
    type: 'global' | 'api' | 'cache' = 'global',
    user_id?: string
  ): Promise<T> {
    const startTime = Date.now();
    const shouldUseMigration = await this.shouldUseMigration('utilities-concurrency-adapter', user_id);
    const implementation = shouldUseMigration ? 'new' : 'legacy';
    
    try {
      const mutex = await this.getMutex(type, user_id);
      const result = await mutex.withLock(fn);
      
      this.recordMetrics({
        startTime,
        endTime: Date.now(),
        success: true,
        implementation,
        operation: `mutex-${type}`
      });
      
      return result;
    } catch (error) {
      this.recordMetrics({
        startTime,
        endTime: Date.now(),
        success: false,
        error: error as Error,
        implementation,
        operation: `mutex-${type}`
      });
      throw error;
    }
  }

  /**
   * Execute function with semaphore, routing based on feature flag
   */
  async withSemaphorePermit<T>(
    fn: () => Promise<T>, 
    type: 'api' | 'file' = 'api',
    user_id?: string
  ): Promise<T> {
    const startTime = Date.now();
    const shouldUseMigration = await this.shouldUseMigration('utilities-concurrency-adapter', user_id);
    const implementation = shouldUseMigration ? 'new' : 'legacy';
    
    try {
      const semaphore = await this.getSemaphore(type, user_id);
      const result = await semaphore.withPermit(fn);
      
      this.recordMetrics({
        startTime,
        endTime: Date.now(),
        success: true,
        implementation,
        operation: `semaphore-${type}`
      });
      
      return result;
    } catch (error) {
      this.recordMetrics({
        startTime,
        endTime: Date.now(),
        success: false,
        error: error as Error,
        implementation,
        operation: `semaphore-${type}`
      });
      throw error;
    }
  }

  /**
   * Get concurrency adapter with feature flag routing
   */
  async getConcurrencyAdapter(user_id?: string): Promise<ConcurrencyAdapter> {
    const shouldUseMigration = await this.shouldUseMigration('utilities-concurrency-adapter', user_id);
    
    if (shouldUseMigration) {
      return this.concurrencyAdapter;
    } else {
      // Return a wrapper that uses legacy implementations
      return {
        withLock: async <T>(fn: () => Promise<T>) => legacyGlobalMutex.withLock(fn),
        withLimit: async <T>(fn: () => Promise<T>) => legacyApiSemaphore.withPermit(fn),
        getMutex: () => legacyGlobalMutex as any,
        getStats: () => ({
          isLocked: legacyGlobalMutex.isLocked(),
          waitingCount: legacyGlobalMutex.getWaitingCount(),
          pendingCount: legacyApiSemaphore.getWaitingCount(),
          activeCount: 0 // Legacy doesn't track active count
        })
      } as ConcurrencyAdapter;
    }
  }

  /**
   * Check if migration should be used based on feature flags
   */
  private async shouldUseMigration(flagName: string, user_id?: string): Promise<boolean> {
    if (!this.featureFlagsService) {
      return false; // Default to legacy if no feature flags service
    }
    
    try {
      return await this.featureFlagsService.shouldUseMigration(flagName, user_id);
    } catch (error) {
      console.error(`Error checking feature flag ${flagName}:`, error);
      return false; // Default to legacy on error
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: MigrationMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance metrics for analysis
   */
  getMetrics(): MigrationMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const newMetrics = this.metrics.filter(m => m.implementation === 'new' && m.success);
    const legacyMetrics = this.metrics.filter(m => m.implementation === 'legacy' && m.success);
    
    const avgResponseTime = (metrics: MigrationMetrics[]) => {
      if (metrics.length === 0) return 0;
      const total = metrics.reduce((sum, m) => sum + ((m.endTime || m.startTime) - m.startTime), 0);
      return total / metrics.length;
    };
    
    const errorRate = (metrics: MigrationMetrics[]) => {
      if (metrics.length === 0) return 0;
      const errors = metrics.filter(m => !m.success).length;
      return (errors / metrics.length) * 100;
    };
    
    return {
      new: {
        count: newMetrics.length,
        avgResponseTime: avgResponseTime(newMetrics),
        errorRate: errorRate(this.metrics.filter(m => m.implementation === 'new'))
      },
      legacy: {
        count: legacyMetrics.length,
        avgResponseTime: avgResponseTime(legacyMetrics),
        errorRate: errorRate(this.metrics.filter(m => m.implementation === 'legacy'))
      }
    };
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Global router instance
let globalRouter: ConcurrencyMigrationRouter | null = null;

export function getConcurrencyRouter(featureFlagsService?: FeatureFlagsService): ConcurrencyMigrationRouter {
  if (!globalRouter) {
    globalRouter = new ConcurrencyMigrationRouter(featureFlagsService);
  }
  return globalRouter;
}

export function setConcurrencyRouter(router: ConcurrencyMigrationRouter): void {
  globalRouter = router;
}


