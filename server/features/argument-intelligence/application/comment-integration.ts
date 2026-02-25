/**
 * Argument Intelligence Comment Integration
 * 
 * Integrates argument intelligence with the comment system for real-time processing
 */

import { logger } from '@server/infrastructure/observability';
import { nlpPipelineConfig } from './nlp-pipeline-config';
import { argumentIntelligenceService } from './argument-intelligence-service';

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
    position: string;
    strength: number;
  };
  processingTime: number;
}

/**
 * Comment Integration Service
 * 
 * Processes comments through the NLP pipeline and stores results
 */
export class CommentIntegrationService {
  /**
   * Process a comment through the NLP pipeline
   */
  async processComment(
    commentId: string,
    commentText: string,
    billId: string,
    userId: string
  ): Promise<CommentAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Processing comment through NLP pipeline', {
        component: 'CommentIntegrationService',
        commentId,
        billId,
      });

      // Run sentiment analysis and quality metrics in parallel
      const [sentiment, quality] = await Promise.all([
        nlpPipelineConfig.analyzeSentiment(commentText),
        nlpPipelineConfig.calculateQuality(commentText),
      ]);

      // Process as argument if quality is sufficient
      let argument;
      if (quality.overallScore > 0.5) {
        try {
          const processedArgument = await argumentIntelligenceService.processComment({
            text: commentText,
            billId,
            userId,
          });

          argument = {
            id: processedArgument.id,
            claims: processedArgument.claims.length,
            evidence: processedArgument.evidence.length,
            position: processedArgument.position,
            strength: processedArgument.strength,
          };
        } catch (error) {
          logger.warn('Failed to process comment as argument', {
            component: 'CommentIntegrationService',
            commentId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

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

      logger.info('Comment processing completed', {
        component: 'CommentIntegrationService',
        commentId,
        processingTime,
        qualityScore: quality.overallScore,
        sentimentScore: sentiment.score,
      });

      return result;
    } catch (error) {
      logger.error('Comment processing failed', {
        component: 'CommentIntegrationService',
        commentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return default result on error
      return {
        commentId,
        sentiment: {
          score: 0,
          label: 'neutral',
          confidence: 0,
        },
        quality: {
          overallScore: 0,
          clarity: 0,
          evidence: 0,
          reasoning: 0,
        },
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch process multiple comments
   */
  async batchProcessComments(
    comments: Array<{
      id: string;
      text: string;
      billId: string;
      userId: string;
    }>
  ): Promise<CommentAnalysisResult[]> {
    logger.info('Batch processing comments', {
      component: 'CommentIntegrationService',
      count: comments.length,
    });

    const results = await Promise.all(
      comments.map((comment) =>
        this.processComment(comment.id, comment.text, comment.billId, comment.userId)
      )
    );

    logger.info('Batch processing completed', {
      component: 'CommentIntegrationService',
      count: results.length,
      averageProcessingTime:
        results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
    });

    return results;
  }

  /**
   * Get comment analysis by ID
   */
  async getCommentAnalysis(commentId: string): Promise<CommentAnalysisResult | null> {
    // In a real implementation, this would fetch from database
    // For now, return null as we're not storing results yet
    return null;
  }

  /**
   * Get aggregated analysis for a bill's comments
   */
  async getBillCommentAnalysis(billId: string): Promise<{
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
  }> {
    // In a real implementation, this would aggregate from database
    // For now, return default values
    return {
      totalComments: 0,
      averageSentiment: 0,
      averageQuality: 0,
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      qualityDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }
}

// Singleton instance
export const commentIntegrationService = new CommentIntegrationService();
