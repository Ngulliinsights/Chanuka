/**
 * Data Retention Service
 * Manages automatic data cleanup and retention policies
 */

import { logger } from '@client/lib/utils/logger';
import { privacyCompliance } from '@client/lib/utils/privacy-compliance';

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataCategory: string;
  retentionPeriod: number; // in days
  autoDelete: boolean;
  backupBeforeDelete: boolean;
  legalBasis: string;
  exceptions: string[];
}

interface DataCleanupJob {
  id: string;
  policyId: string;
  scheduledFor: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsAffected: number;
  completedAt?: string;
  error?: string;
}

interface UserDataSummary {
  userId: string;
  categories: {
    [category: string]: {
      recordCount: number;
      oldestRecord: string;
      newestRecord: string;
      sizeBytes: number;
      canDelete: boolean;
      retentionExpiry: string;
    };
  };
  totalSize: number;
  retentionStatus: 'compliant' | 'overdue' | 'pending_deletion';
}

class DataRetentionService {
  private readonly RETENTION_POLICIES: RetentionPolicy[] = [
    {
      id: 'profile-data',
      name: 'Profile Information',
      description: 'User profile data including name, email, preferences',
      dataCategory: 'profile',
      retentionPeriod: 730, // 2 years
      autoDelete: false, // Manual deletion only
      backupBeforeDelete: true,
      legalBasis: 'Contract performance',
      exceptions: ['Active account holders', 'Legal proceedings'],
    },
    {
      id: 'activity-data',
      name: 'Platform Activity',
      description: 'Comments, votes, bill interactions for civic transparency',
      dataCategory: 'activity',
      retentionPeriod: 1825, // 5 years
      autoDelete: false, // Civic transparency requirement
      backupBeforeDelete: true,
      legalBasis: 'Public interest (civic transparency)',
      exceptions: ['Public comments on legislation', 'Voting records'],
    },
    {
      id: 'analytics-data',
      name: 'Analytics Data',
      description: 'Usage patterns and behavioral analytics',
      dataCategory: 'analytics',
      retentionPeriod: 730, // 2 years
      autoDelete: true,
      backupBeforeDelete: false,
      legalBasis: 'Consent',
      exceptions: [],
    },
    {
      id: 'security-logs',
      name: 'Security Logs',
      description: 'Login attempts, security events, audit trails',
      dataCategory: 'security',
      retentionPeriod: 2555, // 7 years
      autoDelete: false, // Legal requirement
      backupBeforeDelete: true,
      legalBasis: 'Legal obligation',
      exceptions: ['Ongoing security investigations'],
    },
    {
      id: 'communications',
      name: 'Communications',
      description: 'Email notifications and communication history',
      dataCategory: 'communications',
      retentionPeriod: 365, // 1 year
      autoDelete: true,
      backupBeforeDelete: false,
      legalBasis: 'Consent',
      exceptions: ['Legal notices', 'Privacy policy updates'],
    },
    {
      id: 'temporary-data',
      name: 'Temporary Data',
      description: 'Session data, temporary files, cache',
      dataCategory: 'temporary',
      retentionPeriod: 30, // 30 days
      autoDelete: true,
      backupBeforeDelete: false,
      legalBasis: 'Legitimate interest',
      exceptions: [],
    },
  ];

  /**
   * Gets all retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return [...this.RETENTION_POLICIES];
  }

  /**
   * Gets retention policy for a specific data category
   */
  getPolicyForCategory(category: string): RetentionPolicy | null {
    return this.RETENTION_POLICIES.find(policy => policy.dataCategory === category) || null;
  }

  /**
   * Calculates when data should be deleted based on retention policy
   */
  calculateRetentionExpiry(createdAt: string, category: string): string {
    const policy = this.getPolicyForCategory(category);
    if (!policy) {
      // Default to 2 years if no policy found
      const expiry = new Date(createdAt);
      expiry.setDate(expiry.getDate() + 730);
      return expiry.toISOString();
    }

    const expiry = new Date(createdAt);
    expiry.setDate(expiry.getDate() + policy.retentionPeriod);
    return expiry.toISOString();
  }

  /**
   * Checks if data is eligible for deletion
   */
  isEligibleForDeletion(
    createdAt: string,
    category: string,
    userConsent?: boolean,
    hasExceptions?: boolean
  ): boolean {
    const policy = this.getPolicyForCategory(category);
    if (!policy) return false;

    // Check if there are exceptions preventing deletion
    if (hasExceptions) return false;

    // Check if consent-based data has been withdrawn
    if (policy.legalBasis === 'Consent' && userConsent === false) {
      return true;
    }

    // Check if retention period has expired
    const expiryDate = new Date(this.calculateRetentionExpiry(createdAt, category));
    const now = new Date();

    return now > expiryDate;
  }

  /**
   * Schedules automatic data cleanup jobs
   */
  async scheduleDataCleanup(): Promise<DataCleanupJob[]> {
    const jobs: DataCleanupJob[] = [];

    for (const policy of this.RETENTION_POLICIES) {
      if (!policy.autoDelete) continue;

      const job: DataCleanupJob = {
        id: crypto.randomUUID(),
        policyId: policy.id,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        status: 'pending',
        recordsAffected: 0,
      };

      jobs.push(job);

      logger.info('Data cleanup job scheduled', {
        component: 'DataRetentionService',
        jobId: job.id,
        policyId: policy.id,
        category: policy.dataCategory,
        scheduledFor: job.scheduledFor,
      });
    }

    return jobs;
  }

  /**
   * Executes data cleanup for a specific category
   */
  async executeDataCleanup(
    category: string,
    dryRun: boolean = false
  ): Promise<{
    recordsFound: number;
    recordsDeleted: number;
    errors: string[];
    backupCreated: boolean;
  }> {
    const policy = this.getPolicyForCategory(category);
    if (!policy) {
      throw new Error(`No retention policy found for category: ${category}`);
    }

    logger.info('Starting data cleanup', {
      component: 'DataRetentionService',
      category,
      dryRun,
      policy: policy.id,
    });

    try {
      // In a real implementation, this would:
      // 1. Query database for expired records
      // 2. Create backup if required
      // 3. Delete records in batches
      // 4. Log all operations

      // Simulated cleanup results
      const recordsFound = Math.floor(Math.random() * 1000);
      const recordsDeleted = dryRun ? 0 : recordsFound;
      const backupCreated = policy.backupBeforeDelete && !dryRun;

      if (backupCreated) {
        await this.createDataBackup(category, recordsFound);
      }

      logger.info('Data cleanup completed', {
        component: 'DataRetentionService',
        category,
        recordsFound,
        recordsDeleted,
        backupCreated,
        dryRun,
      });

      return {
        recordsFound,
        recordsDeleted,
        errors: [],
        backupCreated,
      };
    } catch (error) {
      logger.error('Data cleanup failed', {
        component: 'DataRetentionService',
        category,
        error,
      });

      return {
        recordsFound: 0,
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        backupCreated: false,
      };
    }
  }

  /**
   * Creates a backup of data before deletion
   */
  private async createDataBackup(category: string, recordCount: number): Promise<string> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // In production, this would create an actual backup
    logger.info('Data backup created', {
      component: 'DataRetentionService',
      backupId,
      category,
      recordCount,
      timestamp,
    });

    return backupId;
  }

  /**
   * Gets user data summary for transparency
   */
  async getUserDataSummary(userId: string): Promise<UserDataSummary> {
    const categories: UserDataSummary['categories'] = {};

    for (const policy of this.RETENTION_POLICIES) {
      // In production, this would query actual user data
      const mockData = {
        recordCount: Math.floor(Math.random() * 100),
        oldestRecord: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        newestRecord: new Date().toISOString(),
        sizeBytes: Math.floor(Math.random() * 1024 * 1024), // Random size up to 1MB
        canDelete: policy.autoDelete,
        retentionExpiry: this.calculateRetentionExpiry(
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          policy.dataCategory
        ),
      };

      categories[policy.dataCategory] = mockData;
    }

    const totalSize = Object.values(categories).reduce((sum, cat) => sum + cat.sizeBytes, 0);

    // Determine retention status
    let retentionStatus: UserDataSummary['retentionStatus'] = 'compliant';
    const now = new Date();

    for (const [category, data] of Object.entries(categories)) {
      const expiryDate = new Date(data.retentionExpiry);
      if (now > expiryDate && data.canDelete) {
        retentionStatus = 'overdue';
        break;
      }
    }

    return {
      userId,
      categories,
      totalSize,
      retentionStatus,
    };
  }

  /**
   * Validates retention compliance for a user
   */
  async validateRetentionCompliance(userId: string): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const summary = await this.getUserDataSummary(userId);
    const issues: string[] = [];
    const recommendations: string[] = [];

    const now = new Date();

    for (const [category, data] of Object.entries(summary.categories)) {
      const policy = this.getPolicyForCategory(category);
      if (!policy) continue;

      const expiryDate = new Date(data.retentionExpiry);

      if (now > expiryDate) {
        if (policy.autoDelete) {
          issues.push(`${policy.name} data is overdue for automatic deletion`);
          recommendations.push(`Schedule cleanup for ${category} data`);
        } else {
          recommendations.push(`Review ${policy.name} data for manual cleanup`);
        }
      }

      // Check for large data sizes
      if (data.sizeBytes > 10 * 1024 * 1024) {
        // 10MB threshold
        recommendations.push(`Consider archiving large ${policy.name} dataset`);
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Generates retention report for transparency
   */
  generateRetentionReport(): {
    policies: RetentionPolicy[];
    summary: {
      totalPolicies: number;
      autoDeletePolicies: number;
      averageRetentionDays: number;
      complianceFrameworks: string[];
    };
    lastUpdated: string;
  } {
    const autoDeletePolicies = this.RETENTION_POLICIES.filter(p => p.autoDelete).length;
    const averageRetentionDays =
      this.RETENTION_POLICIES.reduce((sum, p) => sum + p.retentionPeriod, 0) /
      this.RETENTION_POLICIES.length;

    return {
      policies: this.getRetentionPolicies(),
      summary: {
        totalPolicies: this.RETENTION_POLICIES.length,
        autoDeletePolicies,
        averageRetentionDays: Math.round(averageRetentionDays),
        complianceFrameworks: ['GDPR', 'CCPA', 'PIPEDA', 'Kenya Data Protection Act'],
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();

/**
 * Utility functions for data retention
 */
export const retentionUtils = {
  /**
   * Formats retention period for display
   */
  formatRetentionPeriod(days: number): string {
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.round(days / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  },

  /**
   * Calculates days until retention expiry
   */
  daysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Gets retention status color for UI
   */
  getRetentionStatusColor(status: UserDataSummary['retentionStatus']): string {
    switch (status) {
      case 'compliant':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      case 'pending_deletion':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  },

  /**
   * Formats file size for display
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },
};
