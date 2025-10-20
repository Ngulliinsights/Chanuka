import * as schema from '../../../../../shared/schema'; // Import schema types
import { ComprehensiveAnalysis } from '../entities/analysis-result';

export interface IAnalysisRepository {
  /**
   * Saves a comprehensive analysis result.
   * Handles creating new records or updating existing ones.
   * @param analysis - The ComprehensiveAnalysis entity to save.
   * @returns The saved Drizzle analysis record.
   */
  save(analysis: ComprehensiveAnalysis): Promise<schema.Analysis>;

  /**
   * Finds the latest comprehensive analysis for a specific bill.
   * @param billId - The ID of the bill.
   * @returns The Drizzle analysis record or null if not found.
   */
  findLatestByBillId(billId: number): Promise<schema.Analysis | null>;

  /**
   * Finds a specific analysis run by its unique ID.
   * @param analysisId - The unique ID of the analysis run.
   * @returns The Drizzle analysis record or null if not found.
   */
  findByAnalysisId(analysisId: string): Promise<schema.Analysis | null>;

   /**
    * Retrieves historical analysis runs for a bill (optional, for history tracking).
    * @param billId - The ID of the bill.
    * @param limit - Max number of historical records to return.
    * @returns An array of historical Drizzle analysis records.
    */
   findHistoryByBillId(billId: number, limit?: number): Promise<schema.Analysis[]>;

   /**
    * Stores a failed analysis attempt (optional, for monitoring).
    * @param billId - The ID of the bill.
    * @param errorDetails - Information about the failure.
    */
   recordFailedAnalysis(billId: number, errorDetails: any): Promise<void>;
}