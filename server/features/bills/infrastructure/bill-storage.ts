import { eq, and, desc, inArray, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { BaseStorage, type StorageConfig } from "../../infrastructure/database/base/BaseStorage.js";
import { readDatabase } from '../../db.js';
import {
  bills,
  billTags,
  type Bill,
  type InsertBill,
  schema
} from "../../../shared/schema.js";
import { logger } from '../../utils/logger';

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
type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

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
      await readDatabase().select().from(bills).limit(1);
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
        const result = await readDatabase()
          .select()
          .from(bills)
          .orderBy(desc(bills.createdAt));

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
  const result = await readDatabase().select().from(bills).where(eq(bills.id, id));
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
    if (!bill.title?.trim()) {
      throw new Error("Bill title is required and cannot be empty");
    }

    // Handle optional content field safely - content can be null in schema
    const content = bill.content?.trim() || null;

    return this.executeTransaction(async (tx) => {
      const result = await tx
        .insert(bills)
        .values({
          ...bill,
          title: bill.title.trim(),
          content: content,
          description: bill.description?.trim() || null,
          status: bill.status || "draft",
          viewCount: 0,
          shareCount: 0,
          commentCount: 0,
          engagementScore: "0",
        })
        .returning();

      const newBill = result[0];

      // Invalidate all caches since we've added a new bill
      await this.invalidateCache(CACHE_INVALIDATION.FULL);

      return newBill;
    });
  }

  /**
   * Enhanced bill statistics increment with atomic operations
   *
   * Provides thread-safe increments for view and share counts using
   * SQL atomic operations to prevent race conditions.
   */
  async incrementBillViews(billId: number): Promise<Bill> {
    return this.incrementBillStat(billId, "viewCount");
  }

  async incrementBillShares(billId: number): Promise<Bill> {
    return this.incrementBillStat(billId, "shareCount");
  }

  /**
   * Private method for atomic statistics updates
   *
   * Uses SQL increment operations to ensure thread-safety and data consistency
   * while maintaining proper cache invalidation.
   */
  private async incrementBillStat(
    billId: number,
    field: "viewCount" | "shareCount"
  ): Promise<Bill> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
    }

    return this.executeTransaction(async (tx) => {
      // First check if bill exists for better error messages
      const existingBill = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, billId));

      if (existingBill.length === 0) {
        throw new Error(`Bill with ID ${billId} not found`);
      }

      // Use atomic SQL increment to prevent race conditions
      const updateData =
        field === "viewCount"
          ? { viewCount: sql`${bills.viewCount} + 1`, updatedAt: new Date() }
          : { shareCount: sql`${bills.shareCount} + 1`, updatedAt: new Date() };

      const result = await tx
        .update(bills)
        .set(updateData)
        .where(eq(bills.id, billId))
        .returning();

      // Targeted cache invalidation for better performance
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(billId),
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
  async addTagsToBill(billId: number, tags: string[]): Promise<Bill> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tags array is required and cannot be empty");
    }

    const cleanTags = this.validateAndCleanTags(tags);

    return this.executeTransaction(async (tx) => {
      // Check if bill exists first
      const existingBill = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, billId));

      if (existingBill.length === 0) {
        throw new Error(`Bill with ID ${billId} not found`);
      }

      // Insert tags with conflict resolution (ignore duplicates)
      const tagValues = cleanTags.map((tag) => ({ billId, tag }));
      await tx.insert(billTags).values(tagValues).onConflictDoNothing();

      // Update bill timestamp to reflect the change
      await tx
        .update(bills)
        .set({ updatedAt: new Date() })
        .where(eq(bills.id, billId));

      // Enhanced cache invalidation including tag-based caches
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(billId),
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
  async removeTagsFromBill(billId: number, tags: string[]): Promise<Bill | undefined> {
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new Error("Invalid bill ID: must be a positive integer");
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("Tags array is required and cannot be empty");
    }

    const cleanTags = this.validateAndCleanTags(tags);

    return this.executeTransaction(async (tx) => {
      // Remove specified tags efficiently
      await tx
        .delete(billTags)
        .where(
          and(eq(billTags.billId, billId), inArray(billTags.tag, cleanTags))
        );

      // Update bill timestamp
      await tx
        .update(bills)
        .set({ updatedAt: new Date() })
        .where(eq(bills.id, billId));

      // Enhanced cache invalidation
      await this.invalidateCache([
        CACHE_KEY.ALL_BILLS,
        CACHE_KEY.BILL_BY_ID(billId),
        ...CACHE_INVALIDATION.PATTERN_BY_TAGS,
      ]);

      // Fetch and return the updated bill
      return this.getBill(billId);
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
      async () => {
        // Get bill IDs that have all the specified tags
      const billIdsWithTags = await readDatabase()
        .select({ billId: billTags.billId })
        .from(billTags)
        .where(inArray(billTags.tag, cleanTags))
        .groupBy(billTags.billId)
        .having(sql`COUNT(DISTINCT ${billTags.tag}) = ${cleanTags.length}`);

        if (billIdsWithTags.length === 0) {
          return [];
        }

        // Get the actual bills
        const billIds = billIdsWithTags.map((row) => row.billId);
        return await readDatabase()
          .select()
          .from(bills)
          .where(inArray(bills.id, billIds))
          .orderBy(desc(bills.createdAt));
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
    return await readDatabase().transaction(async (tx) => {
      try {
        return await callback(tx);
      } catch (error) {
        const enhancedError = new Error(
          `Transaction failed: ${
            error instanceof Error ? error.message : "Unknown error"
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