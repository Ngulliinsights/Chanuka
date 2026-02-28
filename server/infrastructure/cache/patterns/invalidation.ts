/**
 * Cache Invalidation Patterns
 * Standardized strategies for cache invalidation
 */

import { logger } from '@server/infrastructure/observability';
import { cacheKeys } from '../key-generator';

export interface InvalidationStrategy {
  name: string;
  execute: (context: InvalidationContext) => Promise<string[]>;
}

export interface InvalidationContext {
  feature: string;
  entity: string;
  id?: string | number;
  relatedEntities?: Array<{ feature: string; entity: string; id?: string | number }>;
  tags?: string[];
}

/**
 * Time-To-Live (TTL) based invalidation
 * Cache expires after specified time
 */
export class TTLInvalidation implements InvalidationStrategy {
  name = 'ttl';

  constructor(private ttlSeconds: number) {}

  async execute(context: InvalidationContext): Promise<string[]> {
    // TTL is handled by cache implementation
    // Return empty array as no manual invalidation needed
    return [];
  }

  getTTL(): number {
    return this.ttlSeconds;
  }
}

/**
 * Write-Through invalidation
 * Invalidate immediately on write
 */
export class WriteThroughInvalidation implements InvalidationStrategy {
  name = 'write-through';

  async execute(context: InvalidationContext): Promise<string[]> {
    const keysToInvalidate: string[] = [];

    // Invalidate the specific entity
    if (context.id) {
      keysToInvalidate.push(
        cacheKeys.buildKey({
          feature: context.feature,
          entity: context.entity,
          id: context.id
        })
      );
    }

    // Invalidate list caches for this entity type
    keysToInvalidate.push(
      cacheKeys.pattern(context.feature, `${context.entity}:*`)
    );

    // Invalidate related entities
    if (context.relatedEntities) {
      for (const related of context.relatedEntities) {
        if (related.id) {
          keysToInvalidate.push(
            cacheKeys.buildKey({
              feature: related.feature,
              entity: related.entity,
              id: related.id
            })
          );
        }
        keysToInvalidate.push(
          cacheKeys.pattern(related.feature, `${related.entity}:*`)
        );
      }
    }

    logger.debug({
      strategy: this.name,
      context,
      keysToInvalidate
    }, 'Write-through invalidation');

    return keysToInvalidate;
  }
}

/**
 * Tag-based invalidation
 * Invalidate all caches with specific tags
 */
export class TagBasedInvalidation implements InvalidationStrategy {
  name = 'tag-based';

  async execute(context: InvalidationContext): Promise<string[]> {
    if (!context.tags || context.tags.length === 0) {
      return [];
    }

    const keysToInvalidate: string[] = [];

    for (const tag of context.tags) {
      keysToInvalidate.push(cacheKeys.pattern('tag', tag));
    }

    logger.debug({
      strategy: this.name,
      tags: context.tags,
      keysToInvalidate
    }, 'Tag-based invalidation');

    return keysToInvalidate;
  }
}

/**
 * Cascade invalidation
 * Invalidate entity and all dependent entities
 */
export class CascadeInvalidation implements InvalidationStrategy {
  name = 'cascade';

  constructor(private dependencyMap: Map<string, string[]>) {}

  async execute(context: InvalidationContext): Promise<string[]> {
    const keysToInvalidate: string[] = [];
    const entityKey = `${context.feature}:${context.entity}`;

    // Invalidate the entity itself
    if (context.id) {
      keysToInvalidate.push(
        cacheKeys.buildKey({
          feature: context.feature,
          entity: context.entity,
          id: context.id
        })
      );
    }

    // Invalidate dependent entities
    const dependencies = this.dependencyMap.get(entityKey) || [];
    for (const dep of dependencies) {
      const [depFeature, depEntity] = dep.split(':');
      if (depFeature && depEntity) {
        keysToInvalidate.push(
          cacheKeys.pattern(depFeature, `${depEntity}:*`)
        );
      }
    }

    logger.debug({
      strategy: this.name,
      entityKey,
      dependencies,
      keysToInvalidate
    }, 'Cascade invalidation');

    return keysToInvalidate;
  }
}

/**
 * Lazy invalidation
 * Mark as stale, refresh on next access
 */
export class LazyInvalidation implements InvalidationStrategy {
  name = 'lazy';

  async execute(context: InvalidationContext): Promise<string[]> {
    // Lazy invalidation doesn't immediately remove keys
    // Instead, it marks them as stale
    const keysToMark: string[] = [];

    if (context.id) {
      keysToMark.push(
        cacheKeys.buildKey({
          feature: context.feature,
          entity: context.entity,
          id: context.id,
          variant: 'stale'
        })
      );
    }

    logger.debug({
      strategy: this.name,
      context,
      keysToMark
    }, 'Lazy invalidation');

    return keysToMark;
  }
}

/**
 * Batch invalidation
 * Collect invalidations and execute in batch
 */
export class BatchInvalidation implements InvalidationStrategy {
  name = 'batch';
  private pendingInvalidations: string[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY_MS = 100;

  async execute(context: InvalidationContext): Promise<string[]> {
    const keys = await new WriteThroughInvalidation().execute(context);
    
    this.pendingInvalidations.push(...keys);

    // Schedule batch execution
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    return new Promise((resolve) => {
      this.batchTimeout = setTimeout(() => {
        const keysToInvalidate = [...new Set(this.pendingInvalidations)];
        this.pendingInvalidations = [];
        this.batchTimeout = null;

        logger.debug({
          strategy: this.name,
          batchSize: keysToInvalidate.length
        }, 'Batch invalidation executed');

        resolve(keysToInvalidate);
      }, this.BATCH_DELAY_MS);
    });
  }
}

/**
 * Conditional invalidation
 * Invalidate only if condition is met
 */
export class ConditionalInvalidation implements InvalidationStrategy {
  name = 'conditional';

  constructor(
    private condition: (context: InvalidationContext) => boolean,
    private strategy: InvalidationStrategy
  ) {}

  async execute(context: InvalidationContext): Promise<string[]> {
    if (!this.condition(context)) {
      logger.debug({
        strategy: this.name,
        context
      }, 'Condition not met, skipping invalidation');
      return [];
    }

    return this.strategy.execute(context);
  }
}

/**
 * Invalidation Strategy Manager
 */
export class InvalidationManager {
  private strategies: Map<string, InvalidationStrategy> = new Map();
  private defaultStrategy: InvalidationStrategy;

  constructor() {
    // Register default strategies
    this.registerStrategy(new WriteThroughInvalidation());
    this.registerStrategy(new TagBasedInvalidation());
    this.registerStrategy(new LazyInvalidation());
    this.registerStrategy(new BatchInvalidation());

    this.defaultStrategy = new WriteThroughInvalidation();
  }

  registerStrategy(strategy: InvalidationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getStrategy(name: string): InvalidationStrategy | undefined {
    return this.strategies.get(name);
  }

  async invalidate(
    context: InvalidationContext,
    strategyName?: string
  ): Promise<string[]> {
    const strategy = strategyName 
      ? this.strategies.get(strategyName) || this.defaultStrategy
      : this.defaultStrategy;

    try {
      const keys = await strategy.execute(context);
      
      logger.info({
        strategy: strategy.name,
        context,
        keysInvalidated: keys.length
      }, 'Cache invalidation completed');

      return keys;
    } catch (error) {
      logger.error({
        strategy: strategy.name,
        context,
        error: error instanceof Error ? error.message : String(error)
      }, 'Cache invalidation failed');
      
      throw error;
    }
  }
}

// Export singleton instance
export const invalidationManager = new InvalidationManager();

// Export common TTL values
export const TTL = {
  FIVE_MINUTES: 5 * 60,
  FIFTEEN_MINUTES: 15 * 60,
  THIRTY_MINUTES: 30 * 60,
  ONE_HOUR: 60 * 60,
  SIX_HOURS: 6 * 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60
} as const;
