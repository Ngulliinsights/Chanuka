/**
 * Database Bill Data Source
 * 
 * Real database implementation of the BillDataSource interface.
 * Handles all database operations with proper error handling.
 */

import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database';
import { bills, bill_engagement, comments } from '@server/infrastructure/schema';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import {
  BillDataSource,
  BillDataRecord,
  BillFilters,
  BillStats,
  DataSourceStatus,
} from './bill-data-source.interface';

export class DatabaseBillDataSource implements BillDataSource {
  private lastHealthCheck: Date | null = null;
  private isHealthy = true;
  private lastError: string | null = null;

  async findById(id: string): Promise<BillDataRecord | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = readDatabase as any;
      
      const billResults = await db
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
          comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
          share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
          engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`,
        })
        .from(bills)
        .leftJoin(comments, eq(bills.id, comments.bill_id))
        .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
        .where(eq(bills.id, id))
        .groupBy(bills.id)
        .limit(1);

      const bill = billResults[0];
      if (!bill) return null;

      return {
        ...bill,
        complexity_score: 5, // Default complexity score
      } as BillDataRecord;

    } catch (error) {
      this.handleError('findById', error);
      throw error;
    }
  }

  async findAll(filters?: BillFilters): Promise<BillDataRecord[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = readDatabase as any;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];

      if (filters?.status) {
        conditions.push(eq(bills.status, filters.status));
      }
      
      if (filters?.category) {
        conditions.push(eq(bills.category, filters.category));
      }
      
      if (filters?.sponsor_id) {
        conditions.push(eq(bills.sponsor_id, filters.sponsor_id));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`,
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const billResults = await db
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
          comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
          share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
          engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`,
        })
        .from(bills)
        .leftJoin(comments, eq(bills.id, comments.bill_id))
        .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
        .where(whereClause)
        .groupBy(bills.id)
        .orderBy(desc(bills.created_at))
        .limit(50);

      return billResults.map(bill => ({
        ...bill,
        complexity_score: 5, // Default complexity score
      })) as BillDataRecord[];

    } catch (error) {
      this.handleError('findAll', error);
      throw error;
    }
  }

  async count(filters?: BillFilters): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = readDatabase as any;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];

      if (filters?.status) {
        conditions.push(eq(bills.status, filters.status));
      }
      
      if (filters?.category) {
        conditions.push(eq(bills.category, filters.category));
      }
      
      if (filters?.sponsor_id) {
        conditions.push(eq(bills.sponsor_id, filters.sponsor_id));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
          ),
        );
      }

      const countResults = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return countResults[0]?.count ?? 0;

    } catch (error) {
      this.handleError('count', error);
      throw error;
    }
  }

  async getStats(): Promise<BillStats> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = readDatabase as any;

      const totalResults = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills);

      const statusResults = await db
        .select({ status: bills.status, count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .groupBy(bills.status);

      const categoryResults = await db
        .select({ category: bills.category, count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .groupBy(bills.category);

      return {
        total: totalResults[0]?.count ?? 0,
        byStatus: statusResults.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.status] = row.count;
            return acc;
          },
          {},
        ),
        byCategory: categoryResults.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.category ?? 'uncategorized'] = row.count;
            return acc;
          },
          {},
        ),
      };

    } catch (error) {
      this.handleError('getStats', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = readDatabase as any;
      
      // Simple health check query
      await db.select({ count: sql<number>`1` }).limit(1);
      
      this.isHealthy = true;
      this.lastError = null;
      this.lastHealthCheck = new Date();
      
      return true;
    } catch (error) {
      this.handleError('healthCheck', error);
      return false;
    }
  }

  getStatus(): DataSourceStatus {
    return {
      type: 'database',
      available: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      error: this.lastError,
      metadata: {
        connectionPool: 'drizzle-orm',
        database: 'postgresql',
      },
    };
  }

  private handleError(operation: string, error: unknown): void {
    this.isHealthy = false;
    this.lastError = error instanceof Error ? error.message : String(error);
    this.lastHealthCheck = new Date();
    
    logger.error({
      operation,
      error: this.lastError,
      dataSource: 'database',
    }, 'Database bill data source error');
  }
}