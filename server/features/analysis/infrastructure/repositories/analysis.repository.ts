/**
 * Analysis Repository
 * 
 * Provides data access operations for bill analysis with domain-specific methods.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { analysis } from '@server/infrastructure/schema';
import { db } from '@server/infrastructure/database';
import { bills } from '@server/infrastructure/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

/**
 * Analysis entity type (inferred from schema)
 */
export type Analysis = typeof analysis.$inferSelect;

/**
 * New analysis data type (for inserts)
 */
export type InsertAnalysis = typeof analysis.$inferInsert;

/**
 * Analysis query options
 */
export interface AnalysisQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Analysis repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new AnalysisRepository();
 * 
 * // Find latest analysis for a bill
 * const result = await repository.findLatestByBillId('bill-123');
 * if (result.isOk && result.value !== null) {
 *   console.log('Latest analysis:', result.value);
 * }
 * ```
 */
export class AnalysisRepository extends BaseRepository<Analysis> {
  constructor() {
    super({
      entityName: 'Analysis',
      enableCache: true,
      cacheTTL: 3600, // 1 hour (analysis results are relatively stable)
      enableLogging: true,
    });
  }

  /**
   * Find analysis by ID
   */
  async findById(id: string): Promise<Result<Maybe<Analysis>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(analysis)
          .where(eq(analysis.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `analysis:id:${id}`
    );
  }

  /**
   * Find all analyses for a specific bill
   */
  async findByBillId(
    billId: string,
    options?: AnalysisQueryOptions
  ): Promise<Result<Analysis[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = db
          .select()
          .from(analysis)
          .where(eq(analysis.bill_id, billId));

        // Apply date filters if provided
        if (options?.startDate) {
          query = query.where(gte(analysis.created_at, options.startDate));
        }
        if (options?.endDate) {
          query = query.where(lte(analysis.created_at, options.endDate));
        }

        // Apply sorting
        const sortColumn = options?.sortBy || 'created_at';
        query = options?.sortOrder === 'asc'
          ? query.orderBy(analysis[sortColumn])
          : query.orderBy(desc(analysis[sortColumn]));

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `analysis:bill:${billId}:${JSON.stringify(options || {})}`
    );
  }

  /**
   * Find the most recent analysis for a bill
   */
  async findLatestByBillId(billId: string): Promise<Result<Maybe<Analysis>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(analysis)
          .where(eq(analysis.bill_id, billId))
          .orderBy(desc(analysis.created_at))
          .limit(1);
        return results[0] ?? null;
      },
      `analysis:bill:${billId}:latest`
    );
  }

  /**
   * Find analyses by type
   */
  async findByType(
    analysisType: string,
    options?: AnalysisQueryOptions
  ): Promise<Result<Analysis[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = db
          .select()
          .from(analysis)
          .where(eq(analysis.analysis_type, analysisType));

        // Apply sorting
        query = query.orderBy(desc(analysis.created_at));

        // Apply pagination
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        query = query.limit(limit).offset(offset);

        return await query;
      },
      `analysis:type:${analysisType}:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Create new analysis
   */
  async create(data: InsertAnalysis): Promise<Result<Analysis, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(analysis)
          .values({
            ...data,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning();
        return results[0];
      },
      [`analysis:bill:${data.bill_id}:*`, 'analysis:*']
    );
  }

  /**
   * Update existing analysis
   */
  async update(
    id: string,
    data: Partial<InsertAnalysis>
  ): Promise<Result<Analysis, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .update(analysis)
          .set({ ...data, updated_at: new Date() })
          .where(eq(analysis.id, id))
          .returning();

        if (results.length === 0) {
          throw new Error(`Analysis not found: ${id}`);
        }

        return results[0];
      },
      [`analysis:id:${id}`, 'analysis:*']
    );
  }

  /**
   * Delete analysis
   */
  async delete(id: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        const result = await tx
          .delete(analysis)
          .where(eq(analysis.id, id));

        if (!result || result.rowCount === 0) {
          throw new Error(`Analysis not found: ${id}`);
        }
        return undefined;
      },
      [`analysis:id:${id}`, 'analysis:*']
    );
  }

  /**
   * Count analyses for a bill
   */
  async countByBillId(billId: string): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(analysis)
          .where(eq(analysis.bill_id, billId));
        return Number(results[0]?.count ?? 0);
      },
      `analysis:bill:${billId}:count`
    );
  }

  /**
   * Find recent analyses across all bills
   */
  async findRecent(options?: AnalysisQueryOptions): Promise<Result<Analysis[], Error>> {
    return this.executeRead(
      async (db) => {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;

        const query = db
          .select()
          .from(analysis)
          .orderBy(desc(analysis.created_at))
          .limit(limit)
          .offset(offset);

        return await query;
      },
      `analysis:recent:${options?.limit ?? 20}:${options?.offset ?? 0}`
    );
  }
}

export const analysisRepository = new AnalysisRepository();
