import { eq, desc, and, sql, count, ilike, or, asc } from "drizzle-orm";
import { databaseService } from "../../infrastructure/database/database-service.js";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../../infrastructure/cache/cache-service.js";
import { SearchIndexManager } from "../search/infrastructure/SearchIndexManager.js";
import * as schema from "../../../shared/schema.js";
import { Bill, InsertBill, BillEngagement } from "../../../shared/schema.js";
import { logger } from '../../utils/logger';

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

export interface BillWithEngagement extends Bill {
  engagement?: {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    uniqueViewers: number;
    totalEngagements: number;
  };
  recentComments?: any[];
  sponsorInfo?: {
    id: number;
    name: string;
    role: string;
    party?: string;
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
 */
export class BillService {
  private db = databaseService.getDatabase();

  // Enhanced fallback data with more comprehensive examples
  private getFallbackBills(): BillWithEngagement[] {
    return [
      {
        id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        summary: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights.",
        status: "committee_review",
        category: "technology",
        introducedDate: new Date("2024-01-15"),
        billNumber: "HR-2024-001",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Economy and Data Protection Act...",
        tags: ["privacy", "technology", "digital-rights"],
        viewCount: 1250,
        shareCount: 89,
        commentCount: 45,
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
        status: "first_reading",
        category: "environment",
        introducedDate: new Date("2024-02-01"),
        billNumber: "S-2024-042",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Change Adaptation Fund Bill...",
        tags: ["climate", "energy", "environment"],
        viewCount: 2100,
        shareCount: 156,
        commentCount: 78,
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
   * Get all bills with filtering, pagination, and sorting
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedBillResponse> {
    const cacheKey = CACHE_KEYS.BILL_SEARCH(
      filters.search || 'all',
      JSON.stringify({ ...filters, ...pagination })
    );

    // Try to get from cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        metadata: {
          source: 'database',
          timestamp: new Date(),
          cacheHit: true
        }
      };
    }

    const result = await databaseService.withFallback(
      async () => {
        const offset = (pagination.page - 1) * pagination.limit;
        
        // Build query conditions
        const conditions: any[] = [];
        
        if (filters.status) {
          conditions.push(eq(schema.bills.status, filters.status));
        }
        
        if (filters.category) {
          conditions.push(eq(schema.bills.category, filters.category));
        }
        
        if (filters.sponsorId) {
          conditions.push(eq(schema.bills.sponsorId, filters.sponsorId));
        }
        
        if (filters.search) {
          const searchTerm = `%${filters.search}%`;
          conditions.push(
            or(
              ilike(schema.bills.title, searchTerm),
              ilike(schema.bills.summary, searchTerm),
              ilike(schema.bills.description, searchTerm),
              ilike(schema.bills.billNumber, searchTerm)
            )
          );
        }
        
        if (filters.dateFrom) {
          conditions.push(sql`${schema.bills.introducedDate} >= ${filters.dateFrom}`);
        }
        
        if (filters.dateTo) {
          conditions.push(sql`${schema.bills.introducedDate} <= ${filters.dateTo}`);
        }

        // Build base query
        let query = this.db.select().from(schema.bills);
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        // Apply sorting
        const sortColumn = this.getSortColumn(pagination.sortBy);
        const sortDirection = pagination.sortOrder === 'asc' ? asc : desc;
        query = query.orderBy(sortDirection(sortColumn));

        // Execute queries in parallel
        const [bills, totalResult] = await Promise.all([
          query.limit(pagination.limit).offset(offset),
          this.db
            .select({ count: count() })
            .from(schema.bills)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
        ]);

        // Enhance bills with engagement data
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

    // Cache the result
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
   * Get a specific bill by ID with comprehensive data
   */
  async getBillById(id: number): Promise<BillWithEngagement | null> {
    const cacheKey = CACHE_KEYS.BILL_DETAILS(id);

    // Try cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await databaseService.withFallback(
      async () => {
        const [bill] = await this.db
          .select()
          .from(schema.bills)
          .where(eq(schema.bills.id, id));

        if (!bill) {
          return null;
        }

        // Get engagement statistics
        const [engagementStats] = await this.db
          .select({
            totalViews: sql<number>`COALESCE(SUM(${schema.billEngagement.viewCount}), 0)`,
            totalComments: sql<number>`COALESCE(SUM(${schema.billEngagement.commentCount}), 0)`,
            totalShares: sql<number>`COALESCE(SUM(${schema.billEngagement.shareCount}), 0)`,
            uniqueViewers: sql<number>`COUNT(DISTINCT ${schema.billEngagement.userId})`,
            totalEngagements: sql<number>`COUNT(${schema.billEngagement.id})`
          })
          .from(schema.billEngagement)
          .where(eq(schema.billEngagement.billId, id));

        // Get recent comments
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

        // Get sponsor information if available
        let sponsorInfo = null;
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
          
          sponsorInfo = sponsor || null;
        }

        return {
          ...bill,
          engagement: engagementStats,
          recentComments,
          sponsorInfo
        };
      },
      this.getFallbackBills().find(b => b.id === id) || null,
      `getBillById(${id})`
    );

    // Cache the result if from database
    if (result.source === 'database' && result.data) {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.BILL_DATA);
    }

    return result.data;
  }

  /**
   * Create a new bill
   */
  async createBill(billData: InsertBill): Promise<Bill> {
    const result = await databaseService.withTransaction(
      async (tx) => {
        // Insert the bill
        const [newBill] = await tx
          .insert(schema.bills)
          .values({
            ...billData,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Initialize engagement tracking
        await tx.insert(schema.billEngagement).values({
          billId: newBill.id,
          userId: '00000000-0000-0000-0000-000000000000', // system user
          viewCount: 0,
          commentCount: 0,
          shareCount: 0,
          engagementScore: "0",
          lastEngaged: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Clear relevant caches
        await this.clearBillCaches();

        // Queue bill for search index update
        // TODO: Implement index update for new SearchIndexManager

        return newBill;
      },
      'createBill'
    );

    return result.data;
  }

  /**
   * Update a bill
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

        // Clear caches
        await this.clearBillCaches(id);

        // Queue bill for search index update
        // TODO: Implement index update for new SearchIndexManager

        return updatedBill;
      },
      'updateBill'
    );

    return result.data;
  }

  /**
   * Update bill status with audit trail and real-time notifications
   */
  async updateBillStatus(id: number, newStatus: string, userId?: string): Promise<void> {
    // Get current bill status before update
    const [currentBill] = await this.db
      .select({ status: schema.bills.status })
      .from(schema.bills)
      .where(eq(schema.bills.id, id))
      .limit(1);

    if (!currentBill) {
      throw new Error(`Bill with ID ${id} not found`);
    }

    const oldStatus = currentBill.status;

    // Only proceed if status is actually changing
    if (oldStatus === newStatus) {
      console.log(`Bill ${id} status unchanged (${newStatus}), skipping update`);
      return;
    }

    await databaseService.withTransaction(
      async (tx) => {
        // Update the bill status
        await tx
          .update(schema.bills)
          .set({
            status: newStatus,
            lastActionDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(schema.bills.id, id));

        // TODO: Add audit log entry when audit table is available
        // await this.createAuditLog(tx, id, 'status_change', { newStatus, userId });

        // Clear caches
        await this.clearBillCaches(id);
      },
      'updateBillStatus'
    );

    // Trigger real-time status change notification
    try {
      const { billStatusMonitorService } = await import('./bill-status-monitor.js');
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
      logger.error('Error triggering status change notification:', { component: 'SimpleTool' }, error as any);
      // Don't fail the status update if notification fails
    }
  }

  /**
   * Get bill statistics
   */
  async getBillStats(): Promise<BillStats> {
    const cacheKey = CACHE_KEYS.BILL_STATS();
    
    // Try cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await databaseService.withFallback(
      async () => {
        // Get total bills count
        const [totalResult] = await this.db
          .select({ count: count() })
          .from(schema.bills);

        // Get bills by status
        const statusResults = await this.db
          .select({
            status: schema.bills.status,
            count: count()
          })
          .from(schema.bills)
          .groupBy(schema.bills.status);

        // Get bills by category
        const categoryResults = await this.db
          .select({
            category: schema.bills.category,
            count: count()
          })
          .from(schema.bills)
          .where(sql`${schema.bills.category} IS NOT NULL`)
          .groupBy(schema.bills.category);

        // Get recent activity (bills updated in last 7 days)
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

    // Cache the result
    if (result.source === 'database') {
      await cacheService.set(cacheKey, result.data, CACHE_TTL.STATIC_DATA);
    }

    return result.data;
  }

  /**
   * Record bill engagement (view, comment, share) with real-time notifications
   */
  async recordEngagement(
    billId: number,
    userId: string,
    engagementType: 'view' | 'comment' | 'share'
  ): Promise<void> {
    let newStats: any = {};

    await databaseService.withFallback(
      async () => {
        // Check if engagement record exists
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
          // Update existing engagement
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

          // Calculate new stats
          newStats = {
            totalViews: existingEngagement.viewCount + (engagementType === 'view' ? 1 : 0),
            totalComments: existingEngagement.commentCount + (engagementType === 'comment' ? 1 : 0),
            totalShares: existingEngagement.shareCount + (engagementType === 'share' ? 1 : 0),
            engagementScore: parseFloat(existingEngagement.engagementScore || '0') + 1
          };
        } else {
          // Create new engagement record
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

          // Set initial stats
          newStats = {
            totalViews: engagementType === 'view' ? 1 : 0,
            totalComments: engagementType === 'comment' ? 1 : 0,
            totalShares: engagementType === 'share' ? 1 : 0,
            engagementScore: 1
          };
        }

        // Update bill view/share count
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

        // Clear caches
        await this.clearBillCaches(billId);
      },
      undefined,
      `recordEngagement(${billId}, ${userId}, ${engagementType})`
    );

    // Trigger real-time engagement notification (only for comments and shares)
    if (engagementType === 'comment' || engagementType === 'share') {
      try {
        const { billStatusMonitorService } = await import('./bill-status-monitor.js');
        await billStatusMonitorService.handleBillEngagementUpdate({
          billId,
          type: engagementType,
          userId,
          timestamp: new Date(),
          newStats
        });
      } catch (error) {
        logger.error('Error triggering engagement notification:', { component: 'SimpleTool' }, error as any);
        // Don't fail the engagement recording if notification fails
      }
    }
  }

  // Helper methods

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

  private async enhanceBillsWithEngagement(bills: Bill[]): Promise<BillWithEngagement[]> {
    if (bills.length === 0) return [];

    try {
      // Get engagement data for all bills in a single query
      const billIds = bills.map(b => b.id);
      const engagementData = await this.db
        .select({
          billId: schema.billEngagement.billId,
          totalViews: sql<number>`SUM(${schema.billEngagement.viewCount})`,
          totalComments: sql<number>`SUM(${schema.billEngagement.commentCount})`,
          totalShares: sql<number>`SUM(${schema.billEngagement.shareCount})`,
          uniqueViewers: sql<number>`COUNT(DISTINCT ${schema.billEngagement.userId})`,
          totalEngagements: sql<number>`COUNT(${schema.billEngagement.id})`
        })
        .from(schema.billEngagement)
        .where(sql`${schema.billEngagement.billId} = ANY(${billIds})`)
        .groupBy(schema.billEngagement.billId);

      // Create engagement lookup map
      const engagementMap = new Map();
      engagementData.forEach(eng => {
        engagementMap.set(eng.billId, {
          totalViews: eng.totalViews || 0,
          totalComments: eng.totalComments || 0,
          totalShares: eng.totalShares || 0,
          uniqueViewers: eng.uniqueViewers || 0,
          totalEngagements: eng.totalEngagements || 0
        });
      });

      // Enhance bills with engagement data
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
      logger.error('Error enhancing bills with engagement:', { component: 'SimpleTool' }, error as any);
      // Return bills without engagement data
      return bills.map(bill => ({ ...bill }));
    }
  }

  private getFallbackBillsResponse(
    filters: BillFilters,
    pagination: PaginationOptions
  ): PaginatedBillResponse {
    let filteredBills = [...this.getFallbackBills()];

    // Apply filters
    if (filters.status) {
      filteredBills = filteredBills.filter(bill => bill.status === filters.status);
    }
    if (filters.category) {
      filteredBills = filteredBills.filter(bill => bill.category === filters.category);
    }
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

  private async clearBillCaches(billId?: number): Promise<void> {
    try {
      // Clear general caches
      await cacheService.delete(CACHE_KEYS.BILL_STATS());
      await cacheService.delete(CACHE_KEYS.BILL_CATEGORIES());
      await cacheService.delete(CACHE_KEYS.BILL_STATUSES());

      // Clear specific bill cache if ID provided
      if (billId) {
        await cacheService.delete(CACHE_KEYS.BILL_DETAILS(billId));
      }

      // Clear search result caches (pattern-based deletion would be ideal)
      // For now, we'll rely on TTL expiration
    } catch (error) {
      logger.error('Error clearing bill caches:', { component: 'SimpleTool' }, error as any);
    }
  }
}

// Export singleton instance
export const billService = new BillService();








