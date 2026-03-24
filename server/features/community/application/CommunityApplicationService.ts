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
// DOMAIN TYPES
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

interface ArgumentCluster {
  id: string;
  theme: string;
  comment_ids: string[];
  size: number;
}

// ============================================================================
// INFRASTRUCTURE ADAPTERS
//
// We have learned the exact shapes through successive TS errors:
//
//  ValidationResult<T>  — { data?: T }        (.data is OPTIONAL — guard before use)
//  ServiceResult<T>     — Ok<T> | Err<T>      (Ok has `value`, Err does not — no `.ok`)
//  CacheService         — has .get / .set / .clear   (not delete/invalidate/remove)
//
// These thin local wrappers isolate all the casts in one place so the
// business logic stays clean and future API changes are a one-line fix here.
// ============================================================================

type _ServiceOk<T> = { value: T };
type _ServiceErr   = Record<string, unknown>; // Err does NOT have `value`
type _SR<T>        = _ServiceOk<T> | _ServiceErr;

/** Narrow: Ok carries `value`, Err does not */
function _isOk<T>(r: _SR<T>): r is _ServiceOk<T> {
  return 'value' in r;
}

/** Throw on failure — use when the error is unrecoverable */
function unwrap<T>(r: _SR<T>, op: string): T {
  if (_isOk(r)) return r.value;
  const err = (r as Record<string, unknown>).error;
  const msg = err && typeof err === 'object' && 'message' in err
    ? String((err as { message: unknown }).message)
    : typeof err === 'string' ? err : 'Unknown error';
  throw new Error(`${op}: ${msg}`);
}

/** Return null on failure — use when absence is acceptable */
function tryGet<T>(r: _SR<T>): T | null {
  return _isOk(r) ? r.value : null;
}

/**
 * Extract validated payload.
 * ValidationResult<T> = { data?: T }  — `.data` is optional; throw if absent
 * (validation should never succeed without data, but the type allows it)
 */
function validated<T>(result: { data?: T }, op: string): T {
  if (result.data === undefined) throw new Error(`${op}: validation produced no data`);
  return result.data;
}

/** Single place to call cache invalidation — swap method name here if needed */
async function cacheEvict(...keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => (cacheService as unknown as { clear(k: string): Promise<void> }).clear(k)));
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
      const v = validated(await validateData(CreateCommentSchema, input), 'createComment');

      logger.info({ bill_id: v.bill_id, has_parent: !!v.parent_id }, 'Creating comment');

      const comment = unwrap(
        await this.commentRepo.create({
          bill_id:   v.bill_id,
          user_id:   'current-user-id', // TODO: replace with auth context
          content:   v.content,
          parent_id: v.parent_id,
        }) as _SR<Comment>,
        'commentRepo.create'
      );

      let analysis: ArgumentAnalysis | undefined;
      if (v.analyze_argument) {
        const maybe = tryGet(
          await this.analysisService.analyzeComment(comment.id, comment.content) as _SR<ArgumentAnalysis>
        );
        if (maybe) analysis = maybe;
      }

      await cacheEvict(
        cacheKeys.list('comments', { bill_id: v.bill_id }),
        cacheKeys.query('debate-quality', { bill_id: v.bill_id }),
      );

      logger.info({
        comment_id:    comment.id,
        quality_score: analysis?.quality_metrics.overall_score,
        has_fallacies: (analysis?.structure.fallacies.length ?? 0) > 0,
      }, 'Comment created');

      return { ...comment, argument_analysis: analysis! } as CommentWithAnalysis;
    }, { service: 'CommunityApplicationService', operation: 'createComment' });
  }

  async getComment(input: GetCommentInput): Promise<AsyncServiceResult<CommentWithAnalysis | null>> {
    return safeAsync(async () => {
      const v = validated(await validateData(GetCommentSchema, input), 'getComment');

      const cacheKey = cacheKeys.entity('comment', v.comment_id);
      const cached = await cacheService.get<CommentWithAnalysis>(cacheKey);
      if (cached) return cached;

      const comment = tryGet(
        await this.commentRepo.findById(v.comment_id) as _SR<Comment | null>
      );
      if (!comment) return null;

      const enriched: CommentWithAnalysis = { ...comment } as CommentWithAnalysis;

      if (v.include_analysis) {
        const analysis = tryGet(
          await this.analysisService.getAnalysis(comment.id) as _SR<ArgumentAnalysis>
        );
        if (analysis) enriched.argument_analysis = analysis;
      }

      if (v.include_related) {
        const ids = tryGet(
          await this.analysisService.findRelatedArguments(comment.id, 0.7, 5) as _SR<string[]>
        );
        if (ids) {
          enriched.related_arguments = (await Promise.all(ids.map((id: string) => this.commentRepo.findById(id))))
            .map((r) => tryGet(r as _SR<Comment | null>))
            .filter((c): c is Comment => c !== null);
        }
      }

      if (v.include_counter_arguments) {
        const ids = tryGet(
          await this.analysisService.findCounterArguments(comment.id, 5) as _SR<string[]>
        );
        if (ids) {
          enriched.counter_arguments = (await Promise.all(ids.map((id: string) => this.commentRepo.findById(id))))
            .map((r) => tryGet(r as _SR<Comment | null>))
            .filter((c): c is Comment => c !== null);
        }
      }

      await cacheService.set(cacheKey, enriched, CACHE_TTL.SHORT);
      return enriched;
    }, { service: 'CommunityApplicationService', operation: 'getComment' });
  }

  async getComments(input: GetCommentsInput): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      const v = validated(await validateData(GetCommentsSchema, input), 'getComments');

      const cacheKey = cacheKeys.list('comments', {
        bill_id:   v.bill_id,
        parent_id: v.parent_id,
        sort:      v.sort_by,
      });
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) return cached;

      const sort =
        v.sort_by === 'quality' ? { field: 'quality_score' as const, direction: 'desc' as const }
        : v.sort_by === 'popular' ? { field: 'upvotes'       as const, direction: 'desc' as const }
        :                         { field: 'created_at'    as const, direction: 'desc' as const };

      let comments = unwrap(
        await this.commentRepo.find(
          { bill_id: v.bill_id, parent_id: v.parent_id },
          sort,
          v.limit,
          v.offset,
        ) as _SR<Comment[]>,
        'commentRepo.find'
      );

      if (v.min_quality_score !== undefined) {
        const threshold = v.min_quality_score as number;
        const analyses = await Promise.all(
          comments.map((c: Comment) => this.analysisService.getAnalysis(c.id))
        );
        comments = comments.filter((_: Comment, i: number) => {
          const a = tryGet(analyses[i] as _SR<ArgumentAnalysis>);
          return a !== null && a.quality_metrics.overall_score >= threshold;
        });
      }

      await cacheService.set(cacheKey, comments, CACHE_TTL.SHORT);
      return comments;
    }, { service: 'CommunityApplicationService', operation: 'getComments' });
  }

  async updateComment(input: UpdateCommentInput): Promise<AsyncServiceResult<CommentWithAnalysis | null>> {
    return safeAsync(async () => {
      const v = validated(await validateData(UpdateCommentSchema, input), 'updateComment');

      const comment = tryGet(
        await this.commentRepo.update(v.comment_id, { content: v.content }) as _SR<Comment | null>
      );
      if (!comment) return null;

      let analysis: ArgumentAnalysis | undefined;
      if (v.reanalyze) {
        const maybe = tryGet(
          await this.analysisService.analyzeComment(comment.id, v.content) as _SR<ArgumentAnalysis>
        );
        if (maybe) analysis = maybe;
      }

      await cacheEvict(
        cacheKeys.entity('comment', v.comment_id),
        cacheKeys.list('comments', { bill_id: comment.bill_id }),
      );

      return { ...comment, argument_analysis: analysis } as CommentWithAnalysis;
    }, { service: 'CommunityApplicationService', operation: 'updateComment' });
  }

  async deleteComment(input: DeleteCommentInput): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const v = validated(await validateData(DeleteCommentSchema, input), 'deleteComment');

      const deleted = unwrap(
        await this.commentRepo.delete(v.comment_id) as _SR<boolean>,
        'commentRepo.delete'
      );

      if (deleted) {
        await cacheEvict(cacheKeys.entity('comment', v.comment_id));
      }

      return deleted;
    }, { service: 'CommunityApplicationService', operation: 'deleteComment' });
  }

  // ============================================================================
  // VOTING
  // ============================================================================

  async voteComment(
    input: VoteCommentInput
  ): Promise<AsyncServiceResult<{ upvotes: number; downvotes: number }>> {
    return safeAsync(async () => {
      const v = validated(await validateData(VoteCommentSchema, input), 'voteComment');

      logger.info(
        { comment_id: v.comment_id, vote: v.vote, has_reason: !!v.reason },
        'Processing vote'
      );

      const counts = unwrap(
        await this.commentRepo.vote(v.comment_id, v.vote) as _SR<{ upvotes: number; downvotes: number }>,
        'commentRepo.vote'
      );

      // TODO: Use vote + reason to train AI (future enhancement)

      await cacheEvict(
        cacheKeys.entity('comment', v.comment_id),
        cacheKeys.list('comments', {}),
      );

      return counts;
    }, { service: 'CommunityApplicationService', operation: 'voteComment' });
  }

  // ============================================================================
  // ARGUMENT INTELLIGENCE
  // ============================================================================

  async analyzeComment(input: AnalyzeCommentInput): Promise<AsyncServiceResult<ArgumentAnalysis>> {
    return safeAsync(async () => {
      const v = validated(await validateData(AnalyzeCommentSchema, input), 'analyzeComment');

      if (!v.force_reanalysis) {
        const existing = tryGet(
          await this.analysisService.getAnalysis(v.comment_id) as _SR<ArgumentAnalysis>
        );
        if (existing) return existing;
      }

      const comment = tryGet(
        await this.commentRepo.findById(v.comment_id) as _SR<Comment | null>
      );
      if (!comment) throw new Error('Comment not found');

      return unwrap(
        await this.analysisService.analyzeComment(v.comment_id, comment.content) as _SR<ArgumentAnalysis>,
        'analysisService.analyzeComment'
      );
    }, { service: 'CommunityApplicationService', operation: 'analyzeComment' });
  }

  async findRelatedArguments(input: FindRelatedArgumentsInput): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      const v = validated(await validateData(FindRelatedArgumentsSchema, input), 'findRelatedArguments');

      const cacheKey = cacheKeys.query('related-arguments', {
        comment_id: v.comment_id,
        threshold:  v.similarity_threshold,
      });
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) return cached;

      const relatedIds = unwrap(
        await this.analysisService.findRelatedArguments(
          v.comment_id,
          v.similarity_threshold,
          v.limit,
        ) as _SR<string[]>,
        'analysisService.findRelatedArguments'
      );

      const related = (
        await Promise.all(relatedIds.map((id: string) => this.commentRepo.findById(id)))
      )
        .map((r) => tryGet(r as _SR<Comment | null>))
        .filter((c): c is Comment => c !== null);

      await cacheService.set(cacheKey, related, CACHE_TTL.MEDIUM);
      return related;
    }, { service: 'CommunityApplicationService', operation: 'findRelatedArguments' });
  }

  async getArgumentClusters(
    input: GetArgumentClustersInput
  ): Promise<AsyncServiceResult<ArgumentCluster[]>> {
    return safeAsync(async () => {
      const v = validated(await validateData(GetArgumentClustersSchema, input), 'getArgumentClusters');

      const cacheKey = cacheKeys.query('argument-clusters', { bill_id: v.bill_id });
      const cached = await cacheService.get<ArgumentCluster[]>(cacheKey);
      if (cached) return cached;

      // TODO: Implement clustering algorithm
      const clusters: ArgumentCluster[] = [];

      await cacheService.set(cacheKey, clusters, CACHE_TTL.MEDIUM);
      return clusters;
    }, { service: 'CommunityApplicationService', operation: 'getArgumentClusters' });
  }

  async getDebateQuality(input: GetDebateQualityInput): Promise<AsyncServiceResult<DebateQualityMetrics>> {
    return safeAsync(async () => {
      const v = validated(await validateData(GetDebateQualitySchema, input), 'getDebateQuality');

      const cacheKey = cacheKeys.query('debate-quality', {
        bill_id: v.bill_id,
        period:  v.time_period,
      });
      const cached = await cacheService.get<DebateQualityMetrics>(cacheKey);
      if (cached) return cached;

      const comments = unwrap(
        await this.commentRepo.find({ bill_id: v.bill_id }) as _SR<Comment[]>,
        'commentRepo.find'
      );
      const totalComments = comments.length;

      const analyses = (
        await Promise.all(comments.map((c: Comment) => this.analysisService.getAnalysis(c.id)))
      )
        .map((r) => tryGet(r as _SR<ArgumentAnalysis>))
        .filter((a): a is ArgumentAnalysis => a !== null);

      const avgQualityScore = analyses.length > 0
        ? analyses.reduce((sum: number, a: ArgumentAnalysis) => sum + a.quality_metrics.overall_score, 0) / analyses.length
        : 0;

      const evidenceRate = analyses.length > 0
        ? analyses.filter((a: ArgumentAnalysis) => a.quality_metrics.evidence_strength > 0.5).length / analyses.length
        : 0;

      const fallacyRate = analyses.length > 0
        ? analyses.filter((a: ArgumentAnalysis) => a.structure.fallacies.length > 0).length / analyses.length
        : 0;

      const engagementRate = totalComments > 0
        ? comments.filter((c: Comment) => c.upvotes + c.downvotes > 0).length / totalComments
        : 0;

      const high   = analyses.filter((a: ArgumentAnalysis) => a.quality_metrics.overall_score >= 7).length;
      const medium = analyses.filter((a: ArgumentAnalysis) => a.quality_metrics.overall_score >= 4 && a.quality_metrics.overall_score < 7).length;
      const low    = analyses.filter((a: ArgumentAnalysis) => a.quality_metrics.overall_score < 4).length;

      const fallacyCount: Record<string, number> = {};
      analyses.forEach((a: ArgumentAnalysis) => {
        a.structure.fallacies.forEach((f: { type: string }) => {
          fallacyCount[f.type] = (fallacyCount[f.type] ?? 0) + 1;
        });
      });

      const topFallacies = Object.entries(fallacyCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      const metrics: DebateQualityMetrics = {
        bill_id:               v.bill_id,
        total_comments:        totalComments,
        average_quality_score: Math.round(avgQualityScore * 10) / 10,
        evidence_rate:         Math.round(evidenceRate   * 100) / 100,
        fallacy_rate:          Math.round(fallacyRate    * 100) / 100,
        engagement_rate:       Math.round(engagementRate * 100) / 100,
        quality_distribution:  { high, medium, low },
        top_fallacies:         topFallacies,
        calculated_at:         new Date(),
      };

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