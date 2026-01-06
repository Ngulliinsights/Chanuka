/**
 * Data Retention Service - Shared Services
 *
 * Migrated from client/src/services/dataRetentionService.ts
 * Handles data lifecycle management, cleanup, and retention policies
 * across the civic engagement platform.
 */

import { logger } from '../../utils/logger';

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // days
  archiveAfter?: number; // days
  deleteAfter: number; // days
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DataCleanupJob {
  id: string;
  policyId: string;
  dataType: string;
  scheduledAt: string;
  executedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed?: number;
  recordsDeleted?: number;
  recordsArchived?: number;
  error?: string;
}

interface RetentionMetrics {
  totalPolicies: number;
  activePolicies: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  dataTypesManaged: string[];
  storageFreed: number; // bytes
  lastCleanup: string;
}

class DataRetentionService {
  private policies = new Map<string, RetentionPolicy>();
  private jobs: DataCleanupJob[] = [];
  private isRunning = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Add or update a retention policy
   */
  async setRetentionPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const policyId = crypto.randomUUID();
      const now = new Date().toISOString();

      const fullPolicy: RetentionPolicy = {
        id: policyId,
        createdAt: now,
        updatedAt: now,
        ...policy,
      };

      this.policies.set(policyId, fullPolicy);

      logger.info('Retention policy created', {
        component: 'DataRetentionService',
        policyId,
        name: policy.name,
        dataTypes: policy.dataTypes,
        retentionPeriod: policy.retentionPeriod,
      });

      return policyId;
    } catch (error) {
      logger.error('Failed to create retention policy', {
        component: 'DataRetentionService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get a specific retention policy
   */
  getRetentionPolicy(policyId: string): RetentionPolicy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * Update an existing retention policy
   */
  async updateRetentionPolicy(
    policyId: string,
    updates: Partial<Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const existingPolicy = this.policies.get(policyId);
      if (!existingPolicy) {
        throw new Error(`Retention policy not found: ${policyId}`);
      }

      const updatedPolicy: RetentionPolicy = {
        ...existingPolicy,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      this.policies.set(policyId, updatedPolicy);

      logger.info('Retention policy updated', {
        component: 'DataRetentionService',
        policyId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Failed to update retention policy', {
        component: 'DataRetentionService',
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete a retention policy
   */
  async deleteRetentionPolicy(policyId: string): Promise<void> {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Retention policy not found: ${policyId}`);
      }

      this.policies.delete(policyId);

      // Cancel any pending jobs for this policy
      this.jobs = this.jobs.filter(job => job.policyId !== policyId);

      logger.info('Retention policy deleted', {
        component: 'DataRetentionService',
        policyId,
        name: policy.name,
      });
    } catch (error) {
      logger.error('Failed to delete retention policy', {
        component: 'DataRetentionService',
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  startScheduler(intervalHours: number = 24): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(
      () => {
        this.runScheduledCleanup();
      },
      intervalHours * 60 * 60 * 1000
    );

    logger.info('Data retention scheduler started', {
      component: 'DataRetentionService',
      intervalHours,
    });
  }

  /**
   * Stop automatic cleanup scheduler
   */
  stopScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    logger.info('Data retention scheduler stopped', {
      component: 'DataRetentionService',
    });
  }

  /**
   * Run cleanup for all active policies
   */
  async runScheduledCleanup(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Cleanup already running, skipping', {
        component: 'DataRetentionService',
      });
      return;
    }

    this.isRunning = true;

    try {
      logger.info('Starting scheduled data cleanup', {
        component: 'DataRetentionService',
      });

      const activePolicies = Array.from(this.policies.values()).filter(p => p.enabled);

      for (const policy of activePolicies) {
        await this.executeCleanupForPolicy(policy);
      }

      logger.info('Scheduled data cleanup completed', {
        component: 'DataRetentionService',
        policiesProcessed: activePolicies.length,
      });
    } catch (error) {
      logger.error('Scheduled cleanup failed', {
        component: 'DataRetentionService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run cleanup for a specific policy
   */
  async runCleanupForPolicy(policyId: string): Promise<void> {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Retention policy not found: ${policyId}`);
      }

      if (!policy.enabled) {
        throw new Error(`Retention policy is disabled: ${policyId}`);
      }

      await this.executeCleanupForPolicy(policy);

      logger.info('Policy cleanup completed', {
        component: 'DataRetentionService',
        policyId,
        name: policy.name,
      });
    } catch (error) {
      logger.error('Policy cleanup failed', {
        component: 'DataRetentionService',
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get cleanup job history
   */
  getCleanupJobs(limit: number = 50): DataCleanupJob[] {
    return this.jobs
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get retention metrics
   */
  getRetentionMetrics(): RetentionMetrics {
    const policies = Array.from(this.policies.values());
    const activePolicies = policies.filter(p => p.enabled);
    const completedJobs = this.jobs.filter(j => j.status === 'completed');
    const failedJobs = this.jobs.filter(j => j.status === 'failed');

    const dataTypesManaged = [...new Set(policies.flatMap(p => p.dataTypes))];
    const storageFreed = completedJobs.reduce((total, job) => {
      // Estimate storage freed (this would be calculated based on actual data)
      return total + (job.recordsDeleted || 0) * 1024; // Rough estimate
    }, 0);

    const lastCleanup =
      completedJobs.length > 0 ? completedJobs[completedJobs.length - 1].executedAt || '' : '';

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalJobs: this.jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      dataTypesManaged,
      storageFreed,
      lastCleanup,
    };
  }

  /**
   * Check if data should be retained based on policies
   */
  shouldRetainData(
    dataType: string,
    createdAt: string
  ): {
    shouldRetain: boolean;
    shouldArchive: boolean;
    policy?: RetentionPolicy;
  } {
    const applicablePolicies = Array.from(this.policies.values()).filter(
      p => p.enabled && p.dataTypes.includes(dataType)
    );

    if (applicablePolicies.length === 0) {
      return { shouldRetain: true, shouldArchive: false };
    }

    // Use the most restrictive policy (shortest retention period)
    const policy = applicablePolicies.reduce((shortest, current) =>
      current.retentionPeriod < shortest.retentionPeriod ? current : shortest
    );

    const dataAge = Date.now() - new Date(createdAt).getTime();
    const daysSinceCreation = Math.floor(dataAge / (1000 * 60 * 60 * 24));

    const shouldArchive = policy.archiveAfter
      ? daysSinceCreation >= policy.archiveAfter && daysSinceCreation < policy.deleteAfter
      : false;

    const shouldRetain = daysSinceCreation < policy.deleteAfter;

    return {
      shouldRetain,
      shouldArchive,
      policy,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'User Activity Logs',
        description: 'Retain user activity logs for audit purposes',
        dataTypes: ['user_activity', 'login_logs', 'action_logs'],
        retentionPeriod: 365, // 1 year
        archiveAfter: 90, // 3 months
        deleteAfter: 365,
        enabled: true,
      },
      {
        name: 'Analytics Data',
        description: 'Retain analytics data for insights',
        dataTypes: ['page_views', 'user_interactions', 'performance_metrics'],
        retentionPeriod: 730, // 2 years
        archiveAfter: 365, // 1 year
        deleteAfter: 730,
        enabled: true,
      },
      {
        name: 'Error Logs',
        description: 'Retain error logs for debugging',
        dataTypes: ['error_logs', 'crash_reports', 'debug_logs'],
        retentionPeriod: 90, // 3 months
        deleteAfter: 90,
        enabled: true,
      },
      {
        name: 'User Comments',
        description: 'Retain user comments and discussions',
        dataTypes: ['comments', 'discussions', 'user_content'],
        retentionPeriod: 2555, // 7 years (legal requirement)
        archiveAfter: 1095, // 3 years
        deleteAfter: 2555,
        enabled: true,
      },
    ];

    defaultPolicies.forEach(policy => {
      this.setRetentionPolicy(policy);
    });

    logger.info('Default retention policies initialized', {
      component: 'DataRetentionService',
      count: defaultPolicies.length,
    });
  }

  private async executeCleanupForPolicy(policy: RetentionPolicy): Promise<void> {
    for (const dataType of policy.dataTypes) {
      const job: DataCleanupJob = {
        id: crypto.randomUUID(),
        policyId: policy.id,
        dataType,
        scheduledAt: new Date().toISOString(),
        status: 'pending',
      };

      this.jobs.push(job);

      try {
        job.status = 'running';
        job.executedAt = new Date().toISOString();

        // Simulate cleanup process (in real implementation, this would interact with database)
        const result = await this.performDataCleanup(dataType, policy);

        job.status = 'completed';
        job.recordsProcessed = result.processed;
        job.recordsDeleted = result.deleted;
        job.recordsArchived = result.archived;

        logger.debug('Cleanup job completed', {
          component: 'DataRetentionService',
          jobId: job.id,
          dataType,
          processed: result.processed,
          deleted: result.deleted,
          archived: result.archived,
        });
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';

        logger.error('Cleanup job failed', {
          component: 'DataRetentionService',
          jobId: job.id,
          dataType,
          error: job.error,
        });
      }
    }
  }

  private async performDataCleanup(
    _dataType: string,
    _policy: RetentionPolicy
  ): Promise<{
    processed: number;
    deleted: number;
    archived: number;
  }> {
    // Simulate data cleanup process
    // In a real implementation, this would:
    // 1. Query database for records older than retention period
    // 2. Archive records if archiveAfter is specified
    // 3. Delete records older than deleteAfter
    // 4. Return actual counts

    const simulatedCounts = {
      processed: Math.floor(Math.random() * 1000),
      deleted: Math.floor(Math.random() * 100),
      archived: Math.floor(Math.random() * 200),
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return simulatedCounts;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopScheduler();
    this.policies.clear();
    this.jobs = [];
    this.isRunning = false;

    logger.info('Data retention service cleaned up', {
      component: 'DataRetentionService',
    });
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();

// Export utility functions
export const retentionUtils = {
  calculateDataAge(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // days
  },

  formatRetentionPeriod(days: number): string {
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      const months = Math.floor(remainingDays / 30);

      let result = `${years} year${years > 1 ? 's' : ''}`;
      if (months > 0) {
        result += ` ${months} month${months > 1 ? 's' : ''}`;
      }
      return result;
    }
  },

  estimateStorageImpact(
    recordCount: number,
    avgRecordSize: number = 1024
  ): {
    totalSize: number;
    formattedSize: string;
  } {
    const totalSize = recordCount * avgRecordSize;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = totalSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return {
      totalSize,
      formattedSize: `${size.toFixed(2)} ${units[unitIndex]}`,
    };
  },
};

export default dataRetentionService;
