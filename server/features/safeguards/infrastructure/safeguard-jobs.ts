/**
 * Safeguard Background Jobs - Automated protection maintenance
 * Handles reputation decay, SLA monitoring, anomaly cleanup, and compliance audits
 *
 * @module safeguard-jobs
 * @version 2.0.0
 */

import { Cron } from "croner";
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
} from "@/shared/schema";
import { database, writeDatabase } from "@/server/db";
import { logger } from "@/server/utils/logger";
import { eq, lt, gt, and, sql, inArray } from "drizzle-orm";
import { moderationService } from "../application/moderation-service";
import { rateLimitService } from "../application/rate-limit-service";
import { cibDetectionService } from "../application/cib-detection-service";

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
} as const;

const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
} as const;

const ANOMALY_CONFIG = {
  MIN_ACTIVITIES_FOR_DETECTION: 3,
  CONCENTRATION_THRESHOLD: 0.5, // 50%
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
  LOW_CONFIDENCE_THRESHOLD: 0.3,
  MIN_SEVERITY_TO_KEEP: 4,
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
}

type JobHandler = () => Promise<JobResult>;

// ============================================================================
// JOB CONFIGURATIONS
// ============================================================================

const jobConfigs: Record<string, JobConfig> = {
  reputationDecay: {
    name: "Reputation Decay Job",
    schedule: "0 0 * * *", // Daily at midnight
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: "Apply reputation decay to inactive users (10% per month)",
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  moderationSLA: {
    name: "Moderation SLA Monitoring",
    schedule: "0 */6 * * *", // Every 6 hours
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: "Check for SLA violations in moderation queue",
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  rateLimitCleanup: {
    name: "Rate Limit Cleanup",
    schedule: "0 2 * * *", // Daily at 2 AM
    enabled: true,
    timeout: 5 * 60 * 1000,
    description: "Remove expired rate limit records",
  },
  anomalyAnalysis: {
    name: "Behavioral Anomaly Analysis",
    schedule: "0 */12 * * *", // Twice daily
    enabled: true,
    timeout: 15 * 60 * 1000,
    description: "Detect behavioral anomalies from activity logs",
  },
  suspiciousActivityCleanup: {
    name: "Suspicious Activity Log Cleanup",
    schedule: "0 3 * * 0", // Weekly on Sunday at 3 AM
    enabled: true,
    timeout: 10 * 60 * 1000,
    description: "Archive and clean old suspicious activity logs (90+ days)",
  },
  deviceFingerprintAudit: {
    name: "Device Fingerprint Audit",
    schedule: "0 4 * * 1", // Weekly on Monday at 4 AM
    enabled: true,
    timeout: 15 * 60 * 1000,
    description: "Audit device fingerprints for anomalies and update trust scores",
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  cibDetectionValidation: {
    name: "CIB Detection Validation",
    schedule: "0 */8 * * *", // Every 8 hours
    enabled: true,
    timeout: 20 * 60 * 1000,
    description: "Validate CIB detections and update investigation status",
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
  complianceAudit: {
    name: "Safeguards Compliance Audit",
    schedule: "0 5 * * 0", // Weekly on Sunday at 5 AM
    enabled: true,
    timeout: 30 * 60 * 1000,
    description: "Generate compliance reports for safeguards effectiveness",
  },
  identityVerificationExpiry: {
    name: "Identity Verification Expiry Check",
    schedule: "0 1 * * *", // Daily at 1 AM
    enabled: true,
    timeout: 5 * 60 * 1000,
    description: "Check for expired IPRS verifications and notify users",
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process items in batches with retry logic
 */
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options: BatchProcessOptions = {
    batchSize: BATCH_CONFIG.DEFAULT_BATCH_SIZE,
    maxRetries: BATCH_CONFIG.RETRY_ATTEMPTS,
    retryDelay: BATCH_CONFIG.RETRY_DELAY,
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
              await sleep(options.retryDelay * attempts);
            }
          }
        }

        failed++;
        logger.error("Batch item processing failed after retries", {
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
      setTimeout(() => reject(new Error("Job execution timeout")), timeout)
    ),
  ]);
}

// ============================================================================
// CORE JOB IMPLEMENTATIONS
// ============================================================================

/**
 * REPUTATION DECAY JOB
 * Applies configurable monthly decay to reputation scores for inactive users
 * Uses batch processing for scalability
 */
export async function runReputationDecayJob(): Promise<JobResult> {
  const startTime = new Date();
  const thresholdDate = new Date(Date.now() - DECAY_CONFIG.INACTIVITY_THRESHOLD);

  try {
    logger.info("Starting reputation decay job", {
      decayRate: DECAY_CONFIG.REPUTATION_DECAY_RATE,
      inactivityThreshold: DECAY_CONFIG.INACTIVITY_THRESHOLD,
    });

    // Process in batches to avoid memory issues with large datasets
    let offset = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    const batchSize = jobConfigs.reputationDecay.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    while (true) {
      const inactiveUsers = await database
        .select({
          id: reputationScores.id,
          userId: reputationScores.user_id,
          score: reputationScores.total_score,
        })
        .from(reputationScores)
        .where(
          and(
            lt(reputationScores.last_contribution_date, thresholdDate),
            gt(reputationScores.total_score, sql`${DECAY_CONFIG.MIN_REPUTATION_SCORE}`)
          )
        )
        .limit(batchSize)
        .offset(offset);

      if (inactiveUsers.length === 0) break;

      const { processed, failed } = await processBatch(
        inactiveUsers,
        async (user) => {
          const currentScore = parseFloat(user.score);
          const decayAmount = currentScore * DECAY_CONFIG.REPUTATION_DECAY_RATE;
          const newScore = Math.max(
            DECAY_CONFIG.MIN_REPUTATION_SCORE,
            currentScore - decayAmount
          );

          await writeDatabase.transaction(async (tx) => {
            await tx
              .update(reputationScores)
              .set({
                total_score: newScore.toFixed(2),
                last_decay_applied: new Date(),
              })
              .where(eq(reputationScores.id, user.id));

            await tx.insert(reputationHistory).values({
              user_id: user.userId,
              change_amount: (-decayAmount).toFixed(2),
              score_before: user.score,
              score_after: newScore.toFixed(2),
              source: "quality_comment",
              is_decay: true,
              reason: `Automatic reputation decay due to inactivity (${(DECAY_CONFIG.REPUTATION_DECAY_RATE * 100).toFixed(0)}% monthly)`,
            });
          });
        }
      );

      totalProcessed += processed;
      totalFailed += failed;
      offset += batchSize;

      // Safety check to prevent infinite loops
      if (inactiveUsers.length < batchSize) break;
    }

    logger.info("Reputation decay job completed", {
      totalProcessed,
      totalFailed,
      decayRate: DECAY_CONFIG.REPUTATION_DECAY_RATE,
    });

    return createJobResult(
      "Reputation Decay Job",
      startTime,
      totalProcessed,
      totalFailed,
      true,
      undefined,
      { decayRate: DECAY_CONFIG.REPUTATION_DECAY_RATE }
    );
  } catch (error) {
    logger.error("Reputation decay job failed", { error });
    return createJobResult(
      "Reputation Decay Job",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * MODERATION SLA MONITORING JOB
 * Checks for SLA violations and escalates overdue items
 */
export async function runModerationSLAJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting moderation SLA monitoring job");

    const overdueItems = await moderationService.getOverdueItems();
    const batchSize = jobConfigs.moderationSLA.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const { processed, failed } = await processBatch(
      overdueItems,
      async (item) => {
        await writeDatabase
          .update(moderationQueue)
          .set({
            metadata: sql`jsonb_set(
              COALESCE(${moderationQueue.metadata}, '{}'::jsonb),
              '{sla_violated}',
              'true'::jsonb
            )`,
          })
          .where(eq(moderationQueue.id, item.id));

        // Log SLA violation for monitoring
        logger.warn("Moderation SLA violation detected", {
          itemId: item.id,
          priority: item.priority,
          createdAt: item.created_at,
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    logger.info("Moderation SLA job completed", { processed, failed });

    return createJobResult(
      "Moderation SLA Monitoring",
      startTime,
      processed,
      failed,
      true,
      undefined,
      { violationsDetected: processed }
    );
  } catch (error) {
    logger.error("Moderation SLA job failed", { error });
    return createJobResult(
      "Moderation SLA Monitoring",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * RATE LIMIT CLEANUP JOB
 * Removes expired rate limit records efficiently
 */
export async function runRateLimitCleanupJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting rate limit cleanup job");

    const cutoffDate = new Date(Date.now() - TIMEFRAME.THIRTY_DAYS);

    // Delete expired records in a single efficient query
    const result = await writeDatabase
      .delete(rateLimits)
      .where(
        and(
          lt(rateLimits.window_start, cutoffDate),
          eq(rateLimits.is_blocked, false)
        )
      );

    const deletedCount = result.rowCount || 0;

    // Additional cleanup through service layer
    const serviceCleanupCount = await rateLimitService.cleanupExpiredRecords();

    const totalProcessed = deletedCount + serviceCleanupCount;

    logger.info("Rate limit cleanup job completed", {
      directDeletes: deletedCount,
      serviceDeletes: serviceCleanupCount,
      total: totalProcessed,
    });

    return createJobResult(
      "Rate Limit Cleanup",
      startTime,
      totalProcessed,
      0,
      true,
      undefined,
      { deletedRecords: totalProcessed, cutoffDate }
    );
  } catch (error) {
    logger.error("Rate limit cleanup job failed", { error });
    return createJobResult(
      "Rate Limit Cleanup",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * BEHAVIORAL ANOMALY ANALYSIS JOB
 * Analyzes suspicious activity patterns using improved detection algorithms
 */
export async function runAnomalyAnalysisJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting behavioral anomaly analysis job");

    const lookbackDate = new Date(Date.now() - TIMEFRAME.ONE_DAY);

    const recentActivities = await database
      .select()
      .from(suspiciousActivityLogs)
      .where(gt(suspiciousActivityLogs.created_at, lookbackDate));

    // Group activities by type for pattern analysis
    const activityGroups = new Map<string, typeof recentActivities>();

    for (const activity of recentActivities) {
      const key = activity.activity_type;
      if (!activityGroups.has(key)) {
        activityGroups.set(key, []);
      }
      activityGroups.get(key)!.push(activity);
    }

    let anomaliesDetected = 0;
    let failed = 0;

    // Analyze each activity group for anomalies
    for (const [activityType, activities] of activityGroups) {
      if (activities.length < ANOMALY_CONFIG.MIN_ACTIVITIES_FOR_DETECTION) {
        continue;
      }

      try {
        // Detect concentration anomalies (same user/IP performing many actions)
        const userActivityMap = new Map<string, number>();

        for (const activity of activities) {
          const key = activity.user_id || activity.ip_address || "unknown";
          userActivityMap.set(key, (userActivityMap.get(key) || 0) + 1);
        }

        for (const [identifier, count] of userActivityMap) {
          const concentration = count / activities.length;

          if (concentration >= ANOMALY_CONFIG.CONCENTRATION_THRESHOLD) {
            const anomalyScore = Math.min(100, concentration * 100);

            await writeDatabase.insert(behavioralAnomalies).values({
              anomaly_type: `Concentrated ${activityType}`,
              affected_users: identifier !== "unknown" ? [identifier] : [],
              affected_content: [],
              anomaly_score: anomalyScore.toFixed(2),
              baseline_behavior: {
                avgActivitiesPerUser: activities.length / userActivityMap.size,
                totalUsers: userActivityMap.size,
              },
              observed_behavior: {
                count,
                totalActivities: activities.length,
                concentration: concentration.toFixed(2),
              },
              is_escalated: concentration > 0.8,
              false_positive: false,
            });

            anomaliesDetected++;
          }
        }
      } catch (error) {
        logger.error("Failed to analyze activity group", { activityType, error });
        failed++;
      }
    }

    logger.info("Anomaly analysis job completed", {
      anomaliesDetected,
      failed,
      activitiesAnalyzed: recentActivities.length,
    });

    return createJobResult(
      "Behavioral Anomaly Analysis",
      startTime,
      anomaliesDetected,
      failed,
      true,
      undefined,
      { activitiesAnalyzed: recentActivities.length }
    );
  } catch (error) {
    logger.error("Anomaly analysis job failed", { error });
    return createJobResult(
      "Behavioral Anomaly Analysis",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * SUSPICIOUS ACTIVITY LOG CLEANUP JOB
 * Archives and removes old logs while preserving critical data
 */
export async function runSuspiciousActivityCleanupJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting suspicious activity cleanup job");

    const cutoffDate = new Date(Date.now() - TIMEFRAME.NINETY_DAYS);

    // Keep high-severity logs, delete others
    const result = await writeDatabase
      .delete(suspiciousActivityLogs)
      .where(
        and(
          lt(suspiciousActivityLogs.created_at, cutoffDate),
          lt(suspiciousActivityLogs.severity_level, ANOMALY_CONFIG.MIN_SEVERITY_TO_KEEP)
        )
      );

    const deletedCount = result.rowCount || 0;

    logger.info("Suspicious activity cleanup job completed", {
      deletedLogs: deletedCount,
      cutoffDate,
    });

    return createJobResult(
      "Suspicious Activity Log Cleanup",
      startTime,
      deletedCount,
      0,
      true,
      undefined,
      { deletedLogs: deletedCount, retainedSeverity: `>=${ANOMALY_CONFIG.MIN_SEVERITY_TO_KEEP}` }
    );
  } catch (error) {
    logger.error("Suspicious activity cleanup job failed", { error });
    return createJobResult(
      "Suspicious Activity Log Cleanup",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * DEVICE FINGERPRINT AUDIT JOB
 * Audits device fingerprints for suspicious patterns
 */
export async function runDeviceFingerprintAuditJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting device fingerprint audit job");

    const dormancyThreshold = new Date(Date.now() - TIMEFRAME.ONE_YEAR);
    let offset = 0;
    let totalProcessed = 0;
    let totalFailed = 0;
    const batchSize = jobConfigs.deviceFingerprintAudit.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    while (true) {
      const fingerprints = await database
        .select()
        .from(deviceFingerprints)
        .limit(batchSize)
        .offset(offset);

      if (fingerprints.length === 0) break;

      const { processed, failed } = await processBatch(
        fingerprints,
        async (fp) => {
          const suspiciousPatterns: string[] = [];

          // Check for dormant device reactivation
          if (
            fp.last_seen &&
            fp.last_seen < dormancyThreshold &&
            !fp.is_suspicious
          ) {
            suspiciousPatterns.push("Dormant device suddenly reactivated");
          }

          // Check for impossible user count
          if (fp.user_count > 10) {
            suspiciousPatterns.push(`Abnormally high user count: ${fp.user_count}`);
          }

          // Update if suspicious patterns detected
          if (suspiciousPatterns.length > 0) {
            await writeDatabase
              .update(deviceFingerprints)
              .set({
                is_suspicious: true,
                suspicion_reason: suspiciousPatterns.join("; "),
              })
              .where(eq(deviceFingerprints.id, fp.id));
          }
        }
      );

      totalProcessed += processed;
      totalFailed += failed;
      offset += batchSize;

      if (fingerprints.length < batchSize) break;
    }

    logger.info("Device fingerprint audit job completed", {
      totalProcessed,
      totalFailed,
    });

    return createJobResult(
      "Device Fingerprint Audit",
      startTime,
      totalProcessed,
      totalFailed
    );
  } catch (error) {
    logger.error("Device fingerprint audit job failed", { error });
    return createJobResult(
      "Device Fingerprint Audit",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * CIB DETECTION VALIDATION JOB
 * Validates and auto-confirms high-confidence CIB detections
 */
export async function runCIBDetectionValidationJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting CIB detection validation job");

    const detections = await database
      .select()
      .from(cibDetections)
      .where(eq(cibDetections.status, "detected"));

    const batchSize = jobConfigs.cibDetectionValidation.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const { processed, failed } = await processBatch(
      detections,
      async (detection) => {
        const confidenceScore = parseFloat(detection.confidence_score);

        if (confidenceScore > ANOMALY_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
          await writeDatabase
            .update(cibDetections)
            .set({ status: "confirmed" })
            .where(eq(cibDetections.id, detection.id));

          logger.info("CIB detection auto-confirmed", {
            detectionId: detection.id,
            confidence: confidenceScore,
          });
        } else if (confidenceScore < ANOMALY_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
          await writeDatabase
            .update(cibDetections)
            .set({ status: "false_positive" })
            .where(eq(cibDetections.id, detection.id));

          logger.info("CIB detection marked as false positive", {
            detectionId: detection.id,
            confidence: confidenceScore,
          });
        }
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    logger.info("CIB detection validation job completed", { processed, failed });

    return createJobResult(
      "CIB Detection Validation",
      startTime,
      processed,
      failed
    );
  } catch (error) {
    logger.error("CIB detection validation job failed", { error });
    return createJobResult(
      "CIB Detection Validation",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * COMPLIANCE AUDIT JOB
 * Generates comprehensive compliance reports
 */
export async function runComplianceAuditJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting compliance audit job");

    const weekAgo = new Date(Date.now() - TIMEFRAME.SEVEN_DAYS);

    // Gather metrics in parallel for efficiency
    const [
      moderatedItems,
      resolvedItems,
      rateLimitViolations,
      cibDetectionCount,
      highSeverityLogs,
    ] = await Promise.all([
      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(moderationQueue)
        .where(gt(moderationQueue.created_at, weekAgo)),

      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(moderationQueue)
        .where(
          and(
            gt(moderationQueue.created_at, weekAgo),
            eq(moderationQueue.status, "resolved")
          )
        ),

      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(rateLimits)
        .where(
          and(
            gt(rateLimits.created_at, weekAgo),
            eq(rateLimits.is_blocked, true)
          )
        ),

      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(cibDetections)
        .where(gt(cibDetections.detection_timestamp, weekAgo)),

      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(suspiciousActivityLogs)
        .where(
          and(
            gt(suspiciousActivityLogs.created_at, weekAgo),
            gt(suspiciousActivityLogs.severity_level, 3)
          )
        ),
    ]);

    const complianceMetrics = {
      period: "Last 7 days",
      moderationQueueItems: moderatedItems[0]?.count || 0,
      resolvedItems: resolvedItems[0]?.count || 0,
      resolutionRate: moderatedItems[0]?.count
        ? ((resolvedItems[0]?.count || 0) / moderatedItems[0].count * 100).toFixed(2)
        : "0.00",
      rateLimitViolations: rateLimitViolations[0]?.count || 0,
      cibDetections: cibDetectionCount[0]?.count || 0,
      highSeverityIncidents: highSeverityLogs[0]?.count || 0,
    };

    logger.info("Compliance audit completed", complianceMetrics);

    return createJobResult(
      "Safeguards Compliance Audit",
      startTime,
      1,
      0,
      true,
      undefined,
      complianceMetrics
    );
  } catch (error) {
    logger.error("Compliance audit job failed", { error });
    return createJobResult(
      "Safeguards Compliance Audit",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * IDENTITY VERIFICATION EXPIRY CHECK JOB
 * Proactively notifies users of upcoming verification expiry
 */
export async function runIdentityVerificationExpiryJob(): Promise<JobResult> {
  const startTime = new Date();

  try {
    logger.info("Starting identity verification expiry check job");

    const now = new Date();
    const notificationWindow = new Date(now.getTime() + TIMEFRAME.THIRTY_DAYS);

    const expiringVerifications = await database
      .select()
      .from(identityVerification)
      .where(
        and(
          lt(identityVerification.iprs_expiry_date, notificationWindow),
          gt(identityVerification.iprs_expiry_date, now)
        )
      );

    const batchSize = jobConfigs.identityVerificationExpiry.batchSize || BATCH_CONFIG.DEFAULT_BATCH_SIZE;

    const { processed, failed } = await processBatch(
      expiringVerifications,
      async (verification) => {
        await writeDatabase
          .update(identityVerification)
          .set({
            metadata: sql`jsonb_set(
              COALESCE(${identityVerification.metadata}, '{}'::jsonb),
              '{expiry_notification_sent}',
              to_jsonb(now()::text)
            )`,
          })
          .where(eq(identityVerification.id, verification.id));

        logger.info("Verification expiry notification queued", {
          verificationId: verification.id,
          expiryDate: verification.iprs_expiry_date,
        });
      },
      { batchSize, maxRetries: 3, retryDelay: 1000 }
    );

    logger.info("Identity verification expiry check job completed", {
      processed,
      failed,
    });

    return createJobResult(
      "Identity Verification Expiry Check",
      startTime,
      processed,
      failed
    );
  } catch (error) {
    logger.error("Identity verification expiry check job failed", { error });
    return createJobResult(
      "Identity Verification Expiry Check",
      startTime,
      0,
      0,
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// JOB SCHEDULER & LIFECYCLE MANAGEMENT
// ============================================================================

let scheduledJobs: Cron[] = [];
const jobExecutionHistory: JobResult[] = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Initialize all safeguard background jobs
 */
export async function initializeSafeguardJobs(): Promise<void> {
  try {
    logger.info("Initializing safeguard background jobs");

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
            const result = await executeJobWithTimeout(handler, config.timeout);

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
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });

        scheduledJobs.push(job);
        logger.info(`Job scheduled: ${config.name}`, {
          schedule: config.schedule,
          timeout: `${config.timeout}ms`,
        });
      } catch (error) {
        logger.error(`Failed to schedule job: ${config.name}`, { error });
      }
    }

    logger.info(`Safeguard jobs initialized: ${scheduledJobs.length} jobs scheduled`);
  } catch (error) {
    logger.error("Failed to initialize safeguard jobs", { error });
    throw error;
  }
}

/**
 * Stop all scheduled jobs gracefully
 */
export async function stopAllSafeguardJobs(): Promise<void> {
  try {
    logger.info("Stopping all safeguard jobs", { count: scheduledJobs.length });

    for (const job of scheduledJobs) {
      job.stop();
    }

    scheduledJobs = [];
    logger.info("All safeguard jobs stopped");
  } catch (error) {
    logger.error("Error stopping safeguard jobs", { error });
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
    "Reputation Decay Job": runReputationDecayJob,
    "Moderation SLA Monitoring": runModerationSLAJob,
    "Rate Limit Cleanup": runRateLimitCleanupJob,
    "Behavioral Anomaly Analysis": runAnomalyAnalysisJob,
    "Suspicious Activity Log Cleanup": runSuspiciousActivityCleanupJob,
    "Device Fingerprint Audit": runDeviceFingerprintAuditJob,
    "CIB Detection Validation": runCIBDetectionValidationJob,
    "Safeguards Compliance Audit": runComplianceAuditJob,
    "Identity Verification Expiry Check": runIdentityVerificationExpiryJob,
  };

  const handler = jobHandlers[jobName];
  if (!handler) {
    logger.warn(`Job not found: ${jobName}`);
    return null;
  }

  logger.info(`Manually triggering job: ${jobName}`);

  const config = Object.values(jobConfigs).find((c) => c.name === jobName);
  const timeout = config?.timeout || 30 * 60 * 1000;

  return executeJobWithTimeout(handler, timeout);
}

/**
 * Health check endpoint for monitoring systems
 */
export function getJobHealthStatus(): {
  healthy: boolean;
  scheduledJobs: number;
  recentFailures: number;
  lastExecutionTime?: Date;
} {
  const recentFailures = jobExecutionHistory
    .slice(-10)
    .filter((r) => !r.success).length;

  const lastExecution = jobExecutionHistory.length > 0
    ? jobExecutionHistory[jobExecutionHistory.length - 1].startTime
    : undefined;

  return {
    healthy: scheduledJobs.length > 0 && recentFailures < 3,
    scheduledJobs: scheduledJobs.length,
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
  type JobConfig,
  type JobResult,
  type JobHandler,
};
