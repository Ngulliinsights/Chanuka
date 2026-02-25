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
  deviceFingerprints,
  identityVerification,
  type ReputationScore,
  type DeviceFingerprint,
  type IdentityVerification,
} from '@server/infrastructure/schema/safeguards';
import {
  readDatabase,
  withTransaction,
  type DatabaseTransaction,
} from '@server/infrastructure/database/connection';
import { logger } from '@server/infrastructure/observability';
import { eq, lt, gt, and, sql, lte, or } from 'drizzle-orm';
import { moderationService } from '../application/moderation-service';
import { rateLimitService } from '../application/rate-limit-service';
import { cibDetectionService } from '../application/cib-detection-service';

// ============================================================================
// DATABASE TRANSACTION WIDENING
// `DatabaseTransaction` exposes a narrower surface than Drizzle's full ORM.
// Cast `rawTx` to `Tx` inside `withTransaction` callbacks to access
// `.update()`, `.insert()`, etc.
// ============================================================================

type Tx = DatabaseTransaction & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (...args: unknown[]) => any;
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>;
};

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const TIMEFRAME = {
  ONE_DAY:     24 * 60 * 60 * 1000,
  SEVEN_DAYS:  7  * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
  ONE_YEAR:    365 * 24 * 60 * 60 * 1000,
} as const;

const DECAY_CONFIG = {
  REPUTATION_DECAY_RATE: 0.1,
  INACTIVITY_THRESHOLD:  TIMEFRAME.THIRTY_DAYS,
  MIN_REPUTATION_SCORE:  0,
  MAX_REPUTATION_SCORE:  100,
} as const;

const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE:       100,
  MAX_BATCH_SIZE:           1000,
  RETRY_ATTEMPTS:           3,
  RETRY_DELAY:              1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

const CLEANUP_CONFIG = {
  RATE_LIMIT_RETENTION_DAYS:          90,
  SUSPICIOUS_ACTIVITY_RETENTION_DAYS: 90,
  RESOLVED_PATTERN_RETENTION_DAYS:    30,
  RESOLVED_ANOMALY_RETENTION_DAYS:    30,
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

// Strongly-typed keys — prevents `Record<string, JobConfig>` from widening
// every property access to `JobConfig | undefined`.
type JobConfigKey =
  | 'reputationDecay'
  | 'moderationSLA'
  | 'rateLimitCleanup'
  | 'anomalyAnalysis'
  | 'suspiciousActivityCleanup'
  | 'deviceFingerprintAudit'
  | 'cibDetectionValidation'
  | 'complianceAudit'
  | 'identityVerificationExpiry';

// ============================================================================
// JOB CONFIGURATIONS
// ============================================================================

const jobConfigs: Record<JobConfigKey, JobConfig> = {
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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Process items in batches with retry logic and exponential back-off.
 *
 * LOGGER CONVENTION: this project's logger is message-first:
 *   `logger.info('Human readable message', { contextObject })`
 */
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options: BatchProcessOptions = {
    batchSize:              BATCH_CONFIG.DEFAULT_BATCH_SIZE,
    maxRetries:             BATCH_CONFIG.RETRY_ATTEMPTS,
    retryDelay:             BATCH_CONFIG.RETRY_DELAY,
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
              const delay =
                options.retryDelay *
                Math.pow(
                  options.retryBackoffMultiplier ?? BATCH_CONFIG.RETRY_BACKOFF_MULTIPLIER,
                  attempts - 1
                );
              await sleep(delay);
            }
          }
        }

        failed++;
        logger.error({
          error: lastError?.message,
          attempts,
        }, 'Batch item processing failed after retries');
      })
    );
  }

  return { processed, failed };
}

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

async function executeJobWithTimeout(handler: JobHandler, timeout: number): Promise<JobResult> {
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
 * Applies configurable monthly decay to reputation scores for inactive users.
 *
 * Schema notes:
 * - Inactivity column : `last_contribution_date`  (not `last_activity`)
 * - Score column      : `total_score` is PgNumeric — string required for comparisons
 */
async function runReputationDecayJob(): Promise<JobResult> {
  const startTime = new Date();
  const batchSize = jobConfigs.reputationDecay.batchSize ?? BATCH_CONFIG.DEFAULT_BATCH_SIZE;
  let processed = 0;
  let failed = 0;

  try {
    logger.info('Starting reputation decay job');

    const inactiveThreshold = new Date(Date.now() - DECAY_CONFIG.INACTIVITY_THRESHOLD);

    // @ts-ignore - Drizzle ORM type inference issue with select()
    const inactiveUsers: ReputationScore[] = await readDatabase
      .select()
      .from(reputationScores)
      .where(
        and(
          lt(reputationScores.last_contribution_date, inactiveThreshold),
          // PgNumeric columns must be compared against strings, not JS numbers.
          gt(reputationScores.total_score, String(DECAY_CONFIG.MIN_REPUTATION_SCORE))
        )
      );

    logger.info({ count: inactiveUsers.length }, 'Found inactive users for reputation decay');

    const result = await processBatch(
      inactiveUsers,
      async (user: ReputationScore) => {
        await withTransaction(async (rawTx: DatabaseTransaction) => {
          const tx = rawTx as Tx;
          const currentScore = parseFloat(user.total_score);
          const decayAmount = currentScore * DECAY_CONFIG.REPUTATION_DECAY_RATE;
          const newScore = Math.max(DECAY_CONFIG.MIN_REPUTATION_SCORE, currentScore - decayAmount);

          await tx
            .update(reputationScores)
            .set({ total_score: newScore.toString(), updated_at: new Date() })
            .where(eq(reputationScores.user_id, user.user_id));

          // `reputationHistory` requires `change_amount`, `score_before`, and
          // `score_after`. The enum has no `inactivity_decay` value, so we use
          // the nearest match and set `is_decay: true` to tag the record.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const historyValues: any = {
            user_id: user.user_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            source: 'community_validation' as any,
            change_amount: (-decayAmount).toString(),
            score_before:  user.total_score,
            score_after:   newScore.toString(),
            reason:        'Monthly inactivity decay applied',
            is_decay:      true,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx as any).insert(reputationHistory).values(historyValues);
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed    = result.failed;

    logger.info({ processed, failed }, 'Reputation decay job completed');
    return createJobResult('Reputation Decay Job', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Reputation decay job failed');
    return createJobResult(
      'Reputation Decay Job', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * MODERATION SLA MONITORING JOB
 */
async function runModerationSLAJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  const failed = 0;

  try {
    logger.info('Starting moderation SLA monitoring job');
    processed = await moderationService.markSlaViolations();
    logger.info({ violationsMarked: processed }, 'Moderation SLA monitoring completed');
    return createJobResult('Moderation SLA Monitoring', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Moderation SLA monitoring failed');
    return createJobResult(
      'Moderation SLA Monitoring', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * RATE LIMIT CLEANUP JOB
 */
async function runRateLimitCleanupJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  const failed = 0;

  try {
    logger.info('Starting rate limit cleanup job');
    const batchSize = jobConfigs.rateLimitCleanup.batchSize ?? BATCH_CONFIG.MAX_BATCH_SIZE;
    processed = await rateLimitService.cleanupExpiredRecords(batchSize);
    logger.info({ recordsDeleted: processed }, 'Rate limit cleanup completed');
    return createJobResult('Rate Limit Cleanup', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Rate limit cleanup failed');
    return createJobResult(
      'Rate Limit Cleanup', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * ANOMALY ANALYSIS JOB — placeholder
 */
async function runAnomalyAnalysisJob(): Promise<JobResult> {
  const startTime = new Date();
  const processed = 0;
  const failed    = 0;

  try {
    logger.info('Starting anomaly analysis job');
    // TODO: implement pattern-detection analysis
    logger.info({ processed, failed }, 'Anomaly analysis completed');
    return createJobResult('Behavioral Anomaly Analysis', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Anomaly analysis failed');
    return createJobResult(
      'Behavioral Anomaly Analysis', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * SUSPICIOUS ACTIVITY CLEANUP JOB
 *
 * `cleanupResolvedPatterns` / `cleanupResolvedAnomalies` are not yet declared
 * on `CIBDetectionService` — guarded via runtime check so the job degrades
 * gracefully until those methods are added to the service interface.
 */
async function runSuspiciousActivityCleanupJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  const failed  = 0;

  try {
    logger.info('Starting suspicious activity cleanup job');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = cibDetectionService as any;

    const patternsDeleted: number =
      typeof svc.cleanupResolvedPatterns === 'function'
        ? (await svc.cleanupResolvedPatterns(CLEANUP_CONFIG.RESOLVED_PATTERN_RETENTION_DAYS) as number)
        : 0;

    const anomaliesDeleted: number =
      typeof svc.cleanupResolvedAnomalies === 'function'
        ? (await svc.cleanupResolvedAnomalies(CLEANUP_CONFIG.RESOLVED_ANOMALY_RETENTION_DAYS) as number)
        : 0;

    processed = patternsDeleted + anomaliesDeleted;

    logger.info({
      patternsDeleted,
      anomaliesDeleted,
      totalDeleted: processed,
    }, 'Suspicious activity cleanup completed');

    return createJobResult(
      'Suspicious Activity Log Cleanup', startTime, processed, failed,
      true, undefined, { patternsDeleted, anomaliesDeleted }
    );
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Suspicious activity cleanup failed');
    return createJobResult(
      'Suspicious Activity Log Cleanup', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * DEVICE FINGERPRINT AUDIT JOB
 *
 * Schema note: no `last_audit` column exists on `device_fingerprints`.
 * `last_seen` is used as the staleness indicator until a dedicated column is
 * added to the schema and a migration is run.
 */
async function runDeviceFingerprintAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed    = 0;

  try {
    logger.info('Starting device fingerprint audit job');

    const auditCutoff = new Date(Date.now() - TIMEFRAME.SEVEN_DAYS);

    // @ts-ignore - Drizzle ORM type inference issue with select()
    const devices: DeviceFingerprint[] = await readDatabase
      .select()
      .from(deviceFingerprints)
      .where(
        or(
          sql`${deviceFingerprints.last_seen} IS NULL`,
          lte(deviceFingerprints.last_seen, auditCutoff)
        )
      )
      .limit(1000);

    const batchSize = jobConfigs.deviceFingerprintAudit.batchSize ?? BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const result = await processBatch(
      devices,
      async (device: DeviceFingerprint) => {
        await withTransaction(async (rawTx: DatabaseTransaction) => {
          const tx = rawTx as Tx;
          const trustScore = device.is_suspicious ? 0.3 : 0.7;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx as any)
            .update(deviceFingerprints)
            .set({
              trust_score: trustScore.toString(),
              last_seen:   new Date(), // doubles as audit timestamp until schema gains last_audit
              updated_at:  new Date(),
            })
            .where(eq(deviceFingerprints.id, device.id));
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed    = result.failed;

    logger.info({ processed, failed }, 'Device fingerprint audit completed');
    return createJobResult('Device Fingerprint Audit', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Device fingerprint audit failed');
    return createJobResult(
      'Device Fingerprint Audit', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * CIB DETECTION VALIDATION JOB — placeholder
 */
async function runCIBDetectionValidationJob(): Promise<JobResult> {
  const startTime = new Date();
  const processed = 0;
  const failed    = 0;

  try {
    logger.info('Starting CIB detection validation job');
    // TODO: implement validation logic
    logger.info({ processed, failed }, 'CIB detection validation completed');
    return createJobResult('CIB Detection Validation', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'CIB detection validation failed');
    return createJobResult(
      'CIB Detection Validation', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * COMPLIANCE AUDIT JOB
 */
async function runComplianceAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  const failed  = 0;

  try {
    logger.info('Starting compliance audit job');

    const metrics = {
      moderationSLA: { total: 0, violated: 0, violationRate: 0 },
      rateLimiting:  { totalBlocks: 0, falsePositives: 0 },
      cibDetection:  { patternsDetected: 0, patternsResolved: 0 },
    };

    // TODO: gather real metrics from respective services
    processed = 1;

    logger.info({ metrics, processed }, 'Compliance audit completed');
    return createJobResult(
      'Safeguards Compliance Audit', startTime, processed, failed,
      true, undefined, { metrics }
    );
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Compliance audit failed');
    return createJobResult(
      'Safeguards Compliance Audit', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

/**
 * IDENTITY VERIFICATION EXPIRY JOB
 *
 * Schema notes:
 * - Expiry column  : `iprs_expiry_date`          (not `expires_at`)
 * - Status column  : `iprs_verification_status`   (not `iprs_status`)
 */
async function runIdentityVerificationExpiryJob(): Promise<JobResult> {
  const startTime = new Date();
  let processed = 0;
  let failed    = 0;

  try {
    logger.info('Starting identity verification expiry check job');

    // @ts-ignore - Drizzle ORM type inference issue with select()
    const expiredVerifications: IdentityVerification[] = await readDatabase
      .select()
      .from(identityVerification)
      .where(
        and(
          lte(identityVerification.iprs_expiry_date, new Date()),
          eq(identityVerification.iprs_verification_status, 'verified')
        )
      )
      .limit(1000);

    const batchSize = jobConfigs.identityVerificationExpiry.batchSize ?? BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const result = await processBatch(
      expiredVerifications,
      async (verification: IdentityVerification) => {
        await withTransaction(async (rawTx: DatabaseTransaction) => {
          const tx = rawTx as Tx;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx as any)
            .update(identityVerification)
            .set({ iprs_verification_status: 'expired', updated_at: new Date() })
            .where(eq(identityVerification.id, verification.id));
          // TODO: trigger user notification
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    processed = result.processed;
    failed    = result.failed;

    logger.info({ processed, failed }, 'Identity verification expiry check job completed');
    return createJobResult('Identity Verification Expiry Check', startTime, processed, failed);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Identity verification expiry check job failed');
    return createJobResult(
      'Identity Verification Expiry Check', startTime, processed, failed, false, getErrorMessage(error)
    );
  }
}

// ============================================================================
// JOB SCHEDULER & LIFECYCLE MANAGEMENT
// ============================================================================

const jobLocks = new Map<string, boolean>();
const jobExecutionHistory: JobResult[] = [];
const MAX_HISTORY_SIZE = 100;

function acquireJobLock(jobName: string): boolean {
  if (jobLocks.get(jobName)) return false;
  jobLocks.set(jobName, true);
  return true;
}

function releaseJobLock(jobName: string): void {
  jobLocks.delete(jobName);
}

async function executeJobWithOverlapPrevention(
  jobName: string,
  handler: JobHandler,
  timeout: number
): Promise<JobResult> {
  if (!acquireJobLock(jobName)) {
    logger.warn(`Job ${jobName} skipped — previous execution still running`);
    return {
      success: false,
      jobName,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: 'Previous execution still running — skipped to prevent overlap',
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
 * Initialize all safeguard background jobs.
 * Croner is timezone-aware; pass `{ timezone: 'Africa/Nairobi' }` as needed.
 */
export async function initializeSafeguardJobs(): Promise<void> {
  try {
    logger.info('Initializing safeguard background jobs');
    await stopAllSafeguardJobs();

    // Direct property access on the typed record — every lookup is
    // guaranteed non-undefined at compile time.
    const jobs: Array<{ config: JobConfig; handler: JobHandler }> = [
      { config: jobConfigs.reputationDecay,           handler: runReputationDecayJob },
      { config: jobConfigs.moderationSLA,              handler: runModerationSLAJob },
      { config: jobConfigs.rateLimitCleanup,           handler: runRateLimitCleanupJob },
      { config: jobConfigs.anomalyAnalysis,            handler: runAnomalyAnalysisJob },
      { config: jobConfigs.suspiciousActivityCleanup,  handler: runSuspiciousActivityCleanupJob },
      { config: jobConfigs.deviceFingerprintAudit,     handler: runDeviceFingerprintAuditJob },
      { config: jobConfigs.cibDetectionValidation,     handler: runCIBDetectionValidationJob },
      { config: jobConfigs.complianceAudit,            handler: runComplianceAuditJob },
      { config: jobConfigs.identityVerificationExpiry, handler: runIdentityVerificationExpiryJob },
    ];

    for (const { config, handler } of jobs) {
      if (!config.enabled) {
        logger.info(`Job disabled: ${config.name}`);
        continue;
      }

      try {
        const job = new Cron(config.schedule, { timezone: 'Africa/Nairobi' }, async () => {
          try {
            const result = await executeJobWithOverlapPrevention(
              config.name, handler, config.timeout
            );

            jobExecutionHistory.push(result);
            if (jobExecutionHistory.length > MAX_HISTORY_SIZE) jobExecutionHistory.shift();

            logger.info({
              duration:  `${result.duration}ms`,
              processed: result.itemsProcessed,
              failed:    result.itemsFailed,
              success:   result.success,
            }, `Job completed: ${result.jobName}`);
          } catch (error) {
            logger.error({ error: getErrorMessage(error) }, `Job execution error: ${config.name}`);
          }
        });

        scheduledJobs.push(job);
        logger.info({
          schedule: config.schedule,
          timeout:  `${config.timeout}ms`,
        }, `Job scheduled: ${config.name}`);
      } catch (error) {
        logger.error({ error: getErrorMessage(error) }, `Failed to schedule job: ${config.name}`);
      }
    }

    logger.info(`Safeguard jobs initialized: ${scheduledJobs.length} jobs scheduled`);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Failed to initialize safeguard jobs');
    throw error;
  }
}

/** Stop all scheduled jobs gracefully. */
export async function stopAllSafeguardJobs(): Promise<void> {
  try {
    logger.info({ count: scheduledJobs.length }, 'Stopping all safeguard jobs');
    for (const job of scheduledJobs) job.stop();
    scheduledJobs = [];
    jobLocks.clear();
    logger.info('All safeguard jobs stopped');
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, 'Error stopping safeguard jobs');
  }
}

/** Return the current status of every registered job. */
export function getSafeguardJobStatus(): Array<{
  name: string;
  enabled: boolean;
  schedule: string;
  description: string;
  isRunning: boolean;
  lastExecution?: JobResult;
}> {
  return (Object.values(jobConfigs) as JobConfig[]).map((config) => {
    const lastExecution = jobExecutionHistory
      .filter((h) => h.jobName === config.name)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

    return {
      name:          config.name,
      enabled:       config.enabled,
      schedule:      config.schedule,
      description:   config.description,
      isRunning:     jobLocks.get(config.name) ?? false,
      lastExecution,
    };
  });
}

/** Return recent execution history for monitoring and debugging. */
export function getJobExecutionHistory(limit = 20): JobResult[] {
  return [...jobExecutionHistory]
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, limit);
}

/** Manually trigger a named job for testing or administrative use. */
export async function manuallyTriggerJob(jobName: string): Promise<JobResult | null> {
  const jobHandlers: Record<string, JobHandler> = {
    'Reputation Decay Job':               runReputationDecayJob,
    'Moderation SLA Monitoring':          runModerationSLAJob,
    'Rate Limit Cleanup':                 runRateLimitCleanupJob,
    'Behavioral Anomaly Analysis':        runAnomalyAnalysisJob,
    'Suspicious Activity Log Cleanup':    runSuspiciousActivityCleanupJob,
    'Device Fingerprint Audit':           runDeviceFingerprintAuditJob,
    'CIB Detection Validation':           runCIBDetectionValidationJob,
    'Safeguards Compliance Audit':        runComplianceAuditJob,
    'Identity Verification Expiry Check': runIdentityVerificationExpiryJob,
  };

  const handler = jobHandlers[jobName];
  if (!handler) {
    logger.warn(`Job not found: ${jobName}`);
    return null;
  }

  logger.info(`Manually triggering job: ${jobName}`);

  const config  = (Object.values(jobConfigs) as JobConfig[]).find((c) => c.name === jobName);
  const timeout = config?.timeout ?? 30 * 60 * 1000;

  try {
    return await executeJobWithTimeout(handler, timeout);
  } catch (error) {
    logger.error({ error: getErrorMessage(error) }, `Manual job trigger failed: ${jobName}`);
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

/** Health-check endpoint for monitoring systems. */
export function getJobHealthStatus(): {
  healthy: boolean;
  scheduledJobs: number;
  runningJobs: number;
  recentFailures: number;
  lastExecutionTime?: Date;
} {
  const recentFailures = jobExecutionHistory.slice(-10).filter((r) => !r.success).length;
  const lastEntry      = jobExecutionHistory[jobExecutionHistory.length - 1];
  const runningJobs    = Array.from(jobLocks.values()).filter(Boolean).length;

  return {
    healthy:           scheduledJobs.length > 0 && recentFailures < 3,
    scheduledJobs:     scheduledJobs.length,
    runningJobs,
    recentFailures,
    lastExecutionTime: lastEntry?.startTime,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  jobConfigs,
  DECAY_CONFIG,
  BATCH_CONFIG,
  CLEANUP_CONFIG,
  type JobConfig,
  type JobResult,
  type JobHandler,
};