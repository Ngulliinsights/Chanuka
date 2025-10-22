import { eq, desc, and, sql, count, like, or } from "drizzle-orm";
import { databaseService } from '../../../infrastructure/database/database-service';
import * as schema from "../../../../shared/schema/schema.js";
import type { Bill, InsertBill, BillEngagement } from "../../../../shared/schema/schema.js";
import { logger } from '../../../../shared/core';

// Simple cache service mock for now
const cacheService = {
  get: async (key: string) => null,
  set: async (key: string, value: any, ttl?: number) => {},
  delete: async (key: string) => {},
  clear: async () => {}
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
  sponsorId?: number;
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
    createdAt: Date;
    userId: string;
    isVerified: boolean;
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
        introducedDate: new Date("2024-01-15"),
        billNumber: "HR-2024-001",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Economy and Data Protection Act...",
        viewCount: 1250,
        shareCount: 89,
        engagementScore: "156",
        complexityScore: 7,
        constitutionalConcerns: {
          concerns: ["First Amendment implications", "Commerce Clause considerations"],
          severity: "medium"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["citizens", "privacy advocates"],
          potential_opponents: ["tech companies", "data brokers"],
          economic_impact: "moderate"
        },
        sponsorId: null,
        lastActionDate: new Date("2024-01-20"),
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-20"),
        commentCountCached: 0,
        searchVector: null,
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
        introducedDate: new Date("2024-02-01"),
        billNumber: "S-2024-042",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Change Adaptation Fund Bill...",
        viewCount: 2100,
        shareCount: 156,
        engagementScore: "234",
        complexityScore: 9,
        constitutionalConcerns: {
          concerns: ["Interstate Commerce regulation", "Federal vs State authority"],
          severity: "low"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["environmental groups", "renewable energy sector"],
          potential_opponents: ["fossil fuel industry", "traditional utilities"],
          economic_impact: "significant"
        },
        sponsorId: null,
        lastActionDate: new Date("2024-02-05"),
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-05"),
        commentCountCached: 0,
        searchVector: null,
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

    // Execute database query with fallback handling
    const result = await databaseService.withFallback(
      async () => {
        const offset = (pagination.page - 1) * pagination.limit;
        
        // Build dynamic query conditions based on provided filters
        const conditions: any[] = [];
        
        if (filters.status) {
          conditions.push(eq(schema.bills.status, filters.status as any));
        }
        
        if (filters.category) {
          conditions.push(eq(schema.bills.category, filters.category));
        }
        
        if (filters.sponsorId) {
          conditions.push(eq(schema.bills.sponsorId, filters.sponsorId));
        }
        
        // Implement case-insensitive search across multiple text fields
        if (filters.search) {
          const searchTerm = `%${filters.search.toLowerCase()}%`;
          conditions.push(
            or(
              sql`LOWER(${schema.bills.title}) LIKE ${searchTerm}`,
              sql`LOWER(${schema.bills.summary}) LIKE ${searchTerm}`,
              sql`LOWER(${schema.bills.description}) LIKE ${searchTerm}`,
              sql`LOWER(${schema.bills.billNumber}) LIKE ${searchTerm}`
            )
          );
        }
        
        // Date range filtering for introduced date
        if (filters.dateFrom) {
          conditions.push(sql`${schema.bills.introducedDate} >= ${filters.dateFrom}`);
        }
        
        if (filters.dateTo) {
          conditions.push(sql`${schema.bills.introducedDate} <= ${filters.dateTo}`);
        }

        // Construct the base query
        let query = this.db.select().from(schema.bills);
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        // Apply sorting based on user preference
        const sortColumn = this.getSortColumn(pagination.sortBy);
        if (pagination.sortOrder === 'asc') {
          query = query.orderBy(sortColumn);
        } else {
          query = query.orderBy(desc(sortColumn));
        }

        // Execute both data and count queries in parallel for efficiency
        const [bills, totalResult] = await Promise.all([
          query.limit(pagination.limit).offset(offset),
          this.db
            .select({ count: count() })
            .from(schema.bills)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
        ]);

        // Enhance bills with engagement statistics
        const enhancedBills = await this.enhanceBillsWithEngagement(bills);

        const total = totalResult[0]?.count || 0;

        return {
          bills: enhancedBills,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages: Math.ceil(total / pagination.limit)
          }
        };
      },
      this.getFallbackBillsResponse(filters, pagination),
      'getAllBills'
    );

    // Cache successful database results
    if (result.source === 'database') {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.SEARCH_RESULTS);
    }

    return {
      ...result.data,
      metadata: {
        source: result.source,
        timestamp: result.timestamp,
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

    const result = await databaseService.withFallback(
      async () => {
        // Fetch the base bill data
        const [bill] = await this.db
          .select()
          .from(schema.bills)
          .where(eq(schema.bills.id, id));

        if (!bill) {
          return null;
        }

        // Aggregate engagement statistics across all user interactions
        const [engagementStats] = await this.db
          .select({
            totalViews: sql`COALESCE(SUM(${schema.billEngagement.viewCount}), 0)`,
            totalComments: sql`COALESCE(SUM(${schema.billEngagement.commentCount}), 0)`,
            totalShares: sql`COALESCE(SUM(${schema.billEngagement.shareCount}), 0)`,
            uniqueViewers: sql`COUNT(DISTINCT ${schema.billEngagement.userId})`,
            totalEngagements: sql`COUNT(${schema.billEngagement.id})`
          })
          .from(schema.billEngagement)
          .where(eq(schema.billEngagement.billId, id));

        // Fetch the 5 most recent comments for preview
        const recentComments = await this.db
          .select({
            id: schema.billComments.id,
            content: schema.billComments.content,
            commentType: schema.billComments.commentType,
            upvotes: schema.billComments.upvotes,
            downvotes: schema.billComments.downvotes,
            createdAt: schema.billComments.createdAt,
            userId: schema.billComments.userId,
            isVerified: schema.billComments.isVerified
          })
          .from(schema.billComments)
          .where(eq(schema.billComments.billId, id))
          .orderBy(desc(schema.billComments.createdAt))
          .limit(5);

        // Get sponsor details if the bill has a sponsor
        let sponsorInfo: {
          id: number;
          name: string;
          role: string;
          party?: string | null;
        } | null = null;
        if (bill.sponsorId) {
          const [sponsor] = await this.db
            .select({
              id: schema.sponsors.id,
              name: schema.sponsors.name,
              role: schema.sponsors.role,
              party: schema.sponsors.party
            })
            .from(schema.sponsors)
            .where(eq(schema.sponsors.id, bill.sponsorId));

          sponsorInfo = sponsor ? {
            id: sponsor.id,
            name: sponsor.name,
            role: sponsor.role,
            party: sponsor.party
          } : null;
        }

        // Combine all data into a comprehensive bill object
        return {
          ...bill,
          engagement: {
            totalViews: Number(engagementStats.totalViews) || 0,
            totalComments: Number(engagementStats.totalComments) || 0,
            totalShares: Number(engagementStats.totalShares) || 0,
            uniqueViewers: Number(engagementStats.uniqueViewers) || 0,
            totalEngagements: Number(engagementStats.totalEngagements) || 0
          },
          recentComments,
          sponsorInfo
        };
      },
      this.getFallbackBills().find(b => b.id === id) || null,
      `getBillById(${id})`
    );

    // Cache the result for faster subsequent access
    if (result.source === 'database' && result.data) {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.BILL_DETAILS);
    }

    return result.data;
  }

  /**
   * Creates a new bill in the database with initial engagement tracking.
   * This operation is wrapped in a transaction to ensure data consistency.
   * 
   * @param billData - The bill data to insert
   * @returns The newly created bill
   */
  async createBill(billData: InsertBill): Promise<Bill> {
    const result = await databaseService.withTransaction(
      async (tx) => {
        // Insert the new bill with timestamps
        const [newBill] = await tx
          .insert(schema.bills)
          .values({
            ...billData,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Initialize engagement tracking for the new bill
        await tx.insert(schema.billEngagement).values({
          billId: newBill.id,
          userId: '00000000-0000-0000-0000-000000000000', // System user placeholder
          viewCount: 0,
          commentCount: 0,
          shareCount: 0,
          engagementScore: "0",
          lastEngaged: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Clear caches to reflect the new bill
        await this.clearBillCaches();

        return newBill;
      },
      'createBill'
    );

    return result.data;
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
    const result = await databaseService.withTransaction(
      async (tx) => {
        const [updatedBill] = await tx
          .update(schema.bills)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(schema.bills.id, id))
          .returning();

        if (!updatedBill) {
          return null;
        }

        // Invalidate caches for this specific bill
        await this.clearBillCaches(id);

        return updatedBill;
      },
      'updateBill'
    );

    return result.data;
  }

  /**
   * Updates bill status with audit trail and real-time notifications.
   * This method includes status change detection to avoid unnecessary updates
   * and triggers notifications to relevant stakeholders.
   * 
   * @param id - The bill ID
   * @param newStatus - The new status to set
   * @param userId - Optional user ID who triggered the change
   */
  async updateBillStatus(id: number, newStatus: string, userId?: string): Promise<void> {
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
            lastActionDate: new Date(),
            updatedAt: new Date()
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
        billId: id,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        triggeredBy: userId,
        metadata: {
          automaticChange: !userId,
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

    const result = await databaseService.withFallback(
      async () => {
        // Get total bill count
        const [totalResult] = await this.db
          .select({ count: count() })
          .from(schema.bills);

        // Group bills by status for distribution analysis
        const statusResults = await this.db
          .select({
            status: schema.bills.status,
            count: count()
          })
          .from(schema.bills)
          .groupBy(schema.bills.status);

        // Group bills by category
        const categoryResults = await this.db
          .select({
            category: schema.bills.category,
            count: count()
          })
          .from(schema.bills)
          .where(sql`${schema.bills.category} IS NOT NULL`)
          .groupBy(schema.bills.category);

        // Calculate recent activity (bills updated in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const [recentActivityResult] = await this.db
          .select({ count: count() })
          .from(schema.bills)
          .where(sql`${schema.bills.updatedAt} >= ${sevenDaysAgo}`);

        return {
          totalBills: totalResult.count,
          billsByStatus: statusResults.map(r => ({ status: r.status, count: r.count })),
          billsByCategory: categoryResults.map(r => ({ category: r.category || 'uncategorized', count: r.count })),
          recentActivity: recentActivityResult.count
        };
      },
      {
        totalBills: this.getFallbackBills().length,
        billsByStatus: [
          { status: 'committee_review', count: 1 },
          { status: 'first_reading', count: 1 }
        ],
        billsByCategory: [
          { category: 'technology', count: 1 },
          { category: 'environment', count: 1 }
        ],
        recentActivity: 2
      },
      'getBillStats'
    );

    // Cache statistics data
    if (result.source === 'database') {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.STATIC_DATA);
    }

    return result.data;
  }

  /**
   * Records user engagement with a bill (views, comments, shares).
   * This method maintains per-user engagement tracking and triggers
   * real-time notifications for significant engagement events.
   * 
   * @param billId - The bill being engaged with
   * @param userId - The user performing the engagement
   * @param engagementType - Type of engagement: 'view', 'comment', or 'share'
   */
  async recordEngagement(
    billId: number,
    userId: string,
    engagementType: 'view' | 'comment' | 'share'
  ): Promise<void> {
    let newStats: any = {};

    await databaseService.withFallback(
      async () => {
        // Check if this user has already engaged with this bill
        const [existingEngagement] = await this.db
          .select()
          .from(schema.billEngagement)
          .where(
            and(
              eq(schema.billEngagement.billId, billId),
              eq(schema.billEngagement.userId, userId)
            )
          );

        if (existingEngagement) {
          // Update existing engagement record by incrementing appropriate counter
          const updates: any = {
            lastEngaged: new Date(),
            updatedAt: new Date()
          };

          switch (engagementType) {
            case 'view':
              updates.viewCount = sql`${schema.billEngagement.viewCount} + 1`;
              break;
            case 'comment':
              updates.commentCount = sql`${schema.billEngagement.commentCount} + 1`;
              break;
            case 'share':
              updates.shareCount = sql`${schema.billEngagement.shareCount} + 1`;
              break;
          }

          await this.db
            .update(schema.billEngagement)
            .set(updates)
            .where(eq(schema.billEngagement.id, existingEngagement.id));

          // Calculate new statistics for notification
          newStats = {
            totalViews: existingEngagement.viewCount + (engagementType === 'view' ? 1 : 0),
            totalComments: existingEngagement.commentCount + (engagementType === 'comment' ? 1 : 0),
            totalShares: existingEngagement.shareCount + (engagementType === 'share' ? 1 : 0),
            engagementScore: parseFloat(existingEngagement.engagementScore || '0') + 1
          };
        } else {
          // Create first engagement record for this user-bill pair
          const engagementData: any = {
            billId,
            userId,
            viewCount: engagementType === 'view' ? 1 : 0,
            commentCount: engagementType === 'comment' ? 1 : 0,
            shareCount: engagementType === 'share' ? 1 : 0,
            engagementScore: "1",
            lastEngaged: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await this.db.insert(schema.billEngagement).values(engagementData);

          // Set initial statistics
          newStats = {
            totalViews: engagementType === 'view' ? 1 : 0,
            totalComments: engagementType === 'comment' ? 1 : 0,
            totalShares: engagementType === 'share' ? 1 : 0,
            engagementScore: 1
          };
        }

        // Update bill-level counters for views and shares
        if (engagementType === 'view' || engagementType === 'share') {
          const updateField = engagementType === 'view' ? 'viewCount' : 'shareCount';
          await this.db
            .update(schema.bills)
            .set({
              [updateField]: sql`${schema.bills[updateField]} + 1`,
              updatedAt: new Date()
            })
            .where(eq(schema.bills.id, billId));
        }

        // Invalidate caches
        await this.clearBillCaches(billId);
      },
      undefined,
      `recordEngagement(${billId}, ${userId}, ${engagementType})`
    );

    // Trigger real-time notifications for comments and shares (not views to reduce noise)
    if (engagementType === 'comment' || engagementType === 'share') {
      try {
        const { billStatusMonitorService } = await import('../bill-status-monitor');
        await billStatusMonitorService.handleBillEngagementUpdate({
          billId,
          type: engagementType,
          userId,
          timestamp: new Date(),
          newStats
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
        return schema.bills.viewCount;
      case 'date':
      default:
        return schema.bills.introducedDate;
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
      const billIds = bills.map(b => b.id);
      const engagementData = await this.db
        .select({
          billId: schema.billEngagement.billId,
          totalViews: sql`SUM(${schema.billEngagement.viewCount})`,
          totalComments: sql`SUM(${schema.billEngagement.commentCount})`,
          totalShares: sql`SUM(${schema.billEngagement.shareCount})`,
          uniqueViewers: sql`COUNT(DISTINCT ${schema.billEngagement.userId})`,
          totalEngagements: sql`COUNT(${schema.billEngagement.id})`
        })
        .from(schema.billEngagement)
        .where(sql`${schema.billEngagement.billId} = ANY(${billIds})`)
        .groupBy(schema.billEngagement.billId);

      // Create efficient lookup map for O(1) access
      const engagementMap = new Map();
      engagementData.forEach(eng => {
        engagementMap.set(eng.billId, {
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
        engagement: engagementMap.get(bill.id) || {
          totalViews: bill.viewCount || 0,
          totalComments: 0,
          totalShares: bill.shareCount || 0,
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
      filteredBills = filteredBills.filter(bill => bill.status === filters.status);
    }

    // Apply category filter
    if (filters.category) {
      filteredBills = filteredBills.filter(bill => bill.category === filters.category);
    }

    // Apply search filter across multiple text fields
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredBills = filteredBills.filter(bill =>
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.summary?.toLowerCase().includes(searchTerm) ||
        bill.description?.toLowerCase().includes(searchTerm)
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
   * @param billId - Optional specific bill ID to clear cache for
   */
  private async clearBillCaches(billId?: number): Promise<void> {
    try {
      // Clear general statistic caches
      await cacheService.delete(CACHE_KEYS.BILL_STATS);
      await cacheService.delete(CACHE_KEYS.BILL_CATEGORIES);
      await cacheService.delete(CACHE_KEYS.BILL_STATUSES);

      // Clear specific bill cache if provided
      if (billId) {
        await cacheService.delete(`${CACHE_KEYS.BILL_DETAILS}_${billId}`);
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





































