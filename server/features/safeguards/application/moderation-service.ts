import { logger } from '@server/infrastructure/observability';
import { type DatabaseTransaction, withTransaction } from '@server/infrastructure/database/connection';
import { readDb as readDatabase } from '@server/infrastructure/database/pool';
import {
  moderationAppeals,
  moderationDecisions,
  moderationQueue,
  type ModerationQueueItem,
} from '@server/infrastructure/schema/safeguards';
import {
  isModerationAppeal,
  isModerationContext,
  isModerationDecision,
  type ModerationAppeal,
  type ModerationContext,
  type ModerationDecision,
} from '@shared/types/domains/safeguards';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

// ==================== Type Re-exports ====================

export type { ModerationAppeal, ModerationContext, ModerationDecision } from '@shared/types/domains/safeguards';

// ==================== Result Types ====================

export interface ModerationQueueResult {
  success: boolean;
  queueItemId?: string;
  error?: string;
}

export interface ModerationDecisionResult {
  success: boolean;
  decisionId?: string;
  error?: string;
}

export interface ModerationAppealResult {
  success: boolean;
  appealId?: string;
  error?: string;
}

export interface ModeratorPerformanceMetrics {
  moderatorId: string;
  periodStart: Date;
  periodEnd: Date;
  decisionsMade: number;
  appealsOverturned: number;
  overturnRate: number;
  averageReviewTimeMinutes: number;
  overallRating: string;
}

// ==================== Helper Functions ====================

/** Safely extract error message from unknown error type */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** Validate moderation context using standardized type guard */
function validateModerationContext(context: unknown): asserts context is ModerationContext {
  if (!isModerationContext(context)) {
    throw new Error('Invalid moderation context');
  }
}

/** Validate moderation decision using standardized type guard */
function validateModerationDecision(decision: unknown): asserts decision is ModerationDecision {
  if (!isModerationDecision(decision)) {
    throw new Error('Invalid moderation decision');
  }
}

/** Validate moderation appeal using standardized type guard */
function validateModerationAppeal(appeal: unknown): asserts appeal is ModerationAppeal {
  if (!isModerationAppeal(appeal)) {
    throw new Error('Invalid moderation appeal');
  }
}

// ==================== Service Class ====================

/**
 * Service for managing content moderation workflows.
 * Handles moderation queue, decisions, appeals, and moderator performance tracking.
 *
 * SECURITY & CONCURRENCY:
 * - Uses transactions with row-level locking (FOR UPDATE) to prevent race conditions
 * - Validates all inputs before processing
 * - Prevents duplicate queue entries atomically
 * - Ensures moderator assignment is atomic and doesn't allow double-assignment
 * - Tracks all state transitions with timestamps for auditing
 */
export class ModerationService {
  private static instance: ModerationService;

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  // ==================== Queue Management ====================

  /**
   * Add content to moderation queue with race condition prevention.
   * Uses transaction with explicit locking to prevent duplicate entries.
   */
  async queueForModeration(context: ModerationContext): Promise<ModerationQueueResult> {
    try {
      validateModerationContext(context);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        const existingQuery = `
          SELECT * FROM moderation_queue
          WHERE content_type = $1
          AND content_id = $2
          AND status IN ('pending', 'in_review')
          FOR UPDATE
        `;

        const existing = await tx.query(existingQuery, [context.contentType, context.contentId]);

        if (existing && Array.isArray(existing) && existing.length > 0) {
          return { success: false, error: 'Content already in moderation queue' };
        }

        const priority = this.calculatePriority(context);
        const slaDeadline = this.calculateSLADeadline(priority);

        const insertQuery = `
          INSERT INTO moderation_queue (
            id, content_type, content_id, content_snapshot, trigger_reason,
            flag_count, ai_confidence_score, detected_violations, priority,
            sla_deadline, status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW()
          ) RETURNING *
        `;

        const result = await tx.query<ModerationQueueItem[]>(insertQuery, [
          context.contentType,
          context.contentId,
          JSON.stringify(context.automatedSignals || {}),
          context.triggerType,
          context.flagCount || 1,
          context.triggerConfidence?.toString() || null,
          JSON.stringify(context.flagReasons || []),
          priority,
          slaDeadline,
        ]);

        const queueItemId = (result as unknown as Array<{ id?: string }>)[0]?.id;

        logger.info(
          { queueItemId, contentType: context.contentType, priority },
          'Content queued for moderation'
        );

        return { success: true, queueItemId };
      });
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), context },
        'Failed to queue content for moderation'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Assign moderator to queue item with race condition prevention.
   * Prevents double-assignment using row-level locking.
   */
  async assignModerator(queueItemId: string, moderatorId: string): Promise<boolean> {
    try {
      if (!queueItemId || !moderatorId) {
        throw new Error('Queue item ID and moderator ID are required');
      }

      return await withTransaction(async (tx: DatabaseTransaction) => {
        const lockQuery = `
          SELECT * FROM moderation_queue
          WHERE id = $1
          AND status = 'pending'
          AND assigned_to IS NULL
          FOR UPDATE
        `;

        const locked = await tx.query(lockQuery, [queueItemId]);

        if (!locked || !Array.isArray(locked) || locked.length === 0) {
          throw new Error('Queue item not available for assignment');
        }

        const updateQuery = `
          UPDATE moderation_queue
          SET assigned_to = $1,
              assigned_at = NOW(),
              status = 'in_review',
              updated_at = NOW()
          WHERE id = $2
        `;

        await tx.query(updateQuery, [moderatorId, queueItemId]);

        logger.info({ queueItemId, moderatorId }, 'Moderator assigned to queue item');
        return true;
      });
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), queueItemId, moderatorId },
        'Failed to assign moderator'
      );
      return false;
    }
  }

  /**
   * Get pending queue items for moderator assignment.
   * Prioritizes by urgency and creation time.
   */
  async getPendingQueueItems(limit = 50): Promise<ModerationQueueItem[]> {
    try {
      if (limit < 1 || limit > 500) {
        throw new Error('Limit must be between 1 and 500');
      }

      const items = (await readDatabase
        .select()
        .from(moderationQueue)
        .where(
          and(
            eq(moderationQueue.status, 'pending'),
            or(
              isNull(moderationQueue.assigned_to),
              lte(moderationQueue.assigned_at, new Date(Date.now() - 60 * 60 * 1000))
            )
          )
        )
        .orderBy(desc(moderationQueue.priority), asc(moderationQueue.created_at))
        .limit(limit)) as ModerationQueueItem[];

      return items;
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'Failed to get pending queue items');
      return [];
    }
  }

  /**
   * Get assigned items for a specific moderator.
   */
  async getAssignedItems(moderatorId: string): Promise<ModerationQueueItem[]> {
    try {
      if (!moderatorId) {
        throw new Error('Moderator ID is required');
      }

      const items = (await readDatabase
        .select()
        .from(moderationQueue)
        .where(
          and(
            eq(moderationQueue.assigned_to, moderatorId),
            or(eq(moderationQueue.status, 'in_review'), eq(moderationQueue.status, 'pending'))
          )
        )
        .orderBy(desc(moderationQueue.priority), asc(moderationQueue.assigned_at))) as ModerationQueueItem[];

      return items;
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), moderatorId },
        'Failed to get assigned items'
      );
      return [];
    }
  }

  // ==================== Decision Management ====================

  /**
   * Record moderation decision with transactional consistency.
   * Ensures queue item status is updated atomically with decision creation.
   */
  async recordDecision(decision: ModerationDecision): Promise<ModerationDecisionResult> {
    try {
      validateModerationDecision(decision);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        const queueQuery = `
          SELECT * FROM moderation_queue
          WHERE id = $1
          LIMIT 1
        `;

        const queueItem = await tx.query<ModerationQueueItem[]>(queueQuery, [decision.queueItemId]);

        if (!queueItem || queueItem.length === 0 || !queueItem[0]) {
          throw new Error('Queue item not found');
        }

        if (queueItem[0].assigned_to !== decision.moderatorId) {
          throw new Error('Queue item not assigned to this moderator');
        }

        if (queueItem[0].status === 'resolved') {
          throw new Error('Queue item already resolved');
        }

        const insertDecisionQuery = `
          INSERT INTO moderation_decisions (
            id, queue_item_id, moderator_id, action_taken, reasoning,
            user_affected, penalty_duration_hours, reputation_impact,
            required_peer_review, peer_review_count, is_appealable,
            is_public, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
          ) RETURNING *
        `;

        const result = await tx.query<Array<{ id: string }>>(insertDecisionQuery, [
          decision.queueItemId,
          decision.moderatorId,
          decision.actionTaken,
          decision.decisionReason,
          decision.userAffected,
          decision.penaltyDurationHours,
          decision.reputationImpact,
          decision.requiredPeerReview,
          decision.peerReviewCount,
          decision.isAppealable,
          decision.isPublic,
        ]);

        const updateQueueQuery = `
          UPDATE moderation_queue
          SET status = 'resolved',
              resolved_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `;

        await tx.query(updateQueueQuery, [decision.queueItemId]);

        const decisionId = result[0]?.id ?? '';

        logger.info(
          { decisionId, queueItemId: decision.queueItemId, action: decision.actionTaken },
          'Moderation decision recorded'
        );

        return { success: true, decisionId };
      });
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), decision },
        'Failed to record moderation decision'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get decision by ID.
   *
   * NOTE: The Drizzle schema uses snake_case columns that do not directly map
   * to the camelCase `ModerationDecision` domain type.  We route through
   * `unknown` to make the mismatch explicit and intentional; a proper mapper
   * function should replace this cast once the schema and domain types are
   * aligned.
   */
  async getDecision(decisionId: string): Promise<ModerationDecision | null> {
    try {
      if (!decisionId) {
        throw new Error('Decision ID is required');
      }

      const result = (await readDatabase
        .select()
        .from(moderationDecisions)
        .where(eq(moderationDecisions.id, decisionId))
        .limit(1)) as unknown as ModerationDecision[];

      return result[0] ?? null;
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), decisionId },
        'Failed to get decision'
      );
      return null;
    }
  }

  // ==================== Appeal Management ====================

  /**
   * File appeal against moderation decision with validation.
   * Prevents duplicate appeals for the same decision.
   */
  async fileAppeal(appeal: ModerationAppeal): Promise<ModerationAppealResult> {
    try {
      validateModerationAppeal(appeal);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        const decisionQuery = `
          SELECT * FROM moderation_decisions
          WHERE id = $1
          LIMIT 1
        `;

        const decision = await tx.query<Array<{ id: string; is_appealable: boolean }>>(
          decisionQuery,
          [appeal.decisionId]
        );

        if (!decision || decision.length === 0 || !decision[0]) {
          throw new Error('Decision not found');
        }

        if (decision[0].is_appealable === false) {
          throw new Error('Appeals not allowed for this decision');
        }

        const existingAppealQuery = `
          SELECT * FROM moderation_appeals
          WHERE decision_id = $1
            AND status = 'pending'
          LIMIT 1
        `;

        const existingAppeal = await tx.query<ModerationAppeal[]>(
          existingAppealQuery,
          [appeal.decisionId]
        );

        if (existingAppeal && existingAppeal.length > 0) {
          throw new Error('Appeal already pending for this decision');
        }

        const insertAppealQuery = `
          INSERT INTO moderation_appeals (
            id, decision_id, appellant_user_id, appeal_reasoning,
            supporting_evidence, status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW(), NOW()
          ) RETURNING *
        `;

        const result = await tx.query<Array<{ id?: string }>>(insertAppealQuery, [
          appeal.decisionId,
          appeal.appellantUserId,
          appeal.appealReasoning,
          JSON.stringify(appeal.supportingEvidence || {}),
        ]);

        const appealId = result[0]?.id;

        logger.info(
          { appealId, decisionId: appeal.decisionId },
          'Moderation appeal filed'
        );

        return { success: true, appealId };
      });
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), appeal },
        'Failed to file moderation appeal'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get pending appeals for review.
   *
   * NOTE: Same schema/domain-type mismatch as `getDecision` — routed through
   * `unknown` intentionally until a mapper layer is introduced.
   */
  async getPendingAppeals(limit = 50): Promise<ModerationAppeal[]> {
    try {
      if (limit < 1 || limit > 500) {
        throw new Error('Limit must be between 1 and 500');
      }

      const appeals = (await readDatabase
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.status, 'pending'))
        .orderBy(asc(moderationAppeals.created_at))
        .limit(limit)) as unknown as ModerationAppeal[];

      return appeals;
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'Failed to get pending appeals');
      return [];
    }
  }

  // ==================== Performance Tracking ====================

  /**
   * Calculate moderator performance metrics for a given period.
   */
  async calculateModeratorPerformance(
    moderatorId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ModeratorPerformanceMetrics | null> {
    try {
      if (!moderatorId) throw new Error('Moderator ID is required');
      if (periodStart >= periodEnd) throw new Error('Period start must be before period end');

      // See getDecision / getPendingAppeals for the schema↔domain-type note.
      const decisions = (await readDatabase
        .select()
        .from(moderationDecisions)
        .where(
          and(
            eq(moderationDecisions.moderator_id, moderatorId),
            gte(moderationDecisions.created_at, periodStart),
            lte(moderationDecisions.created_at, periodEnd)
          )
        )) as unknown as ModerationDecision[];

      if (decisions.length === 0) {
        return {
          moderatorId,
          periodStart,
          periodEnd,
          decisionsMade: 0,
          appealsOverturned: 0,
          overturnRate: 0,
          averageReviewTimeMinutes: 0,
          overallRating: 'insufficient_data',
        };
      }

      const decisionIds = decisions.map((d: ModerationDecision) => d.id);

      const appeals = (await readDatabase
        .select()
        .from(moderationAppeals)
        .where(
          and(
            inArray(moderationAppeals.decision_id, decisionIds),
            eq(moderationAppeals.status, 'resolved')
          )
        )) as unknown as ModerationAppeal[];

      const decisionsMade = decisions.length;
      const appealsOverturned = appeals.filter(
        // `originalPenaltyReversed` is the camelCase field on ModerationAppeal.
        (a: ModerationAppeal) => a.originalPenaltyReversed === true
      ).length;
      const overturnRate = decisionsMade > 0 ? (appealsOverturned / decisionsMade) * 100 : 0;

      // `queueItemId` is the camelCase field on ModerationDecision.
      const queueItemIds = decisions.map((d: ModerationDecision) => d.queueItemId);
      const queueItems = (await readDatabase
        .select()
        .from(moderationQueue)
        .where(inArray(moderationQueue.id, queueItemIds))) as ModerationQueueItem[];

      const reviewTimes = queueItems
        .filter((item: ModerationQueueItem) => item.resolved_at && item.assigned_at)
        .map((item: ModerationQueueItem) => {
          const assignedTime = new Date(item.assigned_at!).getTime();
          const resolvedTime = new Date(item.resolved_at!).getTime();
          return Math.round((resolvedTime - assignedTime) / (1000 * 60));
        });

      const averageReviewTimeMinutes =
        reviewTimes.length > 0
          ? reviewTimes.reduce((sum: number, time: number) => sum + time, 0) / reviewTimes.length
          : 0;

      const metrics: ModeratorPerformanceMetrics = {
        moderatorId,
        periodStart,
        periodEnd,
        decisionsMade,
        appealsOverturned,
        overturnRate,
        averageReviewTimeMinutes,
        overallRating: this.calculateOverallRating(overturnRate, decisionsMade),
      };

      logger.info(
        {
          moderatorId,
          decisionsMade,
          overturnRate: overturnRate.toFixed(2),
          averageReviewTime: averageReviewTimeMinutes.toFixed(2),
        },
        'Moderator performance calculated'
      );

      return metrics;
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), moderatorId },
        'Failed to calculate moderator performance'
      );
      return null;
    }
  }

  // ==================== SLA Management ====================

  /**
   * Mark SLA violations for overdue items.
   */
  async markSlaViolations(): Promise<number> {
    try {
      const result = await withTransaction(async (tx: DatabaseTransaction) => {
        const updateSlaQuery = `
          UPDATE moderation_queue
          SET is_sla_violated = true,
              updated_at = NOW()
          WHERE is_sla_violated = false
            AND sla_deadline <= NOW()
            AND status IN ('pending', 'in_review')
        `;

        const overdueItems = await tx.query(updateSlaQuery);
        return (overdueItems as { rowCount?: number })?.rowCount ?? 0;
      });

      logger.info({ count: result }, 'Marked SLA violations');
      return result;
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'Failed to mark SLA violations');
      return 0;
    }
  }

  // ==================== Private Helpers ====================

  /** Calculate priority based on context signals (1–5, where 5 is highest) */
  private calculatePriority(context: ModerationContext): number {
    if (context.priority && context.priority >= 1 && context.priority <= 5) {
      return context.priority;
    }
    if (context.tribalIncitementDetected || context.violenceThreatLevel === 'imminent') return 5;
    if (context.targetsProtectedGroup || context.violenceThreatLevel === 'high') return 4;
    if (context.triggerConfidence && context.triggerConfidence > 0.8) return 3;
    if (context.flagCount && context.flagCount >= 5) return 2;
    return 1;
  }

  /** Calculate SLA deadline based on priority level */
  private calculateSLADeadline(priority: number): Date {
    const hoursMap: Record<number, number> = { 5: 0.25, 4: 1, 3: 6, 2: 12, 1: 24 };
    const hours = hoursMap[priority] ?? 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /** Calculate overall rating based on performance metrics */
  private calculateOverallRating(overturnRate: number, decisionsMade: number): string {
    if (decisionsMade < 10) return 'insufficient_data';
    if (overturnRate < 5) return 'excellent';
    if (overturnRate < 10) return 'good';
    if (overturnRate < 15) return 'satisfactory';
    return 'needs_improvement';
  }
}

export const moderationService = ModerationService.getInstance();