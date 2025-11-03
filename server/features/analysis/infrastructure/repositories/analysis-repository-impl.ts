import { eq, and, desc } from 'drizzle-orm';
import { readDatabase } from '@shared/database/connection';
import * as schema from '../../../../../shared/schema';
import { IAnalysisRepository } from '../../domain/repositories/analysis-repository';
import { ComprehensiveAnalysis } from '../../domain/entities/analysis-result';
import { logger } from '../../../../../shared/core/index.js';

/**
 * Drizzle-based implementation of the Analysis Repository.
 */
export class AnalysisRepositoryImpl implements IAnalysisRepository {
  private get db() {
  return readDatabase;
  }

  /**
   * Saves or updates a comprehensive analysis result in the database.
   */
  async save(analysis: ComprehensiveAnalysis): Promise<schema.Analysis> {
    logger.debug(`Saving analysis result for bill ${analysis.bill_id} (ID: ${analysis.analysisId})`);
    try {
      // Structure data according to the Drizzle schema
      const dataToStore = {
        analysisId: analysis.analysisId, // Assuming analysis table has analysisId
        constitutionalAnalysis: analysis.constitutionalAnalysis,
        conflictAnalysisSummary: analysis.conflictAnalysisSummary,
        stakeholderImpact: analysis.stakeholderImpact,
        transparency_score: analysis.transparency_score,
        publicInterestScore: analysis.publicInterestScore,
        overallConfidence: analysis.overallConfidence,
        recommendations: analysis.recommendedActions,
        version: analysis.version,
        status: analysis.status,
        timestamp: analysis.timestamp // Assuming analysis table has timestamp
      };

      const insertData: schema.InsertAnalysis = { bill_id: analysis.bill_id,
        analysis_type: `comprehensive_v${analysis.version }`, // Use versioned type
        results: dataToStore,
        confidence: analysis.overallConfidence.toString(),
        created_at: analysis.timestamp, // Use analysis timestamp
        updated_at: new Date(),
        // Potentially add is_approved based on rules or default to false
        is_approved: false,
      };

      // Use onConflictDoUpdate to handle saving new or updating existing analysis for the bill/type
      const [savedRecord] = await this.db
        .insert(schema.analysis)
        .values(insertData)
        .onConflictDoUpdate({
          target: [schema.analysis.bill_id, schema.analysis.analysis_type], // Unique constraint
          set: {
            results: dataToStore,
            confidence: analysis.overallConfidence.toString(),
            updated_at: new Date(),
            // Reset approval status on update? Depends on requirements.
            // is_approved: false,
            // approved_by: null
          },
        })
        .returning();

        if (!savedRecord) {
            // This case might happen if onConflictDoUpdate doesn't return the row on update in some configs/versions
            // Re-fetch if needed, or rely on the fact that the operation succeeded.
            logger.warn(`Analysis record for bill ${analysis.bill_id} might not have been returned after save.`);
            // Attempt to fetch manually if required, though usually returning() handles this.
            const refetched = await this.findLatestByBillIdAndType(analysis.bill_id, insertData.analysis_type);
            if (!refetched) throw new Error("Failed to save or retrieve analysis record after upsert.");
            return refetched;
        }


      logger.info(`Successfully saved analysis result for bill ${analysis.bill_id} (DB ID: ${savedRecord.id})`);
      return savedRecord;
    } catch (error) {
      logger.error(`Failed to save analysis result for bill ${analysis.bill_id}:`, { component: 'AnalysisRepository' }, error);
      throw new Error(`Database error saving analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds the most recent comprehensive analysis for a bills.
   */
  async findLatestByBillId(bill_id: number): Promise<schema.Analysis | null> { logger.debug(`Fetching latest analysis for bill ${bill_id }`);
    try { // Assuming 'comprehensive_vX' naming convention
      const [latestRecord] = await this.db
        .select()
        .from(schema.analysis)
        .where(and(
            eq(schema.analysis.bill_id, bill_id),
            sql`${schema.analysis.analysis_type } LIKE 'comprehensive_v%'` // Filter by type prefix
        ))
        .orderBy(desc(schema.analysis.created_at)) // Get the most recent
        .limit(1);

      return latestRecord || null;
    } catch (error) { logger.error(`Failed to fetch latest analysis for bill ${bill_id }:`, { component: 'AnalysisRepository' }, error);
      throw new Error(`Database error fetching analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
    * Helper to find latest by specific type, used after upsert potentially.
    */
   private async findLatestByBillIdAndType(bill_id: number, analysis_type: string): Promise<schema.Analysis | null> { try {
           const [record] = await this.db
               .select()
               .from(schema.analysis)
               .where(and(
                   eq(schema.analysis.bill_id, bill_id),
                   eq(schema.analysis.analysis_type, analysis_type)
               ))
               .orderBy(desc(schema.analysis.created_at))
               .limit(1);
           return record || null;
        } catch (error) { logger.error(`Failed to fetch latest analysis for bill ${bill_id } and type ${analysis_type}:`, { component: 'AnalysisRepository' }, error);
           return null; // Return null on error during this internal fetch
       }
   }


  /**
   * Finds a specific analysis run by its unique ID (if stored).
   * Note: Assumes `results->>'analysisId'` is how the ID is stored in JSONB.
   * Adjust the query if `analysisId` becomes a dedicated column.
   */
  async findByAnalysisId(analysisId: string): Promise<schema.Analysis | null> {
     logger.debug(`Fetching analysis by analysisId ${analysisId}`);
     try {
         // This query might be slow if analysisId isn't indexed within the JSONB.
         // Consider adding analysisId as a top-level column in the 'analysis' table for performance.
         const [record] = await this.db
             .select()
             .from(schema.analysis)
              // Example JSONB query - syntax depends on exact structure and DB version
             .where(sql`${schema.analysis.results}->>'analysisId' = ${analysisId}`)
             // If analysisId is a top-level column:
             // .where(eq(schema.analysis.analysisId, analysisId))
             .limit(1);

         return record || null;
     } catch (error) {
         logger.error(`Failed to fetch analysis by analysisId ${analysisId}:`, { component: 'AnalysisRepository' }, error);
         throw new Error(`Database error fetching analysis by ID: ${error instanceof Error ? error.message : String(error)}`);
     }
  }


  /**
   * Retrieves historical analysis runs for a bills.
   */
  async findHistoryByBillId(bill_id: number, limit: number = 10): Promise<schema.Analysis[]> { logger.debug(`Fetching analysis history for bill ${bill_id } (limit ${limit})`);
     try { return await this.db
             .select()
             .from(schema.analysis)
             .where(and(
                 eq(schema.analysis.bill_id, bill_id),
                 sql`${schema.analysis.analysis_type } LIKE 'comprehensive_v%'`
             ))
             .orderBy(desc(schema.analysis.created_at))
             .limit(limit);
     } catch (error) { logger.error(`Failed to fetch analysis history for bill ${bill_id }:`, { component: 'AnalysisRepository' }, error);
         throw new Error(`Database error fetching analysis history: ${error instanceof Error ? error.message : String(error)}`);
     }
  }


   /**
    * Records a failed analysis attempt.
    * Uses the main analysis table with a specific type or status.
    */
   async recordFailedAnalysis(bill_id: number, errorDetails: any): Promise<void> { logger.warn(`Recording failed analysis attempt for bill ${bill_id }`);
       try {
           const errorMessage = errorDetails instanceof Error ? errorDetails.message : String(errorDetails);
           const errorStack = errorDetails instanceof Error ? errorDetails.stack : undefined;

           const failureData = {
               error: errorMessage,
               stack: errorStack,
               timestamp: new Date().toISOString(),
           };

           // Use a specific analysis_type for failures
           const insertData: schema.InsertAnalysis = { bill_id,
               analysis_type: 'comprehensive_failed',
               results: failureData, // Store error details in results
               confidence: "0", // Confidence is 0 for failure
               created_at: new Date(),
               updated_at: new Date(),
               is_approved: false, // Failed analyses are never approved
            };

           await this.db.insert(schema.analysis).values(insertData);
           logger.info(`Recorded failed analysis for bill ${ bill_id }`);

       } catch (error) { logger.error(`Failed to record failed analysis for bill ${bill_id }:`, { component: 'AnalysisRepository' }, error);
           // Avoid throwing error here, as this is for logging failures
       }
   }
}

// Export singleton instance
export const analysisRepository = new AnalysisRepositoryImpl();
