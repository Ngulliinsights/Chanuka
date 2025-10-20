import { eq, and, desc } from 'drizzle-orm';
import { readDatabase } from '../../../../db.js';
import * as schema from '../../../../../shared/schema';
import { IAnalysisRepository } from '../../domain/repositories/analysis-repository';
import { ComprehensiveAnalysis } from '../../domain/entities/analysis-result';
import { logger } from '../../../../utils/logger.js';

/**
 * Drizzle-based implementation of the Analysis Repository.
 */
export class AnalysisRepositoryImpl implements IAnalysisRepository {
  private get db() {
    return readDatabase();
  }

  /**
   * Saves or updates a comprehensive analysis result in the database.
   */
  async save(analysis: ComprehensiveAnalysis): Promise<schema.Analysis> {
    logger.debug(`Saving analysis result for bill ${analysis.billId} (ID: ${analysis.analysisId})`);
    try {
      // Structure data according to the Drizzle schema
      const dataToStore = {
        analysisId: analysis.analysisId, // Assuming analysis table has analysisId
        constitutionalAnalysis: analysis.constitutionalAnalysis,
        conflictAnalysisSummary: analysis.conflictAnalysisSummary,
        stakeholderImpact: analysis.stakeholderImpact,
        transparencyScore: analysis.transparencyScore,
        publicInterestScore: analysis.publicInterestScore,
        overallConfidence: analysis.overallConfidence,
        recommendations: analysis.recommendedActions,
        version: analysis.version,
        status: analysis.status,
        timestamp: analysis.timestamp // Assuming analysis table has timestamp
      };

      const insertData: schema.InsertAnalysis = {
        billId: analysis.billId,
        analysisType: `comprehensive_v${analysis.version}`, // Use versioned type
        results: dataToStore,
        confidence: analysis.overallConfidence.toString(),
        createdAt: analysis.timestamp, // Use analysis timestamp
        updatedAt: new Date(),
        // Potentially add isApproved based on rules or default to false
        isApproved: false,
      };

      // Use onConflictDoUpdate to handle saving new or updating existing analysis for the bill/type
      const [savedRecord] = await this.db
        .insert(schema.analysis)
        .values(insertData)
        .onConflictDoUpdate({
          target: [schema.analysis.billId, schema.analysis.analysisType], // Unique constraint
          set: {
            results: dataToStore,
            confidence: analysis.overallConfidence.toString(),
            updatedAt: new Date(),
            // Reset approval status on update? Depends on requirements.
            // isApproved: false,
            // approvedBy: null
          },
        })
        .returning();

        if (!savedRecord) {
            // This case might happen if onConflictDoUpdate doesn't return the row on update in some configs/versions
            // Re-fetch if needed, or rely on the fact that the operation succeeded.
            logger.warn(`Analysis record for bill ${analysis.billId} might not have been returned after save.`);
            // Attempt to fetch manually if required, though usually returning() handles this.
            const refetched = await this.findLatestByBillIdAndType(analysis.billId, insertData.analysisType);
            if (!refetched) throw new Error("Failed to save or retrieve analysis record after upsert.");
            return refetched;
        }


      logger.info(`Successfully saved analysis result for bill ${analysis.billId} (DB ID: ${savedRecord.id})`);
      return savedRecord;
    } catch (error) {
      logger.error(`Failed to save analysis result for bill ${analysis.billId}:`, { component: 'AnalysisRepository' }, error);
      throw new Error(`Database error saving analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds the most recent comprehensive analysis for a bill.
   */
  async findLatestByBillId(billId: number): Promise<schema.Analysis | null> {
    logger.debug(`Fetching latest analysis for bill ${billId}`);
    try {
        // Assuming 'comprehensive_vX' naming convention
      const [latestRecord] = await this.db
        .select()
        .from(schema.analysis)
        .where(and(
            eq(schema.analysis.billId, billId),
            sql`${schema.analysis.analysisType} LIKE 'comprehensive_v%'` // Filter by type prefix
        ))
        .orderBy(desc(schema.analysis.createdAt)) // Get the most recent
        .limit(1);

      return latestRecord || null;
    } catch (error) {
      logger.error(`Failed to fetch latest analysis for bill ${billId}:`, { component: 'AnalysisRepository' }, error);
      throw new Error(`Database error fetching analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
    * Helper to find latest by specific type, used after upsert potentially.
    */
   private async findLatestByBillIdAndType(billId: number, analysisType: string): Promise<schema.Analysis | null> {
       try {
           const [record] = await this.db
               .select()
               .from(schema.analysis)
               .where(and(
                   eq(schema.analysis.billId, billId),
                   eq(schema.analysis.analysisType, analysisType)
               ))
               .orderBy(desc(schema.analysis.createdAt))
               .limit(1);
           return record || null;
       } catch (error) {
           logger.error(`Failed to fetch latest analysis for bill ${billId} and type ${analysisType}:`, { component: 'AnalysisRepository' }, error);
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
   * Retrieves historical analysis runs for a bill.
   */
  async findHistoryByBillId(billId: number, limit: number = 10): Promise<schema.Analysis[]> {
     logger.debug(`Fetching analysis history for bill ${billId} (limit ${limit})`);
     try {
         return await this.db
             .select()
             .from(schema.analysis)
             .where(and(
                 eq(schema.analysis.billId, billId),
                 sql`${schema.analysis.analysisType} LIKE 'comprehensive_v%'`
             ))
             .orderBy(desc(schema.analysis.createdAt))
             .limit(limit);
     } catch (error) {
         logger.error(`Failed to fetch analysis history for bill ${billId}:`, { component: 'AnalysisRepository' }, error);
         throw new Error(`Database error fetching analysis history: ${error instanceof Error ? error.message : String(error)}`);
     }
  }


   /**
    * Records a failed analysis attempt.
    * Uses the main analysis table with a specific type or status.
    */
   async recordFailedAnalysis(billId: number, errorDetails: any): Promise<void> {
       logger.warn(`Recording failed analysis attempt for bill ${billId}`);
       try {
           const errorMessage = errorDetails instanceof Error ? errorDetails.message : String(errorDetails);
           const errorStack = errorDetails instanceof Error ? errorDetails.stack : undefined;

           const failureData = {
               error: errorMessage,
               stack: errorStack,
               timestamp: new Date().toISOString(),
           };

           // Use a specific analysisType for failures
           const insertData: schema.InsertAnalysis = {
               billId,
               analysisType: 'comprehensive_failed',
               results: failureData, // Store error details in results
               confidence: "0", // Confidence is 0 for failure
               createdAt: new Date(),
               updatedAt: new Date(),
               isApproved: false, // Failed analyses are never approved
           };

           await this.db.insert(schema.analysis).values(insertData);
           logger.info(`Recorded failed analysis for bill ${billId}`);

       } catch (error) {
           logger.error(`Failed to record failed analysis for bill ${billId}:`, { component: 'AnalysisRepository' }, error);
           // Avoid throwing error here, as this is for logging failures
       }
   }
}

// Export singleton instance
export const analysisRepository = new AnalysisRepositoryImpl();