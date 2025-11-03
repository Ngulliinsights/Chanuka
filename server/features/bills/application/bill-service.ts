import { eq, desc, and, sql, count, like, or } from "drizzle-orm";
import { databaseService } from '../../../infrastructure/database/database-service';
import { bills, sponsors, Bill, InsertBill } from "../../../../shared/schema/foundation.js";
import { bill_engagement, comments, BillEngagement } from "../../../../shared/schema/citizen_participation.js";
import { schema } from "../../../../shared/schema/index.js";
import { logger } from '../../../../shared/core';
import { billRepository } from '../infrastructure/repositories/bill-repository-impl';

// Simple cache service mock for now
const cacheService = {
  get: async (key: string) => null,
  set: async (key: string, value: any, ttl?: number) => { },
  delete: async (key: string) => { },
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
// Logger is imported above
import { billStorage } from '../infrastructure/bill-storage.js';

// Types for bill operations
export interface BillFilters {
  status?: string;
  category?: string;
  search?: string;
  sponsor_id?: number;
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

// Fixed: Properly extend Bill type to include all its properties
export interface BillWithEngagement extends Bill {
  engagement?: {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    uniqueViewers: number;
    totalEngagements: number;
  };
  recentComments?: Array<{
    id: number;
    content: string;
    commentType: string | null;
    upvotes: number;
    downvotes: number;
    created_at: Date;
    user_id: string;
    is_verified: boolean;
  }>;
  sponsorInfo?: {
    id: number;
    name: string;
    role: string;
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
    return [
      {
        id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        summary: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights.",
        status: "committee",
        category: "technology",
        introduced_date: new Date("2024-01-15"),
        bill_number: "HR-2024-001",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Economy and Data Protection Act...",
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
        sponsor_id: null,
        last_action_date: new Date("2024-01-20"),
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-20"),
        comment_countCached: 0,
        search_vector: null,
        engagement: {
          totalViews: 1250,
          totalComments: 45,
          totalShares: 89,
          uniqueViewers: 892,
          totalEngagements: 156
        }
      },
      {
        id: 2,
        title: "Climate Change Adaptation Fund Bill 2024",
        summary: "Establishes a national fund for climate adaptation projects and carbon offset programs.",
        status: "introduced",
        category: "environment",
        introduced_date: new Date("2024-02-01"),
        bill_number: "S-2024-042",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Change Adaptation Fund Bill...",
        view_count: 2100,
        share_count: 156,
        engagement_score: "234",
        complexity_score: 9,
        constitutionalConcerns: {
          concerns: ["Interstate Commerce regulation", "Federal vs State authority"],
          severity: "low"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["environmental groups", "renewable energy sector"],
          potential_opponents: ["fossil fuel industry", "traditional utilities"],
          economic_impact: "significant"
        },
        sponsor_id: null,
        last_action_date: new Date("2024-02-05"),
        created_at: new Date("2024-02-01"),
        updated_at: new Date("2024-02-05"),
        comment_countCached: 0,
        search_vector: null,
        engagement: {
          totalViews: 2100,
          totalComments: 78,
          totalShares: 156,
          uniqueViewers: 1456,
          totalEngagements: 234
        }
      }
    ];
  }

  /**
   * Retrieves all bills with advanced filtering, pagination, and sorting capabilities.
   * Results are cached to improve performance for repeated queries.
   * 
   * @param filters - Optional filters for status, category, search terms, etc.
   * @param pagination - Pagination and sorting options
   * @returns Paginated bill response with metadata
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedBillResponse> {
    // Generate a unique cache key based on filters and pagination settings
    const cacheKey = `${CACHE_KEYS.BILL_SEARCH}_${filters.search || 'all'}_${JSON.stringify({ ...filters, ...pagination })}`;

    // Check cache first for performance optimization
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult && typeof cachedResult === 'object') {
      return {
        ...(cachedResult as any),
        metadata: {
          source: 'database',
          timestamp: new Date(),
          cacheHit: true
        }
      };
    }

    // Use repository pattern for database operations
    const billsData = await billRepository.findAll(filters, pagination);

    // Get total count separately for pagination
    const allBills = await billRepository.findAll(filters, { page: 1, limit: 10000 }); // Large limit to get all
    const total = allBills.length;

    // Enhance bills with engagement statistics
    const enhancedBills = await this.enhanceBillsWithEngagement(billsData);

    const result = {
      bills: enhancedBills,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit)
      }
    };

    // Cache successful results
    await cacheService.set(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);

    return {
      ...result,
      metadata: {
        source: 'database',
        timestamp: new Date(),
        cacheHit: false
      }
    };
  }

  /**
   * Retrieves a specific bill by ID with complete engagement data,
   * recent comments, and sponsor information.
   * 
   * @param id - The unique bill identifier
   * @returns Complete bill data or null if not found
   */
  async getBillById(id: number): Promise<BillWithEngagement | null> {
    const cacheKey = `${CACHE_KEYS.BILL_DETAILS}_${id}`;

    // Check cache for performance
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Use repository pattern
    const bill = await billRepository.findById(id);
    if (!bill) {
      return null;
    }

    // Get engagement stats using repository
    const engagementStats = await billRepository.getEngagementStats(id);

    // Fetch the 5 most recent comments for preview (still using direct query for now)
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

    // Get sponsor details if the bill has a sponsor
    let sponsorInfo: {
      id: number;
      name: string;
      role: string;
      party?: string | null;
    } | null = null;
    if (bill.sponsor_id) {
      const [sponsor] = await this.db
        .select({
          id: sponsors.id,
          name: sponsors.name,
          role: sponsors.role,
          party: sponsors.party
        })
        .from(sponsors)
        .where(eq(sponsors.id, bill.sponsor_id));

      sponsorInfo = sponsor ? {
        id: sponsor.id,
        name: sponsor.name,
        role: sponsor.role,
        party: sponsor.party
      } : null;
    }

    // Combine all data into a comprehensive bill object
    const result = {
      ...bill,
      engagement: engagementStats,
      recentComments,
      sponsorInfo
    };

    // Cache the result for faster subsequent access
    await cacheService.set(cacheKey, result, CACHE_TTL.BILL_DETAILS);

    return result;
  }

  /**
   * Creates a new bill in the database with initial engagement tracking.
   * This operation is wrapped in a transaction to ensure data consistency.
   * 
   * @param billData - The bill data to insert
   * @returns The newly created bill
   */
  async createBill(billData: InsertBill): Promise<Bill> {
    // Use repository pattern
    const newBill = await billRepository.create(billData);

    // Clear caches to reflect the new bill
    await this.clearBillCaches();

    return newBill;
  }

  /**
   * Updates an existing bill with new data.
   * Clears relevant caches and can trigger search index updates.
   * 
   * @param id - The bill ID to update
   * @param updates - Partial bill data to update
   * @returns The updated bill or null if not found
   */
  async updateBill(id: number, updates: Partial<InsertBill>): Promise<Bill | null> {
    // Use repository pattern
    const updatedBill = await billRepository.update(id, updates);

    if (updatedBill) {
      // Invalidate caches for this specific bill
      await this.clearBillCaches(id);
    }

    return updatedBill;
  }

  /**
   * Updates bill status with audit trail and real-time notifications.
   * This method includes status change detection to avoid unnecessary updates
   * and triggers notifications to relevant stakeholders.
   * 
   * @param id - The bill ID
   * @param newStatus - The new status to set
   * @param user_id - Optional user ID who triggered the change
   */
  async updateBillStatus(id: number, newStatus: string, user_id?: string): Promise<void> {
    // Retrieve current status before making changes
    const [currentBill] = await this.db
      .select({ status: schema.bills.status })
      .from(schema.bills)
      .where(eq(schema.bills.id, id))
      .limit(1);

    if (!currentBill) {
      throw new Error(`Bill with ID ${id} not found`);
    }

    const oldStatus = currentBill.status;

    // Skip update if status hasn't actually changed
    if (oldStatus === newStatus) {
      console.log(`Bill ${id} status unchanged (${newStatus}), skipping update`);
      return;
    }

    // Update status within a transaction
    await databaseService.withTransaction(
      async (tx) => {
        await tx
          .update(schema.bills)
          .set({
            status: newStatus,
            last_action_date: new Date(),
            updated_at: new Date()
          })
          .where(eq(schema.bills.id, id));

        // Clear affected caches
        await this.clearBillCaches(id);
      },
      'updateBillStatus'
    );

    // Trigger real-time notification system (non-blocking)
    try {
      const { billStatusMonitorService } = await import('../bill-status-monitor');
      await billStatusMonitorService.handleBillStatusChange({
        bill_id: id,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        triggeredBy: user_id,
        metadata: {
          automaticChange: !user_id,
          reason: 'Manual status update'
        }
      });
    } catch (error) {
      // Log error but don't fail the status update
      logger.error('Error triggering status change notification:', { component: 'BillService' }, error as any);
    }
  }

  /**
   * Retrieves comprehensive statistics about all bills in the system.
   * This includes total counts, distribution by status and category,
   * and recent activity metrics.
   * 
   * @returns Bill statistics object
   */
  async getBillStats(): Promise<BillStats> {
    const cacheKey = CACHE_KEYS.BILL_STATS;

    // Check cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Use repository pattern
    const stats = await billRepository.getStats();

    // Cache statistics data
    await cacheService.set(cacheKey, stats, CACHE_TTL.STATIC_DATA);

    return stats;
  }

  /**
   * Records user engagement with a bill (views, comments, shares).
   * This method maintains per-user engagement tracking and triggers
   * real-time notifications for significant engagement events.
   * 
   * @param bill_id - The bill being engaged with
   * @param user_id - The user performing the engagement
   * @param engagement_type - Type of engagement: 'view', 'comment', or 'share'
   */
  async recordEngagement(
    bill_id: number,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share'
  ): Promise<void> {
    // Use repository pattern
    await billRepository.recordEngagement(bill_id, user_id, engagement_type);

    // Invalidate caches
    await this.clearBillCaches(bill_id);

    // Trigger real-time notifications for comments and shares (not views to reduce noise)
    if (engagement_type === 'comment' || engagement_type === 'share') {
      try {
        const { billStatusMonitorService } = await import('../bill-status-monitor');
        await billStatusMonitorService.handleBillEngagementUpdate({
          bill_id,
          type: engagement_type,
          user_id,
          timestamp: new Date(),
          newStats: {} // Simplified - repository handles the stats
        });
      } catch (error) {
        logger.error('Error triggering engagement notification:', { component: 'BillService' }, error as any);
        // Don't fail the engagement recording if notification fails
      }
    }
  }

  // Helper methods

  /**
   * Maps sort options to actual database columns for query building.
   */
  private getSortColumn(sortBy?: string) {
    switch (sortBy) {
      case 'title':
        return schema.bills.title;
      case 'status':
        return schema.bills.status;
      case 'engagement':
        return schema.bills.view_count;
      case 'date':
      default:
        return schema.bills.introduced_date;
    }
  }

  /**
   * Enhances a list of bills with aggregated engagement statistics.
   * Uses a single optimized query to fetch engagement data for all bills.
   */
  private async enhanceBillsWithEngagement(bills: Bill[]): Promise<BillWithEngagement[]> {
    if (bills.length === 0) return [];

    try {
      // Fetch engagement data for all bills in one query
      const bill_ids = bills.map(b => b.id);
      const engagement_data = await this.db
        .select({
          bill_id: schema.bill_engagement.bill_id,
          totalViews: sql`SUM(${schema.bill_engagement.view_count})`,
          totalComments: sql`SUM(${schema.bill_engagement.comment_count})`,
          totalShares: sql`SUM(${schema.bill_engagement.share_count})`,
          uniqueViewers: sql`COUNT(DISTINCT ${schema.bill_engagement.user_id})`,
          totalEngagements: sql`COUNT(${schema.bill_engagement.id})`
        })
        .from(schema.bill_engagement)
        .where(sql`${schema.bill_engagement.bill_id} = ANY(${bill_ids})`)
        .groupBy(schema.bill_engagement.bill_id);

      // Create efficient lookup map for O(1) access
      const engagementMap = new Map();
      engagement_data.forEach(eng => {
        engagementMap.set(eng.bill_id, {
          totalViews: Number(eng.totalViews) || 0,
          totalComments: Number(eng.totalComments) || 0,
          totalShares: Number(eng.totalShares) || 0,
          uniqueViewers: Number(eng.uniqueViewers) || 0,
          totalEngagements: Number(eng.totalEngagements) || 0
        });
      });

      // Merge engagement data with bills
      return bills.map(bill => ({
        ...bill,
        engagement: engagementMap.get(bills.id) || {
          totalViews: bills.view_count || 0,
          totalComments: 0,
          totalShares: bills.share_count || 0,
          uniqueViewers: 0,
          totalEngagements: 0
        }
      }));
    } catch (error) {
      logger.error('Error enhancing bills with engagement:', { component: 'BillService' }, error as any);
      // Return bills without engagement enhancement on error
      return bills.map(bill => ({ ...bill }));
    }
  }

  /**
   * Applies filters and pagination to fallback data when database is unavailable.
   */
  private getFallbackBillsResponse(
    filters: BillFilters,
    pagination: PaginationOptions
  ): PaginatedBillResponse {
    let filteredBills = [...this.getFallbackBills()];

    // Apply status filter
    if (filters.status) {
      filteredBills = filteredBills.filter(bill => bills.status === filters.status);
    }

    // Apply category filter
    if (filters.category) {
      filteredBills = filteredBills.filter(bill => bills.category === filters.category);
    }

    // Apply search filter across multiple text fields
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredBills = filteredBills.filter(bill =>
        bills.title.toLowerCase().includes(searchTerm) ||
        bills.summary?.toLowerCase().includes(searchTerm) ||
        bills.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedBills = filteredBills.slice(offset, offset + pagination.limit);

    return {
      bills: paginatedBills,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: filteredBills.length,
        pages: Math.ceil(filteredBills.length / pagination.limit)
      }
    };
  }

  /**
   * Clears all caches related to bills to ensure data consistency.
   * Can clear specific bill caches or general statistics caches.
   * 
   * @param bill_id - Optional specific bill ID to clear cache for
   */
  private async clearBillCaches(bill_id?: number): Promise<void> {
    try {
      // Clear general statistic caches
      await cacheService.delete(CACHE_KEYS.BILL_STATS);
      await cacheService.delete(CACHE_KEYS.BILL_CATEGORIES);
      await cacheService.delete(CACHE_KEYS.BILL_STATUSES);

      // Clear specific bill cache if provided
      if (bill_id) {
        await cacheService.delete(`${CACHE_KEYS.BILL_DETAILS}_${bill_id}`);
      }

      // Note: Search result caches rely on TTL expiration
      // Pattern-based cache deletion could be implemented for more aggressive clearing
    } catch (error) {
      logger.error('Error clearing bill caches:', { component: 'BillService' }, error as any);
      // Don't throw - cache clearing failure shouldn't break the operation
    }
  }
}

// Export singleton instance for application-wide use
export const billService = new BillService();






































