import { logger } from '@server/infrastructure/observability';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { type DatabaseTransaction, withTransaction, readDatabase } from '@server/infrastructure/database/connection';
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

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function validateModerationContext(context: unknown): asserts context is ModerationContext {
  if (!isModerationContext(context)) {
    throw new Error('Invalid moderation context');
  }
}

function validateModerationDecision(decision: unknown): asserts decision is ModerationDecision {
  if (!isModerationDecision(decision)) {
    throw new Error('Invalid moderation decision');
  }
}

function validateModerationAppeal(appeal: unknown): asserts appeal is ModerationAppeal {
  if (!isModerationAppeal(appeal)) {
    throw new Error('Invalid moderation appeal');
  }
}

// ==================== Service Class ====================

export class ModerationService {
  private static instance: ModerationService;

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  // ==================== Queue Management ====================

  async queueForModeration(context: ModerationContext) {
    return safeAsync(async () => {
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
          throw new Error('Content already in moderation queue');
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
    }, { service: 'ModerationService', operation: 'queueForModeration', context });
  }

  async assignModerator(queueItemId: string, moderatorId: string) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'assignModerator', queueItemId, moderatorId });
  }

  async getPendingQueueItems(limit = 50) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'getPendingQueueItems', limit });
  }

  async getAssignedItems(moderatorId: string) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'getAssignedItems', moderatorId });
  }

  // ==================== Decision Management ====================

  async recordDecision(decision: ModerationDecision) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'recordDecision', decision });
  }

  async getDecision(decisionId: string) {
    return safeAsync(async () => {
      if (!decisionId) {
        throw new Error('Decision ID is required');
      }

      const result = (await readDatabase
        .select()
        .from(moderationDecisions)
        .where(eq(moderationDecisions.id, decisionId))
        .limit(1)) as unknown as ModerationDecision[];

      return result[0] ?? null;
    }, { service: 'ModerationService', operation: 'getDecision', decisionId });
  }

  // ==================== Appeal Management ====================

  async fileAppeal(appeal: ModerationAppeal) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'fileAppeal', appeal });
  }

  async getPendingAppeals(limit = 50) {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'getPendingAppeals', limit });
  }

  // ==================== Performance Tracking ====================

  async calculateModeratorPerformance(moderatorId: string, periodStart: Date, periodEnd: Date) {
    return safeAsync(async () => {
      if (!moderatorId) throw new Error('Moderator ID is required');
      if (periodStart >= periodEnd) throw new Error('Period start must be before period end');

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
        (a: ModerationAppeal) => a.originalPenaltyReversed === true
      ).length;
      const overturnRate = decisionsMade > 0 ? (appealsOverturned / decisionsMade) * 100 : 0;

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
    }, { service: 'ModerationService', operation: 'calculateModeratorPerformance', moderatorId });
  }

  // ==================== SLA Management ====================

  async markSlaViolations() {
    return safeAsync(async () => {
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
    }, { service: 'ModerationService', operation: 'markSlaViolations' });
  }

  // ==================== Private Helpers ====================

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

  private calculateSLADeadline(priority: number): Date {
    const hoursMap: Record<number, number> = { 5: 0.25, 4: 1, 3: 6, 2: 12, 1: 24 };
    const hours = hoursMap[priority] ?? 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private calculateOverallRating(overturnRate: number, decisionsMade: number): string {
    if (decisionsMade < 10) return 'insufficient_data';
    if (overturnRate < 5) return 'excellent';
    if (overturnRate < 10) return 'good';
    if (overturnRate < 15) return 'satisfactory';
    return 'needs_improvement';
  }
}

export const moderationService = ModerationService.getInstance();
