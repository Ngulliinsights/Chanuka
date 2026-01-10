/**
 * Safeguard Background Jobs - Automated protection maintenance
 * Handles reputation decay, SLA monitoring, anomaly cleanup, and compliance audits
 *
 * @module safeguard-jobs
 * @version 2.1.0
 *
 * ENHANCEMENTS:
 * - Job overlap prevention using in-memory locks
 * - Improved error handling and retry logic
 * - Atomic batch processing with transactions
 * - Better monitoring and health checks
 * - Configurable batch sizes and timeouts
 */

import { Cron } from 'croner';
import {
  reputationScores,
  reputationHistory,
  rateLimits,
  moderationQueue,
  suspiciousActivityLogs,
  behavioralAnomalies,
  cibDetections,
  deviceFingerprints,
  identityVerification,
  reputationSourceEnum,
  type ReputationScore,
} from '@/shared/schema/safeguards';
import { database, writeDatabase, readDatabase, withTransaction, type DatabaseTransaction } from '@/server/db';
import { logger } from '@/server/utils/logger';
import { eq, lt, gt, and, sql, inArray, lte, gte } from 'drizzle-orm';
import { moderationService } from '../application/moderation-service';
import { rateLimitService } from '../application/rate-limit-service';
import { cibDetectionService } from '../application/cib-detection-service';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const TIMEFRAME = {
  ONE_DAY: 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

const DECAY_CONFIG = {
  REPUTATION_DECAY_RATE: 0.1, // 10% monthly decay
  INACTIVITY_THRESHOLD: TIMEFRAME.THIRTY_DAYS,
  MIN_REPUTATION_SCORE: 0,
  MAX_REPUTATION_SCORE: 100,
} as const;

const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

const ANOMALY_CONFIG = {
  MIN_ACTIVITIES_FOR_DETECTION: 3,
  CONCENTRATION_THRESHOLD: 0.5, // 50%
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
  LOW_CONFIDENCE_THRESHOLD: 0.3,
  MIN_SEVERITY_TO_KEEP: 4,
} as const;

const CLEANUP_CONFIG = {
  RATE_LIMIT_RETENTION_DAYS: 90,
  SUSPICIOUS_ACTIVITY_RETENTION_DAYS: 90,
  RESOLVED_PATTERN_RETENTION_DAYS: 30,
  RESOLVED_ANOMALY_RETENTION_DAYS: 30,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface JobConfig {
  name: string;
  schedule: string;
  enabled: boolean;
  timeout: number;
  description: string;
  batchSize?: number;
}

interface JobResult {
  success: boolean;
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  itemsProcessed: number;
  itemsFailed: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface BatchProcessOptions {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  retryBackoffMultiplier?: number;
}

type JobHandler = () => Promise<JobResult>;

// ============================================================================
// JOB CONFIGURATIONS
// ============================================================================

const jobConfigs: Record<string, JobConfig> = {
  reputationDecay: {
    name: 'Reputation Decay Job',
    schedule: '0 0 * * *', // Daily at midnight
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: 'Apply reputation decay to inactive users (10% per month)',
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  moderationSLA: {
    name: 'Moderation SLA Monitoring',
    schedule: '0 */6 * * *', // Every 6 hours
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: 'Check for SLA violations in moderation queue',
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  rateLimitCleanup: {
    name: 'Rate Limit Cleanup',
    schedule: '0 2 * * *', // Daily at 2 AM
    enabled: true,
    timeout: 5 * 60 * 1000,
    description: 'Remove expired rate limit records',
    batchSize: BATCH_CONFIG.MAX_BATCH_SIZE,
  },
  anomalyAnalysis: {
    name: 'Behavioral Anomaly Analysis',
    schedule: '0 */12 * * *', // Twice daily
    enabled: true,
    timeout: 15 * 60 * 1000,
    description: 'Detect behavioral anomalies from activity logs',
  },
  suspiciousActivityCleanup: {
    name: 'Suspicious Activity Log Cleanup',
    schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: `Archive and clean old suspicious activity logs (${CLEANUP_CONFIG.SUSPICIOUS_ACTIVITY_RETENTION_DAYS}+ days)`,
  },
  deviceFingerprintAudit: {
    name: 'Device Fingerprint Audit',
    schedule: '0 4 * * 1', // Weekly on Monday at 4 AM
    enabled: true,
    timeout: 15 * 60 * 1000,
    description: 'Audit device fingerprints for anomalies and update trust scores',
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  cibDetectionValidation: {
    name: 'CIB Detection Validation',
    schedule: '0 */8 * * *', // Every 8 hours
    enabled: true,
    timeout: 20 * 60 * 1000,
    description: 'Validate CIB detections and update investigation status',
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  complianceAudit: {
    name: 'Safeguards Compliance Audit',
    schedule: '0 5 * * 0', // Weekly on Sunday at 5 AM
    enabled: true,
    timeout: 30 * 60 * 1000,
    description: 'Generate compliance reports for safeguards effectiveness',
  },
  identityVerificationExpiry: {
    name: 'Identity Verification Expiry Check',
    schedule: '0 1 * * *', // Daily at 1 AM
    enabled: true,
    timeout: 5 * 60 * 1000,
    description: 'Check for expired IPRS verifications and notify users',
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep utility for retry delays with exponential backoff
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Process items in batches with retry logic and exponential backoff
 */
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options: BatchProcessOptions = {
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
    maxRetries: BATCH_CONFIG.RETRY_ATTEMPTS,
    retryDelay: BATCH_CONFIG.RETRY_DELAY,
    retryBackoffMultiplier: BATCH_CONFIG.RETRY_BACKOFF_MULTIPLIER,
  }
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += options.batchSize) {
    const batch = items.slice(i, i + options.batchSize);

    await Promise.all(
      batch.map(async (item) => {
        let attempts = 0;
        let lastError: Error | undefined;

        while (attempts < options.maxRetries) {
          try {
            await processor(item);
            processed++;
            return;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            attempts++;

            if (attempts < options.maxRetries) {
              const backoffDelay = options.retryDelay * Math.pow(
                options.retryBackoffMultiplier || BATCH_CONFIG.RETRY_BACKOFF_MULTIPLIER,
                attempts - 1
              );
              await sleep(backoffDelay);
            }
          }
        }

        failed++;
        logger.error('Batch item processing failed after retries', {
          item,
          error: lastError,
          attempts,
        });
      })
    );
  }

  return { processed, failed };
}

/**
 * Create standardized job result
 */
function createJobResult(
  jobName: string,
  startTime: Date,
  processed: number,
  failed: number,
  success = true,
  error?: string,
  metadata?: Record<string, unknown>
): JobResult {
  return {
    success,
    jobName,
    startTime,
    endTime: new Date(),
    duration: Date.now() - startTime.getTime(),
    itemsProcessed: processed,
    itemsFailed: failed,
    error,
    metadata,
  };
}

/**
 * Execute job with timeout and error handling
 */
async function executeJobWithTimeout(
  handler: JobHandler,
  timeout: number
): Promise<JobResult> {
  return Promise.race([
    handler(),
    new Promise<JobResult>((_, reject) =>
      setTimeout(() => reject(new Error('Job execution timeout')), timeout)
    ),
  ]);
}

// ============================================================================
// CORE JOB IMPLEMENTATIONS
// ============================================================================

/**
 * REPUTATION DECAY JOB
 * Applies configurable monthly decay to reputation scores for inactive users
 * Uses batch processing and transactions for data integrity
 */
async function runReputationDecayJob(): Promise<JobResult> {
  const startTime = new Date();
  const batchSize = jobConfigs.reputationDecay.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting reputation decay job');

    // Find inactive users (no activity in last 30 days)
    const inactiveThreshold = new Date(Date.now() - DECAY_CONFIG.INACTIVITY_THRESHOLD);

    const inactiveUsers = await readDatabase
      .select()
      .from(reputationScores)
      .where(
        and(
          lt(reputationScores.last_activity, inactiveThreshold),
          gt(reputationScores.total_score, DECAY_CONFIG.MIN_REPUTATION_SCORE)
        )
      );

    logger.info('Found inactive users for reputation decay', {
      count: inactiveUsers.length,
    });

    // Process in batches with atomic transactions
    const result = await processBatch(
      inactiveUsers,
      async (user: ReputationScore) => {
        await withTransaction(async (tx: DatabaseTransaction) => {
          // Calculate new score (10% decay)
          const decayAmount = parseFloat(user.total_score) * DECAY_CONFIG.REPUTATION_DECAY_RATE;
          const newScore = Math.max(
            DECAY_CONFIG.MIN_REPUTATION_SCORE,
            parseFloat(user.total_score) - decayAmount
          );

          // Update reputation score
          await tx
            .update(reputationScores)
            .set({
              total_score: newScore.toString(),
              updated_at: new Date(),
            })
            .where(eq(reputationScores.user_id, user.user_id));

          // Record in history
          await tx.insert(reputationHistory).values({
            user_id: user.user_id,
            source: 'inactivity_decay',
            amount: -decayAmount.toString(),
            reason: 'Monthly inactivity decay applied',
            metadata: {
              original_score: user.total_score,
              new_score: newScore.toString(),
              decay_rate: DECAY_CONFIG.REPUTATION_DECAY_RATE,
            },
          });
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed = result.failed;

    logger.info('Reputation decay job completed', { processed, failed });

    return createJobResult('Reputation Decay Job', startTime, processed, failed);
  } catch (error) {
    logger.error('Reputation decay job failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Reputation Decay Job',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * MODERATION SLA MONITORING JOB
 * Checks for SLA violations in moderation queue
 */
async function runModerationSLAJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting moderation SLA monitoring job');

    // Use the service method to mark violations
    processed = await moderationService.markSlaViolations();

    logger.info('Moderation SLA monitoring completed', { violationsMarked: processed });

    return createJobResult('Moderation SLA Monitoring', startTime, processed, failed);
  } catch (error) {
    logger.error('Moderation SLA monitoring failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Moderation SLA Monitoring',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * RATE LIMIT CLEANUP JOB
 * Removes expired rate limit records in batches
 */
async function runRateLimitCleanupJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting rate limit cleanup job');

    const batchSize = jobConfigs.rateLimitCleanup.batchSize || BATCH_CONFIG.MAX_BATCH_SIZE;
    processed = await rateLimitService.cleanupExpiredRecords(batchSize);

    logger.info('Rate limit cleanup completed', { recordsDeleted: processed });

    return createJobResult('Rate Limit Cleanup', startTime, processed, failed);
  } catch (error) {
    logger.error('Rate limit cleanup failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Rate Limit Cleanup',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * ANOMALY ANALYSIS JOB
 * Detect behavioral anomalies from activity logs
 */
async function runAnomalyAnalysisJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting anomaly analysis job');

    // This would typically involve complex analysis
    // For now, we'll just log that the job ran
    // In a real implementation, this would analyze activity patterns

    logger.info('Anomaly analysis completed', { processed, failed });

    return createJobResult('Behavioral Anomaly Analysis', startTime, processed, failed);
  } catch (error) {
    logger.error('Anomaly analysis failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Behavioral Anomaly Analysis',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * SUSPICIOUS ACTIVITY CLEANUP JOB
 * Archive and clean old suspicious activity logs
 */
async function runSuspiciousActivityCleanupJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting suspicious activity cleanup job');

    // Clean up resolved patterns
    const patternsDeleted = await cibDetectionService.cleanupResolvedPatterns(
      CLEANUP_CONFIG.RESOLVED_PATTERN_RETENTION_DAYS
    );

    // Clean up resolved anomalies
    const anomaliesDeleted = await cibDetectionService.cleanupResolvedAnomalies(
      CLEANUP_CONFIG.RESOLVED_ANOMALY_RETENTION_DAYS
    );

    processed = patternsDeleted + anomaliesDeleted;

    logger.info('Suspicious activity cleanup completed', {
      patternsDeleted,
      anomaliesDeleted,
      totalDeleted: processed,
    });

    return createJobResult('Suspicious Activity Log Cleanup', startTime, processed, failed, true, undefined, {
      patternsDeleted,
      anomaliesDeleted,
    });
  } catch (error) {
    logger.error('Suspicious activity cleanup failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Suspicious Activity Log Cleanup',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * DEVICE FINGERPRINT AUDIT JOB
 * Audit device fingerprints for anomalies and update trust scores
 */
async function runDeviceFingerprintAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting device fingerprint audit job');

    // Get all device fingerprints that need audit
    const devices = await readDatabase
      .select()
      .from(deviceFingerprints)
      .where(
        or(
          sql`${deviceFingerprints.last_audit} IS NULL`,
          lte(deviceFingerprints.last_audit, new Date(Date.now() - TIMEFRAME.SEVEN_DAYS))
        )
      )
      .limit(1000);

    const batchSize = jobConfigs.deviceFingerprintAudit.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const result = await processBatch(
      devices,
      async (device) => {
        await withTransaction(async (tx: DatabaseTransaction) => {
          // Simple trust score calculation (can be enhanced)
          const trustScore = device.is_suspicious ? 0.3 : 0.7;

          await tx
            .update(deviceFingerprints)
            .set({
              trust_score: trustScore.toString(),
              last_audit: new Date(),
              updated_at: new Date(),
            })
            .where(eq(deviceFingerprints.id, device.id));
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed = result.failed;

    logger.info('Device fingerprint audit completed', { processed, failed });

    return createJobResult('Device Fingerprint Audit', startTime, processed, failed);
  } catch (error) {
    logger.error('Device fingerprint audit failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Device Fingerprint Audit',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * CIB DETECTION VALIDATION JOB
 * Validate CIB detections and update investigation status
 */
async function runCIBDetectionValidationJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting CIB detection validation job');

    // This would involve complex validation logic
    // For now, we'll just log that the job ran

    logger.info('CIB detection validation completed', { processed, failed });

    return createJobResult('CIB Detection Validation', startTime, processed, failed);
  } catch (error) {
    logger.error('CIB detection validation failed', { error: getErrorMessage(error) });
    return createJobResult(
      'CIB Detection Validation',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * COMPLIANCE AUDIT JOB
 * Generate compliance reports for safeguards effectiveness
 */
async function runComplianceAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting compliance audit job');

    // Generate compliance metrics
    const metrics = {
      moderationSLA: {
        total: 0,
        violated: 0,
        violationRate: 0,
      },
      rateLimiting: {
        totalBlocks: 0,
        falsePositives: 0,
      },
      cibDetection: {
        patternsDetected: 0,
        patternsResolved: 0,
      },
    };

    // This would gather actual metrics
    // For now, we'll just log that the job ran

    processed = 1;

    logger.info('Compliance audit completed', { metrics, processed });

    return createJobResult('Safeguards Compliance Audit', startTime, processed, failed, true, undefined, {
      metrics,
    });
  } catch (error) {
    logger.error('Compliance audit failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Safeguards Compliance Audit',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

/**
 * IDENTITY VERIFICATION EXPIRY JOB
 * Check for expired IPRS verifications and notify users
 */
async function runIdentityVerificationExpiryJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting identity verification expiry check job');

    // Find expired verifications
    const expiredVerifications = await readDatabase
      .select()
      .from(identityVerification)
      .where(
        and(
          lte(identityVerification.expires_at, new Date()),
          eq(identityVerification.iprs_status, 'verified')
        )
      )
      .limit(1000);

    const batchSize = jobConfigs.identityVerificationExpiry.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const result = await processBatch(
      expiredVerifications,
      async (verification) => {
        await withTransaction(async (tx: DatabaseTransaction) => {
          await tx
            .update(identityVerification)
            .set({
              iprs_status: 'expired',
              updated_at: new Date(),
            })
            .where(eq(identityVerification.id, verification.id));

          // In a real implementation, this would also trigger a notification
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed = result.failed;

    logger.info('Identity verification expiry check job completed', {
      processed,
      failed,
    });

    return createJobResult(
      'Identity Verification Expiry Check',
      startTime,
      processed,
      failed
    );
  } catch (error) {
    logger.error('Identity verification expiry check job failed', { error: getErrorMessage(error) });
    return createJobResult(
      'Identity Verification Expiry Check',
      startTime,
      processed,
      failed,
      false,
      getErrorMessage(error)
    );
  }
}

// ============================================================================
// JOB SCHEDULER & LIFECYCLE MANAGEMENT
// ============================================================================

// Job execution locks to prevent overlapping executions
const jobLocks = new Map<string, boolean>();
const jobExecutionHistory: JobResult[] = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Acquire job execution lock to prevent overlapping executions
 */
function acquireJobLock(jobName: string): boolean {
  if (jobLocks.get(jobName)) {
    return false; // Job is already running
  }
  jobLocks.set(jobName, true);
  return true;
}

/**
 * Release job execution lock
 */
function releaseJobLock(jobName: string): void {
  jobLocks.delete(jobName);
}

/**
 * Execute job with overlap prevention
 */
async function executeJobWithOverlapPrevention(
  jobName: string,
  handler: JobHandler,
  timeout: number
): Promise<JobResult> {
  // Try to acquire lock
  if (!acquireJobLock(jobName)) {
    logger.warn(`Job ${jobName} skipped - previous execution still running`);
    return {
      success: false,
      jobName,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: 'Previous execution still running - skipped to prevent overlap',
    };
  }

  try {
    return await executeJobWithTimeout(handler, timeout);
  } finally {
    releaseJobLock(jobName);
  }
}

let scheduledJobs: Cron[] = [];

/**
 * Initialize all safeguard background jobs
 */
export async function initializeSafeguardJobs(): Promise<void> {
  try {
    logger.info('Initializing safeguard background jobs');

    // Stop any existing jobs first
    await stopAllSafeguardJobs();

    const jobs: Array<{ config: JobConfig; handler: JobHandler }> = [
      { config: jobConfigs.reputationDecay, handler: runReputationDecayJob },
      { config: jobConfigs.moderationSLA, handler: runModerationSLAJob },
      { config: jobConfigs.rateLimitCleanup, handler: runRateLimitCleanupJob },
      { config: jobConfigs.anomalyAnalysis, handler: runAnomalyAnalysisJob },
      { config: jobConfigs.suspiciousActivityCleanup, handler: runSuspiciousActivityCleanupJob },
      { config: jobConfigs.deviceFingerprintAudit, handler: runDeviceFingerprintAuditJob },
      { config: jobConfigs.cibDetectionValidation, handler: runCIBDetectionValidationJob },
      { config: jobConfigs.complianceAudit, handler: runComplianceAuditJob },
      { config: jobConfigs.identityVerificationExpiry, handler: runIdentityVerificationExpiryJob },
    ];

    for (const { config, handler } of jobs) {
      if (!config.enabled) {
        logger.info(`Job disabled: ${config.name}`);
        continue;
      }

      try {
        const job = Cron(config.schedule, async () => {
          try {
            const result = await executeJobWithOverlapPrevention(config.name, handler, config.timeout);

            // Store execution history
            jobExecutionHistory.push(result);
            if (jobExecutionHistory.length > MAX_HISTORY_SIZE) {
              jobExecutionHistory.shift();
            }

            logger.info(`Job completed: ${result.jobName}`, {
              duration: `${result.duration}ms`,
              processed: result.itemsProcessed,
              failed: result.itemsFailed,
              success: result.success,
            });
          } catch (error) {
            logger.error(`Job execution error: ${config.name}`, {
              error: getErrorMessage(error),
            });
          }
        });

        scheduledJobs.push(job);
        logger.info(`Job scheduled: ${config.name}`, {
          schedule: config.schedule,
          timeout: `${config.timeout}ms`,
        });
      } catch (error) {
        logger.error(`Failed to schedule job: ${config.name}`, { error: getErrorMessage(error) });
      }
    }

    logger.info(`Safeguard jobs initialized: ${scheduledJobs.length} jobs scheduled`);
  } catch (error) {
    logger.error('Failed to initialize safeguard jobs', { error: getErrorMessage(error) });
    throw error;
  }
}

/**
 * Stop all scheduled jobs gracefully
 */
export async function stopAllSafeguardJobs(): Promise<void> {
  try {
    logger.info('Stopping all safeguard jobs', { count: scheduledJobs.length });

    for (const job of scheduledJobs) {
      job.stop();
    }

    scheduledJobs = [];
    jobLocks.clear();
    logger.info('All safeguard jobs stopped');
  } catch (error) {
    logger.error('Error stopping safeguard jobs', { error: getErrorMessage(error) });
  }
}

/**
 * Get status of all scheduled jobs
 */
export function getSafeguardJobStatus(): Array<{
  name: string;
  enabled: boolean;
  schedule: string;
  description: string;
  isRunning: boolean;
  lastExecution?: JobResult;
}> {
  return Object.values(jobConfigs).map((config) => {
    const lastExecution = jobExecutionHistory
      .filter((h) => h.jobName === config.name)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

    return {
      name: config.name,
      enabled: config.enabled,
      schedule: config.schedule,
      description: config.description,
      isRunning: jobLocks.get(config.name) || false,
      lastExecution,
    };
  });
}

/**
 * Get execution history for monitoring and debugging
 */
export function getJobExecutionHistory(limit = 20): JobResult[] {
  return jobExecutionHistory
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, limit);
}

/**
 * Manually trigger a job for testing/admin purposes
 */
export async function manuallyTriggerJob(jobName: string): Promise<JobResult | null> {
  const jobHandlers: Record<string, JobHandler> = {
    'Reputation Decay Job': runReputationDecayJob,
    'Moderation SLA Monitoring': runModerationSLAJob,
    'Rate Limit Cleanup': runRateLimitCleanupJob,
    'Behavioral Anomaly Analysis': runAnomalyAnalysisJob,
    'Suspicious Activity Log Cleanup': runSuspiciousActivityCleanupJob,
    'Device Fingerprint Audit': runDeviceFingerprintAuditJob,
    'CIB Detection Validation': runCIBDetectionValidationJob,
    'Safeguards Compliance Audit': runComplianceAuditJob,
    'Identity Verification Expiry Check': runIdentityVerificationExpiryJob,
  };

  const handler = jobHandlers[jobName];
  if (!handler) {
    logger.warn(`Job not found: ${jobName}`);
    return null;
  }

  logger.info(`Manually triggering job: ${jobName}`);

  const config = Object.values(jobConfigs).find((c) => c.name === jobName);
  const timeout = config?.timeout || 30 * 60 * 1000;

  try {
    return await executeJobWithTimeout(handler, timeout);
  } catch (error) {
    logger.error(`Manual job trigger failed: ${jobName}`, { error: getErrorMessage(error) });
    return {
      success: false,
      jobName,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Health check endpoint for monitoring systems
 */
export function getJobHealthStatus(): {
  healthy: boolean;
  scheduledJobs: number;
  runningJobs: number;
  recentFailures: number;
  lastExecutionTime?: Date;
} {
  const recentFailures = jobExecutionHistory.slice(-10).filter((r) => !r.success).length;

  const lastExecution =
    jobExecutionHistory.length > 0
      ? jobExecutionHistory[jobExecutionHistory.length - 1].startTime
      : undefined;

  const runningJobs = Array.from(jobLocks.values()).filter(Boolean).length;

  return {
    healthy: scheduledJobs.length > 0 && recentFailures < 3,
    scheduledJobs: scheduledJobs.length,
    runningJobs,
    recentFailures,
    lastExecutionTime: lastExecution,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  jobConfigs,
  DECAY_CONFIG,
  BATCH_CONFIG,
  ANOMALY_CONFIG,
  CLEANUP_CONFIG,
  type JobConfig,
  type JobResult,
  type JobHandler,
};