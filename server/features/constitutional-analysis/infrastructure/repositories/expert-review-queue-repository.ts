// ============================================================================
// EXPERT REVIEW QUEUE REPOSITORY - Database Access Layer
// ============================================================================
// Repository implementation for expert review queue using Drizzle ORM

import { eq, and, or, sql, desc, asc, isNull } from 'drizzle-orm';
import { readDatabase, writeDatabase } from '../../../../../shared/database/connection.js';
import { expert_review_queue } from '../../../../../shared/schema/index.js';
import { logger } from '../../../../../shared/core/index.js';

export interface QueueItemRequest {
  analysisId: string;
  billId: string;
  priority: number;
  complexityScore: number;
  uncertaintyFlags: string[];
  estimatedReviewTime: number;
  recommendedExpertise: string[];
}

export class ExpertReviewQueueRepository {
  private get readDb() {
    return readDatabase;
  }

  private get writeDb() {
    return writeDatabase;
  }

  /**
   * Queue an analysis for expert review
   */
  async queueForReview(request: QueueItemRequest): Promise<void> {
    try {
      logger.debug(`Queueing analysis ${request.analysisId} for expert review`, {
        component: 'ExpertReviewQueueRepository',
        analysisId: request.analysisId,
        priority: request.priority,
        complexity: request.complexityScore
      });

      // Check if already queued
      const existing = await this.findByAnalysisId(request.analysisId);
      if (existing) {
        logger.debug(`Analysis ${request.analysisId} already queued for review`, {
          component: 'ExpertReviewQueueRepository'
        });
        return;
      }

      // Calculate due date based on priority
      const dueDate = this.calculateDueDate(request.priority);

      await this.writeDb
        .insert(expert_review_queue)
        .values({
          id: crypto.randomUUID(),
          analysis_id: request.analysisId,
          bill_id: request.billId,
          priority: request.priority,
          complexity_score_percentage: request.complexityScore,
          uncertainty_flags: request.uncertaintyFlags,
          due_date: dueDate,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        });

      logger.info(`✅ Queued analysis for expert review`, {
        component: 'ExpertReviewQueueRepository',
        analysisId: request.analysisId,
        priority: request.priority,
        dueDate: dueDate?.toISOString()
      });

    } catch (error) {
      logger.error(`Failed to queue analysis for expert review: ${request.analysisId}`, {
        component: 'ExpertReviewQueueRepository',
        analysisId: request.analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    pendingCount: number;
    averageWaitTime: number;
    highPriorityCount: number;
  }> {
    try {
      logger.debug('Getting expert review queue status', {
        component: 'ExpertReviewQueueRepository'
      });

      const [statusResult] = await this.readDb
        .select({
          pendingCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending')`,
          highPriorityCount: sql<number>`count(*) filter (where ${expert_review_queue.status} = 'pending' AND ${expert_review_queue.priority} >= 7)`,
          avgWaitHours: sql<number>`avg(extract(epoch from (now() - ${expert_review_queue.created_at})) / 3600) filter (where ${expert_review_queue.status} = 'pending')`
        })
        .from(expert_review_queue);

      const status = {
        pendingCount: statusResult.pendingCount || 0,
        averageWaitTime: Math.round((statusResult.avgWaitHours || 0) * 60), // Convert to minutes
        highPriorityCount: statusResult.highPriorityCount || 0
      };

      logger.debug('Retrieved queue status', {
        component: 'ExpertReviewQueueRepository',
        status
      });

      return status;

    } catch (error) {
      logger.error('Failed to get queue status', {
        component: 'ExpertReviewQueueRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Find queue item by analysis ID
   */
  private async findByAnalysisId(analysisId: string) {
    const [item] = await this.readDb
      .select()
      .from(expert_review_queue)
      .where(eq(expert_review_queue.analysis_id, analysisId))
      .limit(1);

    return item || null;
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority: number): Date | null {
    if (priority >= 9) {
      // Critical priority: 4 hours
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 4);
      return dueDate;
    } else if (priority >= 7) {
      // High priority: 24 hours
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);
      return dueDate;
    } else if (priority >= 5) {
      // Medium priority: 3 days
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      return dueDate;
    } else {
      // Low priority: 1 week
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      return dueDate;
    }
  }
}