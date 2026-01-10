/**
 * Data Retention Service - Enterprise Grade
 *
 * Manages automatic data cleanup and retention policies with:
 * - Comprehensive audit logging
 * - Batch processing for scalability
 * - Configurable policies
 * - Transaction safety
 * - Encrypted backups
 * - Compliance validation
 */

import { logger } from '@client/shared/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type DataCategory =
  | 'profile'
  | 'activity'
  | 'analytics'
  | 'security'
  | 'communications'
  | 'temporary';

export type LegalBasis =
  | 'Contract performance'
  | 'Public interest'
  | 'Consent'
  | 'Legal obligation'
  | 'Legitimate interest';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RetentionStatus = 'compliant' | 'overdue' | 'pending_deletion' | 'archived';
export type ComplianceFramework = 'GDPR' | 'CCPA' | 'PIPEDA' | 'KDPA' | 'LGPD';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataCategory: DataCategory;
  retentionPeriod: number; // in days
  autoDelete: boolean;
  backupBeforeDelete: boolean;
  encryptBackup: boolean;
  legalBasis: LegalBasis;
  exceptions: string[];
  priority: number; // For execution order
  batchSize: number; // Records per batch
  enabled: boolean;
  complianceFrameworks: ComplianceFramework[];
  notifyBeforeDeletion: boolean;
  notificationPeriod: number; // days before deletion
  metadata?: Record<string, unknown>;
}

export interface DataCleanupJob {
  id: string;
  policyId: string;
  scheduledFor: Date;
  status: JobStatus;
  recordsAffected: number;
  recordsProcessed: number;
  completedAt?: Date;
  error?: string;
  dryRun: boolean;
  backupId?: string;
  executionTime?: number; // milliseconds
  retryCount: number;
  maxRetries: number;
}

export interface CategoryData {
  recordCount: number;
  oldestRecord: Date;
  newestRecord: Date;
  sizeBytes: number;
  canDelete: boolean;
  retentionExpiry: Date;
  hasExceptions: boolean;
  lastCleanup?: Date;
}

export interface UserDataSummary {
  userId: string;
  categories: Record<DataCategory, CategoryData>;
  totalSize: number;
  retentionStatus: RetentionStatus;
  complianceScore: number; // 0-100
  lastValidated: Date;
  pendingDeletions: number;
}

export interface CleanupResult {
  success: boolean;
  recordsFound: number;
  recordsDeleted: number;
  errors: string[];
  warnings: string[];
  backupCreated: boolean;
  backupId?: string;
  executionTime: number;
  batchesProcessed: number;
}

export interface RetentionCompliance {
  isCompliant: boolean;
  score: number; // 0-100
  issues: ComplianceIssue[];
  recommendations: string[];
  lastAudit: Date;
  nextAudit: Date;
}

export interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: DataCategory;
  description: string;
  remediation: string;
  deadline?: Date;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  category: DataCategory;
  userId?: string;
  recordCount: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Data Access Layer Interface
// ============================================================================

export interface IDataAccessLayer {
  queryExpiredRecords(category: DataCategory, expiryDate: Date, limit: number): Promise<string[]>;
  deleteRecords(category: DataCategory, recordIds: string[]): Promise<number>;
  createBackup(category: DataCategory, recordIds: string[], encrypted: boolean): Promise<string>;
  getUserCategoryData(userId: string, category: DataCategory): Promise<CategoryData>;
  executeInTransaction<T>(callback: () => Promise<T>): Promise<T>;
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
}

// ============================================================================
// Mock Data Access Layer (Replace with real implementation)
// ============================================================================

class MockDataAccessLayer implements IDataAccessLayer {
  async queryExpiredRecords(
    category: DataCategory,
    expiryDate: Date,
    limit: number
  ): Promise<string[]> {
    // Simulate database query
    const count = Math.floor(Math.random() * limit);
    return Array.from({ length: count }, () => crypto.randomUUID());
  }

  async deleteRecords(category: DataCategory, recordIds: string[]): Promise<number> {
    // Simulate deletion
    await this.delay(100);
    return recordIds.length;
  }

  async createBackup(
    category: DataCategory,
    recordIds: string[],
    encrypted: boolean
  ): Promise<string> {
    // Simulate backup creation
    await this.delay(200);
    return `backup_${category}_${Date.now()}`;
  }

  async getUserCategoryData(userId: string, category: DataCategory): Promise<CategoryData> {
    const now = new Date();
    const oldestDate = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);

    return {
      recordCount: Math.floor(Math.random() * 100),
      oldestRecord: oldestDate,
      newestRecord: now,
      sizeBytes: Math.floor(Math.random() * 10 * 1024 * 1024),
      canDelete: Math.random() > 0.5,
      retentionExpiry: new Date(oldestDate.getTime() + 365 * 24 * 60 * 60 * 1000),
      hasExceptions: Math.random() > 0.8,
      lastCleanup:
        Math.random() > 0.5 ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : undefined,
    };
  }

  async executeInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  }

  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    // Simulate audit logging
    await this.delay(10);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Data Retention Service
// ============================================================================

export class DataRetentionService {
  private policies: Map<string, RetentionPolicy> = new Map();
  private jobs: Map<string, DataCleanupJob> = new Map();
  private readonly dataAccess: IDataAccessLayer;
  private jobExecutionLock = false;

  constructor(dataAccess?: IDataAccessLayer, customPolicies?: RetentionPolicy[]) {
    this.dataAccess = dataAccess ?? new MockDataAccessLayer();
    this.initializeDefaultPolicies();

    if (customPolicies) {
      this.addPolicies(customPolicies);
    }
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'profile-data',
        name: 'Profile Information',
        description: 'User profile data including name, email, preferences',
        dataCategory: 'profile',
        retentionPeriod: 730,
        autoDelete: false,
        backupBeforeDelete: true,
        encryptBackup: true,
        legalBasis: 'Contract performance',
        exceptions: ['Active account holders', 'Legal proceedings'],
        priority: 1,
        batchSize: 100,
        enabled: true,
        complianceFrameworks: ['GDPR', 'CCPA', 'KDPA'],
        notifyBeforeDeletion: true,
        notificationPeriod: 30,
      },
      {
        id: 'activity-data',
        name: 'Platform Activity',
        description: 'Comments, votes, bill interactions',
        dataCategory: 'activity',
        retentionPeriod: 1825,
        autoDelete: false,
        backupBeforeDelete: true,
        encryptBackup: true,
        legalBasis: 'Public interest',
        exceptions: ['Public comments on legislation', 'Voting records'],
        priority: 2,
        batchSize: 500,
        enabled: true,
        complianceFrameworks: ['GDPR'],
        notifyBeforeDeletion: false,
        notificationPeriod: 0,
      },
      {
        id: 'analytics-data',
        name: 'Analytics Data',
        description: 'Usage patterns and behavioral analytics',
        dataCategory: 'analytics',
        retentionPeriod: 730,
        autoDelete: true,
        backupBeforeDelete: false,
        encryptBackup: false,
        legalBasis: 'Consent',
        exceptions: [],
        priority: 5,
        batchSize: 1000,
        enabled: true,
        complianceFrameworks: ['GDPR', 'CCPA'],
        notifyBeforeDeletion: false,
        notificationPeriod: 0,
      },
      {
        id: 'security-logs',
        name: 'Security Logs',
        description: 'Login attempts, security events, audit trails',
        dataCategory: 'security',
        retentionPeriod: 2555,
        autoDelete: false,
        backupBeforeDelete: true,
        encryptBackup: true,
        legalBasis: 'Legal obligation',
        exceptions: ['Ongoing security investigations'],
        priority: 1,
        batchSize: 200,
        enabled: true,
        complianceFrameworks: ['GDPR', 'CCPA', 'PIPEDA'],
        notifyBeforeDeletion: false,
        notificationPeriod: 0,
      },
      {
        id: 'communications',
        name: 'Communications',
        description: 'Email notifications and communication history',
        dataCategory: 'communications',
        retentionPeriod: 365,
        autoDelete: true,
        backupBeforeDelete: false,
        encryptBackup: false,
        legalBasis: 'Consent',
        exceptions: ['Legal notices', 'Privacy policy updates'],
        priority: 4,
        batchSize: 500,
        enabled: true,
        complianceFrameworks: ['GDPR', 'CCPA'],
        notifyBeforeDeletion: true,
        notificationPeriod: 7,
      },
      {
        id: 'temporary-data',
        name: 'Temporary Data',
        description: 'Session data, temporary files, cache',
        dataCategory: 'temporary',
        retentionPeriod: 30,
        autoDelete: true,
        backupBeforeDelete: false,
        encryptBackup: false,
        legalBasis: 'Legitimate interest',
        exceptions: [],
        priority: 10,
        batchSize: 2000,
        enabled: true,
        complianceFrameworks: ['GDPR'],
        notifyBeforeDeletion: false,
        notificationPeriod: 0,
      },
    ];

    defaultPolicies.forEach(policy => this.policies.set(policy.id, policy));
  }

  addPolicies(policies: RetentionPolicy[]): void {
    policies.forEach(policy => {
      this.validatePolicy(policy);
      this.policies.set(policy.id, policy);
    });
  }

  updatePolicy(policyId: string, updates: Partial<RetentionPolicy>): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy = { ...policy, ...updates };
    this.validatePolicy(updatedPolicy);
    this.policies.set(policyId, updatedPolicy);

    logger.info('Policy updated', {
      component: 'DataRetentionService',
      policyId,
      changes: updates,
    });
  }

  private validatePolicy(policy: RetentionPolicy): void {
    if (policy.retentionPeriod < 0) {
      throw new Error('Retention period must be non-negative');
    }
    if (policy.batchSize < 1) {
      throw new Error('Batch size must be at least 1');
    }
    if (policy.notifyBeforeDeletion && policy.notificationPeriod < 1) {
      throw new Error('Notification period must be at least 1 day when notifications are enabled');
    }
  }

  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  getPolicyForCategory(category: DataCategory): RetentionPolicy | null {
    return (
      Array.from(this.policies.values()).find(policy => policy.dataCategory === category) ?? null
    );
  }

  // ============================================================================
  // Retention Calculations
  // ============================================================================

  calculateRetentionExpiry(createdAt: Date, category: DataCategory): Date {
    const policy = this.getPolicyForCategory(category);
    const days = policy?.retentionPeriod ?? 730; // Default 2 years

    const expiry = new Date(createdAt);
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }

  isEligibleForDeletion(
    createdAt: Date,
    category: DataCategory,
    options?: {
      userConsent?: boolean;
      hasExceptions?: boolean;
      manualOverride?: boolean;
    }
  ): boolean {
    const policy = this.getPolicyForCategory(category);
    if (!policy || !policy.enabled) return false;

    // Manual override
    if (options?.manualOverride) return true;

    // Check exceptions
    if (options?.hasExceptions) return false;

    // Consent withdrawal
    if (policy.legalBasis === 'Consent' && options?.userConsent === false) {
      return true;
    }

    // Check retention period
    const expiryDate = this.calculateRetentionExpiry(createdAt, category);
    return new Date() > expiryDate;
  }

  // ============================================================================
  // Job Scheduling and Execution
  // ============================================================================

  async scheduleDataCleanup(options?: {
    categories?: DataCategory[];
    dryRun?: boolean;
    delay?: number; // hours
  }): Promise<DataCleanupJob[]> {
    const categories =
      options?.categories ??
      Array.from(this.policies.values())
        .filter(p => p.autoDelete && p.enabled)
        .map(p => p.dataCategory);

    const delay = (options?.delay ?? 24) * 60 * 60 * 1000;
    const scheduledFor = new Date(Date.now() + delay);
    const jobs: DataCleanupJob[] = [];

    for (const category of categories) {
      const policy = this.getPolicyForCategory(category);
      if (!policy) continue;

      const job: DataCleanupJob = {
        id: crypto.randomUUID(),
        policyId: policy.id,
        scheduledFor,
        status: 'pending',
        recordsAffected: 0,
        recordsProcessed: 0,
        dryRun: options?.dryRun ?? false,
        retryCount: 0,
        maxRetries: 3,
      };

      this.jobs.set(job.id, job);
      jobs.push(job);

      await this.dataAccess.logAudit({
        action: 'job_scheduled',
        category,
        recordCount: 0,
        success: true,
        metadata: { jobId: job.id, scheduledFor },
      });

      logger.info('Data cleanup job scheduled', {
        component: 'DataRetentionService',
        jobId: job.id,
        policyId: policy.id,
        category,
        scheduledFor,
        dryRun: job.dryRun,
      });
    }

    return jobs;
  }

  async executeDataCleanup(
    category: DataCategory,
    options?: {
      dryRun?: boolean;
      batchSize?: number;
      maxRecords?: number;
    }
  ): Promise<CleanupResult> {
    if (this.jobExecutionLock) {
      throw new Error('Another cleanup job is currently running');
    }

    this.jobExecutionLock = true;
    const startTime = Date.now();

    try {
      const policy = this.getPolicyForCategory(category);
      if (!policy) {
        throw new Error(`No retention policy found for category: ${category}`);
      }

      if (!policy.enabled) {
        throw new Error(`Policy for ${category} is disabled`);
      }

      logger.info('Starting data cleanup', {
        component: 'DataRetentionService',
        category,
        dryRun: options?.dryRun ?? false,
        policyId: policy.id,
      });

      const result: CleanupResult = {
        success: false,
        recordsFound: 0,
        recordsDeleted: 0,
        errors: [],
        warnings: [],
        backupCreated: false,
        executionTime: 0,
        batchesProcessed: 0,
      };

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - policy.retentionPeriod);

      // Process in batches
      const batchSize = options?.batchSize ?? policy.batchSize;
      const maxRecords = options?.maxRecords ?? Infinity;
      let totalProcessed = 0;

      while (totalProcessed < maxRecords) {
        const recordIds = await this.dataAccess.queryExpiredRecords(
          category,
          expiryDate,
          Math.min(batchSize, maxRecords - totalProcessed)
        );

        if (recordIds.length === 0) break;

        result.recordsFound += recordIds.length;

        if (!options?.dryRun) {
          // Create backup if required
          if (policy.backupBeforeDelete && !result.backupCreated) {
            try {
              result.backupId = await this.dataAccess.createBackup(
                category,
                recordIds,
                policy.encryptBackup
              );
              result.backupCreated = true;
            } catch (error) {
              result.warnings.push(`Backup creation failed: ${error}`);
            }
          }

          // Delete records in transaction
          try {
            await this.dataAccess.executeInTransaction(async () => {
              const deleted = await this.dataAccess.deleteRecords(category, recordIds);
              result.recordsDeleted += deleted;
            });
          } catch (error) {
            result.errors.push(`Batch deletion failed: ${error}`);
            break;
          }
        }

        result.batchesProcessed++;
        totalProcessed += recordIds.length;
      }

      result.success = result.errors.length === 0;
      result.executionTime = Date.now() - startTime;

      // Audit log
      await this.dataAccess.logAudit({
        action: options?.dryRun ? 'cleanup_dry_run' : 'cleanup_executed',
        category,
        recordCount: result.recordsDeleted,
        success: result.success,
        metadata: {
          recordsFound: result.recordsFound,
          batchesProcessed: result.batchesProcessed,
          executionTime: result.executionTime,
          backupId: result.backupId,
        },
      });

      logger.info('Data cleanup completed', {
        component: 'DataRetentionService',
        category,
        ...result,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Data cleanup failed', {
        component: 'DataRetentionService',
        category,
        error,
        executionTime,
      });

      return {
        success: false,
        recordsFound: 0,
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        backupCreated: false,
        executionTime,
        batchesProcessed: 0,
      };
    } finally {
      this.jobExecutionLock = false;
    }
  }

  async executeJob(jobId: string): Promise<CleanupResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'running') {
      throw new Error('Job is already running');
    }

    if (job.status === 'completed') {
      throw new Error('Job has already completed');
    }

    job.status = 'running';
    const policy = this.policies.get(job.policyId);

    if (!policy) {
      job.status = 'failed';
      job.error = 'Policy not found';
      throw new Error('Policy not found');
    }

    try {
      const result = await this.executeDataCleanup(policy.dataCategory, {
        dryRun: job.dryRun,
      });

      job.status = result.success ? 'completed' : 'failed';
      job.recordsAffected = result.recordsFound;
      job.recordsProcessed = result.recordsDeleted;
      job.completedAt = new Date();
      job.backupId = result.backupId;
      job.executionTime = result.executionTime;
      job.error = result.errors[0];

      return result;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'pending';
        job.scheduledFor = new Date(Date.now() + 60 * 60 * 1000); // Retry in 1 hour
      }

      throw error;
    }
  }

  // ============================================================================
  // User Data Management
  // ============================================================================

  async getUserDataSummary(userId: string): Promise<UserDataSummary> {
    const categories = {} as Record<DataCategory, CategoryData>;
    let totalSize = 0;
    let pendingDeletions = 0;

    for (const policy of this.policies.values()) {
      const data = await this.dataAccess.getUserCategoryData(userId, policy.dataCategory);
      categories[policy.dataCategory] = data;
      totalSize += data.sizeBytes;

      // Check if eligible for deletion
      if (new Date() > data.retentionExpiry && data.canDelete) {
        pendingDeletions += data.recordCount;
      }
    }

    const complianceResult = await this.validateRetentionCompliance(userId);
    const retentionStatus = this.determineRetentionStatus(categories);

    return {
      userId,
      categories,
      totalSize,
      retentionStatus,
      complianceScore: complianceResult.score,
      lastValidated: new Date(),
      pendingDeletions,
    };
  }

  private determineRetentionStatus(
    categories: Record<DataCategory, CategoryData>
  ): RetentionStatus {
    const now = new Date();
    let hasOverdue = false;
    let hasPending = false;

    for (const data of Object.values(categories)) {
      if (now > data.retentionExpiry && data.canDelete) {
        hasOverdue = true;
      }
      if (now > new Date(data.retentionExpiry.getTime() - 30 * 24 * 60 * 60 * 1000)) {
        hasPending = true;
      }
    }

    if (hasOverdue) return 'overdue';
    if (hasPending) return 'pending_deletion';
    return 'compliant';
  }

  async validateRetentionCompliance(userId: string): Promise<RetentionCompliance> {
    const summary = await this.getUserDataSummary(userId);
    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];
    const now = new Date();

    for (const [category, data] of Object.entries(summary.categories) as [
      DataCategory,
      CategoryData,
    ][]) {
      const policy = this.getPolicyForCategory(category);
      if (!policy) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - data.retentionExpiry.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysOverdue > 0) {
        const severity = daysOverdue > 90 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium';

        issues.push({
          severity,
          category,
          description: `${policy.name} data is ${daysOverdue} days overdue for deletion`,
          remediation: policy.autoDelete
            ? `Schedule automatic cleanup for ${category}`
            : `Manually review and delete ${category} data`,
          deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });

        if (policy.autoDelete) {
          recommendations.push(`Enable automatic cleanup for ${policy.name}`);
        }
      }

      // Large dataset warning
      if (data.sizeBytes > 50 * 1024 * 1024) {
        recommendations.push(
          `Consider archiving large ${policy.name} dataset (${this.formatFileSize(data.sizeBytes)})`
        );
      }
    }

    const score = this.calculateComplianceScore(issues);
    const nextAudit = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return {
      isCompliant: issues.length === 0,
      score,
      issues,
      recommendations,
      lastAudit: now,
      nextAudit,
    };
  }

  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    if (issues.length === 0) return 100;

    const severityWeights = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };

    const totalDeductions = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    return Math.max(0, 100 - totalDeductions);
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  generateRetentionReport(): {
    policies: RetentionPolicy[];
    summary: {
      totalPolicies: number;
      enabledPolicies: number;
      autoDeletePolicies: number;
      averageRetentionDays: number;
      complianceFrameworks: ComplianceFramework[];
      totalCategories: number;
    };
    jobs: {
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
    };
    lastUpdated: Date;
  } {
    const policies = this.getRetentionPolicies();
    const enabledPolicies = policies.filter(p => p.enabled);
    const autoDeletePolicies = enabledPolicies.filter(p => p.autoDelete);

    const averageRetentionDays =
      policies.reduce((sum, p) => sum + p.retentionPeriod, 0) / policies.length;

    const frameworks = new Set<ComplianceFramework>();
    policies.forEach(p => p.complianceFrameworks.forEach(f => frameworks.add(f)));

    const jobStats = Array.from(this.jobs.values()).reduce(
      (acc, job) => {
        acc[job.status]++;
        return acc;
      },
      { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 } as Record<JobStatus, number>
    );

    return {
      policies,
      summary: {
        totalPolicies: policies.length,
        enabledPolicies: enabledPolicies.length,
        autoDeletePolicies: autoDeletePolicies.length,
        averageRetentionDays: Math.round(averageRetentionDays),
        complianceFrameworks: Array.from(frameworks),
        totalCategories: new Set(policies.map(p => p.dataCategory)).size,
      },
      jobs: {
        total: this.jobs.size,
        ...jobStats,
      },
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// ============================================================================
// Singleton Instance and Utilities
// ============================================================================

export const dataRetentionService = new DataRetentionService();

export const retentionUtils = {
  formatRetentionPeriod(days: number): string {
    if (days < 30) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    const years = Math.round(days / 365);
    return `${years} year${years !== 1 ? 's' : ''}`;
  },

  daysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  getRetentionStatusColor(status: RetentionStatus): string {
    const colors: Record<RetentionStatus, string> = {
      compliant: 'text-green-600',
      overdue: 'text-red-600',
      pending_deletion: 'text-yellow-600',
      archived: 'text-blue-600',
    };
    return colors[status] ?? 'text-gray-600';
  },

  getSeverityColor(severity: ComplianceIssue['severity']): string {
    const colors = {
      low: 'text-blue-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[severity];
  },

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  estimateCleanupTime(recordCount: number, batchSize: number): string {
    const batches = Math.ceil(recordCount / batchSize);
    const estimatedMinutes = batches * 0.5; // Assume 30 seconds per batch

    if (estimatedMinutes < 1) return 'Less than 1 minute';
    if (estimatedMinutes < 60) return `~${Math.round(estimatedMinutes)} minutes`;
    return `~${Math.round(estimatedMinutes / 60)} hours`;
  },
};
