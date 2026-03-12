/**
 * ML Analysis Repository
 * 
 * Provides data access operations for ML analysis results with domain-specific methods.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { Ok } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { ml_analysis_results } from '@server/infrastructure/schema';
import { db } from '@server/infrastructure/database';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

/**
 * ML Analysis entity type
 */
export type MLAnalysis = typeof ml_analysis_results.$inferSelect;

/**
 * New ML analysis data type
 */
export type InsertMLAnalysis = typeof ml_analysis_results.$inferInsert;

/**
 * ML Analysis query options
 */
export interface MLAnalysisQueryOptions {
  limit?: number;
  offset?: number;
  minConfidence?: number;
  analysisType?: string;
}

/**
 * ML Analysis repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new MLAnalysisRepository();
 * 
 * // Store analysis result
 * const result = await repository.storeAnalysisResult({
 *   bill_id: 'bill-123',
 *   analysis_type: 'stakeholder_influence',
 *   result: { ... },
 *   confidence: 0.85
 * });
 * ```
 */
export class MLAnalysisRepository extends BaseRepository<MLAnalysis> {
  constructor() {
    super({
      entityName: 'MLAnalysis',
      enableCache: true,
      cacheTTL: 3600, // 1 hour (ML results are relatively stable)
      enableLogging: true,
    });
  }

  /**
   * Find ML analysis by ID
   */
  async findById(id: string): Promise<Result<Maybe<MLAnalysis>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(ml_analysis_results)
          .where(eq(ml_analysis_results.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `ml-analysis:id:${id}`
    );
  }

  /**
   * Find ML analyses by bill ID
   */
  async findByBillId(
    billId: string,
    options?: MLAnalysisQueryOptions
  ): Promise<Result<MLAnalysis[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = db
          .select()
          .from(ml_analysis_results)
          .where(eq(ml_analysis_results.bill_id, billId));

        // Filter by analysis type if provided
        if (options?.analysisType) {
          query = query.where(eq(ml_analysis_results.analysis_type, options.analysisType));
        }

        // Filter by minimum confidence if provided
        if (options?.minConfidence !== undefined) {
          query = query.where(gte(ml_analysis_results.confidence, options.minConfidence));
        }

        // Apply sorting and pagination
        query = query.orderBy(desc(ml_analysis_results.created_at));
        
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `ml-analysis:bill:${billId}:${JSON.stringify(options || {})}`
    );
  }

  /**
   * Find latest ML analysis for a bill by type
   */
  async findLatestByBillIdAndType(
    billId: string,
    analysisType: string
  ): Promise<Result<Maybe<MLAnalysis>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(ml_analysis_results)
          .where(
            and(
              eq(ml_analysis_results.bill_id, billId),
              eq(ml_analysis_results.analysis_type, analysisType)
            )
          )
          .orderBy(desc(ml_analysis_results.created_at))
          .limit(1);
        return results[0] ?? null;
      },
      `ml-analysis:bill:${billId}:type:${analysisType}:latest`
    );
  }

  /**
   * Store ML analysis result
   */
  async storeAnalysisResult(
    data: InsertMLAnalysis
  ): Promise<Result<MLAnalysis, Error>> {
    return this.executeWrite(
      async (tx) => {
        const results = await tx
          .insert(ml_analysis_results)
          .values({
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();
        return results[0];
      },
      [`ml-analysis:bill:${data.bill_id}:*`, 'ml-analysis:*']
    );
  }

  /**
   * Get analysis history for a bill
   */
  async getAnalysisHistory(
    billId: string,
    limit: number = 10
  ): Promise<Result<MLAnalysis[], Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(ml_analysis_results)
          .where(eq(ml_analysis_results.bill_id, billId))
          .orderBy(desc(ml_analysis_results.created_at))
          .limit(limit);
        return results;
      },
      `ml-analysis:bill:${billId}:history:${limit}`
    );
  }

  /**
   * Get high-confidence analyses
   */
  async getHighConfidenceAnalyses(
    minConfidence: number = 0.8,
    limit: number = 50
  ): Promise<Result<MLAnalysis[], Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(ml_analysis_results)
          .where(gte(ml_analysis_results.confidence, minConfidence))
          .orderBy(desc(ml_analysis_results.confidence))
          .limit(limit);
        return results;
      },
      `ml-analysis:high-confidence:${minConfidence}:${limit}`
    );
  }

  /**
   * Count analyses by type
   */
  async countByType(analysisType: string): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(ml_analysis_results)
          .where(eq(ml_analysis_results.analysis_type, analysisType));
        return Number(results[0]?.count ?? 0);
      },
      `ml-analysis:count:type:${analysisType}`
    );
  }

  /**
   * Delete old analyses (cleanup)
   */
  async deleteOlderThan(days: number): Promise<Result<number, Error>> {
    return this.executeWrite(
      async (tx) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await tx
          .delete(ml_analysis_results)
          .where(sql`${ml_analysis_results.created_at} < ${cutoffDate}`);

        return result.rowCount || 0;
      },
      ['ml-analysis:*']
    );
  }
}

export const mlAnalysisRepository = new MLAnalysisRepository();
