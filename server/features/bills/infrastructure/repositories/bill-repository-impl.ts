import { eq, desc, and, sql, count, like, or, inArray } from 'drizzle-orm';
import { databaseService } from '../../../../infrastructure/database/database-service';
import { bills, bill_engagement, sponsors } from '@shared/schema/foundation';
import { IBillRepository } from '../../domain/repositories/bill-repository';
import { BillFilters, PaginationOptions } from '../../application/bill-service';

export class BillRepositoryImpl implements IBillRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  async findById(id: number): Promise<any | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [bill] = await this.db
          .select()
          .from(bills)
          .where(eq(bills.id, id));
        return bill || null;
      },
      null,
      `findBillById:${id}`
    );
    return result.data;
  }

  async findAll(filters: BillFilters = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<any[]> {
    const result = await databaseService.withFallback(
      async () => {
        const offset = (pagination.page - 1) * pagination.limit;
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
              sql`LOWER(${bills.description}) LIKE ${searchTerm}`,
              sql`LOWER(${bills.bill_number}) LIKE ${searchTerm}`
            )
          );
        }

        if (filters.dateFrom) {
          conditions.push(sql`${bills.introduced_date} >= ${filters.dateFrom}`);
        }

        if (filters.dateTo) {
          conditions.push(sql`${bills.introduced_date} <= ${filters.dateTo}`);
        }

        let query = this.db.select().from(bills);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const sortColumn = this.getSortColumn(pagination.sortBy);
        if (pagination.sortOrder === 'asc') {
          query = query.orderBy(sortColumn);
        } else {
          query = query.orderBy(desc(sortColumn));
        }

        return await query.limit(pagination.limit).offset(offset);
      },
      [],
      'findAllBills'
    );
    return result.data;
  }

  async create(bill: any): Promise<any> {
    const result = await databaseService.withTransaction(
      async (tx) => {
        const [newBill] = await tx
          .insert(bills)
          .values({
            ...bill,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning();
        return newBill;
      },
      'createBill'
    );
    return result.data;
  }

  async update(id: number, updates: Partial<any>): Promise<any | null> {
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
    return result.data;
  }

  async delete(id: number): Promise<boolean> {
    const result = await databaseService.withTransaction(
      async (tx) => {
        const result = await tx
          .delete(bills)
          .where(eq(bills.id, id));

        return result.rowCount > 0;
      },
      'deleteBill'
    );
    return result.data;
  }

  async recordEngagement(billId: number, userId: string, type: 'view' | 'comment' | 'share'): Promise<void> {
    await databaseService.withFallback(
      async () => {
        // Check if engagement already exists
        const [existingEngagement] = await this.db
          .select()
          .from(bill_engagement)
          .where(
            and(
              eq(bill_engagement.bill_id, billId),
              eq(bill_engagement.user_id, userId)
            )
          );

        if (existingEngagement) {
          // Update existing engagement
          const updates: any = {
            lastEngaged: new Date(),
            updated_at: new Date()
          };

          switch (type) {
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

          await this.db
            .update(bill_engagement)
            .set(updates)
            .where(eq(bill_engagement.id, existingEngagement.id));
        } else {
          // Create new engagement
          const engagement_data: any = {
            bill_id: billId,
            user_id: userId,
            view_count: type === 'view' ? 1 : 0,
            comment_count: type === 'comment' ? 1 : 0,
            share_count: type === 'share' ? 1 : 0,
            engagement_score: "1",
            lastEngaged: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          };

          await this.db.insert(bill_engagement).values(engagement_data);
        }

        // Update bill-level counters
        if (type === 'view' || type === 'share') {
          const updateField = type === 'view' ? 'view_count' : 'share_count';
          await this.db
            .update(bills)
            .set({
              [updateField]: sql`${bills[updateField]} + 1`,
              updated_at: new Date()
            })
            .where(eq(bills.id, billId));
        }
      },
      undefined,
      `recordEngagement:${billId}:${userId}:${type}`
    );
  }

  async getEngagementStats(billId: number): Promise<{
    totalViews: number;
    totalComments: number;
    totalShares: number;
    uniqueViewers: number;
    totalEngagements: number;
  }> {
    const result = await databaseService.withFallback(
      async () => {
        const [stats] = await this.db
          .select({
            totalViews: sql`COALESCE(SUM(${bill_engagement.view_count}), 0)`,
            totalComments: sql`COALESCE(SUM(${bill_engagement.comment_count}), 0)`,
            totalShares: sql`COALESCE(SUM(${bill_engagement.share_count}), 0)`,
            uniqueViewers: sql`COUNT(DISTINCT ${bill_engagement.user_id})`,
            totalEngagements: sql`COUNT(${bill_engagement.id})`
          })
          .from(bill_engagement)
          .where(eq(bill_engagement.bill_id, billId));

        return {
          totalViews: Number(stats.totalViews) || 0,
          totalComments: Number(stats.totalComments) || 0,
          totalShares: Number(stats.totalShares) || 0,
          uniqueViewers: Number(stats.uniqueViewers) || 0,
          totalEngagements: Number(stats.totalEngagements) || 0
        };
      },
      {
        totalViews: 0,
        totalComments: 0,
        totalShares: 0,
        uniqueViewers: 0,
        totalEngagements: 0
      },
      `getEngagementStats:${billId}`
    );
    return result.data;
  }

  async getStats(): Promise<{
    totalBills: number;
    billsByStatus: Array<{ status: string; count: number }>;
    billsByCategory: Array<{ category: string; count: number }>;
    recentActivity: number;
  }> {
    const result = await databaseService.withFallback(
      async () => {
        const [totalResult] = await this.db
          .select({ count: count() })
          .from(bills);

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

        return {
          totalBills: totalResult.count,
          billsByStatus: statusResults.map(r => ({ status: r.status, count: r.count })),
          billsByCategory: categoryResults.map(r => ({ category: r.category || 'uncategorized', count: r.count })),
          recentActivity: recentActivityResult.count
        };
      },
      {
        totalBills: 0,
        billsByStatus: [],
        billsByCategory: [],
        recentActivity: 0
      },
      'getBillStats'
    );
    return result.data;
  }

  async search(query: string, filters?: BillFilters): Promise<any[]> {
    const result = await databaseService.withFallback(
      async () => {
        const searchTerm = `%${query.toLowerCase()}%`;
        const conditions = [
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.description}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.bill_number}) LIKE ${searchTerm}`
          )
        ];

        if (filters?.status) {
          conditions.push(eq(bills.status, filters.status as any));
        }

        if (filters?.category) {
          conditions.push(eq(bills.category, filters.category));
        }

        return await this.db
          .select()
          .from(bills)
          .where(and(...conditions))
          .limit(50);
      },
      [],
      `searchBills:${query}`
    );
    return result.data;
  }

  async getByStatus(status: string): Promise<any[]> {
    const result = await databaseService.withFallback(
      async () => {
        return await this.db
          .select()
          .from(bills)
          .where(eq(bills.status, status as any));
      },
      [],
      `getBillsByStatus:${status}`
    );
    return result.data;
  }

  async getByCategory(category: string): Promise<any[]> {
    const result = await databaseService.withFallback(
      async () => {
        return await this.db
          .select()
          .from(bills)
          .where(eq(bills.category, category));
      },
      [],
      `getBillsByCategory:${category}`
    );
    return result.data;
  }

  async getBySponsor(sponsorId: number): Promise<any[]> {
    const result = await databaseService.withFallback(
      async () => {
        return await this.db
          .select()
          .from(bills)
          .where(eq(bills.sponsor_id, sponsorId));
      },
      [],
      `getBillsBySponsor:${sponsorId}`
    );
    return result.data;
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
}

export const billRepository = new BillRepositoryImpl();