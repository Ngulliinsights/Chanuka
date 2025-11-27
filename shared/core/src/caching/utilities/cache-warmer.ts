/**
 * Cache Warmer Utility
 *
 * Pre-loads critical cache entries to improve application performance
 * Supports various warming strategies and background warming
 */

import { EventEmitter } from 'events';
import { Result, ok, err } from '../../primitives/types/result';

export interface CacheWarmerConfig {
  enabled: boolean;
  strategy: 'eager' | 'lazy' | 'hybrid';
  maxConcurrency: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  backgroundEnabled: boolean;
  backgroundIntervalMs: number;
  priorityThreshold: number;
}

export interface WarmUpEntry {
  key: string;
  factory: () => Promise<any>;
  priority?: number;
  tags?: string[];
  ttlSec?: number;
  dependencies?: string[];
}

export interface WarmUpResult {
  key: string;
  success: boolean;
  duration: number;
  error?: Error;
  size?: number;
}

export interface WarmUpStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  averageDuration: number;
  totalSize: number;
}

export class CacheWarmer extends EventEmitter {
  private config: CacheWarmerConfig;
  private isWarming = false;
  private backgroundTimer?: NodeJS.Timeout;
  private stats = {
    totalWarmUps: 0,
    successfulWarmUps: 0,
    failedWarmUps: 0,
    averageDuration: 0,
    lastWarmUp: 0,
  };

  constructor(config: Partial<CacheWarmerConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      strategy: 'hybrid',
      maxConcurrency: 5,
      timeoutMs: 30000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      backgroundEnabled: false,
      backgroundIntervalMs: 300000, // 5 minutes
      priorityThreshold: 5,
      ...config,
    };
  }

  /**
   * Warm up cache entries
   */
  async warmUp(entries: WarmUpEntry[]): Promise<Result<WarmUpStats, Error>> {
    if (!this.config.enabled) {
      return ok({
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        averageDuration: 0,
        totalSize: 0,
      });
    }

    if (this.isWarming) {
      return err(new Error('Cache warming already in progress'));
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      this.emit('warming:start', { entries: entries.length });

      // Sort entries by priority (highest first)
      const sortedEntries = this.sortByPriority(entries);

      // Filter entries based on strategy
      const filteredEntries = this.filterByStrategy(sortedEntries);

      const results = await this.executeWarmUp(filteredEntries);
      const stats = this.calculateStats(results, Date.now() - startTime);

      this.updateGlobalStats(stats);
      this.emit('warming:complete', stats);

      return ok(stats);
    } catch (error) {
      this.emit('warming:error', error);
      return err(error as Error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Start background warming
   */
  startBackgroundWarming(entries: WarmUpEntry[]): void {
    if (!this.config.backgroundEnabled) {
      return;
    }

    this.stopBackgroundWarming();

    this.backgroundTimer = setInterval(async () => {
      try {
        const result = await this.warmUp(entries);
        if (result.isErr()) {
          console.warn('Background cache warming failed:', result.error);
        }
      } catch (error) {
        console.warn('Background cache warming error:', error);
      }
    }, this.config.backgroundIntervalMs);

    this.emit('background:start');
  }

  /**
   * Stop background warming
   */
  stopBackgroundWarming(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null as any;
      this.emit('background:stop');
    }
  }

  /**
   * Get warming statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Check if warming is in progress
   */
  isCurrentlyWarming(): boolean {
    return this.isWarming;
  }

  private sortByPriority(entries: WarmUpEntry[]): WarmUpEntry[] {
    return entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  private filterByStrategy(entries: WarmUpEntry[]): WarmUpEntry[] {
    switch (this.config.strategy) {
      case 'eager':
        return entries; // Warm up all entries

      case 'lazy':
        return entries.filter(entry => (entry.priority || 0) >= this.config.priorityThreshold);

      case 'hybrid':
        // Warm up high priority entries immediately, others can be background
        return entries.filter(entry => (entry.priority || 0) >= this.config.priorityThreshold);

      default:
        return entries;
    }
  }

  private async executeWarmUp(entries: WarmUpEntry[]): Promise<WarmUpResult[]> {
    const results: WarmUpResult[] = [];
    const semaphore = new Semaphore(this.config.maxConcurrency);

    const tasks = entries.map(entry => async () => {
      await semaphore.acquire();

      try {
        const result = await this.warmUpEntry(entry);
        results.push(result);
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(tasks.map(task => task()));
    return results;
  }

  private async warmUpEntry(entry: WarmUpEntry): Promise<WarmUpResult> {
    const startTime = Date.now();

    try {
      this.emit('entry:start', { key: entry.key });

      const value = await this.executeWithTimeout(
        entry.factory(),
        this.config.timeoutMs
      );

      const duration = Date.now() - startTime;
      const size = this.calculateSize(value);

      this.emit('entry:success', {
        key: entry.key,
        duration,
        size,
      });

      return {
        key: entry.key,
        success: true,
        duration,
        size,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit('entry:error', {
        key: entry.key,
        error: error as Error,
        duration,
      });

      return {
        key: entry.key,
        success: false,
        duration,
        error: error as Error,
      };
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  private async _executeWithRetry<T>(
    operation: () => Promise<T>,
    attempts: number,
    delayMs: number
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === attempts - 1) {
          throw error;
        }

        await this.delay(delayMs);
      }
    }

    throw new Error('Retry logic failed');
  }

  private calculateStats(results: WarmUpResult[], totalDuration: number): WarmUpStats {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      skipped: 0,
      duration: totalDuration,
      averageDuration: results.length > 0 ? totalDuration / results.length : 0,
      totalSize: successful.reduce((sum, r) => sum + (r.size || 0), 0),
    };
  }

  private updateGlobalStats(stats: WarmUpStats): void {
    this.stats.totalWarmUps++;
    this.stats.successfulWarmUps += stats.successful;
    this.stats.failedWarmUps += stats.failed;
    this.stats.lastWarmUp = Date.now();

    // Update rolling average
    const totalOperations = this.stats.successfulWarmUps + this.stats.failedWarmUps;
    if (totalOperations > 0) {
      this.stats.averageDuration =
        (this.stats.averageDuration * (totalOperations - stats.total) +
         stats.averageDuration * stats.total) / totalOperations;
    }
  }

  private calculateSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;

    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}



