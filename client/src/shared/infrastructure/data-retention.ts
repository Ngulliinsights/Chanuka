/**
 * Data Retention Service - Shared Infrastructure
 * 
 * Migrated from client/src/services/dataRetentionService.ts
 * Handles data lifecycle management, cleanup policies, and compliance
 * with data protection regulations for the civic engagement platform.
 */

import { logger } from '@client/utils/logger';

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // days
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  complianceReason: string;
  createdAt: string;
  updatedAt: string;
}

interface DataRecord {
  id: string;
  type: string;
  userId?: string;
  createdAt: string;
  lastAccessed?: string;
  metadata: Record<string, any>;
  retentionPolicyId: string;
  scheduledDeletion?: string;
  archived: boolean;
}

interface RetentionReport {
  totalRecords: number;
  recordsByType: Record<string, number>;
  recordsByPolicy: Record<string, number>;
  scheduledDeletions: number;
  archivedRecords: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
  nextCleanupDate: string;
  recommendations: string[];
}

class DataRetentionService {
  private policies = new Map<string, RetentionPolicy>();
  private records = new Map<string, DataRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the data retention service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Data retention service already initialized', {
        component: 'DataRetentionService'
      });
      return;
    }

    try {
      // Load default policies
      await this.loadDefaultPolicies();
      
      // Load existing records
      await this.loadExistingRecords();
      
      // Schedule cleanup tasks
      this.scheduleCleanupTasks();
      
      this.isInitialized = true;
      
      logger.info('Data retention service initialized', {
        component: 'DataRetentionService',
        policiesCount: this.policies.size,
        recordsCount: this.records.size
      });
    } catch (error) {
      logger.error('Failed to initialize data retention service', {
        component: 'DataRetentionService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register a new data record for retention tracking
   */
  registerDataRecord(record: Omit<DataRecord, 'id' | 'createdAt' | 'archived'>): string {
    const recordId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const fullRecord: DataRecord = {
      id: recordId,
      createdAt: now,
      archived: false,
      ...record
    };

    // Apply retention policy
    const policy = this.policies.get(record.retentionPolicyId);
    if (policy) {
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + policy.retentionPeriod);
      fullRecord.scheduledDeletion = deletionDate.toISOString();
    }

    this.records.set(recordId, fullRecord);
    
    logger.debug('Data record registered', {
      component: 'DataRetentionService',
      recordId,
      type: record.type,
      policyId: record.retentionPolicyId,
      scheduledDeletion: fullRecord.scheduledDeletion
    });

    return recordId;
  }

  /**
   * Update last accessed time for a record
   */
  updateLastAccessed(recordId: string): void {
    const record = this.records.get(recordId);
    if (record) {
      record.lastAccessed = new Date().toISOString();
      this.records.set(recordId, record);
    }
  }

  /**
   * Create a new retention policy
   */
  createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): string {
    const policyId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const fullPolicy: RetentionPolicy = {
      id: policyId,
      createdAt: now,
      updatedAt: now,
      ...policy
    };

    this.policies.set(policyId, fullPolicy);
    
    logger.info('Retention policy created', {
      component: 'DataRetentionService',
      policyId,
      name: policy.name,
      retentionPeriod: policy.retentionPeriod,
      dataTypes: policy.dataTypes
    });

    return policyId;
  }

  /**
   * Update an existing retention policy
   */
  updateRetentionPolicy(policyId: string, updates: Partial<RetentionPolicy>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      logger.warn('Retention policy not found', {
        component: 'DataRetentionService',
        policyId
      });
      return false;
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.policies.set(policyId, updatedPolicy);
    
    // Update affected records
    this.updateRecordsForPolicy(policyId, updatedPolicy);
    
    logger.info('Retention policy updated', {
      component: 'DataRetentionService',
      policyId,
      updates: Object.keys(updates)
    });

    return true;
  }

  /**
   * Delete records that have reached their retention period
   */
  async performCleanup(): Promise<{
    deletedRecords: number;
    archivedRecords: number;
    errors: string[];
  }> {
    const result = {
      deletedRecords: 0,
      archivedRecords: 0,
      errors: []
    };

    const now = new Date();
    const recordsToProcess = Array.from(this.records.values()).filter(
      record => record.scheduledDeletion && new Date(record.scheduledDeletion) <= now
    );

    logger.info('Starting data retention cleanup', {
      component: 'DataRetentionService',
      recordsToProcess: recordsToProcess.length
    });

    for (const record of recordsToProcess) {
      try {
        const policy = this.policies.get(record.retentionPolicyId);
        if (!policy) {
          result.errors.push(`Policy not found for record ${record.id}`);
          continue;
        }

        if (policy.archiveBeforeDelete && !record.archived) {
          // Archive the record first
          await this.archiveRecord(record);
          result.archivedRecords++;
        }

        if (policy.autoDelete) {
          // Delete the record
          await this.deleteRecord(record.id);
          result.deletedRecords++;
        }
      } catch (error) {
        const errorMsg = `Failed to process record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        logger.error('Cleanup error', {
          component: 'DataRetentionService',
          recordId: record.id,
          error: errorMsg
        });
      }
    }

    logger.info('Data retention cleanup completed', {
      component: 'DataRetentionService',
      ...result
    });

    return result;
  }

  /**
   * Generate a compliance report
   */
  generateComplianceReport(): RetentionReport {
    const records = Array.from(this.records.values());
    const now = new Date();
    
    const recordsByType: Record<string, number> = {};
    const recordsByPolicy: Record<string, number> = {};
    let scheduledDeletions = 0;
    let archivedRecords = 0;
    let violationCount = 0;

    records.forEach(record => {
      // Count by type
      recordsByType[record.type] = (recordsByType[record.type] || 0) + 1;
      
      // Count by policy
      recordsByPolicy[record.retentionPolicyId] = (recordsByPolicy[record.retentionPolicyId] || 0) + 1;
      
      // Count scheduled deletions
      if (record.scheduledDeletion && new Date(record.scheduledDeletion) <= now) {
        scheduledDeletions++;
      }
      
      // Count archived records
      if (record.archived) {
        archivedRecords++;
      }
      
      // Check for violations (records past retention without deletion)
      const policy = this.policies.get(record.retentionPolicyId);
      if (policy && record.scheduledDeletion) {
        const deletionDate = new Date(record.scheduledDeletion);
        const gracePeriod = new Date(deletionDate);
        gracePeriod.setDate(gracePeriod.getDate() + 7); // 7-day grace period
        
        if (now > gracePeriod && !record.archived) {
          violationCount++;
        }
      }
    });

    // Determine compliance status
    let complianceStatus: RetentionReport['complianceStatus'] = 'compliant';
    if (violationCount > 0) {
      complianceStatus = 'violation';
    } else if (scheduledDeletions > 10) {
      complianceStatus = 'warning';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (scheduledDeletions > 0) {
      recommendations.push(`${scheduledDeletions} records are due for cleanup`);
    }
    if (violationCount > 0) {
      recommendations.push(`${violationCount} records are overdue for deletion`);
    }
    if (archivedRecords / records.length > 0.8) {
      recommendations.push('Consider reviewing archive policies - high archive ratio detected');
    }

    // Calculate next cleanup date
    const nextCleanup = new Date();
    nextCleanup.setDate(nextCleanup.getDate() + 1); // Daily cleanup

    return {
      totalRecords: records.length,
      recordsByType,
      recordsByPolicy,
      scheduledDeletions,
      archivedRecords,
      complianceStatus,
      nextCleanupDate: nextCleanup.toISOString(),
      recommendations
    };
  }

  /**
   * Get all retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get records by type
   */
  getRecordsByType(type: string): DataRecord[] {
    return Array.from(this.records.values()).filter(record => record.type === type);
  }

  /**
   * Delete user data (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<{
    deletedRecords: number;
    errors: string[];
  }> {
    const result = {
      deletedRecords: 0,
      errors: []
    };

    const userRecords = Array.from(this.records.values()).filter(
      record => record.userId === userId
    );

    logger.info('Deleting user data', {
      component: 'DataRetentionService',
      userId,
      recordCount: userRecords.length
    });

    for (const record of userRecords) {
      try {
        await this.deleteRecord(record.id);
        result.deletedRecords++;
      } catch (error) {
        const errorMsg = `Failed to delete record ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
      }
    }

    return result;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async loadDefaultPolicies(): Promise<void> {
    const defaultPolicies = [
      {
        name: 'User Comments',
        description: 'Comments posted by users on bills and discussions',
        dataTypes: ['comment', 'reply'],
        retentionPeriod: 2555, // 7 years
        autoDelete: false,
        archiveBeforeDelete: true,
        complianceReason: 'Legal requirement for public records'
      },
      {
        name: 'User Analytics',
        description: 'User behavior and analytics data',
        dataTypes: ['analytics_event', 'user_journey'],
        retentionPeriod: 730, // 2 years
        autoDelete: true,
        archiveBeforeDelete: false,
        complianceReason: 'GDPR compliance for analytics data'
      },
      {
        name: 'Session Data',
        description: 'User session and temporary data',
        dataTypes: ['session', 'temp_data'],
        retentionPeriod: 30, // 30 days
        autoDelete: true,
        archiveBeforeDelete: false,
        complianceReason: 'Security and performance optimization'
      },
      {
        name: 'Audit Logs',
        description: 'System audit and security logs',
        dataTypes: ['audit_log', 'security_event'],
        retentionPeriod: 1095, // 3 years
        autoDelete: false,
        archiveBeforeDelete: true,
        complianceReason: 'Regulatory compliance and security monitoring'
      }
    ];

    for (const policyData of defaultPolicies) {
      this.createRetentionPolicy(policyData);
    }
  }

  private async loadExistingRecords(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, we'll simulate loading from localStorage
    try {
      const storedRecords = localStorage.getItem('dataRetentionRecords');
      if (storedRecords) {
        const records: DataRecord[] = JSON.parse(storedRecords);
        records.forEach(record => {
          this.records.set(record.id, record);
        });
      }
    } catch (error) {
      logger.debug('No existing records found or failed to load', {
        component: 'DataRetentionService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private scheduleCleanupTasks(): void {
    // Schedule daily cleanup at 2 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const timeUntilCleanup = tomorrow.getTime() - now.getTime();
    
    this.cleanupTimer = setTimeout(() => {
      this.performCleanup();
      
      // Schedule recurring cleanup every 24 hours
      this.cleanupTimer = setInterval(() => {
        this.performCleanup();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilCleanup);

    logger.info('Cleanup tasks scheduled', {
      component: 'DataRetentionService',
      nextCleanup: tomorrow.toISOString()
    });
  }

  private updateRecordsForPolicy(policyId: string, policy: RetentionPolicy): void {
    const affectedRecords = Array.from(this.records.values()).filter(
      record => record.retentionPolicyId === policyId
    );

    affectedRecords.forEach(record => {
      const deletionDate = new Date(record.createdAt);
      deletionDate.setDate(deletionDate.getDate() + policy.retentionPeriod);
      record.scheduledDeletion = deletionDate.toISOString();
      this.records.set(record.id, record);
    });
  }

  private async archiveRecord(record: DataRecord): Promise<void> {
    // In a real implementation, this would move data to archive storage
    record.archived = true;
    record.metadata.archivedAt = new Date().toISOString();
    this.records.set(record.id, record);
    
    logger.debug('Record archived', {
      component: 'DataRetentionService',
      recordId: record.id,
      type: record.type
    });
  }

  private async deleteRecord(recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    // In a real implementation, this would delete from database
    this.records.delete(recordId);
    
    logger.debug('Record deleted', {
      component: 'DataRetentionService',
      recordId,
      type: record.type
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Save records to localStorage before cleanup
    try {
      const records = Array.from(this.records.values());
      localStorage.setItem('dataRetentionRecords', JSON.stringify(records));
    } catch (error) {
      logger.error('Failed to save records during cleanup', {
        component: 'DataRetentionService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.records.clear();
    this.policies.clear();
    this.isInitialized = false;

    logger.info('Data retention service cleaned up', {
      component: 'DataRetentionService'
    });
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();

// Export utility functions
export const retentionUtils = {
  calculateRetentionDate(createdAt: string, retentionDays: number): string {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + retentionDays);
    return date.toISOString();
  },

  isOverdue(scheduledDeletion: string, graceDays: number = 7): boolean {
    const deletionDate = new Date(scheduledDeletion);
    const graceDate = new Date(deletionDate);
    graceDate.setDate(graceDate.getDate() + graceDays);
    return new Date() > graceDate;
  },

  formatRetentionPeriod(days: number): string {
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} months`;
    } else {
      const years = Math.round(days / 365);
      return `${years} years`;
    }
  }
};

export default dataRetentionService;