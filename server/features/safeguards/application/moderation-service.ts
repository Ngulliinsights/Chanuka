import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';

import { logger } from '@shared/core';
import { readDatabase, withTransaction, writeDatabase } from '@shared/database/connection';
import {
  moderation_appeals,
  moderation_decisions,
  moderation_queue,
  moderator_performance,
  type ModerationAppeal,
  type ModerationQueueItem,
  type NewModerationAppeal,
  type NewModerationDecision,
  type NewModerationQueueItem,
  type NewModeratorPerformance,
} from '@shared/schema/safeguards';

// ==================== Type Definitions ====================

export interface ModerationContext {
  contentType: string;
  contentId: string;
  authorId: string;
  billId?: string;
  triggerType: string;
  triggerConfidence?: number;
  automatedSignals?: Record<string, unknown>;
  flagReasons?: string[];
  flaggedBy?: string[];
  flagCount?: number;
  priority?: string;
  tribalIncitementDetected?: boolean;
  hateSpeechLanguage?: string;
  targetsProtectedGroup?: boolean;
  violenceThreatLevel?: string;
}

export interface ModerationDecisionContext {
  queueItemId: string;
  moderatorId: string;
  decision: string;
  decisionReason: string;
  violatedPolicies?: string[];
  actionTaken: string;
  confidenceLevel?: string;
  userNotified?: boolean;
  reputationPenalty?: number;
  suspensionDurationHours?: number;
  isPermanentBan?: boolean;
  reviewNotes?: string;
}

export interface ModerationAppealContext {
  decisionId: string;
  appellantId: string;
  appealReason: string;
  appealGrounds?: string[];
  supportingEvidence?: Record<string, unknown>;
}

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

// ==================== Service Class ====================

/**
 * Service for managing content moderation workflows
 * Handles moderation queue, decisions, appeals, and moderator performance tracking
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
   * Add content to moderation queue
   * Checks for existing items and calculates priority automatically
   * @param context - Moderation context with content details and flags
   * @returns Result with queue item ID
   */
  async queueForModeration(context: ModerationContext): Promise<ModerationQueueResult> {
    try {
      // Check if content is already in queue
      const existing = await this.findExistingQueueItem(context.contentType, context.contentId);
      if (existing) {
        return {
          success: false,
          error: 'Content already in moderation queue',
        };
      }

      // Calculate priority based on context
      const priority = this.calculatePriority(context);

      // Calculate expected review time based on priority
      const expectedReviewBy = this.calculateExpectedReviewTime(priority);

      const queueItem: NewModerationQueueItem = {
        content_type: context.contentType,
        content_id: context.contentId,
        author_id: context.authorId,
        bill_id: context.billId,
        trigger_type: context.triggerType,
        trigger_confidence: context.triggerConfidence?.toString(),
        automated_signals: context.automatedSignals,
        flag_reasons: context.flagReasons,
        flagged_by: context.flaggedBy,
        flag_count: context.flagCount || 1,
        priority,
        expected_review_by: expectedReviewBy,
        tribal_incitement_detected: context.tribalIncitementDetected,
        hate_speech_language: context.hateSpeechLanguage,
        targets_protected_group: context.targetsProtectedGroup,
        violence_threat_level: context.violenceThreatLevel,
      };

      const result = await writeDatabase.insert(moderation_queue).values(queueItem).returning();

      logger.info('Content queued for moderation', {
        queueItemId: result[0].id,
        contentType: context.contentType,
        priority,
      });

      return {
        success: true,
        queueItemId: result[0].id,
      };
    } catch (error) {
      logger.error('Failed to queue content for moderation', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: 'Failed to queue content for moderation',
      };
    }
  }

  /**
   * Assign moderator to queue item
   * Updates item status and assignment timestamp
   * @param queueItemId - Queue item identifier
   * @param moderatorId - Moderator identifier
   * @returns Success boolean
   */
  async assignModerator(queueItemId: string, moderatorId: string): Promise<boolean> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .update(moderation_queue)
          .set({
            assigned_to: moderatorId,
            assigned_at: new Date(),
            status: 'assigned',
            updated_at: new Date(),
          })
          .where(eq(moderation_queue.id, queueItemId));
      });

      logger.info('Moderator assigned to queue item', { queueItemId, moderatorId });
      return true;
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
      const items = await readDatabase
        .select()
        .from(moderation_queue)
        .where(
          and(
            eq(moderation_queue.status, 'pending'),
            or(
              sql`${moderation_queue.expected_review_by} IS NULL`,
              gte(moderation_queue.expected_review_by, new Date())
            )
          )
        )
        .orderBy(desc(moderation_queue.priority), asc(moderation_queue.created_at))
        .limit(limit);

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
      const items = await readDatabase
        .select()
        .from(moderation_queue)
        .where(
          and(
            eq(moderation_queue.assigned_to, moderatorId),
            or(eq(moderation_queue.status, 'assigned'), eq(moderation_queue.status, 'in_review'))
          )
        )
        .orderBy(desc(moderation_queue.priority), asc(moderation_queue.assigned_at));

      return items;
    } catch (error) {
      logger.error('Failed to get assigned items', {
        error: getErrorMessage(error),
        moderatorId,
      });
      return [];
    }
  }

  /**
   * Get overdue moderation items
   * Returns items that have exceeded their expected review time
   * @returns Array of overdue queue items
   */
  async getOverdueItems(): Promise<ModerationQueueItem[]> {
    try {
      const items = await readDatabase
        .select()
        .from(moderation_queue)
        .where(
          and(
            eq(moderation_queue.is_overdue, true),
            or(
              eq(moderation_queue.status, 'pending'),
              eq(moderation_queue.status, 'assigned'),
              eq(moderation_queue.status, 'in_review')
            )
          )
        )
        .orderBy(desc(moderation_queue.priority), asc(moderation_queue.expected_review_by));

      return items;
    } catch (error) {
      logger.error('Failed to get overdue items', {
        error: getErrorMessage(error),
      });
      return [];
    }
  }

  // ==================== Decision Management ====================

  /**
   * Make moderation decision
   * Records decision and updates queue item status
   * @param context - Decision context with moderator action details
   * @returns Result with decision ID
   */
  async makeDecision(context: ModerationDecisionContext): Promise<ModerationDecisionResult> {
    try {
      const decision: NewModerationDecision = {
        queue_item_id: context.queueItemId,
        decision: context.decision,
        decision_reason: context.decisionReason,
        moderator_id: context.moderatorId,
        confidence_level: context.confidenceLevel,
        violated_policies: context.violatedPolicies,
        action_taken: context.actionTaken,
        user_notified: context.userNotified,
        reputation_penalty: context.reputationPenalty,
        suspension_duration_hours: context.suspensionDurationHours,
        is_permanent_ban: context.isPermanentBan,
        review_notes: context.reviewNotes,
      };

      const result = await withTransaction(async (tx) => {
        // Insert decision
        const decisionResult = await tx.insert(moderation_decisions).values(decision).returning();

        // Update queue item
        await tx
          .update(moderation_queue)
          .set({
            status: 'reviewed',
            reviewed_at: new Date(),
            reviewed_by: context.moderatorId,
            decision: context.decision,
            decision_reason: context.decisionReason,
            violated_policies: context.violatedPolicies,
            updated_at: new Date(),
          })
          .where(eq(moderation_queue.id, context.queueItemId));

        return decisionResult[0];
      });

      if (!result) {
        throw new Error('Failed to create decision record');
      }

      logger.info('Moderation decision made', {
        decisionId: result.id,
        queueItemId: context.queueItemId,
        decision: context.decision,
      });

      return {
        success: true,
        decisionId: result.id,
      };
    } catch (error) {
      logger.error('Failed to make moderation decision', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: 'Failed to make moderation decision',
      };
    }
  }

  // ==================== Appeal Management ====================

  /**
   * File appeal against moderation decision
   * Creates appeal record and updates queue item status
   * @param context - Appeal context with appellant details and reasoning
   * @returns Result with appeal ID
   */
  async fileAppeal(context: ModerationAppealContext): Promise<ModerationAppealResult> {
    try {
      const appeal: NewModerationAppeal = {
        decision_id: context.decisionId,
        appellant_id: context.appellantId,
        appeal_reason: context.appealReason,
        appeal_decision_reason: '', // Will be filled when appeal is reviewed
        appeal_grounds: context.appealGrounds,
        supporting_evidence: context.supportingEvidence,
      };

      const result = await writeDatabase.insert(moderation_appeals).values(appeal).returning();

      // Get the queue item ID from the decision
      const decision = await readDatabase
        .select()
        .from(moderation_decisions)
        .where(eq(moderation_decisions.id, context.decisionId))
        .limit(1);

      if (decision[0]?.queue_item_id) {
        await withTransaction(async (tx) => {
          await tx
            .update(moderation_queue)
            .set({
              status: 'appealed',
              updated_at: new Date(),
            })
            .where(eq(moderation_queue.id, decision[0].queue_item_id));
        });
      }

      logger.info('Moderation appeal filed', {
        appealId: result[0].id,
        decisionId: context.decisionId,
      });

      return {
        success: true,
        appealId: result[0].id,
      };
    } catch (error) {
      logger.error('Failed to file moderation appeal', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: 'Failed to file moderation appeal',
      };
    }
  }

  // ==================== Performance Tracking ====================

  /**
   * Update moderator performance metrics for a given period
   * Calculates decisions made, appeal overturn rate, and overall rating
   * @param moderatorId - Moderator identifier
   * @param periodStart - Start of performance period
   * @param periodEnd - End of performance period
   */
  async updateModeratorPerformance(
    moderatorId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    try {
      // Calculate performance metrics
      const decisions = await readDatabase
        .select()
        .from(moderation_decisions)
        .where(
          and(
            eq(moderation_decisions.moderator_id, moderatorId),
            gte(moderation_decisions.created_at, periodStart),
            lte(moderation_decisions.created_at, periodEnd)
          )
        );

      const appeals = await readDatabase
        .select()
        .from(moderation_appeals)
        .where(
          sql`EXISTS (
            SELECT 1 FROM ${moderation_decisions} md
            WHERE md.id = ${moderation_appeals.decision_id}
            AND md.moderator_id = ${moderatorId}
            AND md.created_at >= ${periodStart}
            AND md.created_at <= ${periodEnd}
          )`
        );

      const decisionsMade = decisions.length;
      const appealsOverturned = appeals.filter(
        (appeal: ModerationAppeal) => appeal.appeal_decision === 'overturned'
      ).length;
      const overturnRate = decisionsMade > 0 ? (appealsOverturned / decisionsMade) * 100 : 0;

      const performance: NewModeratorPerformance = {
        moderator_id: moderatorId,
        period_start: periodStart,
        period_end: periodEnd,
        decisions_made: decisionsMade,
        appeals_overturned: appealsOverturned,
        overturn_rate: overturnRate.toString(),
        overall_rating: this.calculateOverallRating(overturnRate, decisionsMade),
      };

      await writeDatabase.insert(moderator_performance).values(performance).onConflictDoUpdate({
        target: [
          moderator_performance.moderator_id,
          moderator_performance.period_start,
          moderator_performance.period_end,
        ],
        set: performance,
      });

      logger.info('Moderator performance updated', {
        moderatorId,
        decisionsMade,
        overturnRate: overturnRate.toFixed(2),
      });
    } catch (error) {
      logger.error('Failed to update moderator performance', {
        error: getErrorMessage(error),
        moderatorId,
      });
    }
  }

  // ==================== SLA Management ====================

  /**
   * Mark SLA violations for overdue items
   * Identifies items past their expected review time and increments violation counter
   * @returns Number of items marked as overdue
   */
  async markSlaViolations(): Promise<number> {
    try {
      const result = await withTransaction(async (tx) => {
        const overdueItems = await tx
          .update(moderation_queue)
          .set({
            is_overdue: true,
            sla_violations: sql`${moderation_queue.sla_violations} + 1`,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(moderation_queue.is_overdue, false),
              lte(moderation_queue.expected_review_by, new Date()),
              or(
                eq(moderation_queue.status, 'pending'),
                eq(moderation_queue.status, 'assigned'),
                eq(moderation_queue.status, 'in_review')
              )
            )
          )
          .returning({ id: moderation_queue.id });

        return overdueItems.length;
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
   * Check if content is already in moderation queue
   */
  private async findExistingQueueItem(
    contentType: string,
    contentId: string
  ): Promise<ModerationQueueItem | null> {
    try {
      const result = await readDatabase
        .select()
        .from(moderation_queue)
        .where(
          and(
            eq(moderation_queue.content_type, contentType),
            eq(moderation_queue.content_id, contentId),
            or(
              eq(moderation_queue.status, 'pending'),
              eq(moderation_queue.status, 'assigned'),
              eq(moderation_queue.status, 'in_review')
            )
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find existing queue item', {
        error: getErrorMessage(error),
        contentType,
        contentId,
      });
      return null;
    }
  }

  /**
   * Calculate priority based on context signals
   */
  private calculatePriority(context: ModerationContext): string {
    if (context.tribalIncitementDetected || context.violenceThreatLevel === 'imminent') {
      return 'critical';
    }
    if (context.targetsProtectedGroup || context.violenceThreatLevel === 'high') {
      return 'high';
    }
    if (context.triggerConfidence && context.triggerConfidence > 0.8) {
      return 'high';
    }
    if (context.flagCount && context.flagCount >= 5) {
      return 'medium';
    }
    return context.priority || 'low';
  }

  /**
   * Calculate expected review time based on priority level
   */
  private calculateExpectedReviewTime(priority: string): Date {
    const now = new Date();
    let hours = 24; // default low priority

    switch (priority) {
      case 'critical':
        hours = 0.25; // 15 minutes
        break;
      case 'high':
        hours = 1;
        break;
      case 'medium':
        hours = 6;
        break;
      case 'low':
        hours = 24;
        break;
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
