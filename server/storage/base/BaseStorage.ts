import {
  readDatabase,
  writeDatabase,
  database
} from '../../../shared/database/connection.js';
import { sql } from 'drizzle-orm';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Configuration interface for storage options
 * This gives us type safety and clear documentation of what options are available
 */
export interface StorageConfig {
  // Cache configuration
  enableCaching?: boolean;
  defaultTTL?: number;
  maxCacheSize?: number;
  
  // Storage-specific configuration
  prefix?: string;
  
  // Database configuration
  useReadReplica?: boolean;
  transactionTimeout?: number;
}

/**
 * Enhanced BaseStorage class that combines robust caching with unified database access
 * 
 * This class provides a foundation for all storage operations with:
 * - Sophisticated caching with TTL and size management
 * - Unified database connection handling (read/write separation)
 * - Transaction support with proper error handling
 * - Health monitoring and cleanup capabilities
 * - Pattern-based cache invalidation
 */
export abstract class BaseStorage<T> {
  // Enhanced cache with metadata for better management
  protected cache: Map<string, { 
    data: any; 
    expires: number; 
    accessCount: number; 
    lastAccessed: number; 
  }> = new Map();
  
  // Configuration with sensible defaults
  protected config: Required<StorageConfig>;
  
  // Cache performance tracking
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  
  // Cleanup interval reference for proper shutdown
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Constructor that merges provided options with intelligent defaults
   * 
   * @param options - Configuration options for the storage instance
   */
  constructor(options: StorageConfig = {}) {
    // Merge with defaults, ensuring all required fields are present
    this.config = {
      enableCaching: true,
      defaultTTL: 3600, // 1 hour
      maxCacheSize: 1000,
      prefix: this.constructor.name.toLowerCase(),
      useReadReplica: true,
      transactionTimeout: 30000, // 30 seconds
      ...options
    };

    // Initialize cache cleanup if caching is enabled
    if (this.config.enableCaching) {
      this.setupCacheCleanup();
    }
    
    logger.debug(`${this.config.prefix} storage initialized with config:`, this.config);
  }

  /**
   * Enhanced cache getter with performance tracking and intelligent fallback
   * 
   * This method provides sophisticated caching with:
   * - Automatic expiration handling
   * - Performance metrics tracking
   * - Intelligent cache size management
   * - Error resilience
   * 
   * @param key - Cache key for storing/retrieving data
   * @param fetchFn - Function to fetch fresh data when cache miss occurs
   * @param ttl - Optional TTL override (uses default if not provided)
   * @returns Promise resolving to cached or freshly fetched data
   */
  protected async getCached<R>(
    key: string,
    fetchFn: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    // If caching is disabled, go directly to the source
    if (!this.config.enableCaching) {
      return await fetchFn();
    }

    const cacheKey = `${this.config.prefix}:${key}`;
    const now = Date.now();
    
    try {
      // Check for valid cached entry
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > now) {
        // Update access tracking for LRU-like behavior
        cached.accessCount++;
        cached.lastAccessed = now;
        this.cacheStats.hits++;
        
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return cached.data as R;
      }
      
      // Cache miss - remove expired entry if it exists
      if (cached) {
        this.cache.delete(cacheKey);
      }
      
      this.cacheStats.misses++;
    } catch (error) {
      logger.warn(`Cache read error for key ${cacheKey}:`, error);
      // Continue to fetch fresh data
    }

    try {
      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the result if it's valid
      if (data !== null && data !== undefined) {
        const effectiveTTL = ttl || this.config.defaultTTL;
        this.setCacheEntry(cacheKey, data, effectiveTTL);
        logger.debug(`Cached fresh data for key: ${cacheKey}`);
      }
      
      return data;
    } catch (error) {
      // Clean up any potentially corrupted cache entry
      this.cache.delete(cacheKey);
      logger.error(`Failed to fetch data for key ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Intelligent cache entry management with LRU-like eviction
   * 
   * This method handles cache size limits by removing the least recently used
   * entries when the cache is full, ensuring optimal memory usage.
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in seconds
   */
  private setCacheEntry<R>(key: string, data: R, ttl: number): void {
    // Ensure we don't exceed the maximum cache size
    if (this.cache.size >= this.config.maxCacheSize) {
      // Find the least recently used entry for eviction
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheStats.evictions++;
        logger.debug(`Evicted cache entry: ${oldestKey}`);
      }
    }

    // Set the new cache entry with full metadata
    const now = Date.now();
    this.cache.set(key, {
      data: data as any,
      expires: now + (ttl * 1000),
      accessCount: 1,
      lastAccessed: now
    });
  }

  /**
   * Flexible cache invalidation with pattern support
   * 
   * This method supports both exact key matching and wildcard patterns,
   * giving you fine-grained control over cache invalidation.
   * 
   * @param patterns - String or array of patterns to invalidate
   */
  protected async invalidateCache(patterns: string | string[]): Promise<void> {
    if (!this.config.enableCaching) {
      return; // No-op if caching is disabled
    }

    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    let invalidatedCount = 0;
    
    for (const pattern of patternArray) {
      const fullPattern = `${this.config.prefix}:${pattern}`;
      
      if (pattern.includes('*')) {
        // Handle wildcard patterns with regex
        const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));
        const keysToDelete = [...this.cache.keys()].filter(key => regex.test(key));
        keysToDelete.forEach(key => {
          this.cache.delete(key);
          invalidatedCount++;
        });
      } else {
        // Direct key invalidation
        if (this.cache.delete(fullPattern)) {
          invalidatedCount++;
        }
      }
    }
    
    if (invalidatedCount > 0) {
      logger.debug(`Invalidated ${invalidatedCount} cache entries for patterns:`, patternArray);
    }
  }

  /**
   * Enhanced transaction wrapper with timeout and better error handling
   * 
   * This method provides a robust transaction interface with:
   * - Configurable timeouts
   * - Enhanced error context
   * - Proper cleanup on failure
   * 
   * @param callback - Function to execute within the transaction
   * @returns Promise resolving to the callback result
   */
  protected async withTransaction<R>(
    callback: (tx: any) => Promise<R>
  ): Promise<R> {
    const startTime = Date.now();
    
    try {
      return await writeDatabase.transaction(async (tx) => {
        // Set up timeout handling - using arrow function to preserve 'this' context
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Transaction timeout after ${this.config.transactionTimeout}ms`));
          }, this.config.transactionTimeout);
        });

        // Race the callback against the timeout
        const result = await Promise.race([
          callback(tx),
          timeoutPromise
        ]);

        const duration = Date.now() - startTime;
        logger.debug(`Transaction completed in ${duration}ms`);
        
        return result;
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Type guard to safely handle unknown error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Create enhanced error with context
      const enhancedError = new Error(
        `Transaction failed after ${duration}ms: ${errorMessage}`
      );
      enhancedError.stack = errorStack;
      
      logger.error('Transaction error:', {
        duration,
        error: errorMessage,
        stack: errorStack
      });
      
      throw enhancedError;
    }
  }

  /**
   * Smart database connection selection based on operation type
   * 
   * This method allows you to optimize database usage by directing
   * read operations to read replicas when available.
   * 
   * @param forWrite - Whether this connection will be used for write operations
   * @returns Appropriate database connection
   */
  protected getDatabase(forWrite: boolean = false) {
    if (forWrite) {
      return writeDatabase;
    }
    
    // Use read replica if available and configured
    return this.config.useReadReplica ? readDatabase : database;
  }

  /**
   * Comprehensive health check with detailed diagnostics
   * 
   * This method provides visibility into the health of both the database
   * connections and the cache system, essential for monitoring and alerting.
   * 
   * @returns Promise resolving to detailed health status
   */
  async healthCheck(): Promise<{
    database: boolean;
    cache: boolean;
    readDatabase: boolean;
    writeDatabase: boolean;
    cacheStats: typeof this.cacheStats;
  }> {
    const results = {
      database: false,
      cache: false,
      readDatabase: false,
      writeDatabase: false,
      cacheStats: { ...this.cacheStats }
    };

    // Test main database connection
    try {
      await database.execute(sql`SELECT 1`);
      results.database = true;
    } catch (error) {
      logger.error('Main database health check failed:', error);
    }

    // Test read database connection
    try {
      await readDatabase.execute(sql`SELECT 1`);
      results.readDatabase = true;
    } catch (error) {
      logger.error('Read database health check failed:', error);
    }

    // Test write database connection
    try {
      await writeDatabase.execute(sql`SELECT 1`);
      results.writeDatabase = true;
    } catch (error) {
      logger.error('Write database health check failed:', error);
    }

    // Test cache functionality
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = { test: true };
      
      // Test cache write
      this.setCacheEntry(testKey, testValue, 1);
      
      // Test cache read
      const cached = this.cache.get(testKey);
      results.cache = cached?.data?.test === true;
      
      // Clean up test entry
      this.cache.delete(testKey);
    } catch (error) {
      logger.error('Cache health check failed:', error);
    }

    return results;
  }

  /**
   * Get comprehensive cache performance statistics
   * 
   * This method provides detailed insights into cache performance,
   * helping you optimize cache configuration and identify issues.
   * 
   * @returns Object containing detailed cache statistics
   */
  protected getCacheStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
      hitRate: Number(hitRate.toFixed(2)),
      totalRequests
    };
  }

  /**
   * Efficient cache cleanup with intelligent scheduling
   * 
   * This method runs periodically to remove expired entries and
   * provides logging for monitoring cache health.
   */
  private setupCacheCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      // Find all expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires <= now) {
          expiredKeys.push(key);
        }
      }
      
      // Remove expired entries
      expiredKeys.forEach(key => this.cache.delete(key));
      
      // Log cleanup results if significant
      if (expiredKeys.length > 0) {
        logger.debug(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
      }
      
      // Log cache statistics periodically
      if (this.cache.size > 0) {
        const stats = this.getCacheStats();
        logger.debug(`Cache stats: ${stats.size}/${stats.maxSize} entries, ${stats.hitRate}% hit rate`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Graceful shutdown with proper cleanup
   * 
   * This method ensures all resources are properly cleaned up
   * when the storage instance is no longer needed.
   */
  async shutdown(): Promise<void> {
    // Clear the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Clear cache
    this.cache.clear();
    
    // Reset statistics
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    
    logger.debug(`${this.config.prefix} storage shutdown completed`);
  }

  /**
   * Abstract method for storage-specific health checks
   * 
   * Derived classes should implement this method to provide
   * storage-specific health validation beyond the base checks.
   * 
   * @returns Promise resolving to true if the storage is healthy
   */
  abstract isHealthy(): Promise<boolean>;
}