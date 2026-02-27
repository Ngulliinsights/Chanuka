// ============================================================================
// BASE REPOSITORY - Infrastructure for Domain-Specific Repositories
// ============================================================================
// Provides common infrastructure (transactions, caching, logging, error handling)
// for domain-specific repositories. Does NOT enforce generic CRUD methods.
//
// DESIGN PRINCIPLE:
// - BaseRepository provides INFRASTRUCTURE ONLY
// - Domain-specific repositories extend BaseRepository and define their OWN methods
// - Example: BillRepository.findByBillNumber(), NOT generic findById()
// - This avoids the "generic repository anti-pattern"

import { readDatabase, withTransaction } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import { RepositoryError, FatalError } from './errors';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';

/**
 * Repository configuration options
 */
export interface RepositoryOptions {
  /** Entity name for logging and error context */
  entityName: string;
  
  /** Enable caching for read operations */
  enableCache?: boolean;
  
  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTTL?: number;
  
  /** Enable performance logging */
  enableLogging?: boolean;
  
  /** Retry configuration for transient errors */
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Cache interface (to be implemented with Redis)
 */
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

/**
 * In-memory cache implementation (placeholder for Redis)
 */
class InMemoryCache implements CacheProvider {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Base repository providing infrastructure for domain-specific repositories.
 * 
 * IMPORTANT: This class does NOT enforce generic CRUD methods (findById, findMany, etc.).
 * Domain-specific repositories should extend this class and define their own methods
 * that reflect business operations.
 * 
 * @example Domain-Specific Repository
 * ```typescript
 * class BillRepository extends BaseRepository<Bill> {
 *   constructor() {
 *     super({ entityName: 'Bill', enableCache: true });
 *   }
 * 
 *   // Domain-specific methods (NOT generic CRUD)
 *   async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
 *     return this.executeRead(
 *       async (db) => {
 *         const results = await db
 *           .select()
 *           .from(bills)
 *           .where(eq(bills.billNumber, billNumber))
 *           .limit(1);
 *         return results[0] ?? null;
 *       },
 *       `bill:number:${billNumber}`
 *     );
 *   }
 * 
 *   async findByAffectedCounties(counties: string[]): Promise<Result<Bill[], Error>> {
 *     return this.executeRead(async (db) => {
 *       return db
 *         .select()
 *         .from(bills)
 *         .where(arrayOverlaps(bills.affectedCounties, counties));
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T> {
  protected readonly options: Required<RepositoryOptions>;
  private readonly cache: CacheProvider;

  constructor(options: RepositoryOptions) {
    this.options = {
      enableCache: false,
      cacheTTL: 300,
      enableLogging: true,
      retryConfig: DEFAULT_RETRY_CONFIG,
      ...options,
    };
    
    // TODO: Replace with Redis cache in production
    this.cache = new InMemoryCache();
  }

  /**
   * Execute a read operation with optional caching.
   * Wraps Week 1's readDatabase pattern with caching layer.
   * 
   * @param operation - Database operation to execute
   * @param cacheKey - Optional cache key for result caching
   * @returns Result containing the operation result or error
   * 
   * @example
   * ```typescript
   * protected async findByEmail(email: string): Promise<Result<Maybe<User>, Error>> {
   *   return this.executeRead(
   *     async (db) => {
   *       const results = await db
   *         .select()
   *         .from(users)
   *         .where(eq(users.email, email))
   *         .limit(1);
   *       return results[0] ?? null;
   *     },
   *     `user:email:${email}`
   *   );
   * }
   * ```
   */
  protected async executeRead<R>(
    operation: (db: any) => Promise<R>,
    cacheKey?: string
  ): Promise<Result<R, Error>> {
    const startTime = Date.now();
    const operationName = 'read';

    try {
      // Check cache first
      if (this.options.enableCache && cacheKey) {
        const cached = await this.getFromCache<R>(cacheKey);
        if (cached !== null) {
          this.logOperation(operationName, Date.now() - startTime, true);
          return new Ok(cached);
        }
      }

      // Execute read operation using readDatabase connection
      const result = await operation(readDatabase);

      // Cache result
      if (this.options.enableCache && cacheKey) {
        await this.setInCache(cacheKey, result);
      }

      this.logOperation(operationName, Date.now() - startTime, false);
      return new Ok(result);
    } catch (error) {
      this.logError(operationName, error);
      return new Err(this.wrapError(error, operationName));
    }
  }

  /**
   * Execute a write operation within a transaction.
   * Wraps Week 1's withTransaction pattern with retry logic and cache invalidation.
   * 
   * @param operation - Database operation to execute
   * @param invalidateKeys - Optional cache keys to invalidate after successful write
   * @returns Result containing the operation result or error
   * 
   * @example
   * ```typescript
   * protected async create(data: InsertBill): Promise<Result<Bill, Error>> {
   *   return this.executeWrite(
   *     async (tx) => {
   *       const results = await tx
   *         .insert(bills)
   *         .values(data)
   *         .returning();
   *       return results[0];
   *     },
   *     ['bill:*'] // Invalidate all bill caches
   *   );
   * }
   * ```
   */
  protected async executeWrite<R>(
    operation: (tx: any) => Promise<R>,
    invalidateKeys?: string[]
  ): Promise<Result<R, Error>> {
    const startTime = Date.now();
    const operationName = 'write';

    try {
      // Execute write operation using Week 1's withTransaction pattern
      // withTransaction already includes retry logic for transient errors
      const result = await withTransaction(async (tx) => {
        return await operation(tx);
      });

      // Invalidate cache keys
      if (this.options.enableCache && invalidateKeys) {
        await this.invalidateCache(invalidateKeys);
      }

      this.logOperation(operationName, Date.now() - startTime, false);
      return new Ok(result);
    } catch (error) {
      this.logError(operationName, error);
      return new Err(this.wrapError(error, operationName));
    }
  }

  /**
   * Execute a batch write operation within a transaction with extended timeout.
   * Useful for bulk inserts, updates, or deletes.
   * 
   * @param operation - Database operation to execute
   * @param invalidatePattern - Optional cache pattern to invalidate (e.g., 'bill:*')
   * @returns Result containing the operation result or error
   * 
   * @example
   * ```typescript
   * protected async createMany(data: InsertBill[]): Promise<Result<Bill[], Error>> {
   *   return this.executeBatchWrite(
   *     async (tx) => {
   *       return tx.insert(bills).values(data).returning();
   *     },
   *     'bill:*'
   *   );
   * }
   * ```
   */
  protected async executeBatchWrite<R>(
    operation: (tx: any) => Promise<R>,
    invalidatePattern?: string
  ): Promise<Result<R, Error>> {
    const startTime = Date.now();
    const operationName = 'batch_write';

    try {
      // Execute batch write operation using Week 1's withTransaction pattern
      // Note: Extended timeout would be configured in withTransaction options
      const result = await withTransaction(async (tx) => {
        return await operation(tx);
      });

      // Invalidate cache pattern
      if (this.options.enableCache && invalidatePattern) {
        await this.cache.deletePattern(invalidatePattern);
      }

      this.logOperation(operationName, Date.now() - startTime, false);
      return new Ok(result);
    } catch (error) {
      this.logError(operationName, error);
      return new Err(this.wrapError(error, operationName));
    }
  }

  /**
   * Get value from cache
   */
  private async getFromCache<R>(key: string): Promise<R | null> {
    try {
      return await this.cache.get<R>(key);
    } catch (error) {
      logger.warn(
        { component: 'BaseRepository', entityName: this.options.entityName, error },
        'Cache get failed'
      );
      return null;
    }
  }

  /**
   * Set value in cache
   */
  private async setInCache<R>(key: string, value: R): Promise<void> {
    try {
      await this.cache.set(key, value, this.options.cacheTTL);
    } catch (error) {
      logger.warn(
        { component: 'BaseRepository', entityName: this.options.entityName, error },
        'Cache set failed'
      );
    }
  }

  /**
   * Invalidate cache keys
   */
  private async invalidateCache(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => {
        if (key.includes('*')) {
          return this.cache.deletePattern(key);
        }
        return this.cache.delete(key);
      }));
    } catch (error) {
      logger.warn(
        { component: 'BaseRepository', entityName: this.options.entityName, error },
        'Cache invalidation failed'
      );
    }
  }

  /**
   * Log operation with performance tracking
   */
  private logOperation(operation: string, durationMs: number, cacheHit: boolean): void {
    if (!this.options.enableLogging) return;

    logger.info(
      {
        component: 'BaseRepository',
        entityName: this.options.entityName,
        operation,
        durationMs,
        cacheHit,
      },
      `Repository operation completed: ${this.options.entityName}.${operation}`
    );
  }

  /**
   * Log error
   */
  private logError(operation: string, error: unknown): void {
    logger.error(
      {
        component: 'BaseRepository',
        entityName: this.options.entityName,
        operation,
        error,
      },
      `Repository operation failed: ${this.options.entityName}.${operation}`
    );
  }

  /**
   * Wrap error with repository context
   */
  private wrapError(error: unknown, operation: string): Error {
    if (error instanceof RepositoryError) {
      // Already a repository error, just return it
      return error;
    }

    if (error instanceof Error) {
      // Wrap in FatalError with context
      return new FatalError(
        `${this.options.entityName} repository ${operation} failed: ${error.message}`,
        { cause: error, operation }
      );
    }

    // Unknown error type
    return new FatalError(
      `${this.options.entityName} repository ${operation} failed: ${String(error)}`,
      { operation }
    );
  }
}
