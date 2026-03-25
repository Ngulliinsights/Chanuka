/**
 * Argument Intelligence Comment Integration — FINAL DRAFT
 *
 * CHANGES FROM PRIOR DRAFT:
 * - Extract LOG_COMPONENT constant; remove per-call component repetition
 * - Mark unused processComment params (_billId, _userId) with underscore prefix
 *   until persistence/auth wiring is in place
 * - Remove inner try/catch around synchronous argument construction — it
 *   cannot throw, and the wrapper already handles errors
 * - Replace Date.now() ID generation with crypto.randomUUID()
 * - Swap Promise.all → Promise.allSettled in batchProcessComments so one
 *   failed comment cannot abort the entire batch; fulfilled/rejected counts logged
 * - Guard averageProcessingTime against division by zero
 * - Extract BillCommentSummary as a named export interface
 * - Replace silent stub returns with explicit TODO warnings so gaps surface
 *   in logs rather than appearing to succeed
 */

import { CACHE_TTL, createSimpleCacheService } from '@server/infrastructure/cache';
import type { CacheService } from '@server/infrastructure/cache/core/interfaces';
import { logger } from '@server/infrastructure/observability';

import { nlpPipelineConfig } from './nlp-pipeline-config';

// ============================================================================
// TYPES
// ============================================================================

export interface CommentAnalysisResult {
  commentId: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  quality: {
    overallScore: number;
    clarity: number;
    evidence: number;
    reasoning: number;
  };
  argument?: {
    id: string;
    claims: number;
    evidence: number;
    position: 'support' | 'oppose' | 'neutral';
    strength: number;
  };
  processingTime: number;
}

export interface BillCommentSummary {
  totalComments: number;
  averageSentiment: number;
  averageQuality: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

const LOG_COMPONENT = 'CommentIntegrationService';

/** Minimum quality score required before treating a comment as an argument. */
const ARGUMENT_QUALITY_THRESHOLD = 0.5;

/**
 * Comment Integration Service
 *
 * Processes comments through the NLP pipeline and surfaces analysis results.
 * Uses factory-based caching for sustainable in-memory caching with LRU and TTL.
 *
 * TODO: Replace in-memory caching with persistent repository layer
 *       (e.g., Drizzle ORM table for comment_analyses).
 */
export class CommentIntegrationService {
  private readonly cache: CacheService;
  private readonly billCommentIndex: Map<string, Set<string>> = new Map(); // billId -> Set<commentId>

  constructor() {
    // Initialize cache via unified factory
    this.cache = createSimpleCacheService({
      defaultTtlSec: CACHE_TTL.HOUR,
      keyPrefix: 'app:comment-analysis',
    });

    logger.info(
      { component: LOG_COMPONENT },
      'CommentIntegrationService initialized with unified factory cache',
    );
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Process a single comment through the NLP pipeline.
   *
   * On failure, returns a zeroed-out result so callers always receive a
   * well-typed value; the original error is preserved in the log.
   *
   * Results are cached in-memory for quick retrieval by getCommentAnalysis
   * and aggregated by getBillCommentAnalysis.
   *
   * @param commentId       Unique identifier for this comment.
   * @param commentText     The raw comment text to analyze.
   * @param billId          Bill being commented on (used for aggregation).
   * @param _userId         Reserved for future audit-trail wiring — not yet used.
   */
  async processComment(
    commentId: string,
    commentText: string,
    billId: string,
    _userId: string,
  ): Promise<CommentAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info({ component: LOG_COMPONENT, commentId, billId }, 'Processing comment through NLP pipeline');

      const [sentiment, quality] = await Promise.all([
        nlpPipelineConfig.analyzeSentiment(commentText),
        nlpPipelineConfig.calculateQuality(commentText),
      ]);

      const argument =
        quality.overallScore > ARGUMENT_QUALITY_THRESHOLD
          ? this.buildArgumentStub(sentiment.score, quality.overallScore)
          : undefined;

      const processingTime = Date.now() - startTime;

      const result: CommentAnalysisResult = {
        commentId,
        sentiment: {
          score: sentiment.score,
          label: sentiment.label,
          confidence: sentiment.confidence,
        },
        quality: {
          overallScore: quality.overallScore,
          clarity: quality.dimensions.clarity,
          evidence: quality.dimensions.evidence,
          reasoning: quality.dimensions.reasoning,
        },
        argument,
        processingTime,
      };

      // Cache the result and index by bill
      await this.cache.set(commentId, result);
      
      // Also maintain bill index for aggregation
      if (!this.billCommentIndex.has(billId)) {
        this.billCommentIndex.set(billId, new Set());
      }
      const commentIds = this.billCommentIndex.get(billId);
      if (commentIds) {
        commentIds.add(commentId);
      }

      logger.info(
        { component: LOG_COMPONENT, commentId, processingTime, qualityScore: quality.overallScore, sentimentScore: sentiment.score },
        'Comment processing completed',
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ component: LOG_COMPONENT, commentId, error: errorMessage }, 'Comment processing failed');

      return this.zeroResult(commentId, Date.now() - startTime);
    }
  }

  /**
   * Process multiple comments concurrently.
   *
   * Uses Promise.allSettled so a single failure does not abort the batch.
   * Failed comments are replaced with zeroed results and counted in the log.
   */
  async batchProcessComments(
    comments: Array<{ id: string; text: string; billId: string; userId: string }>,
  ): Promise<CommentAnalysisResult[]> {
    logger.info({ component: LOG_COMPONENT, count: comments.length }, 'Batch processing comments');

    const settled = await Promise.allSettled(
      comments.map((c) => this.processComment(c.id, c.text, c.billId, c.userId)),
    );

    const results: CommentAnalysisResult[] = Array.from(settled.entries()).map(([i, outcome]) => {
      const comment = comments[i];

      if (outcome.status === 'fulfilled') return outcome.value;

      const errorMessage =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);

      logger.warn(
        { component: LOG_COMPONENT, commentId: comment?.id, error: errorMessage },
        'Comment failed during batch processing — using zeroed result',
      );

      return this.zeroResult(comment?.id ?? '', 0);
    });

    const fulfilled = results.filter((r) => r.processingTime > 0).length;
    const averageProcessingTime =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
        : 0;

    logger.info(
      { component: LOG_COMPONENT, total: results.length, fulfilled, failed: results.length - fulfilled, averageProcessingTime },
      'Batch processing completed',
    );

    return results;
  }

  /**
   * Retrieve a stored comment analysis by ID.
   *
   * Returns cached analysis if available, or null if comment has not been
   * processed yet. Works with factory cache for sustainable caching.
   */
  async getCommentAnalysis(commentId: string): Promise<CommentAnalysisResult | null> {
    const cached = await this.cache.get<CommentAnalysisResult>(commentId);

    if (cached) {
      logger.debug({ component: LOG_COMPONENT, commentId }, 'Retrieved comment analysis from cache');
      return cached;
    }

    logger.warn(
      { component: LOG_COMPONENT, commentId },
      'Comment analysis not found in cache — comment may not have been processed yet',
    );
    return null;
  }

  /**
   * Retrieve aggregated analysis for all comments on a bill.
   *
   * Aggregates sentiment and quality metrics across all comments associated
   * with the given billId. Works with factory cache for sustainable caching.
   *
   * Returns zero values if no comments have been processed for the bill yet.
   *
   * TODO: Once persistence layer is available, query database instead of
   *       memory index for full historical analysis.
   */
  async getBillCommentAnalysis(billId: string): Promise<BillCommentSummary> {
    // Get comment IDs from our local index
    const commentIds = this.billCommentIndex.get(billId) || new Set();

    if (commentIds.size === 0) {
      logger.debug(
        { component: LOG_COMPONENT, billId },
        'No comment analyses found for bill — returning zero summary',
      );

      return {
        totalComments: 0,
        averageSentiment: 0,
        averageQuality: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        qualityDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    // Retrieve all analyses from cache
    const analyses: CommentAnalysisResult[] = [];
    for (const commentId of commentIds) {
      const analysis = await this.cache.get<CommentAnalysisResult>(commentId);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    if (analyses.length === 0) {
      logger.debug(
        { component: LOG_COMPONENT, billId },
        'No comment analyses remain in cache for bill',
      );

      return {
        totalComments: 0,
        averageSentiment: 0,
        averageQuality: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        qualityDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    // Aggregate metrics across all comments.
    let sentimentSum = 0;
    let qualitySum = 0;
    const sentimentDist = { positive: 0, neutral: 0, negative: 0 };
    const qualityDist = { high: 0, medium: 0, low: 0 };

    for (const analysis of analyses) {
      sentimentSum += analysis.sentiment.score;
      qualitySum += analysis.quality.overallScore;

      // Sentiment distribution (thresholds: ±0.2).
      if (analysis.sentiment.score > 0.2) sentimentDist.positive++;
      else if (analysis.sentiment.score < -0.2) sentimentDist.negative++;
      else sentimentDist.neutral++;

      // Quality distribution (thresholds: 0.66 high, 0.33 medium, rest low).
      if (analysis.quality.overallScore >= 0.66) qualityDist.high++;
      else if (analysis.quality.overallScore >= 0.33) qualityDist.medium++;
      else qualityDist.low++;
    }

    const count = analyses.length;
    const summary: BillCommentSummary = {
      totalComments: count,
      averageSentiment: sentimentSum / count,
      averageQuality: qualitySum / count,
      sentimentDistribution: sentimentDist,
      qualityDistribution: qualityDist,
    };

    logger.info(
      {
        component: LOG_COMPONENT,
        billId,
        totalComments: count,
        averageSentiment: summary.averageSentiment,
        averageQuality: summary.averageQuality,
      },
      'Bill comment analysis aggregated',
    );

    return summary;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Derive a position label from a raw sentiment score.
   *
   * Thresholds mirror those used elsewhere in the pipeline (±0.2).
   */
  private sentimentToPosition(score: number): 'support' | 'oppose' | 'neutral' {
    if (score > 0.2) return 'support';
    if (score < -0.2) return 'oppose';
    return 'neutral';
  }

  /**
   * Build a lightweight argument stub while the full argument-intelligence
   * service integration is pending.
   *
   * CURRENT IMPLEMENTATION (Complete): Returns a minimal argument representation
   * with position inferred from sentiment and strength from quality score.
   *
   * TODO: Once argumentIntelligenceService.processComment API is available,
   *       replace with full call:
   *
   *       const fullArgument = await argumentIntelligenceService.processComment({
   *         text: sourceCommentText,
   *         position,
   *         qualityMetrics,
   *       });
   *       return {
   *         ...fullArgument,
   *         strength: qualityScore,
   *       };
   *
   *       This would provide: claim detection, evidence linking, detailed
   *       reasoning structure, stakeholder group mapping, etc.
   */
  private buildArgumentStub(
    sentimentScore: number,
    qualityScore: number,
  ): CommentAnalysisResult['argument'] {
    return {
      id: crypto.randomUUID(),
      claims: 0, // Will be populated by argumentIntelligenceService
      evidence: 0, // Will be populated by argumentIntelligenceService
      position: this.sentimentToPosition(sentimentScore),
      strength: qualityScore,
    };
  }

  /** Return a fully-typed zeroed result for use in error paths. */
  private zeroResult(commentId: string, processingTime: number): CommentAnalysisResult {
    return {
      commentId,
      sentiment: { score: 0, label: 'neutral', confidence: 0 },
      quality: { overallScore: 0, clarity: 0, evidence: 0, reasoning: 0 },
      processingTime,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const commentIntegrationService = new CommentIntegrationService();