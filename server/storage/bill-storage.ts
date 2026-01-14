import { type Bill,bills } from '@server/infrastructure/schema';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';

import { BaseStorage } from './base';

export class BillStorage extends BaseStorage<Bill> {
  constructor() {
    super({ prefix: 'bills', defaultTTL: 600 }); // 10 min cache for bills
  }

  async getBills(filters?: { category?: string; status?: string; search?: string }): Promise<Bill[]> {
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
        conditions.push(or(
          like(bills.title, `%${filters.search}%`),
          like(bills.summary, `%${filters.search}%`)
        ));
      }

      // Apply conditions if they exist
      if (conditions.length > 0) {
        return await query
          .where(and(...conditions))
          .orderBy(desc(bills.created_at));
      }

      return await query.orderBy(desc(bills.created_at));
    });
  }

  async getBill(id: number): Promise<Bill | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [bill] = await this.db.select().from(bills).where(eq(bills.id, id));
      return bill;
    });
  }

  /**
   * Example of an aggregation query
   */
  async getBillStats() {
    return this.getCached('stats', async () => {
      const stats = await this.db
        .select({
          status: bills.status,
          count: sql<number>`count(*)`
        })
        .from(bills)
        .groupBy(bills.status);
      return stats;
    });
  }
}