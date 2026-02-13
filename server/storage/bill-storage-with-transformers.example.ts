/**
 * Example: Bill Storage with Transformers
 * 
 * This example shows how to integrate transformers into the BillStorage class.
 * This is a reference implementation - the actual integration should be done
 * as part of task 5.3.
 * 
 * Requirements: 4.1, 4.3
 */

import { type Bill as DbBill, bills } from '@server/infrastructure/schema';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { BaseStorage } from './base';

// Import domain types and transformers
import type { Bill } from '@shared/types/domains/legislative/bill';
import type { BillId } from '@shared/types/core/branded';
import { billDbToDomain } from '@shared/utils/transformers/entities/bill';

/**
 * Bill Storage with Transformer Integration
 * 
 * Key changes from original:
 * 1. Generic type changed from DbBill to Bill (domain type)
 * 2. All methods return domain types
 * 3. Transformers used at DB boundary
 */
export class BillStorageWithTransformers extends BaseStorage<Bill> {
  constructor() {
    super({ prefix: 'bills', defaultTTL: 600 }); // 10 min cache for bills
  }

  /**
   * Get bills with filters
   * Returns array of domain Bill types
   */
  async getBills(filters?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<Bill[]> {
    // Create a unique cache key based on the filter object
    const cacheKey = `list:${JSON.stringify(filters || {})}`;

    return this.getCached(cacheKey, async () => {
      const query = this.db.select().from(bills);
      const conditions = [];

      if (filters?.category) {
        conditions.push(eq(bills.category, filters.category));
      }

      if (filters?.status) {
        conditions.push(eq(bills.status, filters.status));
      }

      if (filters?.search) {
        conditions.push(
          or(
            like(bills.title, `%${filters.search}%`),
            like(bills.summary, `%${filters.search}%`)
          )
        );
      }

      // Execute query
      let dbBills: DbBill[];
      if (conditions.length > 0) {
        dbBills = await query
          .where(and(...conditions))
          .orderBy(desc(bills.created_at));
      } else {
        dbBills = await query.orderBy(desc(bills.created_at));
      }

      // Transform DB → Domain for each bill
      return dbBills.map(dbBill => billDbToDomain.transform(dbBill as DbBill));
    });
  }

  /**
   * Get bill by ID
   * Returns domain Bill type
   */
  async getBill(id: BillId): Promise<Bill | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [dbBill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, id as string));

      // Transform DB → Domain at the boundary
      return dbBill ? billDbToDomain.transform(dbBill as DbBill) : undefined;
    });
  }

  /**
   * Create bill
   * Accepts domain Bill type, returns domain Bill type
   */
  async createBill(bill: Bill): Promise<Bill> {
    // Transform Domain → DB before insert
    const dbBill = billDbToDomain.reverse(bill);

    // Insert into database
    const [created] = await this.db
      .insert(bills)
      .values(dbBill as any)
      .returning();

    // Invalidate caches
    await this.invalidateCache('list:*');
    await this.invalidateCache('stats');

    // Transform DB → Domain before returning
    return billDbToDomain.transform(created as DbBill);
  }

  /**
   * Update bill
   * Accepts domain Bill type, returns domain Bill type
   */
  async updateBill(bill: Bill): Promise<Bill> {
    // Transform Domain → DB before update
    const dbBill = billDbToDomain.reverse(bill);

    // Update in database
    const [updated] = await this.db
      .update(bills)
      .set(dbBill as Partial<DbBill>)
      .where(eq(bills.id, bill.id as string))
      .returning();

    // Invalidate caches
    await this.invalidateCache(`id:${bill.id}`);
    await this.invalidateCache('list:*');
    await this.invalidateCache('stats');

    // Transform DB → Domain before returning
    return billDbToDomain.transform(updated as DbBill);
  }

  /**
   * Delete bill
   * Accepts domain BillId
   */
  async deleteBill(id: BillId): Promise<void> {
    await this.db
      .delete(bills)
      .where(eq(bills.id, id as string));

    // Invalidate caches
    await this.invalidateCache(`id:${id}`);
    await this.invalidateCache('list:*');
    await this.invalidateCache('stats');
  }

  /**
   * Get bill statistics
   * Returns aggregated data (no transformation needed for stats)
   */
  async getBillStats(): Promise<Array<{ status: string; count: number }>> {
    return this.getCached('stats', async () => {
      const stats = await this.db
        .select({
          status: bills.status,
          count: sql<number>`count(*)`,
        })
        .from(bills)
        .groupBy(bills.status);

      return stats.map(stat => ({
        status: stat.status,
        count: Number(stat.count),
      }));
    });
  }

  /**
   * Get bills by status
   * Returns array of domain Bill types
   */
  async getBillsByStatus(status: string): Promise<Bill[]> {
    return this.getCached(`status:${status}`, async () => {
      const dbBills = await this.db
        .select()
        .from(bills)
        .where(eq(bills.status, status))
        .orderBy(desc(bills.created_at));

      // Transform each DB bill to domain bill
      return dbBills.map(dbBill => billDbToDomain.transform(dbBill as DbBill));
    });
  }

  /**
   * Get bills by sponsor
   * Returns array of domain Bill types
   */
  async getBillsBySponsor(sponsorId: string): Promise<Bill[]> {
    return this.getCached(`sponsor:${sponsorId}`, async () => {
      const dbBills = await this.db
        .select()
        .from(bills)
        .where(eq(bills.sponsor_id, sponsorId))
        .orderBy(desc(bills.created_at));

      // Transform each DB bill to domain bill
      return dbBills.map(dbBill => billDbToDomain.transform(dbBill as DbBill));
    });
  }

  /**
   * Search bills by text
   * Returns array of domain Bill types
   */
  async searchBills(query: string, limit: number = 20): Promise<Bill[]> {
    const dbBills = await this.db
      .select()
      .from(bills)
      .where(
        or(
          like(bills.title, `%${query}%`),
          like(bills.summary, `%${query}%`),
          like(bills.bill_number, `%${query}%`)
        )
      )
      .orderBy(desc(bills.created_at))
      .limit(limit);

    // Transform each DB bill to domain bill
    return dbBills.map(dbBill => billDbToDomain.transform(dbBill as DbBill));
  }
}

/**
 * Usage Example in Service Layer
 */
export class BillServiceExample {
  constructor(private billStorage: BillStorageWithTransformers) {}

  /**
   * Service methods work with domain types
   * No transformation needed - storage handles it
   */
  async getBillById(id: BillId): Promise<Bill | null> {
    const bill = await this.billStorage.getBill(id);
    return bill ?? null;
  }

  async getAllBills(filters?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<Bill[]> {
    return await this.billStorage.getBills(filters);
  }

  async createBill(billData: {
    title: string;
    summary: string;
    status: string;
    sponsorId: string;
  }): Promise<Bill> {
    // Create domain entity
    const bill: Bill = {
      id: crypto.randomUUID() as BillId,
      billNumber: `H.R.${Date.now()}`,
      title: billData.title,
      summary: billData.summary,
      status: billData.status as any,
      chamber: 'house' as any,
      billType: 'bill' as any,
      priority: 'medium' as any,
      introductionDate: new Date(),
      congress: 118,
      session: 1,
      sponsorId: billData.sponsorId as any,
      timeline: [],
      engagement: {
        billId: crypto.randomUUID() as BillId,
        views: 0,
        comments: 0,
        shares: 0,
        endorsements: 0,
        oppositions: 0,
      },
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Storage handles transformation
    return await this.billStorage.createBill(bill);
  }

  async updateBillStatus(id: BillId, status: string): Promise<Bill> {
    const bill = await this.getBillById(id);
    if (!bill) {
      throw new Error('Bill not found');
    }

    const updated: Bill = {
      ...bill,
      status: status as any,
      updatedAt: new Date(),
    };

    return await this.billStorage.updateBill(updated);
  }
}

/**
 * Usage Example in API Route
 */
import { Router } from 'express';
import { billDomainToApi } from '@shared/utils/transformers/entities/bill';
import type { ApiBill } from '@shared/utils/transformers/entities/bill';

export function createBillRoutes(billService: BillServiceExample): Router {
  const router = Router();

  /**
   * GET /api/bills
   * Returns array of API representations
   */
  router.get('/bills', async (req, res) => {
    const filters = {
      category: req.query.category as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    };

    // Service returns domain types
    const bills = await billService.getAllBills(filters);

    // Transform Domain → API for each bill
    const apiBills: ApiBill[] = bills.map(bill =>
      billDomainToApi.transform(bill)
    );

    res.json(apiBills);
  });

  /**
   * GET /api/bills/:id
   * Returns API representation
   */
  router.get('/bills/:id', async (req, res) => {
    const billId = req.params.id as BillId;

    // Service returns domain type
    const bill = await billService.getBillById(billId);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Transform Domain → API for response
    const apiBill: ApiBill = billDomainToApi.transform(bill);

    res.json(apiBill);
  });

  /**
   * POST /api/bills
   * Accepts API representation
   */
  router.post('/bills', async (req, res) => {
    const { title, summary, status, sponsorId } = req.body;

    // Service works with domain types
    const bill = await billService.createBill({
      title,
      summary,
      status,
      sponsorId,
    });

    // Transform Domain → API for response
    const apiBill: ApiBill = billDomainToApi.transform(bill);

    res.status(201).json(apiBill);
  });

  /**
   * PATCH /api/bills/:id/status
   * Updates bill status
   */
  router.patch('/bills/:id/status', async (req, res) => {
    const billId = req.params.id as BillId;
    const { status } = req.body;

    // Service works with domain types
    const bill = await billService.updateBillStatus(billId, status);

    // Transform Domain → API for response
    const apiBill: ApiBill = billDomainToApi.transform(bill);

    res.json(apiBill);
  });

  return router;
}
