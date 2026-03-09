/**
 * Community Application Service
 * Integrated with Argument Intelligence for AI-enhanced discussions
 * 
 * Combines community features (comments, voting, discussions) with
 * AI-powered argument analysis (quality scoring, fallacy detection, evidence evaluation)
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import type { ICommentRepository } from '../domain/interfaces/ICommentRepository';
import type { IArgumentAnalysisService } from '../domain/interfaces/IArgumentAnalysisService';
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  DeleteCommentSchema,
  GetCommentSchema,
  GetCommentsSchema,
  VoteCommentSchema,
  AnalyzeCommentSchema,
  FindRelatedArgumentsSchema,
  GetArgumentClustersSchema,
  GetDebateQualitySchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type DeleteCommentInput,
  type GetCommentInput,
  type GetCommentsInput,
  type VoteCommentInput,
  type AnalyzeCommentInput,
  type FindRelatedArgumentsInput,
  type GetArgumentClustersInput,
  type GetDebateQualityInput,
  type ArgumentAnalysis,
  type DebateQualityMetrics,
} from './community-validation.schemas';

// ============================================================================
// TYPES
// ============================================================================

interface Comment {
  id: string;
  bill_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  upvotes: number;
  downvotes: number;
  is_verified: boolean;
  
  // Argument Intelligence enrichment
  argument_analysis?: ArgumentAnalysis;
  quality_score?: number;
  evidence_strength?: number;
  detected_fallacies?: string[];
  
  created_at: Date;
  updated_at: Date;
}

interface CommentWithAnalysis extends Comment {
  argument_analysis: ArgumentAnalysis;
  related_arguments?: Comment[];
  counter_arguments?: Comment[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class CommunityApplicationService {
  constructor(
    private commentRepo: ICommentRepository,
    private analysisService: IArgumentAnalysisService
  ) {}

  // ============================================================================
  // COMMENT MANAGEMENT
  // ============================================================================

  async createComment(input: CreateCommentInput): Promise<AsyncServiceResult<CommentWithAnalysis>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(CreateCommentSchema, input);
      
      logger.info({
        bill_id: validatedInput.bill_id,
        has_parent: !!validatedInput.parent_id,
      }, 'Creating comment');
      
      // Create comment in database
      const commentResult = await this.commentRepo.create({
        bill_id: validatedInput.bill_id,
        user_id: 'current-user-id', // TODO: Get from auth context
        content: validatedInput.content,
        parent_id: validatedInput.parent_id,
      });
      
      if (!commentResult.success) {
        throw new Error(commentResult.error || 'Failed to create comment');
      }
      
      const comment = commentResult.data;
      
      // Analyze argument if requested
      let analysis: ArgumentAnalysis | undefined;
      if (validatedInput.analyze_argument) {
        const analysisResult = await this.analysisService.analyzeComment(comment.id, comment.content);
        if (analysisResult.success) {
          analysis = analysisResult.data;
        }
      }
      
      // Invalidate caches
      await Promise.all([
        cacheService.delete(cacheKeys.list('comments', { bill_id: validatedInput.bill_id })),
        cacheService.delete(cacheKeys.query('debate-quality', { bill_id: validatedInput.bill_id })),
      ]);
      
      logger.info({
        comment_id: comment.id,
        quality_score: analysis?.quality_metrics.overall_score,
        has_fallacies: (analysis?.structure.fallacies.length || 0) > 0,
      }, 'Comment created');
      
      return {
        ...comment,
        argument_analysis: analysis!,
      };
    }, { service: 'CommunityApplicationService', operation: 'createComment' });
  }

  async getComment(input: GetCommentInput): Promise<AsyncServiceResult<CommentWithAnalysis | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetCommentSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.entity('comment', validatedInput.comment_id);
      const cached = await cacheService.get<CommentWithAnalysis>(cacheKey);
      if (cached) return cached;
      
      // Fetch from database
      const commentResult = await this.commentRepo.findById(validatedInput.comment_id);
      if (!commentResult.success || !commentResult.data) return null;
      
      const comment = commentResult.data;
      let enriched: CommentWithAnalysis = comment as CommentWithAnalysis;
      
      // Enrich with analysis if requested
      if (validatedInput.include_analysis) {
        const analysisResult = await this.analysisService.getAnalysis(comment.id);
        if (analysisResult.success && analysisResult.data) {
          enriched.argument_analysis = analysisResult.data;
        }
      }
      
      // Fetch related/counter arguments if requested
      if (validatedInput.include_related) {
        const relatedResult = await this.analysisService.findRelatedArguments(comment.id, 0.7, 5);
        if (relatedResult.success) {
          const relatedIds = relatedResult.data;
          const relatedComments = await Promise.all(
            relatedIds.map(id => this.commentRepo.findById(id))
          );
          enriched.related_arguments = relatedComments
            .filter(r => r.success && r.data)
            .map(r => r.data!);
        }
      }
      
      if (validatedInput.include_counter_arguments) {
        const counterResult = await this.analysisService.findCounterArguments(comment.id, 5);
        if (counterResult.success) {
          const counterIds = counterResult.data;
          const counterComments = await Promise.all(
            counterIds.map(id => this.commentRepo.findById(id))
          );
          enriched.counter_arguments = counterComments
            .filter(r => r.success && r.data)
            .map(r => r.data!);
        }
      }
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, enriched, CACHE_TTL.SHORT);
      
      return enriched;
    }, { service: 'CommunityApplicationService', operation: 'getComment' });
  }

  async getComments(input: GetCommentsInput): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetCommentsSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.list('comments', {
        bill_id: validatedInput.bill_id,
        parent_id: validatedInput.parent_id,
        sort: validatedInput.sort_by,
      });
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) return cached;
      
      // Fetch from database with sorting
      const sort = validatedInput.sort_by === 'quality' 
        ? { field: 'quality_score' as const, direction: 'desc' as const }
        : validatedInput.sort_by === 'votes'
        ? { field: 'upvotes' as const, direction: 'desc' as const }
        : { field: 'created_at' as const, direction: 'desc' as const };
      
      const commentsResult = await this.commentRepo.find(
        {
          bill_id: validatedInput.bill_id,
          parent_id: validatedInput.parent_id,
        },
        sort,
        validatedInput.limit,
        validatedInput.offset
      );
      
      if (!commentsResult.success) {
        throw new Error(commentsResult.error || 'Failed to fetch comments');
      }
      
      let comments = commentsResult.data;
      
      // Filter by quality if requested
      if (validatedInput.min_quality_score !== undefined) {
        // Fetch analysis for filtering
        const analysisPromises = comments.map(c => this.analysisService.getAnalysis(c.id));
        const analyses = await Promise.all(analysisPromises);
        
        comments = comments.filter((c, i) => {
          const analysis = analyses[i];
          if (!analysis.success || !analysis.data) return false;
          return analysis.data.quality_metrics.overall_score >= validatedInput.min_quality_score!;
        });
      }
      
      // Cache for 3 minutes (high volatility)
      await cacheService.set(cacheKey, comments, CACHE_TTL.SHORT);
      
      return comments;
    }, { service: 'CommunityApplicationService', operation: 'getComments' });
  }

  async updateComment(input: UpdateCommentInput): Promise<AsyncServiceResult<CommentWithAnalysis | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(UpdateCommentSchema, input);
      
      // Update in database
      const commentResult = await this.commentRepo.update(validatedInput.comment_id, {
        content: validatedInput.content,
      });
      
      if (!commentResult.success || !commentResult.data) return null;
      
      const comment = commentResult.data;
      
      // Re-analyze if requested
      let analysis: ArgumentAnalysis | undefined;
      if (validatedInput.reanalyze) {
        const analysisResult = await this.analysisService.analyzeComment(comment.id, validatedInput.content);
        if (analysisResult.success) {
          analysis = analysisResult.data;
        }
      }
      
      // Invalidate caches
      await Promise.all([
        cacheService.delete(cacheKeys.entity('comment', validatedInput.comment_id)),
        cacheService.delete(cacheKeys.list('comments', { bill_id: comment.bill_id })),
      ]);
      
      return {
        ...comment,
        argument_analysis: analysis,
      } as CommentWithAnalysis;
    }, { service: 'CommunityApplicationService', operation: 'updateComment' });
  }

  async deleteComment(input: DeleteCommentInput): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(DeleteCommentSchema, input);
      
      // Soft delete in database
      const deleteResult = await this.commentRepo.delete(validatedInput.comment_id);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete comment');
      }
      
      const deleted = deleteResult.data;
      
      if (deleted) {
        // Invalidate caches
        await cacheService.delete(cacheKeys.entity('comment', validatedInput.comment_id));
      }
      
      return deleted;
    }, { service: 'CommunityApplicationService', operation: 'deleteComment' });
  }

  // ============================================================================
  // VOTING
  // ============================================================================

  async voteComment(input: VoteCommentInput): Promise<AsyncServiceResult<{ upvotes: number; downvotes: number }>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(VoteCommentSchema, input);
      
      logger.info({
        comment_id: validatedInput.comment_id,
        vote: validatedInput.vote,
        has_reason: !!validatedInput.reason,
      }, 'Processing vote');
      
      // Record vote in database
      const voteResult = await this.commentRepo.vote(validatedInput.comment_id, validatedInput.vote);
      
      if (!voteResult.success) {
        throw new Error(voteResult.error || 'Failed to record vote');
      }
      
      // TODO: Use vote + reason to train AI (future enhancement)
      
      // Invalidate caches
      await Promise.all([
        cacheService.delete(cacheKeys.entity('comment', validatedInput.comment_id)),
        cacheService.delete(cacheKeys.list('comments', {})),
      ]);
      
      return voteResult.data;
    }, { service: 'CommunityApplicationService', operation: 'voteComment' });
  }

  // ============================================================================
  // ARGUMENT INTELLIGENCE
  // ============================================================================

  async analyzeComment(input: AnalyzeCommentInput): Promise<AsyncServiceResult<ArgumentAnalysis>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(AnalyzeCommentSchema, input);
      
      // Check cache unless force reanalysis
      if (!validatedInput.force_reanalysis) {
        const existingAnalysis = await this.analysisService.getAnalysis(validatedInput.comment_id);
        if (existingAnalysis.success && existingAnalysis.data) {
          return existingAnalysis.data;
        }
      }
      
      // Fetch comment content
      const commentResult = await this.commentRepo.findById(validatedInput.comment_id);
      if (!commentResult.success || !commentResult.data) {
        throw new Error('Comment not found');
      }
      
      const content = commentResult.data.content;
      
      // Analyze
      const analysisResult = await this.analysisService.analyzeComment(validatedInput.comment_id, content);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }
      
      return analysisResult.data;
    }, { service: 'CommunityApplicationService', operation: 'analyzeComment' });
  }

  async findRelatedArguments(input: FindRelatedArgumentsInput): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(FindRelatedArgumentsSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.query('related-arguments', {
        comment_id: validatedInput.comment_id,
        threshold: validatedInput.similarity_threshold,
      });
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) return cached;
      
      // Find related argument IDs
      const relatedIdsResult = await this.analysisService.findRelatedArguments(
        validatedInput.comment_id,
        validatedInput.similarity_threshold,
        validatedInput.limit
      );
      
      if (!relatedIdsResult.success) {
        throw new Error(relatedIdsResult.error || 'Failed to find related arguments');
      }
      
      // Fetch full comments
      const commentPromises = relatedIdsResult.data.map(id => this.commentRepo.findById(id));
      const commentResults = await Promise.all(commentPromises);
      
      const related = commentResults
        .filter(r => r.success && r.data)
        .map(r => r.data!);
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, related, CACHE_TTL.MEDIUM);
      
      return related;
    }, { service: 'CommunityApplicationService', operation: 'findRelatedArguments' });
  }

  async getArgumentClusters(input: GetArgumentClustersInput): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetArgumentClustersSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.query('argument-clusters', { bill_id: validatedInput.bill_id });
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;
      
      // TODO: Implement clustering algorithm
      const clusters = []; // Placeholder
      
      // Cache for 15 minutes
      await cacheService.set(cacheKey, clusters, CACHE_TTL.MEDIUM);
      
      return clusters;
    }, { service: 'CommunityApplicationService', operation: 'getArgumentClusters' });
  }

  async getDebateQuality(input: GetDebateQualityInput): Promise<AsyncServiceResult<DebateQualityMetrics>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetDebateQualitySchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.query('debate-quality', {
        bill_id: validatedInput.bill_id,
        period: validatedInput.time_period,
      });
      const cached = await cacheService.get<DebateQualityMetrics>(cacheKey);
      if (cached) return cached;
      
      // Fetch all comments for the bill
      const commentsResult = await this.commentRepo.find({ bill_id: validatedInput.bill_id });
      if (!commentsResult.success) {
        throw new Error(commentsResult.error || 'Failed to fetch comments');
      }
      
      const comments = commentsResult.data;
      const totalComments = comments.length;
      
      // Fetch analyses for all comments
      const analysisPromises = comments.map(c => this.analysisService.getAnalysis(c.id));
      const analysisResults = await Promise.all(analysisPromises);
      
      const analyses = analysisResults
        .filter(r => r.success && r.data)
        .map(r => r.data!);
      
      // Calculate metrics
      const avgQualityScore = analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.quality_metrics.overall_score, 0) / analyses.length
        : 0;
      
      const evidenceRate = analyses.length > 0
        ? analyses.filter(a => a.quality_metrics.evidence_strength > 0.5).length / analyses.length
        : 0;
      
      const fallacyRate = analyses.length > 0
        ? analyses.filter(a => a.structure.fallacies.length > 0).length / analyses.length
        : 0;
      
      const engagementRate = totalComments > 0
        ? comments.filter(c => c.upvotes + c.downvotes > 0).length / totalComments
        : 0;
      
      // Quality distribution
      const high = analyses.filter(a => a.quality_metrics.overall_score >= 7).length;
      const medium = analyses.filter(a => a.quality_metrics.overall_score >= 4 && a.quality_metrics.overall_score < 7).length;
      const low = analyses.filter(a => a.quality_metrics.overall_score < 4).length;
      
      // Top fallacies
      const fallacyCount: Record<string, number> = {};
      analyses.forEach(a => {
        a.structure.fallacies.forEach(f => {
          fallacyCount[f.type] = (fallacyCount[f.type] || 0) + 1;
        });
      });
      
      const topFallacies = Object.entries(fallacyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
      
      const metrics: DebateQualityMetrics = {
        bill_id: validatedInput.bill_id,
        total_comments: totalComments,
        average_quality_score: Math.round(avgQualityScore * 10) / 10,
        evidence_rate: Math.round(evidenceRate * 100) / 100,
        fallacy_rate: Math.round(fallacyRate * 100) / 100,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        quality_distribution: { high, medium, low },
        top_fallacies: topFallacies,
        calculated_at: new Date(),
      };
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, metrics, CACHE_TTL.MEDIUM);
      
      return metrics;
    }, { service: 'CommunityApplicationService', operation: 'getDebateQuality' });
  }
}

// Export singleton with mock implementations for MVP
import { MockCommentRepository } from '../infrastructure/mock/MockCommentRepository';
import { MockArgumentAnalysisService } from '../infrastructure/mock/MockArgumentAnalysisService';

export const communityApplicationService = new CommunityApplicationService(
  new MockCommentRepository(),
  new MockArgumentAnalysisService()
);
