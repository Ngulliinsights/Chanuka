import * as cron from 'node-cron';
import { privacyService } from '@server/features/privacy/privacy-service.ts';
import { auditLogger } from '@server/infrastructure/monitoring/index.js';
import { logger   } from '@shared/core';

class PrivacySchedulerService {
  private cleanupJob: cron.ScheduledTask | null = null;
  private complianceReportJob: cron.ScheduledTask | null = null;
  private isInitialized = false;
  private initializationLock = false;
  private cleanupInProgress = false;
  private complianceInProgress = false;

  /**
   * Initialize the privacy scheduler service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.initializationLock) {
      logger.info('Privacy scheduler already initialized or initialization in progress', { component: 'Chanuka' });
      return;
    }

    this.initializationLock = true;
    
    try {
      // Schedule daily data cleanup at 2 AM
      this.cleanupJob = cron.schedule('0 2 * * *', async () => {
        if (this.cleanupInProgress) {
          logger.info('Data cleanup already in progress, skipping...', { component: 'Chanuka' });
          return;
        }
        logger.info('Running scheduled data cleanup...', { component: 'Chanuka' });
        await this.runScheduledCleanup();
      }, {
        timezone: 'UTC'
      });

      // Schedule weekly compliance monitoring on Sundays at 3 AM
      this.complianceReportJob = cron.schedule('0 3 * * 0', async () => {
        if (this.complianceInProgress) {
          logger.info('Compliance monitoring already in progress, skipping...', { component: 'Chanuka' });
          return;
        }
        logger.info('Running scheduled compliance monitoring...', { component: 'Chanuka' });
        await this.runComplianceMonitoring();
      }, {
        timezone: 'UTC'
      });

      this.isInitialized = true;
      logger.info('✅ Privacy scheduler service initialized', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Failed to initialize privacy scheduler service:', { component: 'Chanuka' }, { errorMessage: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      this.initializationLock = false;
    }
  }

  /**
   * Start the scheduled jobs
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('Privacy scheduler not initialized');
    }

    if (this.cleanupJob) {
      this.cleanupJob.start();
      logger.info('✅ Data cleanup job started (daily at 2 AM UTC)', { component: 'Chanuka' });
    }

    if (this.complianceReportJob) {
      this.complianceReportJob.start();
      logger.info('✅ Compliance monitoring job started (weekly on Sundays at 3 AM UTC)', { component: 'Chanuka' });
    }
  }

  /**
   * Stop the scheduled jobs
   */
  stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      logger.info('🛑 Data cleanup job stopped', { component: 'Chanuka' });
    }

    if (this.complianceReportJob) {
      this.complianceReportJob.stop();
      logger.info('🛑 Compliance monitoring job stopped', { component: 'Chanuka' });
    }
  }

  /**
   * Run manual data cleanup
   */
  async runManualCleanup(): Promise<{
    success: boolean;
    cleanupResults: Array<{
      dataType: string;
      recordsDeleted: number;
      error?: string;
    }>;
  }> {
    logger.info('Running manual data cleanup...', { component: 'Chanuka' });
    return await this.runScheduledCleanup();
  }

  /**
   * Run scheduled data cleanup
   */
  private async runScheduledCleanup(): Promise<{
    success: boolean;
    cleanupResults: Array<{
      dataType: string;
      recordsDeleted: number;
      error?: string;
    }>;
  }> {
    if (this.cleanupInProgress) {
      logger.info('Data cleanup already in progress', { component: 'Chanuka' });
      return { success: false, cleanupResults: [] };
    }
    
    this.cleanupInProgress = true;
    const startTime = Date.now();
    
    try { const result = await privacyService.runDataCleanup();
      
      const totalRecordsDeleted = result.cleanupResults.reduce(
        (total, cleanup) => total + cleanup.recordsDeleted, 
        0
      );

      // Log the scheduled cleanup
      await auditLogger.log({
        user_id: 'system',
        action: 'data.cleanup.scheduled',
        resource: 'system',
        details: {
          success: result.success,
          totalRecordsDeleted,
          cleanupResults: result.cleanupResults,
          duration: Date.now() - startTime,
          timestamp: new Date()
         },
        ip_address: 'system',
        user_agent: 'privacy-scheduler',
        severity: 'low'
      });

      if (result.success) {
        console.log(`✅ Scheduled data cleanup completed. Deleted ${totalRecordsDeleted} records.`);
      } else {
        logger.error('❌ Scheduled data cleanup completed with errors', { component: 'Chanuka' });
      }

      return result;
    } catch (error) {
      logger.error('❌ Error during scheduled data cleanup:', { component: 'Chanuka' }, { errorMessage: error instanceof Error ? error.message : String(error) });
      
      // Log the error
      await auditLogger.log({ user_id: 'system',
        action: 'data.cleanup.failed',
        resource: 'system',
        details: {
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
          timestamp: new Date()
         },
        ip_address: 'system',
        user_agent: 'privacy-scheduler',
        severity: 'medium'
      });

      return {
        success: false,
        cleanupResults: []
      };
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Run compliance monitoring
   */
  private async runComplianceMonitoring(): Promise<void> {
    if (this.complianceInProgress) {
      logger.info('Compliance monitoring already in progress', { component: 'Chanuka' });
      return;
    }
    
    this.complianceInProgress = true;
    const startTime = Date.now();
    
    try {
      // Get retention policies status
      const retentionPolicies = privacyService.getDataRetentionPolicies();
      
      // Check for policies that haven't run cleanup recently
      const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
      const stalePolicies = retentionPolicies.filter(policy => {
        if (!policy.lastCleanup) return true;
        return Date.now() - policy.lastCleanup.getTime() > staleThreshold;
      });

      // Generate compliance metrics
      const complianceMetrics = {
        totalPolicies: retentionPolicies.length,
        activePolicies: retentionPolicies.filter(p => p.is_active).length,
        stalePolicies: stalePolicies.length,
        lastCleanupRuns: retentionPolicies.map(p => ({
          dataType: p.dataType,
          lastCleanup: p.lastCleanup,
          recordsAffected: p.recordsAffected
        }))
      };

      // Log compliance monitoring results
      await auditLogger.log({ user_id: 'system',
        action: 'compliance.monitoring.completed',
        resource: 'system',
        details: {
          complianceMetrics,
          stalePoliciesCount: stalePolicies.length,
          duration: Date.now() - startTime,
          timestamp: new Date()
         },
        ip_address: 'system',
        user_agent: 'privacy-scheduler',
        severity: 'low'
      });

      if (stalePolicies.length > 0) {
        console.warn(`⚠️  Found ${stalePolicies.length} stale retention policies that need attention`);
        stalePolicies.forEach(policy => {
          console.warn(`   - ${policy.dataType}: Last cleanup ${policy.lastCleanup || 'never'}`);
        });
      } else {
        logger.info('✅ All retention policies are up to date', { component: 'Chanuka' });
      }

    } catch (error) {
      logger.error('❌ Error during compliance monitoring:', { component: 'Chanuka' }, { errorMessage: error instanceof Error ? error.message : String(error) });
      
      // Log the error
      await auditLogger.log({ user_id: 'system',
        action: 'compliance.monitoring.failed',
        resource: 'system',
        details: {
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
          timestamp: new Date()
         },
        ip_address: 'system',
        user_agent: 'privacy-scheduler',
        severity: 'medium'
      });
    } finally {
      this.complianceInProgress = false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    initialized: boolean;
    cleanupJobRunning: boolean;
    complianceJobRunning: boolean;
    nextCleanupRun: string | null;
    nextComplianceRun: string | null;
  } {
    return {
      initialized: this.isInitialized,
      cleanupJobRunning: this.cleanupJob ? this.cleanupJob.getStatus() === 'scheduled' : false,
      complianceJobRunning: this.complianceReportJob ? this.complianceReportJob.getStatus() === 'scheduled' : false,
      nextCleanupRun: this.cleanupJob ? 'Daily at 2:00 AM UTC' : null,
      nextComplianceRun: this.complianceReportJob ? 'Weekly on Sundays at 3:00 AM UTC' : null
    };
  }

  /**
   * Destroy the scheduler and clean up resources
   */
  destroy(): void {
    this.stop();
    
    if (this.cleanupJob) {
      this.cleanupJob.destroy();
      this.cleanupJob = null;
    }

    if (this.complianceReportJob) {
      this.complianceReportJob.destroy();
      this.complianceReportJob = null;
    }

    this.isInitialized = false;
    logger.info('🧹 Privacy scheduler service destroyed', { component: 'Chanuka' });
  }
}

export const privacySchedulerService = new PrivacySchedulerService();















































