// cSpell:ignore upvotes downvotes
import { eq, desc, and, sql, count, or, inArray } from "drizzle-orm";
import { databaseService } from '../../../infrastructure/database/database-service';
import { bills, sponsors, Bill } from "../../../../shared/schema/foundation.js";
import { bill_engagement, comments } from "../../../../shared/schema/citizen_participation.js";
import { logger } from '../../../../shared/core';
import {
  AsyncServiceResult,
  withResultHandling
} from '../../../infrastructure/errors/result-adapter.js';

// Define InsertBill type locally since it's not exported from schema
type InsertBill = typeof bills.$inferInsert;

// Simple cache service implementation
const cacheService = {
  get: async (_key: string) => null,
  set: async (_key: string, _value: any, _ttl?: number) => { },
  delete: async (_key: string) => { },
  clear: async () => { }
};

const CACHE_KEYS = {
  BILL: 'bill',
  BILLS: 'bills',
  BILL_SEARCH: 'bill_search',
  SEARCH_RESULTS: 'search_results',
  BILL_DETAILS: 'bill_details',
  BILL_STATS: 'bill_stats',
  BILL_CATEGORIES: 'bill_categories',
  BILL_STATUSES: 'bill_statuses',
  BILL_DATA: 'bill_data'
};

const CACHE_TTL = {
  SHORT: 300,
  MEDIUM: 1800,
  LONG: 3600,
  SEARCH_RESULTS: 1800,
  BILL_DATA: 3600,
  BILL_DETAILS: 3600,
  STATIC_DATA: 7200
};

// Types for bill operations
export interface BillFilters {
  status?: string;
  category?: string;
  search?: string;
  sponsor_id?: string; // UUID string
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'date' | 'title' | 'engagement' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Extended Bill interface that properly types all fields including engagement
export interface BillWithEngagement extends Bill {
  engagement?: {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    uniqueViewers: number;
    totalEngagements: number;
  };
  recentComments?: Array<{
    id: string;
    content: string;
    commentType: string | null;
    upvotes: number;
    downvotes: number;
    created_at: string;
    user_id: string;
    is_verified: boolean;
  }>;
  sponsorInfo?: {
    id: string;
    name: string;
    party?: string | null;
  };
}

export interface PaginatedBillResponse {
  bills: BillWithEngagement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metadata?: {
    source: 'database' | 'fallback';
    timestamp: Date;
    cacheHit?: boolean;
  };
}

export interface BillStats {
  totalBills: number;
  billsByStatus: Array<{ status: string; count: number }>;
  billsByCategory: Array<{ category: string; count: number }>;
  recentActivity: number;
}

// Type definition for engagement query results
interface EngagementQueryResult {
  bill_id: string;
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  totalEngagements: number;
}

/**
 * Comprehensive Bill Service with database operations and fallback handling
 * 
 * This service manages all bill-related operations including CRUD operations,
 * engagement tracking, statistics, and real-time notifications. It includes
 * robust error handling with fallback data and caching for performance.
 */
export class BillService {
  /**
   * Access the database instance dynamically at runtime.
   * This getter pattern ensures we always work with the current DB connection.
   */
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Provides fallback bill data when database is unavailable.
   * This ensures the application remains functional even during outages.
   */
  private getFallbackBills(): BillWithEngagement[] {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    const fallback: any[] = [
      {
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
        created_at: twentyDaysAgo, // Date object as expected by Bill type
        updated_at: now, // Date object as expected by Bill type
  comment_count: 45,
        search_vector: null,
        view_count: 1250,
        share_count: 89,
        engagement_score: "156",
        complexity_score: 7,
        constitutionalConcerns: {
          concerns: ["First Amendment implications", "Commerce Clause considerations"],
          severity: "medium"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["citizens", "privacy advocates"],
          potential_opponents: ["tech companies", "data brokers"],
          economic_impact: "moderate"
        },
        argument_synthesis_status: "pending",
        engagement: {
          totalViews: 1250,
          totalComments: 45,
          totalShares: 89,
          uniqueViewers: 892,
          totalEngagements: 156
        }
      }
    ];

    return fallback as BillWithEngagement[];
  }

  /**
   * Retrieves all bills with advanced filtering, pagination, and sorting capabilities.
   * Results are cached to improve performance for repeated queries.
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): AsyncServiceResult<PaginatedBillResponse> {
    return withResultHandling(async () => {
      const cacheKey = `${CACHE_KEYS.BILL_SEARCH}_${filters.search || 'all'}_${JSON.stringify({ ...filters, ...pagination })}`;

      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult && typeof cachedResult === 'object') {
        return {
          ...(cachedResult as any),
          metadata: {
            source: 'database' as const,
            timestamp: new Date(),
            cacheHit: true
          }
        };
      }

      const offset = (pagination.page - 1) * pagination.limit;

      try {
        const conditions: any[] = [];

        // Build filter conditions with proper type handling
        if (filters.status) {
          conditions.push(eq(bills.status, filters.status as any));
        }

        if (filters.category) {
          conditions.push(eq(bills.category, filters.category));
        }

        if (filters.sponsor_id) {
          conditions.push(eq(bills.sponsor_id, filters.sponsor_id));
        }

        if (filters.search) {
          const searchTerm = `%${filters.search.toLowerCase()}%`;
          conditions.push(
            or(
              sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.bill_number}) LIKE ${searchTerm}`
            )
          );
        }

        if (filters.dateFrom) {
          conditions.push(sql`${bills.introduced_date} >= ${filters.dateFrom.toISOString()}`);
        }

        if (filters.dateTo) {
          conditions.push(sql`${bills.introduced_date} <= ${filters.dateTo.toISOString()}`);
        }

        if (filters.tags && filters.tags.length > 0) {
          conditions.push(sql`${bills.tags} && ${filters.tags}`);
        }

        let query = this.db.select().from(bills);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const sortColumn = this.getSortColumn(pagination.sortBy);
        if (pagination.sortOrder === 'asc') {
          query = query.orderBy(sortColumn) as any;
        } else {
          query = query.orderBy(desc(sortColumn)) as any;
        }

        const billsData = await query.limit(pagination.limit).offset(offset);

        let countQuery = this.db.select({ count: count() }).from(bills);
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions));
        }
        const [{ count: total }] = await countQuery;

        const enhancedBills = await this.enhanceBillsWithEngagement(billsData);

        const result = {
          bills: enhancedBills,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: Number(total),
            pages: Math.ceil(Number(total) / pagination.limit)
          }
        };

        await cacheService.set(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);

        return {
          ...result,
          metadata: {
            source: 'database' as const,
            timestamp: new Date(),
            cacheHit: false
          }
        };
      } catch (error) {
        logger.warn('Database error in getAllBills, returning fallback data', { component: 'BillService' }, error as any);
        const fallback = this.getFallbackBills();
        const total = fallback.length;
        const paged = fallback.slice(offset, offset + pagination.limit);

        const result = {
          bills: paged,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages: Math.max(1, Math.ceil(total / pagination.limit))
          }
        };

        return {
          ...result,
          metadata: {
            source: 'fallback' as const,
            timestamp: new Date(),
            cacheHit: false
          }
        };
      }
    }, { service: 'BillService', operation: 'getAllBills' });
  }

  /**
   * Retrieves a specific bill by ID with complete engagement data,
   * recent comments, and sponsor information.
   */
  async getBillById(id: string): AsyncServiceResult<BillWithEngagement | null> {
    return withResultHandling(async () => {
      const cacheKey = `${CACHE_KEYS.BILL_DETAILS}_${id}`;

      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      let bill: any = null;
      try {
        const [fetchedBill] = await this.db
          .select()
          .from(bills)
          .where(eq(bills.id, id))
          .limit(1);

        bill = fetchedBill || null;

        if (!bill) {
          // If not found in DB, try fallback data
          const fallback = this.getFallbackBills();
          const fb = fallback.find(b => b.id === id) || null;
          if (fb) {
            await cacheService.set(cacheKey, fb, CACHE_TTL.BILL_DETAILS);
          }
          return fb;
        }
      } catch (error) {
        logger.warn('Database error in getBillById, attempting fallback', { component: 'BillService' }, error as any);
        const fallback = this.getFallbackBills();
        const fb = fallback.find(b => b.id === id) || null;
        if (fb) {
          await cacheService.set(cacheKey, fb, CACHE_TTL.BILL_DETAILS);
        }
        return fb;
      }

      // Get engagement stats using proper type annotations
      const engagementStats = await this.db
        .select({
          totalViews: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'view'), 0)`,
          totalComments: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'comment'), 0)`,
          totalShares: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'share'), 0)`,
          uniqueViewers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})`,
          totalEngagements: sql<number>`COUNT(${bill_engagement.id})`
        })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, id));

      const processedEngagementStats = {
        totalViews: Number(engagementStats[0]?.totalViews) || 0,
        totalComments: Number(engagementStats[0]?.totalComments) || 0,
        totalShares: Number(engagementStats[0]?.totalShares) || 0,
        uniqueViewers: Number(engagementStats[0]?.uniqueViewers) || 0,
        totalEngagements: Number(engagementStats[0]?.totalEngagements) || 0
      };

      const recentComments = await this.db
        .select({
          id: comments.id,
          content: comments.content,
          commentType: comments.commentType,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          created_at: comments.created_at,
          user_id: comments.user_id,
          is_verified: comments.is_verified
        })
        .from(comments)
        .where(eq(comments.bill_id, id))
        .orderBy(desc(comments.created_at))
        .limit(5);

      let sponsorInfo: {
        id: string;
        name: string;
        party?: string | null;
      } | null = null;

      if (bill.sponsor_id) {
        const [sponsor] = await this.db
          .select({
            id: sponsors.id,
            name: sponsors.name,
            party: sponsors.party
          })
          .from(sponsors)
          .where(eq(sponsors.id, bill.sponsor_id));

        sponsorInfo = sponsor ? {
          id: sponsor.id,
          name: sponsor.name,
          party: sponsor.party
        } : null;
      }

      const result: BillWithEngagement = {
        ...bill,
        engagement: processedEngagementStats,
        recentComments,
        sponsorInfo
      };

      await cacheService.set(cacheKey, result, CACHE_TTL.BILL_DETAILS);

      return result;
    }, { service: 'BillService', operation: 'getBillById' });
  }

  /**
   * Creates a new bill in the database with initial engagement tracking.
   */
  async createBill(billData: InsertBill): AsyncServiceResult<Bill> {
    return withResultHandling(async () => {
      if (!billData.title || !billData.summary) {
        throw new Error('Title and summary are required for bill creation');
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

      await this.clearBillCaches();

      return result.data;
    }, { service: 'BillService', operation: 'createBill' });
  }

  /**
   * Updates an existing bill with new data.
   */
  async updateBill(id: string, updates: Partial<InsertBill>): AsyncServiceResult<Bill | null> {
    return withResultHandling(async () => {
      const result = await databaseService.withTransaction(
        async (tx) => {
          const [updatedBill] = await tx
            .update(bills)
            .set({
              ...updates,
              updated_at: new Date()
            })
            .where(eq(bills.id, id))
            .returning();

          return updatedBill || null;
        },
        'updateBill'
      );

      if (result.data) {
        await this.clearBillCaches(id);
      }

      return result.data;
    }, { service: 'BillService', operation: 'updateBill' });
  }

  /**
   * Updates bill status with audit trail and real-time notifications.
   */
  async updateBillStatus(id: string, newStatus: string, user_id?: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      if (!newStatus || typeof newStatus !== 'string') {
        throw new Error('Valid status is required');
      }

      const [currentBill] = await this.db
        .select({ status: bills.status })
        .from(bills)
        .where(eq(bills.id, id))
        .limit(1);

      if (!currentBill) {
        throw new Error(`Bill with ID ${id} not found`);
      }

      const oldStatus = currentBill.status;

      if (oldStatus === newStatus) {
        logger.info(`Bill ${id} status unchanged (${newStatus}), skipping update`, { component: 'BillService' });
        return;
      }

      await databaseService.withTransaction(
        async (tx) => {
          await tx
            .update(bills)
            .set({
              status: newStatus as any,
              last_action_date: new Date().toISOString(),
              updated_at: new Date()
            })
            .where(eq(bills.id, id));

          await this.clearBillCaches(id);
        },
        'updateBillStatus'
      );

      // Trigger real-time notification - note: bill_id is string (UUID)
      try {
        const { billStatusMonitorService } = await import('../bill-status-monitor');
        await billStatusMonitorService.handleBillStatusChange({
          bill_id: id, // String UUID, matching the interface expectation
          oldStatus,
          newStatus,
          timestamp: new Date(),
          triggeredBy: user_id || 'system',
          metadata: {
            automaticChange: !user_id,
            reason: 'Manual status update'
          }
        });
      } catch (error) {
        logger.error('Error triggering status change notification:', { component: 'BillService' }, error as any);
      }
    }, { service: 'BillService', operation: 'updateBillStatus' });
  }

  /**
   * Retrieves comprehensive statistics about all bills in the system.
   */
  async getBillStats(): AsyncServiceResult<BillStats> {
    return withResultHandling(async () => {
      const cacheKey = CACHE_KEYS.BILL_STATS;

      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(bills);

      // Explicitly type the aggregation results to avoid implicit any
      const statusResults = await this.db
        .select({
          status: bills.status,
          count: count()
        })
        .from(bills)
        .groupBy(bills.status);

      const categoryResults = await this.db
        .select({
          category: bills.category,
          count: count()
        })
        .from(bills)
        .where(sql`${bills.category} IS NOT NULL`)
        .groupBy(bills.category);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentActivityResult] = await this.db
        .select({ count: count() })
        .from(bills)
        .where(sql`${bills.updated_at} >= ${sevenDaysAgo}`);

      const stats = {
        totalBills: Number(totalResult.count),
        billsByStatus: statusResults.map((r: { status: string; count: number }) => ({ 
          status: r.status, 
          count: Number(r.count) 
        })),
        billsByCategory: categoryResults.map((r: { category: string | null; count: number }) => ({ 
          category: r.category || 'uncategorized', 
          count: Number(r.count) 
        })),
        recentActivity: Number(recentActivityResult.count)
      };

      await cacheService.set(cacheKey, stats, CACHE_TTL.STATIC_DATA);

      return stats;
    }, { service: 'BillService', operation: 'getBillStats' });
  }

  /**
   * Records user engagement with a bill (views, comments, shares).
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share'
  ): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      if (!bill_id || !user_id || !engagement_type) {
        throw new Error('Bill ID, user ID, and engagement type are required');
      }

      const validEngagementTypes = ['view', 'comment', 'share'];
      if (!validEngagementTypes.includes(engagement_type)) {
        throw new Error(`Invalid engagement type: ${engagement_type}`);
      }

      try {
        const [existingEngagement] = await this.db
          .select()
          .from(bill_engagement)
          .where(
            and(
              eq(bill_engagement.bill_id, bill_id),
              eq(bill_engagement.user_id, user_id)
            )
          );

        if (existingEngagement) {
          await this.db
            .update(bill_engagement)
            .set({
              lastEngaged: new Date().toISOString(),
              updated_at: new Date()
            })
            .where(eq(bill_engagement.id, existingEngagement.id));
        } else {
          await this.db.insert(bill_engagement).values({
            bill_id: bill_id,
            user_id: user_id,
            engagement_type: engagement_type,
            engagement_score: "1",
            lastEngaged: new Date().toISOString(),
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        // Update bill-level counters
        if (engagement_type === 'view') {
          await this.db
            .update(bills)
            .set({
              view_count: sql`${bills.view_count} + 1`,
              updated_at: new Date()
            })
            .where(eq(bills.id, bill_id));
        } else if (engagement_type === 'share') {
          await this.db
            .update(bills)
            .set({
              share_count: sql`${bills.share_count} + 1`,
              updated_at: new Date()
            })
            .where(eq(bills.id, bill_id));
        }
      } catch (error) {
        throw error;
      }

      await this.clearBillCaches(bill_id);

      if (engagement_type === 'comment' || engagement_type === 'share') {
        try {
          const { billStatusMonitorService } = await import('../bill-status-monitor');
          await billStatusMonitorService.handleBillEngagementUpdate({
            bill_id, // String UUID, matching the interface expectation
            type: engagement_type,
            user_id,
            timestamp: new Date(),
            newStats: {
              totalViews: 0,
              totalComments: 0,
              totalShares: 0,
              engagement_score: 0
            }
          });
        } catch (error) {
          logger.error('Error triggering engagement notification:', { component: 'BillService' }, error as any);
        }
      }
    }, { service: 'BillService', operation: 'recordEngagement' });
  }

  // Helper methods

  async deleteBill(id: string): AsyncServiceResult<boolean> {
    return withResultHandling(async () => {
      const result = await databaseService.withTransaction(
        async (tx) => {
          const deleteResult = await tx
            .delete(bills)
            .where(eq(bills.id, id));

          return deleteResult.rowCount > 0;
        },
        'deleteBill'
      );

      if (result.data) {
        await this.clearBillCaches(id);
      }

      return result.data;
    }, { service: 'BillService', operation: 'deleteBill' });
  }

  async searchBills(query: string, filters?: BillFilters): AsyncServiceResult<Bill[]> {
    return withResultHandling(async () => {
      const searchTerm = `%${query.toLowerCase()}%`;
      const conditions = [
        or(
          sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
          sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
          sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`,
          sql`LOWER(${bills.bill_number}) LIKE ${searchTerm}`
        )
      ];

      if (filters?.status) {
        conditions.push(eq(bills.status, filters.status as any));
      }

      if (filters?.category) {
        conditions.push(eq(bills.category, filters.category));
      }

      if (filters?.sponsor_id) {
        conditions.push(eq(bills.sponsor_id, filters.sponsor_id));
      }

      if (filters?.tags && filters.tags.length > 0) {
        conditions.push(sql`${bills.tags} && ${filters.tags}`);
      }

      const result = await this.db
        .select()
        .from(bills)
        .where(and(...conditions))
        .limit(50)
        .orderBy(desc(bills.updated_at));

      return result;
    }, { service: 'BillService', operation: 'searchBills' });
  }

  async getBillsByStatus(status: string): AsyncServiceResult<Bill[]> {
    return withResultHandling(async () => {
      const result = await this.db
        .select()
        .from(bills)
        .where(eq(bills.status, status as any))
        .orderBy(desc(bills.updated_at));

      return result;
    }, { service: 'BillService', operation: 'getBillsByStatus' });
  }

  async getBillsByCategory(category: string): AsyncServiceResult<Bill[]> {
    return withResultHandling(async () => {
      const result = await this.db
        .select()
        .from(bills)
        .where(eq(bills.category, category))
        .orderBy(desc(bills.updated_at));

      return result;
    }, { service: 'BillService', operation: 'getBillsByCategory' });
  }

  async getBillsBySponsor(sponsorId: string): AsyncServiceResult<Bill[]> {
    return withResultHandling(async () => {
      const result = await this.db
        .select()
        .from(bills)
        .where(eq(bills.sponsor_id, sponsorId))
        .orderBy(desc(bills.updated_at));

      return result;
    }, { service: 'BillService', operation: 'getBillsBySponsor' });
  }

  async getBillsByIds(ids: string[]): AsyncServiceResult<Bill[]> {
    return withResultHandling(async () => {
      if (ids.length === 0) return [];

      const result = await this.db
        .select()
        .from(bills)
        .where(inArray(bills.id, ids))
        .orderBy(desc(bills.updated_at));

      return result;
    }, { service: 'BillService', operation: 'getBillsByIds' });
  }

  async countBills(filters: BillFilters = {}): AsyncServiceResult<number> {
    return withResultHandling(async () => {
      const conditions: any[] = [];

      if (filters.status) {
        conditions.push(eq(bills.status, filters.status as any));
      }

      if (filters.category) {
        conditions.push(eq(bills.category, filters.category));
      }

      if (filters.sponsor_id) {
        conditions.push(eq(bills.sponsor_id, filters.sponsor_id));
      }

      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.bill_number}) LIKE ${searchTerm}`
          )
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push(sql`${bills.tags} && ${filters.tags}`);
      }

      let query = this.db.select({ count: count() }).from(bills);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      return Number(result[0]?.count || 0);
    }, { service: 'BillService', operation: 'countBills' });
  }

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

  private async enhanceBillsWithEngagement(billsList: Bill[]): Promise<BillWithEngagement[]> {
    if (billsList.length === 0) return [];

    try {
      const bill_ids = billsList.map(b => b.id);
      
      // Query engagement data with explicit typing
      const engagement_data = await this.db
        .select({
          bill_id: bill_engagement.bill_id,
          totalViews: sql<number>`COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'view')`,
          totalComments: sql<number>`COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'comment')`,
          totalShares: sql<number>`COUNT(*) FILTER (WHERE ${bill_engagement.engagement_type} = 'share')`,
          uniqueViewers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})`,
          totalEngagements: sql<number>`COUNT(${bill_engagement.id})`
        })
        .from(bill_engagement)
        .where(inArray(bill_engagement.bill_id, bill_ids))
        .groupBy(bill_engagement.bill_id);

      // Create a type-safe map for engagement data
      const engagementMap = new Map<string, {
        totalViews: number;
        totalComments: number;
        totalShares: number;
        uniqueViewers: number;
        totalEngagements: number;
      }>();
      
      engagement_data.forEach((eng: EngagementQueryResult) => {
        engagementMap.set(eng.bill_id, {
          totalViews: Number(eng.totalViews) || 0,
          totalComments: Number(eng.totalComments) || 0,
          totalShares: Number(eng.totalShares) || 0,
          uniqueViewers: Number(eng.uniqueViewers) || 0,
          totalEngagements: Number(eng.totalEngagements) || 0
        });
      });

      return billsList.map(bill => ({
        ...bill,
        engagement: engagementMap.get(bill.id) || {
          totalViews: bill.view_count || 0,
          totalComments: 0,
          totalShares: bill.share_count || 0,
          uniqueViewers: 0,
          totalEngagements: 0
        }
      }));
    } catch (error) {
      logger.error('Error enhancing bills with engagement:', { component: 'BillService' }, error as any);
      return billsList.map(bill => ({ ...bill }));
    }
  }

  private async clearBillCaches(bill_id?: string): Promise<void> {
    try {
      await cacheService.delete(CACHE_KEYS.BILL_STATS);
      await cacheService.delete(CACHE_KEYS.BILL_CATEGORIES);
      await cacheService.delete(CACHE_KEYS.BILL_STATUSES);

      if (bill_id) {
        await cacheService.delete(`${CACHE_KEYS.BILL_DETAILS}_${bill_id}`);
      }
    } catch (error) {
      logger.error('Error clearing bill caches:', { component: 'BillService' }, error as any);
    }
  }
}

export const billService = new BillService();