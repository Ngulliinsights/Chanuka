// ============================================================================
// BILL REPOSITORY - Domain-Specific Repository
// ============================================================================
// Provides data access operations for bills with domain-specific methods.
// Extends BaseRepository for infrastructure (caching, logging, error handling).

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { bills } from '@server/infrastructure/schema';
import { eq, and, or, inArray, arrayOverlaps, desc, asc, sql, like } from 'drizzle-orm';

/**
 * Bill entity type (inferred from schema)
 */
export type Bill = typeof bills.$inferSelect;

/**
 * New bill data type (for inserts)
 */
export type InsertBill = typeof bills.$inferInsert;

/**
 * Bill status enum
 */
export type BillStatus = 'draft' | 'introduced' | 'committee' | 'passed' | 'rejected' | 'enacted';

/**
 * Query options for bill searches
 */
export interface BillQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'introduced_date' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Bill search options
 */
export interface BillSearchOptions extends BillQueryOptions {
  status?: BillStatus | BillStatus[];
  affectedCounties?: string[];
  sponsorIds?: string[];
}

/**
 * Bill repository providing domain-specific data access methods.
 * 
 * DESIGN PRINCIPLES:
 * - Domain-specific methods (NOT generic CRUD)
 * - Methods reflect business operations
 * - Example: findByBillNumber(), findByAffectedCounties()
 * - NOT: findById(), findAll()
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new BillRepository();
 * 
 * // Find by bill number
 * const result = await repository.findByBillNumber('BILL-2024-001');
 * if (result.isOk && result.value !== null) {
 *   console.log('Found:', result.value.title);
 * }
 * 
 * // Find by affected counties
 * const billsResult = await repository.findByAffectedCounties(['Nairobi', 'Mombasa']);
 * if (billsResult.isOk) {
 *   console.log('Found', billsResult.value.length, 'bills');
 * }
 * ```
 */
export class BillRepository extends BaseRepository<Bill> {
  constructor() {
    super({
      entityName: 'Bill',
      enableCache: true,
      cacheTTL: 300, // 5 minutes
      enableLogging: true,
    });
  }

  /**
   * Find bill by ID
   * 
   * @param id - Bill ID
   * @returns Result containing Maybe<Bill>
   * 
   * @example
   * ```typescript
   * const result = await repository.findById(123);
   * if (result.isOk && result.value !== null) {
   *   console.log('Found:', result.value.title);
   * }
   * ```
   */
  async findById(id: number): Promise<Result<Maybe<Bill>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(bills)
          .where(eq(bills.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `bill:id:${id}`
    );
  }

  /**
   * Find bill by bill number (unique identifier)
   * 
   * @param billNumber - Bill number (e.g., 'BILL-2024-001')
   * @returns Result containing Maybe<Bill>
   * 
   * @example
   * ```typescript
   * const result = await repository.findByBillNumber('BILL-2024-001');
   * if (result.isOk) {
   *   const bill = result.value;
   *   if (bill !== null) {
   *     console.log('Found:', bill.title);
   *   } else {
   *     console.log('Bill not found');
   *   }
   * }
   * ```
   */
  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(bills)
          .where(eq(bills.bill_number, billNumber))
          .limit(1);
        return results[0] ?? null;
      },
      `bill:number:${billNumber}`
    );
  }

  /**
   * Find bills by affected counties
   * 
   * @param counties - Array of county names
   * @param options - Query options (pagination, sorting)
   * @returns Result containing array of bills
   * 
   * @example
   * ```typescript
   * const result = await repository.findByAffectedCounties(
   *   ['Nairobi', 'Mombasa'],
   *   { limit: 10, sortBy: 'introduced_date', sortOrder: 'desc' }
   * );
   * ```
   */
  async findByAffectedCounties(
    counties: string[],
    options?: BillQueryOptions
  ): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const baseQuery = db
          .select()
          .from(bills)
          .where(arrayOverlaps(bills.affected_counties, counties));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc' 
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      },
      `bill:counties:${counties.sort().join(',')}`
    );
  }

  /**
   * Find bills by category
   *
   * @param category - Category name
   * @param options - Query options
   * @returns Result containing array of bills
   */
  async findByCategory(
    category: string,
    options?: BillQueryOptions
  ): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const baseQuery = db
          .select()
          .from(bills)
          .where(eq(bills.category, category));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit
          ? sortedQuery.limit(options.limit)
          : sortedQuery;

        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      },
      `bill:category:${category}`
    );
  }

  /**
   * Find popular bills (sorted by view count)
   *
   * @param options - Query options with optional excludeIds
   * @returns Result containing array of popular bills
   */
  async findPopular(options?: BillQueryOptions & { excludeIds?: number[] }): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        let baseQuery = db
          .select()
          .from(bills);

        // Exclude specific IDs if provided
        if (options?.excludeIds && options.excludeIds.length > 0) {
          baseQuery = baseQuery.where(sql`${bills.id} NOT IN (${sql.raw(options.excludeIds.join(','))})`);
        }

        // Sort by view count
        const sortedQuery = baseQuery.orderBy(desc(bills.view_count));

        // Apply pagination
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;

        return await sortedQuery.limit(limit).offset(offset);
      }
      // No caching for popular bills (changes frequently)
    );
  }

  /**
   * Find bills by IDs with filters
   *
   * @param ids - Array of bill IDs
   * @param options - Query options with optional filters
   * @returns Result containing array of bills
   */
  async findByIds(
    ids: number[],
    options?: BillQueryOptions & {
      category?: string;
      status?: BillStatus | BillStatus[];
    }
  ): Promise<Result<Bill[], Error>> {
    if (ids.length === 0) {
      return new Ok([]);
    }

    return this.executeRead(
      async (db) => {
        const conditions = [inArray(bills.id, ids)];

        // Add optional filters
        if (options?.category) {
          conditions.push(eq(bills.category, options.category));
        }
        if (options?.status) {
          const statuses = Array.isArray(options.status) ? options.status : [options.status];
          conditions.push(inArray(bills.status, statuses));
        }

        const baseQuery = db
          .select()
          .from(bills)
          .where(and(...conditions));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit
          ? sortedQuery.limit(options.limit)
          : sortedQuery;

        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      }
      // No caching for ID-based queries (too many variations)
    );
  }



  /**
   * Find bills by sponsor ID
   * 
   * @param sponsorId - Sponsor ID
   * @param options - Query options
   * @returns Result containing array of bills
   */
  async findBySponsorId(
    sponsorId: string,
    options?: BillQueryOptions
  ): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const baseQuery = db
          .select()
          .from(bills)
          .where(eq(bills.sponsor_id, sponsorId));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      },
      `bill:sponsor:${sponsorId}`
    );
  }

  /**
   * Find bills by status
   * 
   * @param status - Bill status or array of statuses
   * @param options - Query options
   * @returns Result containing array of bills
   */
  async findByStatus(
    status: BillStatus | BillStatus[],
    options?: BillQueryOptions
  ): Promise<Result<Bill[], Error>> {
    const statuses = Array.isArray(status) ? status : [status];
    
    return this.executeRead(
      async (db) => {
        const baseQuery = db
          .select()
          .from(bills)
          .where(inArray(bills.status, statuses));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      },
      `bill:status:${statuses.sort().join(',')}`
    );
  }

  /**
   * Search bills by keywords in title or description
   * 
   * @param keywords - Search keywords
   * @param options - Search options
   * @returns Result containing array of bills
   */
  async searchByKeywords(
    keywords: string,
    options?: BillSearchOptions
  ): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const searchPattern = `%${keywords.toLowerCase()}%`;
        
        // Build conditions
        const conditions = [
          or(
            like(sql`LOWER(${bills.title})`, searchPattern),
            like(sql`LOWER(${bills.description})`, searchPattern)
          )
        ];

        // Add status filter
        if (options?.status) {
          const statuses = Array.isArray(options.status) ? options.status : [options.status];
          conditions.push(inArray(bills.status, statuses));
        }

        // Add county filter
        if (options?.affectedCounties && options.affectedCounties.length > 0) {
          conditions.push(arrayOverlaps(bills.affected_counties, options.affectedCounties));
        }

        // Add sponsor filter
        if (options?.sponsorIds && options.sponsorIds.length > 0) {
          conditions.push(inArray(bills.sponsor_id, options.sponsorIds));
        }

        const baseQuery = db
          .select()
          .from(bills)
          .where(and(...conditions));

        // Apply sorting
        const sortedQuery = options?.sortBy
          ? (options.sortOrder === 'asc'
              ? baseQuery.orderBy(asc(bills[options.sortBy]))
              : baseQuery.orderBy(desc(bills[options.sortBy])))
          : baseQuery.orderBy(desc(bills.introduced_date));

        // Apply pagination
        const limitedQuery = options?.limit 
          ? sortedQuery.limit(options.limit)
          : sortedQuery;
        
        const finalQuery = options?.offset
          ? limitedQuery.offset(options.offset)
          : limitedQuery;

        return await finalQuery;
      }
      // No caching for search results (too many variations)
    );
  }

  /**
   * Find recent bills
   * 
   * @param options - Query options
   * @returns Result containing array of recent bills
   */
  async findRecent(options?: BillQueryOptions): Promise<Result<Bill[], Error>> {
    return this.executeRead(
      async (db) => {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        
        const query = db
          .select()
          .from(bills)
          .orderBy(desc(bills.introduced_date))
          .limit(limit)
          .offset(offset);

        return await query;
      },
      `bill:recent:${options?.limit ?? 20}:${options?.offset ?? 0}`
    );
  }

  /**
   * Count bills by criteria
   * 
   * @param criteria - Count criteria
   * @returns Result containing count
   */
  async count(criteria?: {
    status?: BillStatus | BillStatus[];
    sponsorId?: string;
    affectedCounties?: string[];
  }): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = [];

        if (criteria?.status) {
          const statuses = Array.isArray(criteria.status) ? criteria.status : [criteria.status];
          conditions.push(inArray(bills.status, statuses));
        }

        if (criteria?.sponsorId) {
          conditions.push(eq(bills.sponsor_id, criteria.sponsorId));
        }

        if (criteria?.affectedCounties && criteria.affectedCounties.length > 0) {
          conditions.push(arrayOverlaps(bills.affected_counties, criteria.affectedCounties));
        }

        const baseQuery = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(bills);

        const query = conditions.length > 0
          ? baseQuery.where(and(...conditions))
          : baseQuery;

        const result = await query;
        return Number(result[0]?.count ?? 0);
      },
      criteria ? `bill:count:${JSON.stringify(criteria)}` : 'bill:count:all'
    );
  }

  /**
   * Create new bill
   * 
   * @param data - Bill data
   * @returns Result containing created bill
   */
  async create(data: InsertBill): Promise<Result<Bill, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(bills)
          .values(data)
          .returning();
        return results[0];
      },
      ['bill:*'] // Invalidate all bill caches
    );
  }

  /**
   * Update bill
   * 
   * @param billNumber - Bill number
   * @param data - Partial bill data
   * @returns Result containing updated bill
   */
  async update(billNumber: string, data: Partial<InsertBill>): Promise<Result<Bill, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(bills)
          .set({ ...data, updated_at: new Date() })
          .where(eq(bills.bill_number, billNumber))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`Bill not found: ${billNumber}`);
        }
        
        return results[0];
      },
      [`bill:number:${billNumber}`, 'bill:*']
    );
  }

  /**
   * Delete bill
   * 
   * @param billNumber - Bill number
   * @returns Result containing void
   */
  async delete(billNumber: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        const result = await tx
          .delete(bills)
          .where(eq(bills.bill_number, billNumber));
        
        if (!result || result.rowCount === 0) {
          throw new Error(`Bill not found: ${billNumber}`);
        }
        return undefined;
      },
      [`bill:number:${billNumber}`, 'bill:*']
    );
  }

  /**
   * Create multiple bills in batch
   * 
   * @param data - Array of bill data
   * @returns Result containing created bills
   */
  async createBatch(data: InsertBill[]): Promise<Result<Bill[], Error>> {
    return this.executeBatchWrite(
      async (tx) => {
        const results = await tx
          .insert(bills)
          .values(data)
          .returning();
        return results;
      },
      'bill:*'
    );
  }

  /**
   * Update multiple bills in batch
   * 
   * @param updates - Array of updates with bill number and data
   * @returns Result containing updated bills
   */
  async updateBatch(
    updates: Array<{ billNumber: string; data: Partial<InsertBill> }>
  ): Promise<Result<Bill[], Error>> {
    return this.executeBatchWrite(
      async (tx) => {
        const updatedBills: Bill[] = [];

        for (const update of updates) {
          const results = await tx
            .update(bills)
            .set({ ...update.data, updated_at: new Date() })
            .where(eq(bills.bill_number, update.billNumber))
            .returning();
          
          if (results.length > 0) {
            updatedBills.push(results[0]);
          }
        }

        return updatedBills;
      },
      'bill:*'
    );
  }

  /**
   * Delete multiple bills in batch
   * 
   * @param billNumbers - Array of bill numbers
   * @returns Result containing void
   */
  async deleteBatch(billNumbers: string[]): Promise<Result<void, Error>> {
    return this.executeBatchWrite(
      async (tx) => {
        await tx
          .delete(bills)
          .where(inArray(bills.bill_number, billNumbers));
        return undefined;
      },
      'bill:*'
    );
  }
}
