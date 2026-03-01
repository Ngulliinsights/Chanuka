/**
 * Argument Analysis Service Interface
 * Defines contract for AI-powered argument analysis
 * Allows swapping between mock and production implementations
 */

import type { AsyncServiceResult } from '@server/infrastructure/error-handling';
import type { ArgumentAnalysis } from '../../application/community-validation.schemas';

export interface IArgumentAnalysisService {
  /**
   * Analyze a comment's argument structure and quality
   * @param commentId - ID of the comment
   * @param content - Comment text content
   * @returns Argument analysis with quality metrics
   */
  analyzeComment(commentId: string, content: string): Promise<AsyncServiceResult<ArgumentAnalysis>>;
  
  /**
   * Find comments with similar arguments
   * @param commentId - ID of the comment to find similar arguments for
   * @param threshold - Similarity threshold (0-1)
   * @param limit - Maximum number of results
   * @returns Array of similar comment IDs
   */
  findRelatedArguments(
    commentId: string,
    threshold: number,
    limit: number
  ): Promise<AsyncServiceResult<string[]>>;
  
  /**
   * Find counter-arguments to a comment
   * @param commentId - ID of the comment
   * @param limit - Maximum number of results
   * @returns Array of counter-argument comment IDs
   */
  findCounterArguments(
    commentId: string,
    limit: number
  ): Promise<AsyncServiceResult<string[]>>;
  
  /**
   * Get argument analysis by comment ID
   * @param commentId - ID of the comment
   * @returns Existing analysis or null
   */
  getAnalysis(commentId: string): Promise<AsyncServiceResult<ArgumentAnalysis | null>>;
  
  /**
   * Save argument analysis to database
   * @param analysis - Analysis to save
   * @returns Saved analysis
   */
  saveAnalysis(analysis: ArgumentAnalysis): Promise<AsyncServiceResult<ArgumentAnalysis>>;
}
