import { eq, and, desc, inArray, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { BaseStorage, type StorageConfig } from "../../../infrastructure/database/base/BaseStorage.js";
import { readDatabase } from '@shared/database/connection';
import {
  bill as bills,
  bill_tag as bill_tags,
  type Bill,
  type InsertBill
} from "../../../../shared/schema";
import { logger } from '../../../../shared/core/index.js';

// Cache configuration constants - these control cache behavior across the application
const CACHE_TTL = 300; // Cache time-to-live in seconds (5 minutes default)

// Cache key generators for consistent cache key construction
const CACHE_KEY = {
  ALL_BILLS: "all",
  BILL_BY_ID: (id: number) => `id:${id}`,
  BILLS_BY_TAGS: (tags: string[]) => `tags:${tags.sort().join(",")}`,
} as const;

// Cache invalidation patterns for targeted cache clearing
const CACHE_INVALIDATION = {
  FULL: ["all", "id:*", "tags:*"], // Invalidates all caches
  PATTERN_BY_TAGS: ["tags:*"], // Invalidates only tag-based caches
} as const;

// Type alias for transaction to improve readability
type DbTransaction = any;

/**
 * Enhanced BillStorage class with optimized Drizzle ORM operations
 *
 * This class provides a comprehensive storage solution for bill management with:
 * - Efficient caching with smart invalidation strategies
 * - Robust transaction handling with proper error recovery
 * - Type-safe database operations using Drizzle ORM
 * - Performance optimizations for common query patterns
 */
export class BillStorage extends BaseStorage<Bill> {
  private static instance: BillStorage;

  constructor(options: StorageConfig = {}) {
    super(options);
  }

  /**
   * Health check implementation to verify database connectivity
   * Returns true if the database is accessible, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    try {
  await readDatabase.select().from(bills).limit(1);
      return true;
    } catch (error) {
      logger.error('BillStorage health check failed:', { component: 'Chanuka' }, error as any);
      return false;
    }
  }

  /**
   * Singleton pattern implementation for consistent storage access
   * This ensures only one instance exists throughout the application lifecycle
   */
  static getInstance(options?: StorageConfig): BillStorage {
    if (!BillStorage.instance) {
      BillStorage.instance = new BillStorage(options);
    }
    return BillStorage.instance;
  }

  /**
   * Optimized method to retrieve all bills with enhanced caching
   *
   * Uses intelligent caching to reduce database load while maintaining
   * data freshness through the configured TTL.
   */
  async getBills(): Promise<Bill[]> {
    return this.getCached(
      CACHE_KEY.ALL_BILLS,
      async () => {
  const result = await readDatabase
          .select()
          .from(bills)
          .orderBy(desc(bills.created_at));

        return result;
      },
      CACHE_TTL
    );
  }

  /**
   * Enhanced single bill retrieval with input validation
   *
   * Provides optimized single bill fetching with comprehensive validation
   * and error handling to ensure data integrity.
   */
  async getBill(id: number): Promise<Bill | undefined> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
    }

    return this.getCached(
      CACHE_KEY.BILL_BY_ID(id),
      async () => {
  const result = await readDatabase.select().from(bills).where(eq(bills.id, id));
        return result[0];
      },
      CACHE_TTL
    );
  }

  /**
   * Optimized bill creation with enhanced validation and transaction handling
   *
   * Creates a new bill with comprehensive validation, proper transaction
   * management, and intelligent cache invalidation.
   */
  async createBill(bill: InsertBill): Promise<Bill> {
    // Comprehensive input validation with specific error messages
    if (!bills.title?.trim()) {
      throw new Error("Bill title is required and cannot be empty");
    }

    // Handle optional content field safely - content can be null in schema
    const content = bills.content?.trim() || null;

    return this.executeTransaction(async (tx) => {
      const result = await tx
        .insert(bills)
        .values({
          ...bill,
          title: bills.title.trim(),
          content: content,
          description: bills.description?.trim() || null,
          status: bills.status || "draft",
          view_count: 0,
          share_count: 0,
          comment_count: 0,
          engagement_score: "0",
        })
        .returning();

      const newBill = result[0];

      // Invalidate all caches since we've added a new bill
      await this.invalidateCache([...CACHE_INVALIDATION.FULL]);

      return newBill;
    });
  }

  /**
   * Enhanced bill statistics increment with atomic operations
   *
   * Provides thread-safe increments for view and share counts using
   * SQL atomic operations to prevent race conditions.
   */
  async incrementBillViews(bill_id: number): Promise<Bill> { return this.incrementBillStat(bill_id, "view_count");
   }

  async incrementBillShares(bill_id: number): Promise<Bill> { return this.incrementBillStat(bill_id, "share_count");
   }

  /**
   * Private method for atomic statistics updates
   *
   * Uses SQL increment operations to ensure thread-safety and data consistency
   * while maintaining proper cache invalidation.
   */
  private async incrementBillStat(
    bill_id: number,
    field: "view_count" | "share_count"
  ): Promise<Bill> { if (!Number.isInteger(bill_id) || bill_id <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
     }

    return this.executeTransaction(async (tx) => { // First check if bill exists for better error messages
      const existingBill = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id));

      if (existingBill.length === 0) {
        throw new Error(`Bill with ID ${bill_id } not found`);
      }

      // Use atomic SQL increment to prevent race conditions
      const updateData =
        field === "view_count"
          ? { view_count: sql`${bills.view_count} + 1`, updated_at: new Date() }
          : { share_count: sql`${bills.share_count} + 1`, updated_at: new Date() };

      const result = await tx
        .update(bills)
        .set(updateData)
        .where(eq(bills.id, bill_id))
        .returning();

      // Targeted cache invalidation for better performance
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(bill_id),
      ]);

      return result[0];
    });
  }

  /**
   * Enhanced tag management with better validation and performance
   *
   * Provides comprehensive tag operations with proper validation,
   * deduplication, and optimized database queries.
   */
  async addTagsToBill(bill_id: number, tags: string[]): Promise<Bill> { if (!Number.isInteger(bill_id) || bill_id <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
     }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tags array is required and cannot be empty");
    }

    const cleanTags = this.validateAndCleanTags(tags);

    return this.executeTransaction(async (tx) => { // Check if bill exists first
      const existingBill = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id));

      if (existingBill.length === 0) {
        throw new Error(`Bill with ID ${bill_id } not found`);
      }

      // Insert tags with conflict resolution (ignore duplicates)
      const tagValues = cleanTags.map((tag) => ({ bill_id, tag  }));
      await tx.insert(bill_tags).values(tagValues).onConflictDoNothing();

      // Update bill timestamp to reflect the change
      await tx
        .update(bills)
        .set({ updated_at: new Date() })
        .where(eq(bills.id, bill_id));

      // Enhanced cache invalidation including tag-based caches
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(bill_id),
        ...CACHE_INVALIDATION.PATTERN_BY_TAGS,
      ]);

      return existingBill[0];
    });
  }

  /**
   * Enhanced tag removal with proper validation
   * 
   * Removes specified tags from a bill while maintaining data integrity
   * and cache consistency.
   */
  async removeTagsFromBill(bill_id: number, tags: string[]): Promise<Bill | undefined> { if (!Number.isInteger(bill_id) || bill_id <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
     }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tags array is required and cannot be empty");
    }

    const cleanTags = this.validateAndCleanTags(tags);

    return this.executeTransaction(async (tx) => { // Remove specified tags efficiently
      await tx
        .delete(bill_tags)
        .where(
          and(eq(bill_tags.bill_id, bill_id), inArray(bill_tags.tag, cleanTags))
        );

      // Update bill timestamp
      await tx
        .update(bills)
        .set({ updated_at: new Date()  })
        .where(eq(bills.id, bill_id));

      // Enhanced cache invalidation
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(bill_id),
        ...CACHE_INVALIDATION.PATTERN_BY_TAGS,
      ]);

      // Fetch and return the updated bill
      return this.getBill(bill_id);
    });
  }

  /**
   * Optimized tag-based bill retrieval with smart caching
   *
   * Efficiently finds bills that contain all specified tags using
   * optimized queries and intelligent caching strategies.
   */
  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }

    const cleanTags = this.validateAndCleanTags(tags);
    if (cleanTags.length === 0) {
      return [];
    }

    return this.getCached(
      CACHE_KEY.BILLS_BY_TAGS(cleanTags),
      async () => { // Get bill IDs that have all the specified tags
  const bill_idsWithTags = await readDatabase
          .select({ bill_id: bill_tags.bill_id  })
          .from(bill_tags)
          .where(inArray(bill_tags.tag, cleanTags))
          .groupBy(bill_tags.bill_id)
          .having(sql`COUNT(DISTINCT ${bill_tags.tag}) = ${cleanTags.length}`);

        if (bill_idsWithTags.length === 0) {
          return [];
        }

        // Get the actual bills
        const bill_ids = bill_idsWithTags.map((row) => row.bill_id);
  return await readDatabase
          .select()
          .from(bills)
          .where(inArray(bills.id, bill_ids))
          .orderBy(desc(bills.created_at));
      },
      CACHE_TTL
    );
  }

  /**
   * Enhanced tag validation and cleaning utility
   *
   * Provides comprehensive tag validation with normalization,
   * deduplication, and consistent formatting.
   */
  private validateAndCleanTags(tags: string[]): string[] {
    const cleanTags = tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index);

    if (cleanTags.length === 0) {
      throw new Error("No valid tags provided");
    }

    return cleanTags;
  }

  /**
   * Enhanced transaction execution with comprehensive error handling
   *
   * Provides robust transaction management with proper error recovery,
   * logging, and rollback mechanisms for data integrity.
   */
  private async executeTransaction<T>(
    callback: (tx: DbTransaction) => Promise<T>
  ): Promise<T> {
  return await readDatabase.transaction(async (tx) => {
      try {
        return await callback(tx);
      } catch (error) {
        const enhancedError = new Error(
          `Transaction failed: ${error instanceof Error ? error.message : "Unknown error"
          }`
        );

        if (error instanceof Error) {
          enhancedError.stack = error.stack;
        }

        logger.error('Database transaction error:', { component: 'Chanuka' }, error as Record<string, any>);

        throw enhancedError;
      }
    });
  }

  /**
   * Enhanced cache invalidation with pattern support
   *
   * Provides flexible cache invalidation supporting both specific keys
   * and pattern-based invalidation for complex cache scenarios.
   */
  protected async invalidateCache(patterns: string | string[]): Promise<void> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    await Promise.all(
      patternArray.map(async (pattern) => {
        try {
          if (pattern.includes("*")) {
            const keys = [...this.cache.keys()];
            const matchingKeys = keys.filter((key) =>
              key.includes(pattern.replace("*", ""))
            );

            await Promise.all(
              matchingKeys.map((key) => {
                this.cache.delete(key);
              })
            );
          } else {
            this.cache.delete(pattern);
          }
        } catch (error) {
          console.warn(
            `Cache invalidation failed for pattern ${pattern}:`,
            error
          );
        }
      })
    );
  }

  /**
   * Enhanced caching with better error handling and performance monitoring
   *
   * Provides intelligent caching with fallback mechanisms, error recovery,
   * and performance optimizations for high-traffic scenarios.
   */
  protected async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL
  ): Promise<T> {
    try {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data as T;
      }

      const data = await fetchFn();

      if (data !== undefined && data !== null) {
        try {
          // Store cache entry with all required properties for tracking
          this.cache.set(key, {
            data: data,
            expires: Date.now() + ttl * 1000,
            accessCount: 1,
            lastAccessed: Date.now(),
          });
        } catch (cacheError) {
          console.warn(`Cache write error for key ${key}:`, cacheError);
        }
      }

      return data;
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error);
      this.cache.delete(key);
      throw error;
    }
  }
}

// Export singleton instance for consistent usage across the application
export const billStorage = BillStorage.getInstance();






































