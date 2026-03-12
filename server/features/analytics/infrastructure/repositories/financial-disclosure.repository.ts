/**
 * Financial Disclosure Repository
 * 
 * Provides data access operations for financial disclosures with domain-specific methods.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { financial_disclosures } from '@server/infrastructure/schema';
import { db } from '@server/infrastructure/database';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Financial Disclosure entity type
 */
export type FinancialDisclosure = typeof financial_disclosures.$inferSelect;

/**
 * New financial disclosure data type
 */
export type InsertFinancialDisclosure = typeof financial_disclosures.$inferInsert;

/**
 * Financial disclosure query options
 */
export interface FinancialDisclosureQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  disclosureType?: string;
}

/**
 * Financial disclosure summary
 */
export interface FinancialDisclosureSummary {
  sponsorId: string;
  totalDisclosures: number;
  totalAmount: number;
  averageAmount: number;
  latestDisclosureDate: Date | null;
  disclosureTypes: string[];
}

/**
 * Financial Disclosure repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new FinancialDisclosureRepository();
 * 
 * // Get disclosures by sponsor
 * const result = await repository.getDisclosuresBySponsor('sponsor-123');
 * if (result.isOk) {
 *   console.log('Disclosures:', result.value);
 * }
 * ```
 */
export class FinancialDisclosureRepository extends BaseRepository<FinancialDisclosure> {
  constructor() {
    super({
      entityName: 'FinancialDisclosure',
      enableCache: true,
      cacheTTL: 7200, // 2 hours (financial data changes less frequently)
      enableLogging: true,
    });
  }

  /**
   * Find financial disclosure by ID
   */
  async findById(id: string): Promise<Result<Maybe<FinancialDisclosure>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(financial_disclosures)
          .where(eq(financial_disclosures.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `financial-disclosure:id:${id}`
    );
  }

  /**
   * Get disclosures by sponsor
   */
  async getDisclosuresBySponsor(
    sponsorId: string,
    options?: FinancialDisclosureQueryOptions
  ): Promise<Result<FinancialDisclosure[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = db
          .select()
          .from(financial_disclosures)
          .where(eq(financial_disclosures.sponsor_id, sponsorId));

        // Apply date filters
        if (options?.startDate) {
          query = query.where(gte(financial_disclosures.disclosure_date, options.startDate));
        }
        if (options?.endDate) {
          query = query.where(lte(financial_disclosures.disclosure_date, options.endDate));
        }

        // Apply amount filter
        if (options?.minAmount !== undefined) {
          query = query.where(gte(financial_disclosures.amount, options.minAmount));
        }

        // Apply type filter
        if (options?.disclosureType) {
          query = query.where(eq(financial_disclosures.disclosure_type, options.disclosureType));
        }

        // Apply sorting and pagination
        query = query.orderBy(desc(financial_disclosures.disclosure_date));
        
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `financial-disclosure:sponsor:${sponsorId}:${JSON.stringify(options || {})}`
    );
  }

  /**
   * Get disclosures by bill
   */
  async getDisclosuresByBill(
    billId: string,
    options?: FinancialDisclosureQueryOptions
  ): Promise<Result<FinancialDisclosure[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = db
          .select()
          .from(financial_disclosures)
          .where(eq(financial_disclosures.bill_id, billId));

        // Apply filters
        if (options?.minAmount !== undefined) {
          query = query.where(gte(financial_disclosures.amount, options.minAmount));
        }

        // Apply sorting and pagination
        query = query.orderBy(desc(financial_disclosures.amount));
        
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        query = query.limit(limit).offset(offset);

        return await query;
      },
      `financial-disclosure:bill:${billId}:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Get disclosure summary for a sponsor
   */
  async getDisclosureSummary(
    sponsorId: string
  ): Promise<Result<FinancialDisclosureSummary, Error>> {
    return this.executeRead(
      async (db) => {
        const summary = await db
          .select({
            sponsorId: financial_disclosures.sponsor_id,
            totalDisclosures: sql<number>`COUNT(*)::int`,
            totalAmount: sql<number>`COALESCE(SUM(${financial_disclosures.amount}), 0)::float`,
            averageAmount: sql<number>`COALESCE(AVG(${financial_disclosures.amount}), 0)::float`,
            latestDisclosureDate: sql<Date | null>`MAX(${financial_disclosures.disclosure_date})`,
            disclosureTypes: sql<string[]>`ARRAY_AGG(DISTINCT ${financial_disclosures.disclosure_type})`,
          })
          .from(financial_disclosures)
          .where(eq(financial_disclosures.sponsor_id, sponsorId))
          .groupBy(financial_disclosures.sponsor_id);

        return summary[0] || {
          sponsorId,
          totalDisclosures: 0,
          totalAmount: 0,
          averageAmount: 0,
          latestDisclosureDate: null,
          disclosureTypes: [],
        };
      },
      `financial-disclosure:summary:${sponsorId}`
    );
  }

  /**
   * Create financial disclosure
   */
  async create(
    data: InsertFinancialDisclosure
  ): Promise<Result<FinancialDisclosure, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(financial_disclosures)
          .values({
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();
        return results[0];
      },
      [
        `financial-disclosure:sponsor:${data.sponsor_id}:*`,
        data.bill_id ? `financial-disclosure:bill:${data.bill_id}:*` : null,
        'financial-disclosure:*'
      ].filter(Boolean) as string[]
    );
  }

  /**
   * Update financial disclosure
   */
  async update(
    id: string,
    data: Partial<InsertFinancialDisclosure>
  ): Promise<Result<FinancialDisclosure, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(financial_disclosures)
          .set({ ...data, updated_at: new Date() })
          .where(eq(financial_disclosures.id, id))
          .returning();

        if (results.length === 0) {
          throw new Error(`Financial disclosure not found: ${id}`);
        }

        return results[0];
      },
      [`financial-disclosure:id:${id}`, 'financial-disclosure:*']
    );
  }

  /**
   * Get recent disclosures
   */
  async getRecentDisclosures(
    limit: number = 20
  ): Promise<Result<FinancialDisclosure[], Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(financial_disclosures)
          .orderBy(desc(financial_disclosures.disclosure_date))
          .limit(limit);
        return results;
      },
      `financial-disclosure:recent:${limit}`
    );
  }

  /**
   * Get high-value disclosures
   */
  async getHighValueDisclosures(
    minAmount: number,
    limit: number = 50
  ): Promise<Result<FinancialDisclosure[], Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(financial_disclosures)
          .where(gte(financial_disclosures.amount, minAmount))
          .orderBy(desc(financial_disclosures.amount))
          .limit(limit);
        return results;
      },
      `financial-disclosure:high-value:${minAmount}:${limit}`
    );
  }
}

export const financialDisclosureRepository = new FinancialDisclosureRepository();
