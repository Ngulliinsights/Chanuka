/**
 * Cache Warming Strategies
 * Proactively populate cache with frequently accessed data
 */

import { logger } from '@server/infrastructure/observability';

export interface WarmingStrategy {
  name: string;
  execute: (context: WarmingContext) => Promise<WarmingResult>;
}

export interface WarmingContext {
  feature: string;
  entity: string;
  dataLoader: () => Promise<any>;
  priority?: 'high' | 'medium' | 'low';
  schedule?: string; // cron expression
}

export interface WarmingResult {
  success: boolean;
  itemsWarmed: number;
  duration: number;
  errors?: string[];
}

/**
 * Eager warming - warm cache immediately on startup
 */
export class EagerWarming implements WarmingStrategy {
  name = 'eager';

  async execute(context: WarmingContext): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;

    try {
      logger.info({
        strategy: this.name,
        feature: context.feature,
        entity: context.entity
      }, 'Starting eager cache warming');

      const data = await context.dataLoader();
      
      if (Array.isArray(data)) {
        itemsWarmed = data.length;
      } else {
        itemsWarmed = 1;
      }

      const duration = Date.now() - startTime;

      logger.info({
        strategy: this.name,
        feature: context.feature,
        entity: context.entity,
        itemsWarmed,
        duration
      }, 'Eager cache warming completed');

      return {
        success: true,
        itemsWarmed,
        duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      logger.error({
        strategy: this.name,
        feature: context.feature,
        entity: context.entity,
        error: errorMessage
      }, 'Eager cache warming failed');

      return {
        success: false,
        itemsWarmed,
        duration: Date.now() - startTime,
        errors
      };
    }
  }
}

/**
 * Lazy warming - warm cache on first access
 */
export class LazyWarming implements WarmingStrategy {
  name = 'lazy';
  private warmedKeys: Set<string> = new Set();

  async execute(context: WarmingContext): Promise<WarmingResult> {
    const key = `${context.feature}:${context.entity}`;
    
    // Skip if already warmed
    if (this.warmedKeys.has(key)) {
      return {
        success: true,
        itemsWarmed: 0,
        duration: 0
      };
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;

    try {
      const data = await context.dataLoader();
      
      if (Array.isArray(data)) {
        itemsWarmed = data.length;
      } else {
        itemsWarmed = 1;
      }

      this.warmedKeys.add(key);

      return {
        success: true,
        itemsWarmed,
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      return {
        success: false,
        itemsWarmed,
        duration: Date.now() - startTime,
        errors
      };
    }
  }
}

/**
 * Scheduled warming - warm cache on schedule
 */
export class ScheduledWarming implements WarmingStrategy {
  name = 'scheduled';
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  async execute(context: WarmingContext): Promise<WarmingResult> {
    const key = `${context.feature}:${context.entity}`;
    
    // Clear existing interval if any
    const existingInterval = this.intervals.get(key);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Parse schedule (simplified - in production use a cron library)
    const intervalMs = this.parseSchedule(context.schedule || '*/5 * * * *');

    // Set up recurring warming
    const interval = setInterval(async () => {
      try {
        await context.dataLoader();
        logger.debug({
          strategy: this.name,
          feature: context.feature,
          entity: context.entity
        }, 'Scheduled cache warming executed');
      } catch (error) {
        logger.error({
          strategy: this.name,
          feature: context.feature,
          entity: context.entity,
          error: error instanceof Error ? error.message : String(error)
        }, 'Scheduled cache warming failed');
      }
    }, intervalMs);

    this.intervals.set(key, interval);

    // Execute immediately
    const startTime = Date.now();
    try {
      const data = await context.dataLoader();
      const itemsWarmed = Array.isArray(data) ? data.length : 1;

      return {
        success: true,
        itemsWarmed,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private parseSchedule(schedule: string): number {
    // Simplified schedule parsing
    // In production, use a proper cron parser
    if (schedule.startsWith('*/')) {
      const minutes = parseInt(schedule.substring(2).split(' ')[0] || '5');
      return minutes * 60 * 1000;
    }
    return 5 * 60 * 1000; // Default 5 minutes
  }

  stopAll(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

/**
 * Predictive warming - warm cache based on usage patterns
 */
export class PredictiveWarming implements WarmingStrategy {
  name = 'predictive';
  private accessPatterns: Map<string, number[]> = new Map();

  async execute(context: WarmingContext): Promise<WarmingResult> {
    const key = `${context.feature}:${context.entity}`;
    
    // Analyze access patterns
    const pattern = this.accessPatterns.get(key) || [];
    const shouldWarm = this.predictAccess(pattern);

    if (!shouldWarm) {
      return {
        success: true,
        itemsWarmed: 0,
        duration: 0
      };
    }

    const startTime = Date.now();
    try {
      const data = await context.dataLoader();
      const itemsWarmed = Array.isArray(data) ? data.length : 1;

      // Record access
      pattern.push(Date.now());
      if (pattern.length > 100) {
        pattern.shift(); // Keep only recent 100 accesses
      }
      this.accessPatterns.set(key, pattern);

      return {
        success: true,
        itemsWarmed,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private predictAccess(pattern: number[]): boolean {
    if (pattern.length < 2) return true;

    // Calculate average time between accesses
    const intervals: number[] = [];
    for (let i = 1; i < pattern.length; i++) {
      intervals.push(pattern[i]! - pattern[i - 1]!);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lastAccess = pattern[pattern.length - 1]!;
    const timeSinceLastAccess = Date.now() - lastAccess;

    // Predict access if we're approaching the average interval
    return timeSinceLastAccess >= avgInterval * 0.8;
  }

  recordAccess(feature: string, entity: string): void {
    const key = `${feature}:${entity}`;
    const pattern = this.accessPatterns.get(key) || [];
    pattern.push(Date.now());
    if (pattern.length > 100) {
      pattern.shift();
    }
    this.accessPatterns.set(key, pattern);
  }
}

/**
 * Priority-based warming - warm high-priority items first
 */
export class PriorityWarming implements WarmingStrategy {
  name = 'priority';
  private queue: Array<{ context: WarmingContext; priority: number }> = [];
  private isProcessing = false;

  async execute(context: WarmingContext): Promise<WarmingResult> {
    const priority = this.getPriorityValue(context.priority || 'medium');
    
    this.queue.push({ context, priority });
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.isProcessing) {
      return this.processQueue();
    }

    return {
      success: true,
      itemsWarmed: 0,
      duration: 0
    };
  }

  private async processQueue(): Promise<WarmingResult> {
    this.isProcessing = true;
    let totalItemsWarmed = 0;
    const startTime = Date.now();
    const errors: string[] = [];

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const data = await item.context.dataLoader();
        const itemsWarmed = Array.isArray(data) ? data.length : 1;
        totalItemsWarmed += itemsWarmed;

        logger.debug({
          strategy: this.name,
          feature: item.context.feature,
          entity: item.context.entity,
          priority: item.priority,
          itemsWarmed
        }, 'Priority cache warming item completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(errorMessage);
        
        logger.error({
          strategy: this.name,
          feature: item.context.feature,
          entity: item.context.entity,
          error: errorMessage
        }, 'Priority cache warming item failed');
      }
    }

    this.isProcessing = false;

    return {
      success: errors.length === 0,
      itemsWarmed: totalItemsWarmed,
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }
}

/**
 * Cache Warming Manager
 */
export class WarmingManager {
  private strategies: Map<string, WarmingStrategy> = new Map();
  private defaultStrategy: WarmingStrategy;

  constructor() {
    // Register default strategies
    this.registerStrategy(new EagerWarming());
    this.registerStrategy(new LazyWarming());
    this.registerStrategy(new ScheduledWarming());
    this.registerStrategy(new PredictiveWarming());
    this.registerStrategy(new PriorityWarming());

    this.defaultStrategy = new LazyWarming();
  }

  registerStrategy(strategy: WarmingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getStrategy(name: string): WarmingStrategy | undefined {
    return this.strategies.get(name);
  }

  async warm(
    context: WarmingContext,
    strategyName?: string
  ): Promise<WarmingResult> {
    const strategy = strategyName
      ? this.strategies.get(strategyName) || this.defaultStrategy
      : this.defaultStrategy;

    try {
      const result = await strategy.execute(context);

      logger.info({
        strategy: strategy.name,
        feature: context.feature,
        entity: context.entity,
        result
      }, 'Cache warming completed');

      return result;
    } catch (error) {
      logger.error({
        strategy: strategy.name,
        feature: context.feature,
        entity: context.entity,
        error: error instanceof Error ? error.message : String(error)
      }, 'Cache warming failed');

      throw error;
    }
  }
}

// Export singleton instance
export const warmingManager = new WarmingManager();
