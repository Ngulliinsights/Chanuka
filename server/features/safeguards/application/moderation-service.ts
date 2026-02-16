import { logger } from '@shared/core';
import { type DatabaseTransaction,withTransaction } from '@server/infrastructure/database/connection';
import { readDb as readDatabase } from '@server/infrastructure/database/pool';
import {
  type ModerationAppeal,
  moderationAppeals,
  type ModerationDecision,
  moderationDecisions,
  moderationQueue,
  type ModerationQueueItem,
} from '@server/infrastructure/schema/safeguards';
import { and, asc, desc, eq, gte, inArray,lte, or, sql } from 'drizzle-orm';

// ==================== Type Definitions ====================

import { ModerationContext, ModerationDecision, ModerationAppeal } from '@shared/types/domains/safeguards';
import { Result, AppError } from '@shared/types/core/errors';

// Using standardized types from the new safeguards domain
export { ModerationContext, ModerationDecision, ModerationAppeal } from '@shared/types/domains/safeguards';

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

/**
 * Type guard to check if error has a message property
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

import { isModerationContext, isModerationDecision, isModerationAppeal } from '@shared/types/domains/safeguards';

/**
 * Validate moderation context using standardized type guard
 */
function validateModerationContext(context: unknown): asserts context is ModerationContext {
  if (!isModerationContext(context)) {
    throw new Error('Invalid moderation context');
  }
}

/**
 * Validate moderation decision using standardized type guard
 */
function validateModerationDecision(decision: unknown): asserts decision is ModerationDecision {
  if (!isModerationDecision(decision)) {
    throw new Error('Invalid moderation decision');
  }
}

/**
 * Validate moderation appeal using standardized type guard
 */
function validateModerationAppeal(appeal: unknown): asserts context is ModerationAppeal {
  if (!isModerationAppeal(appeal)) {
    throw new Error('Invalid moderation appeal');
  }
}

// ==================== Service Class ====================

/**
 * Service for managing content moderation workflows
 * Handles moderation queue, decisions, appeals, and moderator performance tracking
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

  /**
   * Get singleton instance of ModerationService
   */
  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  // ==================== Queue Management ====================

  /**
   * Add content to moderation queue with race condition prevention
   * Uses transaction with explicit locking to prevent duplicate entries
   * @param context - Moderation context with content details and flags
   * @returns Result with queue item ID
   */
  async queueForModeration(context: ModerationContext): Promise<ModerationQueueResult> {
    try {
      // Validate input
      validateModerationContext(context);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        // Check for existing queue item with FOR UPDATE lock
        const existingQuery = `
          SELECT * FROM moderation_queue
          WHERE content_type = $1
          AND content_id = $2
          AND status IN ('pending', 'in_review')
          FOR UPDATE
        `;

        const existing = await tx.query(existingQuery, [context.contentType, context.contentId]);

        if (existing && Array.isArray(existing) && existing.length > 0) {
          return {
            success: false,
            error: 'Content already in moderation queue',
          };
        }

        // Calculate priority based on context
        const priority = this.calculatePriority(context);

        // Calculate expected review time based on priority
        const slaDeadline = this.calculateSLADeadline(priority);

        // Insert new queue item using raw SQL
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
          slaDeadline
        ]);

        logger.info('Content queued for moderation', {
          queueItemId: result[0]?.id,
          contentType: context.contentType,
          priority,
        });

        return {
          success: true,
          queueItemId: result[0]?.id,
        };
      });
    } catch (error) {
      logger.error('Failed to queue content for moderation', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Assign moderator to queue item with race condition prevention
   * Prevents double-assignment using row-level locking
   * @param queueItemId - Queue item identifier
   * @param moderatorId - Moderator identifier
   * @returns Success boolean
   */
  async assignModerator(queueItemId: string, moderatorId: string): Promise<boolean> {
    try {
      if (!queueItemId || !moderatorId) {
        throw new Error('Queue item ID and moderator ID are required');
      }

      return await withTransaction(async (tx: DatabaseTransaction) => {
        // Lock the row and check if it's available for assignment
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

        // Assign moderator using raw SQL
        const updateQuery = `
          UPDATE moderation_queue
          SET assigned_to = $1,
              assigned_at = NOW(),
              status = 'in_review',
              updated_at = NOW()
          WHERE id = $2
        `;

        await tx.query(updateQuery, [moderatorId, queueItemId]);

        logger.info('Moderator assigned to queue item', { queueItemId, moderatorId });
        return true;
      });
    } catch (error) {
      logger.error('Failed to assign moderator', {
        error: getErrorMessage(error),
        queueItemId,
        moderatorId,
      });
      return false;
    }
  }

  /**
   * Get pending queue items for moderator assignment
   * Prioritizes by urgency and creation time
   * @param limit - Maximum number of items to return
   * @returns Array of pending queue items
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
              eq(moderationQueue.assigned_to, null),
              // Allow reassignment if assigned over 1 hour ago
              lte(moderationQueue.assigned_at, new Date(Date.now() - 60 * 60 * 1000))
            )
          )
        )
        .orderBy(desc(moderationQueue.priority), asc(moderationQueue.created_at))
        .limit(limit)) as ModerationQueueItem[];

      return items;
    } catch (error) {
      logger.error('Failed to get pending queue items', {
        error: getErrorMessage(error),
      });
      return [];
    }
  }

  /**
   * Get assigned items for a specific moderator
   * @param moderatorId - Moderator identifier
   * @returns Array of assigned queue items
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
      logger.error('Failed to get assigned items', {
        error: getErrorMessage(error),
        moderatorId,
      });
      return [];
    }
  }

  // ==================== Decision Management ====================

  /**
   * Record moderation decision with transactional consistency
   * Ensures queue item status is updated atomically with decision creation
   * @param decision - Standardized moderation decision
   * @returns Result with decision ID
   */
  async recordDecision(decision: ModerationDecision): Promise<ModerationDecisionResult> {
    try {
      // Validate input
      validateModerationDecision(decision);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        // Verify queue item exists and is assigned to this moderator using raw SQL
        const queueQuery = `
          SELECT * FROM moderation_queue
          WHERE id = $1
          LIMIT 1
        `;

        const queueItem = await tx.query<ModerationQueueItem[]>(queueQuery, [decision.queueItemId]);

        if (!queueItem || queueItem.length === 0) {
          throw new Error('Queue item not found');
        }

        if (!queueItem[0]) {
          throw new Error('Queue item not found');
        }

        if (queueItem[0].assigned_to !== decision.moderatorId) {
          throw new Error('Queue item not assigned to this moderator');
        }

        if (queueItem[0].status === 'resolved') {
          throw new Error('Queue item already resolved');
        }

        // Create decision record using raw SQL
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

        const result = await tx.query<ModerationDecision[]>(insertDecisionQuery, [
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
          decision.isPublic
        ]);

        // Update queue item status using raw SQL
        const updateQueueQuery = `
          UPDATE moderation_queue
          SET status = 'resolved',
              resolved_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `;

        await tx.query(updateQueueQuery, [decision.queueItemId]);

        logger.info('Moderation decision recorded', {
          decisionId: result[0].id,
          queueItemId: decision.queueItemId,
          action: decision.actionTaken,
        });

        return {
          success: true,
          decisionId: result[0].id,
        };
      });
    } catch (error) {
      logger.error('Failed to record moderation decision', {
        error: getErrorMessage(error),
        decision,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get decision by ID
   * @param decisionId - Decision identifier
   * @returns Decision or null
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
        .limit(1)) as ModerationDecision[];

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get decision', {
        error: getErrorMessage(error),
        decisionId,
      });
      return null;
    }
  }

  // ==================== Appeal Management ====================

  /**
   * File appeal against moderation decision with validation
   * Prevents duplicate appeals for the same decision
   * @param appeal - Standardized moderation appeal
   * @returns Result with appeal ID
   */
  async fileAppeal(appeal: ModerationAppeal): Promise<ModerationAppealResult> {
    try {
      // Validate input
      validateModerationAppeal(appeal);

      return await withTransaction(async (tx: DatabaseTransaction) => {
        // Verify decision exists and is appealable using raw SQL
        const decisionQuery = `
          SELECT * FROM moderation_decisions
          WHERE id = $1
          LIMIT 1
        `;

        const decision = await tx.query<ModerationDecision[]>(decisionQuery, [appeal.decisionId]);

        if (!decision || decision.length === 0) {
          throw new Error('Decision not found');
        }

        if (!decision[0]) {
          throw new Error('Decision not found');
        }

        if (decision[0].is_appealable === false) {
          throw new Error('Appeals not allowed for this decision');
        }

        // Check for existing pending appeal using raw SQL
        const existingAppealQuery = `
          SELECT * FROM moderation_appeals
          WHERE decision_id = $1
            AND status = 'pending'
          LIMIT 1
        `;

        const existingAppeal = await tx.query<ModerationAppeal[]>(existingAppealQuery, [appeal.decisionId]);

        if (existingAppeal && existingAppeal.length > 0) {
          throw new Error('Appeal already pending for this decision');
        }

        // Create appeal record using raw SQL
        const insertAppealQuery = `
          INSERT INTO moderation_appeals (
            id, decision_id, appellant_user_id, appeal_reasoning,
            supporting_evidence, status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW(), NOW()
          ) RETURNING *
        `;

        const result = await tx.query<ModerationAppeal[]>(insertAppealQuery, [
          appeal.decisionId,
          appeal.appellantUserId,
          appeal.appealReasoning,
          JSON.stringify(appeal.supportingEvidence || {})
        ]);

        logger.info('Moderation appeal filed', {
          appealId: result[0]?.id,
          decisionId: appeal.decisionId,
        });

        return {
          success: true,
          appealId: result[0]?.id,
        };
      });
    } catch (error) {
      logger.error('Failed to file moderation appeal', {
        error: getErrorMessage(error),
        appeal,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get pending appeals for review
   * @param limit - Maximum number of appeals to return
   * @returns Array of pending appeals
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
        .limit(limit)) as ModerationAppeal[];

      return appeals;
    } catch (error) {
      logger.error('Failed to get pending appeals', {
        error: getErrorMessage(error),
      });
      return [];
    }
  }

  // ==================== Performance Tracking ====================

  /**
   * Calculate moderator performance metrics for a given period
   * @param moderatorId - Moderator identifier
   * @param periodStart - Start of performance period
   * @param periodEnd - End of performance period
   * @returns Performance metrics
   */
  async calculateModeratorPerformance(
    moderatorId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ModeratorPerformanceMetrics | null> {
    try {
      if (!moderatorId) {
        throw new Error('Moderator ID is required');
      }

      if (periodStart >= periodEnd) {
        throw new Error('Period start must be before period end');
      }

      // Get all decisions made by moderator in period
      const decisions = (await readDatabase
        .select()
        .from(moderationDecisions)
        .where(
          and(
            eq(moderationDecisions.moderator_id, moderatorId),
            gte(moderationDecisions.created_at, periodStart),
            lte(moderationDecisions.created_at, periodEnd)
          )
        )) as ModerationDecision[];

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

      // Get appeals related to these decisions
      const decisionIds = decisions.map((d: ModerationDecision) => d.id);
      const appeals = (await readDatabase
        .select()
        .from(moderationAppeals)
        .where(
          and(
            inArray(moderationAppeals.decision_id, decisionIds),
            eq(moderationAppeals.status, 'resolved')
          )
        )) as ModerationAppeal[];

      const decisionsMade = decisions.length;
      const appealsOverturned = appeals.filter(
        (appeal: ModerationAppeal) => appeal.original_penalty_reversed === true
      ).length;
      const overturnRate = decisionsMade > 0 ? (appealsOverturned / decisionsMade) * 100 : 0;

      // Calculate average review time from queue items
      const queueItemIds = decisions.map((d: ModerationDecision) => d.queue_item_id);
      const queueItems = (await readDatabase
        .select()
        .from(moderationQueue)
        .where(
          inArray(moderationQueue.id, queueItemIds)
        )) as ModerationQueueItem[];

      const reviewTimes = queueItems
        .filter((item: ModerationQueueItem) => item.resolved_at && item.assigned_at)
        .map((item: ModerationQueueItem) => {
          const assignedTime = new Date(item.assigned_at!).getTime();
          const resolvedTime = new Date(item.resolved_at!).getTime();
          return Math.round((resolvedTime - assignedTime) / (1000 * 60)); // Convert to minutes
        });

      const averageReviewTimeMinutes = reviewTimes.length > 0
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

      logger.info('Moderator performance calculated', {
        moderatorId,
        decisionsMade,
        overturnRate: overturnRate.toFixed(2),
        averageReviewTime: averageReviewTimeMinutes.toFixed(2),
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to calculate moderator performance', {
        error: getErrorMessage(error),
        moderatorId,
      });
      return null;
    }
  }

  // ==================== SLA Management ====================

  /**
   * Mark SLA violations for overdue items
   * Identifies items past their SLA deadline and marks them
   * @returns Number of items marked as overdue
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

        // Return the number of affected rows (PostgreSQL returns rowCount in result)
        const queryResult = overdueItems as { rowCount?: number };
        return queryResult?.rowCount || 0;
      });

      logger.info('Marked SLA violations', { count: result });
      return result;
    } catch (error) {
      logger.error('Failed to mark SLA violations', {
        error: getErrorMessage(error),
      });
      return 0;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Calculate priority based on context signals
   * Returns numeric priority (1-5, where 5 is highest)
   */
  private calculatePriority(context: ModerationContext): number {
    // Return explicit priority if provided and valid
    if (context.priority && context.priority >= 1 && context.priority <= 5) {
      return context.priority;
    }

    // Critical priority (5)
    if (context.tribalIncitementDetected || context.violenceThreatLevel === 'imminent') {
      return 5;
    }

    // High priority (4)
    if (context.targetsProtectedGroup || context.violenceThreatLevel === 'high') {
      return 4;
    }

    // Medium-high priority (3)
    if (context.triggerConfidence && context.triggerConfidence > 0.8) {
      return 3;
    }

    // Medium priority (2)
    if (context.flagCount && context.flagCount >= 5) {
      return 2;
    }

    // Default low priority (1)
    return 1;
  }

  /**
   * Calculate SLA deadline based on priority level
   */
  private calculateSLADeadline(priority: number): Date {
    const now = new Date();
    let hours = 24; // default for priority 1

    switch (priority) {
      case 5: // Critical
        hours = 0.25; // 15 minutes
        break;
      case 4: // High
        hours = 1;
        break;
      case 3: // Medium-high
        hours = 6;
        break;
      case 2: // Medium
        hours = 12;
        break;
      case 1: // Low
        hours = 24;
        break;
      default:
        hours = 24;
    }

    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Calculate overall rating based on performance metrics
   */
  private calculateOverallRating(overturnRate: number, decisionsMade: number): string {
    if (decisionsMade < 10) return 'insufficient_data';

    if (overturnRate < 5) return 'excellent';
    if (overturnRate < 10) return 'good';
    if (overturnRate < 15) return 'satisfactory';
    return 'needs_improvement';
  }
}

// Export singleton instance
export const moderationService = ModerationService.getInstance();
