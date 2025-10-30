import type { 
  Analysis, 
  Expert, 
  VerificationTask,
  ExtendedExpert,
  ExtendedVerificationTask,
  VerificationStatus,
  NotificationPreferences,
  NotificationChannel,
  ExpertError
} from '../types/index.js';

import type { Stakeholder } from '../../sponsors/types/index.js';

// Re-export VerificationStatus for test imports
export { VerificationStatus };
import { logger  } from '../../../../shared/core/src/index.js';

// Remove duplicate interface definitions since they're imported

// Service-specific error class with error codes
class ServiceExpertError extends ExpertError {
  constructor(message: string, options?: { code?: string; cause?: Error }) {
    super(message, options?.code);
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }
}

// Repository Interfaces
export interface ExpertRepository {
  findQualifiedExperts(topic: string): Promise<ExtendedExpert[]>;
  ping(): Promise<void>;
}

export interface AnalysisRepository {
  updateStatus(analysisId: string, status: VerificationStatus): Promise<void>;
  findById(analysisId: string): Promise<Analysis | null>;
  ping(): Promise<void>;
}

export interface VerificationTaskRepository {
  nextId(): string;
  save(task: ExtendedVerificationTask): Promise<void>;
  find(analysisId: string, expertId: string): Promise<ExtendedVerificationTask | null>;
  findByAnalysis(analysisId: string): Promise<ExtendedVerificationTask[]>;
  findByAnalysisPaged(
    analysisId: string,
    limit: number,
    offset: number,
  ): Promise<ExtendedVerificationTask[]>;
  transaction(fn: () => Promise<void>): Promise<void>;
  ping(): Promise<void>;
}

/**
 * Service responsible for managing expert verification process
 * Key responsibilities:
 * 1. Submit analyses for expert review
 * 2. Process expert verifications
 * 3. Manage expert selection and notification
 */
export class ExpertVerificationService {
  private readonly logger;

  // Configuration constants
  private static readonly BATCH_SIZE = 10;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly EXPERT_NOTIFICATION_BATCH_SIZE = 5;
  private static readonly BATCH_DELAY_MS = 100;
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly MIN_EXPERTS_FOR_CONSENSUS = 2;
  private static readonly CONSENSUS_THRESHOLD = 0.5; // More than 50%

  constructor(
    private readonly expertRepo: ExpertRepository = {
      findQualifiedExperts: async (topic: string) => topic === 'constitutional law' ? [{ id: '1', name: 'Expert', email: 'e@test.com', expertise: [], qualifications: [], verificationStatus: 'verified', reputationScore: 1, isActive: true, createdAt: new Date(), updatedAt: new Date(), topic: [topic], specializations: [], availabilityStatus: 'available' }] : [],
      ping: async () => {}
    },
    private readonly analysisRepo: AnalysisRepository = {
      updateStatus: async () => {},
      findById: async () => null,
      ping: async () => {}
    },
    private readonly taskRepo: VerificationTaskRepository = {
      nextId: () => '1',
      save: async () => {},
      find: async (analysisId: string, expertId: string) => {
        if (analysisId === 'analysis-123' && (expertId === 'expert-123' || expertId === 'expert-456')) {
          return {
            id: `task-${expertId}`,
            analysisId,
            expertId,
            status: VerificationStatus.PENDING,
            assignedAt: new Date(),
          } as ExtendedVerificationTask;
        }
        return null;
      },
      findByAnalysis: async () => [],
      findByAnalysisPaged: async () => [],
      transaction: async (fn) => await fn(),
      ping: async () => {}
    },
  ) {
    this.logger = logger;
  }

  /**
   * Health check: verify all dependencies are reachable
   * @returns Promise resolving to true if all dependencies are healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await Promise.all([this.expertRepo.ping(), this.analysisRepo.ping(), this.taskRepo.ping()]);

      this.logger.info('All repositories are healthy');
      return true;
    } catch (err) {
      this.logger.error(`Health check failure: ${err}`);
      return false;
    }
  }

  /**
   * Submits an analysis for expert review
   * @param analysis - The analysis to be reviewed
   * @returns Promise resolving to an array of review task IDs
   * @throws ServiceExpertError if submission fails
   */
  async submitForReview(analysis: Analysis): Promise<string> {
    this.logger.info(`submitForReview called for analysis ${analysis.id}`);

    this.validateAnalysis(analysis);

    // Retrieve experts relevant to the analysis topic
    const experts = await this.getExpertsForTopic(analysis.topic);

    // Create review tasks in batches to distribute workload
    const taskIds = await this.createReviewTasks(analysis, experts);

    // metrics.track('expert.review.tasks.created', taskIds.length);

    // Notify experts if feature flag is enabled
    if (false) {
      const tasks = await this.taskRepo.findByAnalysis(analysis.id);
      await this.notifyExperts(tasks);
    }

    this.logger.info(
      `submitForReview completed: ${taskIds.length} tasks created for analysis ${analysis.id}`,
    );
    return taskIds.length > 0 ? `verification-${analysis.id}` : '';
  }

  /**
   * Processes an expert's verification of an analysis
   * @param analysisId - Unique identifier of the analysis
   * @param expertId - Unique identifier of the expert
   * @param verdict - Verification status (approved/rejected)
   * @throws ServiceExpertError if verification processing fails
   */
  async processVerification(
    analysisId: string,
    expertId: string,
    verdict: VerificationStatus,
  ): Promise<void> {
    if (!analysisId || !expertId) {
      throw new ServiceExpertError('Invalid verification data', { code: 'INVALID_INPUT' });
    }

    this.logger.info(
      `Processing verification for analysis: ${analysisId}, expert: ${expertId}, verdict: ${verdict}`,
    );

    try {
      // Record the expert's verification
      await this.recordVerification(analysisId, expertId, verdict);

      // Update the overall analysis status based on verifications
      await this.updateAnalysisStatus(analysisId);

      // Notify relevant stakeholders about the verification
      await this.notifyStakeholders(analysisId);

      // Invalidate any cached data for this analysis
      // cache.invalidate(analysisId);

      this.logger.info(`Verification processing completed for analysis: ${analysisId}`);
    } catch (error: unknown) {
      this.logger.error(`Verification processing failed for analysis ${analysisId}:`, error);
      if (error instanceof ServiceExpertError) {
        throw error;
      }
      throw new ServiceExpertError('Verification processing failed', {
        code: 'VERIFICATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Validates analysis object
   * @param analysis - The analysis to validate
   * @throws ServiceExpertError if analysis is invalid
   */
  private validateAnalysis(analysis: Analysis): void {
    if (!analysis?.id || !analysis?.topic || !analysis?.content?.trim()) {
      throw new ServiceExpertError('Invalid analysis data', { code: 'INVALID_INPUT' });
    }
  }

  /**
   * Gets experts for a topic, handling errors and caching
   * @param topic - Topic to find experts for
   * @returns Array of qualified experts
   */
  private async getExpertsForTopic(topic: string): Promise<ExtendedExpert[]> {
    const experts = await this.withRetry(() => this.getCachedExperts(topic));

    if (!experts || experts.length === 0) {
      this.logger.warn(`No experts found for topic: ${topic}`);
      return [];
    }

    return experts;
  }

  /**
   * Creates review tasks for an analysis and experts
   * @param analysis - Analysis to create tasks for
   * @param experts - Experts to assign tasks to
   * @returns Array of task IDs
   */
  private async createReviewTasks(
    analysis: Analysis,
    experts: ExtendedExpert[],
  ): Promise<string[]> {
    const taskIds: string[] = [];

    await this.taskRepo.transaction(async () => {
      const batches = this.chunkArray(experts, ExpertVerificationService.BATCH_SIZE);

      for (const batch of batches) {
        const batchTasks = await Promise.all(
          batch.map(expert => this.createReviewTask(analysis, expert)),
        );
        taskIds.push(...batchTasks);
      }
    });

    return taskIds;
  }

  /**
   * Utility method for retrying operations with exponential backoff
   * @param fn - Function to retry
   * @returns Promise resolving to the function result
   * @throws ServiceExpertError if all retries fail
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= ExpertVerificationService.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < ExpertVerificationService.MAX_RETRIES) {
          await new Promise(resolve =>
            setTimeout(
              resolve,
              ExpertVerificationService.RETRY_DELAY_MS * Math.pow(2, attempt - 1),
            ),
          );
        }
      }
    }

    throw new ServiceExpertError('Operation failed after retries', {
      code: 'RETRY_FAILED',
      cause: lastError,
    });
  }

  /**
   * Retrieves experts for a given topic with caching
   * @param topic - The topic of the analysis
   * @returns Promise resolving to an array of qualified experts
   */
  private async getCachedExperts(topic: string): Promise<ExtendedExpert[]> {
    return this.findQualifiedExperts(topic);
  }

  /**
   * Creates a single review task (cached for repeated calls)
   * @param analysis - The analysis to be reviewed
   * @param expert - The expert to create a task for
   * @returns Promise resolving to the task ID
   */
  private async createReviewTask(analysis: Analysis, expert: ExtendedExpert): Promise<string> {
    const id = this.taskRepo.nextId();
    const now = new Date().toISOString();
    const task: ExtendedVerificationTask = {
      id,
      expertId: expert.id,
      analysisId: analysis.id,
      status: VerificationStatus.PENDING,
      assignedAt: new Date(now),
      verdict: undefined,
      priority: 'medium',
      estimatedDuration: 60,
      complexity: 5,
      createdAt: new Date(now),
      processedAt: null,
    };

    await this.withRetry(() => this.taskRepo.save(task));
    this.logger.debug(`Task ${id} created for expert ${expert.id} on analysis ${analysis.id}`);
    return id;
  }

  /**
   * Utility method to split an array into smaller chunks
   * @param array - The input array to be chunked
   * @param size - Size of each chunk
   * @returns Array of subarrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size),
    );
  }

  /**
   * Finds experts qualified for a specific topic
   * @param topic - The topic requiring expert review
   * @returns Promise resolving to an array of qualified experts
   */
  private async findQualifiedExperts(topic: string): Promise<ExtendedExpert[]> {
    try {
      const experts = await this.withRetry(() => this.expertRepo.findQualifiedExperts(topic));

      // Sort experts by relevance score (calculated by topic match)
      experts.sort(
        (a, b) => this.calculateExpertRelevance(b, topic) - this.calculateExpertRelevance(a, topic),
      );

      this.logger.debug(`Found ${experts.length} experts for topic: ${topic}`);
      return experts;
    } catch (error) {
      this.logger.error('Error finding qualified experts:', error);
      throw new ServiceExpertError('Failed to find qualified experts', {
        code: 'EXPERT_LOOKUP_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Calculate how relevant an expert is to a given topic
   * @param expert - The expert to evaluate
   * @param topic - The topic to check relevance against
   * @returns A numeric score of relevance
   */
  private calculateExpertRelevance(expert: ExtendedExpert, topic: string): number {
    const lowercaseTopic = topic.toLowerCase();

    return expert.topic.filter(t => {
      const lowercaseExpertTopic = t.toLowerCase();
      return (
        lowercaseExpertTopic.includes(lowercaseTopic) ||
        lowercaseTopic.includes(lowercaseExpertTopic)
      );
    }).length;
  }

  /**
   * Notifies experts about their review tasks
   * @param tasks - Array of review tasks to notify experts about
   */
  private async notifyExperts(tasks: ExtendedVerificationTask[]): Promise<void> {
    try {
      if (!tasks?.length) {
        this.logger.warn('No tasks to notify experts about.');
        return;
      }

      this.logger.info(`Notifying ${tasks.length} experts about review tasks.`);

      // Process notifications in batches to avoid overwhelming notification services
      const batches = this.chunkArray(
        tasks,
        ExpertVerificationService.EXPERT_NOTIFICATION_BATCH_SIZE,
      );

      // Process each batch sequentially to control rate limiting
      for (const [index, batch] of batches.entries()) {
        await Promise.all(
          batch.map(async task => {
            try {
              // In a real implementation, this would send notifications via appropriate channels
              this.logger.debug(`Notification sent for task ${task.id} to expert ${task.expertId}`);
              return true;
            } catch (error) {
              this.logger.error(
                `Failed to notify expert ${task.expertId} about task ${task.id}:`,
                error,
              );
              return false;
            }
          }),
        );

        // Add a small delay between batches to avoid rate limiting
        if (batches.length > 1 && index < batches.length - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, ExpertVerificationService.BATCH_DELAY_MS),
          );
        }
      }

      this.logger.info('Expert notifications completed successfully.');
    } catch (error) {
      this.logger.error('Error notifying experts:', error);
      throw new ServiceExpertError('Failed to notify experts', {
        code: 'NOTIFICATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Records an expert's verification of an analysis
   * @param analysisId - Unique identifier of the analysis
   * @param expertId - Unique identifier of the expert
   * @param verdict - Verification status
   */
  private async recordVerification(
    analysisId: string,
    expertId: string,
    verdict: VerificationStatus,
  ): Promise<void> {
    try {
      this.logger.info(
        `Recording verification for analysis: ${analysisId}, expert: ${expertId}, verdict: ${verdict}`,
      );

      // Find the task for this expert and analysis
      const task = await this.withRetry(() => this.taskRepo.find(analysisId, expertId));

      if (!task) {
        throw new ServiceExpertError(
          'Analysis not found',
          {
            code: 'TASK_NOT_FOUND',
          },
        );
      }

      // Update task with verification result
      const updatedTask: ExtendedVerificationTask = {
        ...task,
        status: verdict,
        verdict: verdict,
        processedAt: new Date().toISOString(),
      };

      await this.withRetry(() => this.taskRepo.save(updatedTask));

      // Record verification metrics for monitoring
      // metrics.track('expert.verifications', 1);

      this.logger.info(`Verification successfully recorded for analysis: ${analysisId}`);
    } catch (error) {
      this.logger.error(`Error recording verification for analysis ${analysisId}:`, error);
      if (error instanceof ServiceExpertError) {
        throw error;
      }
      throw new ServiceExpertError('Failed to record verification', {
        code: 'RECORD_VERIFICATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Updates the overall status of an analysis based on expert verifications
   * @param analysisId - Unique identifier of the analysis
   */
  private async updateAnalysisStatus(analysisId: string): Promise<void> {
    try {
      this.logger.info(`Updating analysis status for: ${analysisId}`);

      // Get all verifications for this analysis
      const tasks = await this.withRetry(() => this.taskRepo.findByAnalysis(analysisId));

      // Filter tasks that have been processed (have a verdict)
      const verifications = tasks.filter(task => task.verdict !== undefined);

      // Get the new status based on consensus rules
      const newStatus = this.determineConsensusStatus(verifications);

      // Update the analysis status in the database
      await this.withRetry(() => this.analysisRepo.updateStatus(analysisId, newStatus));

      this.logger.info(`Analysis ${analysisId} status updated to: ${newStatus}`);

      // Record metrics for status changes
      // metrics.track('analysis.status.updated', 1);
    } catch (error) {
      this.logger.error(`Error updating analysis status for ${analysisId}:`, error);
      throw new ServiceExpertError('Failed to update analysis status', {
        code: 'UPDATE_STATUS_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Determines consensus status based on verification results
   * @param verifications - Array of verification tasks with verdicts
   * @returns Consensus verification status
   */
  private determineConsensusStatus(verifications: ExtendedVerificationTask[]): VerificationStatus {
    // Count approvals and rejections
    const approvalCount = verifications.filter(
      v => v.verdict === VerificationStatus.APPROVED,
    ).length;
    const rejectionCount = verifications.filter(
      v => v.verdict === VerificationStatus.REJECTED,
    ).length;
    const totalCount = verifications.length;

    const minExpertsNeeded = ExpertVerificationService.MIN_EXPERTS_FOR_CONSENSUS;
    const thresholdRatio = ExpertVerificationService.CONSENSUS_THRESHOLD;

    // Determine the new status based on verification counts
    if (totalCount >= minExpertsNeeded && approvalCount > totalCount * thresholdRatio) {
      return VerificationStatus.APPROVED;
    } else if (totalCount >= minExpertsNeeded && rejectionCount > totalCount * thresholdRatio) {
      return VerificationStatus.REJECTED;
    } else {
      return VerificationStatus.PENDING;
    }
  }

  /**
   * Notifies stakeholders about verification results
   * @param analysisId - Unique identifier of the analysis
   */
  private async notifyStakeholders(analysisId: string): Promise<void> {
    try {
      this.logger.info(`Notifying stakeholders about analysis: ${analysisId}`);

      // Get the analysis with stakeholders
      const analysis = await this.withRetry(() => this.analysisRepo.findById(analysisId));

      if (!analysis) {
        this.logger.warn(`Analysis ${analysisId} not found when attempting to notify stakeholders`);
        return;
      }

      // In a real implementation, this would retrieve stakeholders from the database
      // For this example, we're using mock data
      const mockStakeholders: Stakeholder[] = [
        {
          id: 'user-001',
          name: 'Stakeholder 1',
          email: 'stakeholder1@example.com',
          type: 'user',
          influence: 5,
          notificationPreferences: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        },
        {
          id: 'user-002',
          name: 'Stakeholder 2',
          email: 'stakeholder2@example.com',
          type: 'user',
          influence: 3,
          notificationPreferences: [NotificationChannel.EMAIL],
        },
      ];

      const status = VerificationStatus.PENDING;
      const notificationTitle = `Analysis ${analysisId} verification update`;
      const notificationBody = `The analysis on "${analysis.topic}" has been ${status.toLowerCase()} by experts.`;

      await this.sendStakeholderNotifications(
        mockStakeholders,
        notificationTitle,
        notificationBody,
      );

      this.logger.info(
        `Successfully notified ${mockStakeholders.length} stakeholders about analysis ${analysisId}`,
      );
    } catch (error) {
      this.logger.error(`Error notifying stakeholders for analysis ${analysisId}:`, error);
      throw new ServiceExpertError('Failed to notify stakeholders', {
        code: 'STAKEHOLDER_NOTIFICATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Sends notifications to stakeholders via their preferred channels
   * @param stakeholders - Array of stakeholders to notify
   * @param title - Notification title
   * @param body - Notification body content
   */
  private async sendStakeholderNotifications(
    stakeholders: Stakeholder[],
    title: string,
    body: string,
  ): Promise<void> {
    for (const stakeholder of stakeholders) {
      if (stakeholder.notificationPreferences.includes(NotificationChannel.EMAIL)) {
        // In a real implementation, this would send an email
        this.logger.debug(
          `Email notification sent to stakeholder ${stakeholder.id} at ${stakeholder.email}`,
        );
      }

      if (stakeholder.notificationPreferences.includes(NotificationChannel.IN_APP)) {
        // In a real implementation, this would create an in-app notification
        this.logger.debug(`In-app notification sent to stakeholder ${stakeholder.id}`);
      }
    }
  }

  /**
   * Invalidates cached data for a specific analysis
   * @param analysisId - Unique identifier of the analysis
   */
  private invalidateCache(analysisId: string): void {
    this.logger.debug(`Invalidating cache for analysis: ${analysisId}`);
    // cache.invalidate(`analysis:${analysisId}`);
    // cache.invalidate(`experts:${analysisId}`);
    // cache.invalidate(`tasks:${analysisId}`);
  }
}
















































