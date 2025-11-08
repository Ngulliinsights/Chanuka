// cSpell:ignore upvotes downvotes
import { eq, desc, and, sql, count, or, inArray } from "drizzle-orm";
import { databaseService } from '../../../infrastructure/database/database-service';
import { bills, sponsors, Bill } from '../../../../shared/schema/foundation.js';
import { bill_engagement, comments } from '../../../../shared/schema/citizen_participation.js';
import { logger } from '../../../../shared/core/src/index.js';
import type { AsyncServiceResult } from '../../../infrastructure/errors/result-adapter.js';
import { withResultHandling } from '../../../infrastructure/errors/result-adapter.js';
import { QueryCache, CacheHelpers, Cached } from '../../../infrastructure/cache/query-cache';
import { serverCache } from '../../../infrastructure/cache/cache-service';

// ============================================================================
// Type Definitions
// ============================================================================

type InsertBill = typeof bills.$inferInsert;

interface BillFilters {
  status?: string;
  category?: string;
  sponsor_id?: string;
  search?: string;
}

interface BillStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

interface BillWithEngagement extends Bill {
  comment_count: number;
  view_count: number;
  share_count: number;
  engagement_score: string;
  complexity_score: number;
  // optional search vector used by some DB queries (may not exist in all schemas)
  search_vector?: string | null;
  constitutionalConcerns?: {
    concerns: string[];
    riskLevel: string;
  };
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedBills {
  bills: BillWithEngagement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL = {
  BILL_DETAILS: 900,      // 15 minutes - individual bills
  BILL_LIST: 300,         // 5 minutes - lists and searches
  BILL_STATS: 1800,       // 30 minutes - statistics
  BILL_ENGAGEMENT: 180,   // 3 minutes - engagement data
  POPULAR_BILLS: 600      // 10 minutes - popular/featured bills
} as const;

const CACHE_KEYS = {
  BILL: 'bill',
  BILLS: 'bills',
  SEARCH: 'search',
  STATS: 'stats',
  STATUS: 'status',
  CATEGORY: 'category',
  SPONSOR: 'sponsor',
  ENGAGEMENT: 'engagement'
} as const;

const CACHE_TAGS = {
  ALL_BILLS: 'bills:all',
  BILL_LISTS: 'bills:lists',
  BILL_STATS: 'bills:stats',
  BILL_SEARCH: 'bills:search'
} as const;

// ============================================================================
// Cache Service Wrapper
// ============================================================================

const cacheService = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      return await serverCache.getCachedQuery<T>(key);
    } catch (error) {
      logger.warn('Cache get failed', { key, error });
      return null;
    }
  },

  set: async (key: string, value: any, ttl?: number): Promise<void> => {
    try {
      await serverCache.cacheQuery(key, value, ttl);
    } catch (error) {
      logger.warn('Cache set failed', { key, error });
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      await serverCache.invalidateQueryPattern(key);
    } catch (error) {
      logger.warn('Cache delete failed', { key, error });
    }
  },

  invalidatePattern: async (pattern: string): Promise<void> => {
    try {
      await serverCache.invalidateQueryPattern(pattern);
    } catch (error) {
      logger.warn('Cache invalidate pattern failed', { pattern, error });
    }
  }
};

// ============================================================================
// Enhanced Bill Service with Integrated Caching
// ============================================================================

/**
 * Enhanced BillService with comprehensive caching, error handling, and performance optimization.
 * Provides multi-layer caching strategy with automatic invalidation and fallback support.
 */
export class CachedBillService {
  
  // --------------------------------------------------------------------------
  // Database Access
  // --------------------------------------------------------------------------

  private get db() {
    return databaseService.getDatabase();
  }

  // --------------------------------------------------------------------------
  // Fallback Data
  // --------------------------------------------------------------------------

  private getFallbackBills(): BillWithEngagement[] {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    return [
      ({
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "Digital Economy and Data Protection Act 2024",
        summary: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights.",
        status: "committee_stage",
        category: "technology",
        introduced_date: "2024-01-15",
        bill_number: "HR-2024-001",
        full_text: "Full text of the Digital Economy and Data Protection Act...",
        sponsor_id: null,
        tags: ["technology", "privacy", "digital rights"],
        last_action_date: "2024-01-20",
        created_at: twentyDaysAgo,
        updated_at: now,
        comment_count: 45,
        search_vector: null,
        view_count: 1250,
        share_count: 89,
        engagement_score: "156",
        complexity_score: 7,
        constitutionalConcerns: {
          concerns: ["First Amendment implications", "Commerce Clause considerations"],
          riskLevel: "medium"
        }
      } as any)
    ];
  }

  // --------------------------------------------------------------------------
  // Core CRUD Operations with Caching
  // --------------------------------------------------------------------------

  /**
   * Retrieves a bill by ID with multi-layer caching.
   */
  async getBillById(id: string): Promise<AsyncServiceResult<BillWithEngagement | null>> {
    return withResultHandling(async () => {
      try {
        const [bill] = await this.db
          .select({
            id: bills.id,
            title: bills.title,
            summary: bills.summary,
            status: bills.status,
            category: bills.category,
            introduced_date: bills.introduced_date,
            bill_number: bills.bill_number,
            full_text: bills.full_text,
            sponsor_id: bills.sponsor_id,
            tags: bills.tags,
            last_action_date: bills.last_action_date,
            created_at: bills.created_at,
            updated_at: bills.updated_at,
            // search_vector column may not exist in all schema versions; omit to keep queries portable
            comment_count: count(comments.id),
            view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
            share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
            engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`
          })
          .from(bills)
          .leftJoin(comments, eq(bills.id, comments.bill_id))
          .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
          .where(eq(bills.id, id))
          .groupBy(bills.id)
          .limit(1);

        if (!bill) {
          return null;
        }

        return {
          ...bill,
          complexity_score: 5, // Default complexity score
        };

      } catch (error) {
        logger.warn('Database error in getBillById, using fallback', { error, id });
        const fallbackBills = this.getFallbackBills();
        return fallbackBills.find((bill: any) => bill.id === id) || null;
      }
    }, { service: 'CachedBillService', operation: 'getBillById' });
  }

  /**
   * Creates a new bill and invalidates relevant caches.
   */
  async createBill(billData: InsertBill): Promise<AsyncServiceResult<Bill>> {
    return withResultHandling(async () => {
      if (!billData.title) {
        throw new Error('Title is required for bill creation');
      }

      const result = await databaseService.withTransaction(
        async (tx) => {
          const [newBill] = await tx
            .insert(bills)
            .values({
              ...billData,
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning();
          return newBill;
        },
        'createBill'
      );

      // Invalidate all list and stats caches
      await this.invalidateAllBillCaches();
      
      return result.data;
    }, { service: 'CachedBillService', operation: 'createBill' });
  }

  /**
   * Updates an existing bill and invalidates caches.
   */
  async updateBill(id: string, updates: Partial<InsertBill>): Promise<AsyncServiceResult<Bill | null>> {
    return withResultHandling(async () => {
      const [updatedBill] = await this.db
        .update(bills)
        .set({
          ...updates,
          updated_at: new Date()
        })
        .where(eq(bills.id, id))
        .returning();

      if (updatedBill) {
        await this.invalidateBillCaches(id);
      }

      return updatedBill || null;
    }, { service: 'CachedBillService', operation: 'updateBill' });
  }

  /**
   * Updates bill status with cache invalidation.
   */
  async updateBillStatus(id: string, newStatus: string, user_id?: string): Promise<AsyncServiceResult<void>> {
    return withResultHandling(async () => {
      await databaseService.withTransaction(
        async (tx) => {
          await tx
            .update(bills)
            .set({
              status: newStatus,
              last_action_date: new Date().toISOString().split('T')[0],
              updated_at: new Date()
            })
            .where(eq(bills.id, id));

          if (user_id) {
            logger.info('Bill status updated', {
              bill_id: id,
              new_status: newStatus,
              updated_by: user_id
            });
          }
        },
        'updateBillStatus'
      );

      await this.invalidateBillCaches(id);
    }, { service: 'CachedBillService', operation: 'updateBillStatus' });
  }

  /**
   * Deletes a bill and cleans up all related caches.
   */
  async deleteBill(id: string): Promise<AsyncServiceResult<boolean>> {
    return withResultHandling(async () => {
      const result = await databaseService.withTransaction(
        async (tx) => {
          await tx.delete(bill_engagement).where(eq(bill_engagement.bill_id, id));
          const [deletedBill] = await tx
            .delete(bills)
            .where(eq(bills.id, id))
            .returning();
          return !!deletedBill;
        },
        'deleteBill'
      );

      if (result.data) {
        await this.invalidateBillCaches(id);
      }

      return result.data;
    }, { service: 'CachedBillService', operation: 'deleteBill' });
  }

  // --------------------------------------------------------------------------
  // Search and Query Operations with Caching
  // --------------------------------------------------------------------------

  /**
   * Searches bills with caching support.
   */
  async searchBills(query: string, filters: BillFilters = {}): Promise<AsyncServiceResult<Bill[]>> {
    const cacheKey = `${CACHE_KEYS.SEARCH}:${query}:${JSON.stringify(filters)}`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          const searchTerm = `%${query.toLowerCase()}%`;
          const conditions = [
            or(
              sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`
            )
          ];

          if (filters.status) conditions.push(eq(bills.status, filters.status as any));
          if (filters.category) conditions.push(eq(bills.category, filters.category as any));
          if (filters.sponsor_id) conditions.push(eq(bills.sponsor_id, filters.sponsor_id as any));

          const results = await this.db
            .select()
            .from(bills)
            .where(and(...conditions))
            .orderBy(desc(bills.created_at))
            .limit(50);

          return results;
        }, { service: 'CachedBillService', operation: 'searchBills' });
      },
      cacheKey,
      CacheHelpers.search(CACHE_TTL.BILL_LIST)
    );
  }

  /**
   * Gets bills by status with caching.
   */
  async getBillsByStatus(status: string): Promise<AsyncServiceResult<Bill[]>> {
    const cacheKey = `${CACHE_KEYS.STATUS}:${status}`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          return await this.db
            .select()
            .from(bills)
            .where(eq(bills.status, status as any))
            .orderBy(desc(bills.created_at));
        }, { service: 'CachedBillService', operation: 'getBillsByStatus' });
      },
      cacheKey,
      { ttl: CACHE_TTL.BILL_LIST, keyPrefix: CACHE_KEYS.BILLS, tags: [CACHE_TAGS.BILL_LISTS] }
    );
  }

  /**
   * Gets bills by category with caching.
   */
  async getBillsByCategory(category: string): Promise<AsyncServiceResult<Bill[]>> {
    const cacheKey = `${CACHE_KEYS.CATEGORY}:${category}`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          return await this.db
            .select()
            .from(bills)
            .where(eq(bills.category, category as any))
            .orderBy(desc(bills.created_at));
        }, { service: 'CachedBillService', operation: 'getBillsByCategory' });
      },
      cacheKey,
      { ttl: CACHE_TTL.BILL_LIST, keyPrefix: CACHE_KEYS.BILLS, tags: [CACHE_TAGS.BILL_LISTS] }
    );
  }

  /**
   * Gets bills by sponsor with caching.
   */
  async getBillsBySponsor(sponsor_id: string): Promise<AsyncServiceResult<Bill[]>> {
    const cacheKey = `${CACHE_KEYS.SPONSOR}:${sponsor_id}`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          return await this.db
            .select()
            .from(bills)
            .where(eq(bills.sponsor_id, sponsor_id))
            .orderBy(desc(bills.created_at));
        }, { service: 'CachedBillService', operation: 'getBillsBySponsor' });
      },
      cacheKey,
      { ttl: CACHE_TTL.BILL_LIST, keyPrefix: CACHE_KEYS.BILLS, tags: [CACHE_TAGS.BILL_LISTS] }
    );
  }

  /**
   * Gets bills by IDs (batch query).
   */
  async getBillsByIds(ids: string[]): Promise<AsyncServiceResult<Bill[]>> {
    return withResultHandling(async () => {
      if (ids.length === 0) return [];

      return await this.db
        .select()
        .from(bills)
        .where(inArray(bills.id, ids))
        .orderBy(desc(bills.created_at));
    }, { service: 'CachedBillService', operation: 'getBillsByIds' });
  }

  /**
   * Gets paginated bills with comprehensive caching.
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<AsyncServiceResult<PaginatedBills>> {
    const cacheKey = `${CACHE_KEYS.BILLS}:${JSON.stringify(filters)}:${pagination.page}:${pagination.limit}`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          const conditions = [];
          
          if (filters.status) conditions.push(eq(bills.status, filters.status as any));
          if (filters.category) conditions.push(eq(bills.category, filters.category as any));
          if (filters.sponsor_id) conditions.push(eq(bills.sponsor_id, filters.sponsor_id as any));
          
          if (filters.search) {
            const searchTerm = `%${filters.search.toLowerCase()}%`;
            conditions.push(
              or(
                sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
                sql`LOWER(${bills.summary}) LIKE ${searchTerm}`
              )
            );
          }

          const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
          
          // Get total count
          const [{ count: total }] = await this.db
            .select({ count: count() })
            .from(bills)
            .where(whereClause);

          // Get paginated results
          const offset = (pagination.page - 1) * pagination.limit;
          const sortColumn = this.getSortColumn(pagination.sortBy);
          const sortOrder = pagination.sortOrder === 'asc' ? sortColumn : desc(sortColumn);

          const billResults = await this.db
            .select({
              id: bills.id,
              title: bills.title,
              summary: bills.summary,
              status: bills.status,
              category: bills.category,
              introduced_date: bills.introduced_date,
              bill_number: bills.bill_number,
              full_text: bills.full_text,
              sponsor_id: bills.sponsor_id,
              tags: bills.tags,
              last_action_date: bills.last_action_date,
              created_at: bills.created_at,
              updated_at: bills.updated_at,
              // search_vector column may not exist in all schema versions; omit to keep queries portable
              comment_count: count(comments.id),
              view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
              share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
              engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`
            })
            .from(bills)
            .leftJoin(comments, eq(bills.id, comments.bill_id))
            .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
            .where(whereClause)
            .groupBy(bills.id)
            .orderBy(sortOrder)
            .limit(pagination.limit)
            .offset(offset);

          return {
            bills: billResults.map((b: any) => ({ ...b, complexity_score: 5 })),
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit)
          };
        }, { service: 'CachedBillService', operation: 'getAllBills' });
      },
      cacheKey,
      { ttl: CACHE_TTL.BILL_LIST, keyPrefix: CACHE_KEYS.BILLS, tags: [CACHE_TAGS.BILL_LISTS] }
    );
  }

  // --------------------------------------------------------------------------
  // Statistics and Analytics with Caching
  // --------------------------------------------------------------------------

  /**
   * Gets bill statistics with extended caching.
   */
  async getBillStats(): Promise<AsyncServiceResult<BillStats>> {
    const cacheKey = `${CACHE_KEYS.STATS}:all`;
    
    return await QueryCache.execute(
      async () => {
        return withResultHandling(async () => {
          const [totalResult] = await this.db
            .select({ count: count() })
            .from(bills);

          const statusResults = await this.db
            .select({ status: bills.status, count: count() })
            .from(bills)
            .groupBy(bills.status);

          const categoryResults = await this.db
            .select({ category: bills.category, count: count() })
            .from(bills)
            .groupBy(bills.category);

          return {
            total: totalResult.count,
            byStatus: statusResults.reduce((acc: Record<string, number>, { status, count }: { status: string; count: number }) => {
              acc[status] = count;
              return acc;
            }, {} as Record<string, number>),
            byCategory: categoryResults.reduce((acc: Record<string, number>, { category, count }: { category?: string; count: number }) => {
              acc[category || 'uncategorized'] = count;
              return acc;
            }, {} as Record<string, number>)
          };
        }, { service: 'CachedBillService', operation: 'getBillStats' });
      },
      cacheKey,
      CacheHelpers.analytics(CACHE_TTL.BILL_STATS)
    );
  }

  /**
   * Counts bills with filters.
   */
  async countBills(filters: BillFilters = {}): Promise<AsyncServiceResult<number>> {
    return withResultHandling(async () => {
      const conditions = [];

          if (filters.status) conditions.push(eq(bills.status, filters.status as any));
          if (filters.category) conditions.push(eq(bills.category, filters.category as any));
          if (filters.sponsor_id) conditions.push(eq(bills.sponsor_id, filters.sponsor_id as any));
      
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`
          )
        );
      }

      const [result] = await this.db
        .select({ count: count() })
        .from(bills)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result.count;
    }, { service: 'CachedBillService', operation: 'countBills' });
  }

  // --------------------------------------------------------------------------
  // Engagement Tracking
  // --------------------------------------------------------------------------

  /**
   * Records user engagement with optimized caching.
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share'
  ): Promise<AsyncServiceResult<void>> {
    return withResultHandling(async () => {
      await databaseService.withTransaction(
        async (tx) => {
          const [existing] = await tx
            .select()
            .from(bill_engagement)
            .where(and(
              eq(bill_engagement.bill_id, bill_id),
              eq(bill_engagement.user_id, user_id)
            ))
            .limit(1);

          if (existing) {
            const updates: any = { updated_at: new Date() };
            
            switch (engagement_type) {
              case 'view':
                updates.view_count = sql`${bill_engagement.view_count} + 1`;
                break;
              case 'comment':
                updates.comment_count = sql`${bill_engagement.comment_count} + 1`;
                break;
              case 'share':
                updates.share_count = sql`${bill_engagement.share_count} + 1`;
                break;
            }

            await tx
              .update(bill_engagement)
              .set(updates)
              .where(eq(bill_engagement.id, existing.id));
          } else {
            const newEngagement: any = {
              bill_id,
              user_id,
              view_count: engagement_type === 'view' ? 1 : 0,
              comment_count: engagement_type === 'comment' ? 1 : 0,
              share_count: engagement_type === 'share' ? 1 : 0,
              engagement_score: "1",
              created_at: new Date(),
              updated_at: new Date()
            };

            await tx.insert(bill_engagement).values(newEngagement);
          }
        },
        'recordEngagement'
      );

      // Invalidate only engagement-related caches
      await cacheService.delete(`${CACHE_KEYS.BILL}:${bill_id}`);
      await cacheService.delete(`${CACHE_KEYS.ENGAGEMENT}:${bill_id}`);
    }, { service: 'CachedBillService', operation: 'recordEngagement' });
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Invalidates caches for a specific bill.
   */
  async invalidateBillCaches(bill_id: string): Promise<void> {
    await Promise.all([
      cacheService.delete(`${CACHE_KEYS.BILL}:${bill_id}`),
      cacheService.invalidatePattern(`${CACHE_KEYS.BILLS}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.SEARCH}:*`),
      cacheService.delete(`${CACHE_KEYS.STATS}:all`)
    ]);
  }

  /**
   * Invalidates all bill-related caches.
   */
  async invalidateAllBillCaches(): Promise<void> {
    await Promise.all([
      cacheService.invalidatePattern(`${CACHE_KEYS.BILL}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.BILLS}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.SEARCH}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.STATUS}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.CATEGORY}:*`),
      cacheService.invalidatePattern(`${CACHE_KEYS.SPONSOR}:*`),
      cacheService.delete(`${CACHE_KEYS.STATS}:all`)
    ]);
  }

  /**
   * Warms up cache with popular bills and common queries.
   */
  async warmUpCache(): Promise<void> {
    try {
      logger.info('Starting cache warm-up...');

      // Pre-load popular bills
      const popularBillsRes: any = await this.getAllBills({}, { page: 1, limit: 20 });
      const billIds = (popularBillsRes?.data?.bills ?? []).map((b: any) => b.id);
      if (billIds.length > 0) {
        await Promise.all(billIds.map((id: any) => this.getBillById(id)));
      }

      // Pre-load common searches
      const commonSearches = ['budget', 'healthcare', 'education', 'infrastructure', 'technology'];
      await Promise.all(commonSearches.map(search => this.searchBills(search)));

      // Pre-load stats
      await this.getBillStats();

      // Pre-load bills by common statuses
      const commonStatuses = ['draft', 'committee_stage', 'passed'];
      await Promise.all(commonStatuses.map(status => this.getBillsByStatus(status)));

      logger.info('Cache warm-up completed successfully');
    } catch (error) {
      logger.error('Failed to warm up bill cache', { error });
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private getSortColumn(sortBy?: string) {
    switch (sortBy) {
      case 'title':
        return bills.title;
      case 'status':
        return bills.status;
      case 'engagement':
        return bills.view_count;
      case 'date':
      default:
        return bills.introduced_date;
    }
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const cachedBillService = new CachedBillService();

// Export types
export type {
  BillFilters,
  BillStats,
  BillWithEngagement,
  PaginationOptions,
  PaginatedBills
};