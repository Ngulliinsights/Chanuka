/**
 * Expert Review Workflow for Constitutional Analysis
 *
 * Manages the full lifecycle of expert review requests for constitutional
 * analysis results: creation, submission, querying, and notifications.
 */

import { and, eq } from 'drizzle-orm';

import { notificationOrchestratorService } from '@server/features/notifications';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import {
  createDatabaseError,
  createSystemError,
  createValidationError,
  err,
  ok,
  type AsyncServiceResult,
} from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';
import { expertReviews } from '@server/infrastructure/schema/expert_verification';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_revision';

/** Terminal statuses — the only valid values when submitting a review. */
export type TerminalReviewStatus = Extract<ReviewStatus, 'approved' | 'rejected' | 'needs_revision'>;

export interface ExpertReview {
  id: string;
  analysisId: string;
  billId: string;
  expertId: string;
  status: ReviewStatus;
  comments: string;
  recommendations: string[];
  reviewedAt?: string;
  createdAt: string;
}

export interface ExpertReviewRequest {
  analysisId: string;
  billId: string;
  expertId: string;
  status: TerminalReviewStatus;
  comments: string;
  recommendations?: string[];
}

export interface ReviewStatistics {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  /** Average review time in milliseconds across all non-pending reviews. */
  averageReviewTimeMs: number;
}

// Derived locally — avoids a direct import of a type that may not be exported.
type AppError = ReturnType<typeof createValidationError>;

// Inferred DB row type for internal use
type DbRow = typeof expertReviews.$inferSelect;
type ReviewMetadata = {
  billId?: string;
  recommendations?: string[];
  createdAt?: string;
  reviewedAt?: string;
};

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Validates one or more string fields, returning the first `AppError` found
 * or `null` if all pass. Callers do a single `if (e) return err(e)` with
 * no type casts.
 */
function validateFields(
  fields: Array<{ name: string; value: string }>
): AppError | null {
  for (const { name, value } of fields) {
    if (!value?.trim()) {
      return createValidationError(
        [{ field: name, message: 'Must not be empty', value: value ?? '' }],
        { operation: 'validateFields' }
      );
    }
  }
  return null;
}

/** Construct an in-memory `ExpertReview` with sensible defaults. */
function buildReview(
  analysisId: string,
  billId: string,
  expertId: string,
  overrides: Partial<ExpertReview> = {}
): ExpertReview {
  return {
    id: crypto.randomUUID(),
    analysisId,
    billId,
    expertId,
    status: 'pending',
    comments: '',
    recommendations: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Map a domain `ExpertReview` to the DB insert shape. */
function mapReviewToDbRow(review: ExpertReview) {
  const metadata: ReviewMetadata = {
    billId: review.billId,
    recommendations: review.recommendations,
    createdAt: review.createdAt,
    ...(review.reviewedAt ? { reviewedAt: review.reviewedAt } : {}),
  };

  return {
    id: review.id,
    expertId: review.expertId,
    entityType: 'analysis' as const,
    entityId: review.analysisId,
    reviewType: 'analysis' as const,
    reviewStatus: review.status,
    reviewContent: review.comments,
    confidenceLevel: null,
    reviewMetadata: metadata,
    createdAt: new Date(review.createdAt),
    updatedAt: new Date(review.reviewedAt ?? review.createdAt),
  };
}

/** Map a DB row back to the domain `ExpertReview` shape. */
function mapRowToReview(row: DbRow): ExpertReview {
  const meta = (row.reviewMetadata ?? {}) as ReviewMetadata;
  return {
    id: row.id,
    analysisId: row.entityId,
    billId: meta.billId ?? '',
    expertId: row.expertId,
    status: (row.reviewStatus as ReviewStatus) ?? 'pending',
    comments: row.reviewContent ?? '',
    recommendations: (meta.recommendations ?? []) as string[],
    reviewedAt: meta.reviewedAt,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Normalize an unknown thrown value to an `Error` instance. */
function toError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ExpertReviewWorkflow {
  /**
   * Create pending review requests for each supplied expert and persist them.
   *
   * @param analysisId - The constitutional analysis being reviewed.
   * @param billId     - The legislative bill associated with the analysis.
   * @param expertIds  - Non-empty list of expert identifiers to notify.
   */
  async createReviewRequest(
    analysisId: string,
    billId: string,
    expertIds: string[]
  ): AsyncServiceResult<ExpertReview[]> {
    const validationError = validateFields([
      { name: 'analysisId', value: analysisId },
      { name: 'billId', value: billId },
    ]);
    if (validationError) return err(validationError);

    if (!expertIds.length) {
      return err(
        createValidationError(
          [{ field: 'expertIds', message: 'Must contain at least one entry' }],
          { operation: 'createReviewRequest' }
        )
      );
    }

    const ctx = { component: 'ExpertReviewWorkflow', analysisId, billId };

    logger.info({ message: 'Creating expert review requests', ...ctx, expertCount: expertIds.length });

    const reviews = expertIds.map((expertId) => buildReview(analysisId, billId, expertId));

    try {
      await writeDatabase.insert(expertReviews).values(reviews.map(mapReviewToDbRow));

      logger.info({ message: 'Expert review requests created', ...ctx, count: reviews.length });

      return ok(reviews);
    } catch (thrown) {
      const error = toError(thrown);
      logger.error({ message: 'Failed to persist expert review requests', ...ctx, error: error.message });
      return err(
        createDatabaseError('createReviewRequest', error, {
          operation: 'createReviewRequest',
          metadata: { analysisId, billId, expertCount: expertIds.length },
        })
      );
    }
  }

  /**
   * Persist a completed review submitted by an expert.
   *
   * @param request - Review details including a terminal status and comments.
   */
  async submitReview(request: ExpertReviewRequest): AsyncServiceResult<ExpertReview> {
    const validationError = validateFields([
      { name: 'analysisId', value: request.analysisId },
      { name: 'billId', value: request.billId },
      { name: 'expertId', value: request.expertId },
      { name: 'comments', value: request.comments },
    ]);
    if (validationError) return err(validationError);

    const ctx = {
      component: 'ExpertReviewWorkflow',
      analysisId: request.analysisId,
      expertId: request.expertId,
    };

    logger.info({ message: 'Submitting expert review', ...ctx, status: request.status });

    const review = buildReview(request.analysisId, request.billId, request.expertId, {
      status: request.status,
      comments: request.comments,
      recommendations: request.recommendations ?? [],
      reviewedAt: new Date().toISOString(),
    });

    try {
      await writeDatabase.insert(expertReviews).values(mapReviewToDbRow(review));

      logger.info({ message: 'Expert review submitted', ...ctx, reviewId: review.id, status: review.status });

      return ok(review);
    } catch (thrown) {
      const error = toError(thrown);
      logger.error({
        message: 'Failed to persist expert review submission',
        ...ctx,
        reviewId: review.id,
        error: error.message,
      });
      return err(
        createDatabaseError('submitReview', error, {
          operation: 'submitReview',
          metadata: { analysisId: request.analysisId, expertId: request.expertId },
        })
      );
    }
  }

  /**
   * Retrieve all reviews associated with a given analysis.
   *
   * @param analysisId - The analysis to look up reviews for.
   */
  async getReviewsForAnalysis(analysisId: string): AsyncServiceResult<ExpertReview[]> {
    try {
      const rows = await readDatabase
        .select()
        .from(expertReviews)
        .where(
          and(
            eq(expertReviews.entityType, 'analysis'),
            eq(expertReviews.entityId, analysisId)
          )
        );

      return ok(rows.map(mapRowToReview));
    } catch (thrown) {
      const error = toError(thrown);
      logger.error({
        message: 'Failed to retrieve reviews for analysis',
        component: 'ExpertReviewWorkflow',
        analysisId,
        error: error.message,
      });
      return err(
        createDatabaseError('getReviewsForAnalysis', error, {
          operation: 'getReviewsForAnalysis',
          metadata: { analysisId },
        })
      );
    }
  }

  /**
   * Retrieve all pending reviews assigned to a specific expert.
   *
   * @param expertId - The expert whose pending queue is requested.
   */
  async getPendingReviews(expertId: string): AsyncServiceResult<ExpertReview[]> {
    try {
      const rows = await readDatabase
        .select()
        .from(expertReviews)
        .where(
          and(
            eq(expertReviews.expertId, expertId),
            eq(expertReviews.reviewStatus, 'pending')
          )
        );

      return ok(rows.map(mapRowToReview));
    } catch (thrown) {
      const error = toError(thrown);
      logger.error({
        message: 'Failed to retrieve pending reviews',
        component: 'ExpertReviewWorkflow',
        expertId,
        error: error.message,
      });
      return err(
        createDatabaseError('getPendingReviews', error, {
          operation: 'getPendingReviews',
          metadata: { expertId },
        })
      );
    }
  }

  /**
   * Aggregate review statistics across all analyses.
   *
   * NOTE: Currently performs in-memory aggregation after a full table scan.
   * Replace with SQL COUNT / AVG aggregates once query volume warrants it.
   */
  async getReviewStatistics(): AsyncServiceResult<ReviewStatistics> {
    try {
      const rows = await readDatabase
        .select()
        .from(expertReviews)
        .where(eq(expertReviews.entityType, 'analysis'));

      const completedRows = rows.filter(
        (r: DbRow) => r.reviewStatus !== 'pending' && r.createdAt && r.updatedAt
      );

      const averageReviewTimeMs =
        completedRows.length > 0
          ? Math.round(
              completedRows.reduce(
                (sum: number, r: DbRow) =>
                  sum + ((r.updatedAt?.getTime() ?? 0) - (r.createdAt?.getTime() ?? 0)),
                0
              ) / completedRows.length
            )
          : 0;

      return ok({
        totalReviews: rows.length,
        pendingReviews: rows.filter((r: DbRow) => r.reviewStatus === 'pending').length,
        approvedReviews: rows.filter((r: DbRow) => r.reviewStatus === 'approved').length,
        rejectedReviews: rows.filter((r: DbRow) => r.reviewStatus === 'rejected').length,
        averageReviewTimeMs,
      });
    } catch (thrown) {
      const error = toError(thrown);
      logger.error({
        message: 'Failed to retrieve review statistics',
        component: 'ExpertReviewWorkflow',
        error: error.message,
      });
      return err(createSystemError(error, { operation: 'getReviewStatistics' }));
    }
  }

  /**
   * Dispatch review-request notifications to a list of experts.
   *
   * Failures are logged at `warn` level but do not propagate — notification
   * delivery is best-effort and must not block the review creation flow.
   *
   * @param expertIds  - Recipients of the notification.
   * @param analysisId - The analysis under review.
   * @param billId     - The associated legislative bill.
   */
  async notifyExperts(
    expertIds: string[],
    analysisId: string,
    billId: string
  ): AsyncServiceResult<void> {
    try {
      logger.info({
        message: 'Notifying experts of review request',
        component: 'ExpertReviewWorkflow',
        expertCount: expertIds.length,
        analysisId,
        billId,
      });

      await notificationOrchestratorService.sendBulkNotification(expertIds, {
        notificationType: 'system_alert',
        priority: 'urgent',
        content: {
          title: 'Constitutional Analysis Review Required',
          message:
            `A new constitutional analysis requires expert review. ` +
            `Bill ID: ${billId}. Please review the analysis and provide your assessment.`,
          htmlMessage:
            `<p>A new constitutional analysis requires expert review.</p>` +
            `<p><strong>Bill ID:</strong> ${billId}</p>` +
            `<p><strong>Analysis ID:</strong> ${analysisId}</p>` +
            `<p>Please review the analysis and provide your assessment.</p>`,
        },
        metadata: {
          actionUrl: `/analysis/${analysisId}/review`,
          analysisId,
          billId,
          reviewType: 'constitutional_analysis',
        },
        config: {
          skipFiltering: false,
          forceImmediate: true,
          channels: ['inApp', 'email'],
          retryOnFailure: true,
        },
      });

      logger.info({
        message: 'Expert notifications dispatched',
        component: 'ExpertReviewWorkflow',
        analysisId,
        billId,
      });

      return ok(undefined);
    } catch (thrown) {
      const error = toError(thrown);
      logger.warn({
        message: 'Failed to notify experts (non-fatal)',
        component: 'ExpertReviewWorkflow',
        expertCount: expertIds.length,
        analysisId,
        error: error.message,
      });
      // Intentionally returned, not thrown — callers decide whether to surface this.
      return err(createSystemError(error, { operation: 'notifyExperts', metadata: { analysisId } }));
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const expertReviewWorkflow = new ExpertReviewWorkflow();