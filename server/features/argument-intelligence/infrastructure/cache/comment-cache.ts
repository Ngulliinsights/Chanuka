// ============================================================================
// ARGUMENT INTELLIGENCE - Comment Analysis Cache Service
// ============================================================================
// Caching layer for comment analysis results with bill-comment indexing

import { logger } from '@server/infrastructure/observability';

/**
 * Comment Analysis Cache
 *
 * Manages caching of processed comment analyses with bill-level aggregation support.
 * Automatically maintains indexes for quick bill-comment lookups.
 */
export class CommentAnalysisCache<T = unknown> {
  private analysisCache: Map<string, T> = new Map(); // commentId → analysis
  private billIndexes: Map<string, Set<string>> = new Map(); // billId → Set<commentId>

  constructor() {
    logger.info(
      { component: 'CommentAnalysisCache' },
      'Comment Analysis Cache initialized',
    );
  }

  /**
   * Get analysis for a specific comment.
   */
  get(commentId: string): T | null {
    return this.analysisCache.get(commentId) ?? null;
  }

  /**
   * Store analysis and update bill index.
   */
  set(commentId: string, billId: string, analysis: T): void {
    this.analysisCache.set(commentId, analysis);

    // Update bill index
    if (!this.billIndexes.has(billId)) {
      this.billIndexes.set(billId, new Set());
    }
    this.billIndexes.get(billId)!.add(commentId);
  }

  /**
   * Get all comment IDs for a bill.
   */
  getCommentIdsForBill(billId: string): string[] {
    const commentIds = this.billIndexes.get(billId) ?? new Set();
    return Array.from(commentIds);
  }

  /**
   * Get all analyses for a bill.
   */
  getAnalysesForBill(billId: string): T[] {
    const commentIds = this.billIndexes.get(billId) ?? new Set();
    const analyses: T[] = [];

    for (const commentId of commentIds) {
      const analysis = this.analysisCache.get(commentId);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Delete a comment's analysis and update bill index.
   */
  delete(commentId: string, billId?: string): boolean {
    const removed = this.analysisCache.delete(commentId);

    if (removed && billId) {
      const billComments = this.billIndexes.get(billId);
      if (billComments) {
        billComments.delete(commentId);
        // Clean up empty bill entries
        if (billComments.size === 0) {
          this.billIndexes.delete(billId);
        }
      }
    }

    return removed;
  }

  /**
   * Get overall cache statistics.
   */
  getStats(): {
    totalAnalyses: number;
    totalBills: number;
    averageCommentsPerBill: number;
  } {
    const totalAnalyses = this.analysisCache.size;
    const totalBills = this.billIndexes.size;
    const averageCommentsPerBill =
      totalBills > 0
        ? Array.from(this.billIndexes.values()).reduce((sum, set) => sum + set.size, 0) /
          totalBills
        : 0;

    return {
      totalAnalyses,
      totalBills,
      averageCommentsPerBill,
    };
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.analysisCache.clear();
    this.billIndexes.clear();
    logger.info({ component: 'CommentAnalysisCache' }, 'Comment analysis cache cleared');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const commentAnalysisCache = new CommentAnalysisCache();
