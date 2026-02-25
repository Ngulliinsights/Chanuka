import { and, desc, eq, lte, sql } from 'drizzle-orm';

import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database/connection';
import {
  behavioralAnomalies,
  cibDetections,
  suspiciousActivityLogs,
  type BehavioralAnomaly,
  type CIBDetection,
  type NewBehavioralAnomaly,
  type NewCIBDetection,
  type NewSuspiciousActivityLog,
  type SuspiciousActivityLog,
} from '@server/infrastructure/schema/safeguards';

// ==================== Type Definitions ====================

interface TemporalEvidence {
  postingTimes?: string[];
  timeCorrelation?: number;
  suspiciousWindows?: Array<{ start: string; end: string; count: number }>;
}

interface ContentEvidence {
  similarityMatrix?: number[][];
  sharedPhrases?: string[];
  templateDetected?: boolean;
}

interface NetworkEvidence {
  clusterGraph?: { nodes: string[]; edges: Array<{ from: string; to: string }> };
  interactionMatrix?: number[][];
  isolationScore?: number;
}

interface StatisticalMeasures {
  pValue?: number;
  zScore?: number;
  anomalyScore?: number;
}

interface AffectedContent {
  contentId: string;
  contentType: string;
  timestamp: string;
}

export interface SuspiciousActivityContext {
  userId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  activityType: string;
  suspicionReason: string;
  severityLevel: number;
  relatedEntities?: Record<string, unknown>;
  activityMetadata?: Record<string, unknown>;
  autoActionTaken?: string;
  requiresManualReview?: boolean;
}

export interface BehavioralAnomalyContext {
  userId: string;
  anomalyType: string;
  anomalyScore: number;
  anomalyDescription: string;
  affectedUsers?: string[];
  affectedContent?: AffectedContent[];
  temporalEvidence?: TemporalEvidence;
  contentEvidence?: ContentEvidence;
  networkEvidence?: NetworkEvidence;
  statisticalMeasures?: StatisticalMeasures;
  detectionMethod: string;
  detectionAlgorithm?: string;
  detectedAt?: Date;
  isEscalated?: boolean;
  escalatedAt?: Date;
  escalatedToModeration?: boolean;
  isFalsePositive?: boolean;
  verifiedBy?: string;
  resolutionNotes?: string;
}

export type CIBPatternType =
  | 'temporal_clustering'
  | 'content_similarity'
  | 'network_isolation'
  | 'single_issue_focus'
  | 'rapid_activation'
  | 'coordinated_voting'
  | 'template_structure'
  | 'shared_infrastructure'
  | 'abnormal_engagement'
  | 'vote_manipulation';

export interface CIBDetectionContext {
  patternType: CIBPatternType;
  patternDescription?: string;
  affectedUserIds: string[];
  investigationStatus: string;
  confidenceScore: number;
  severity: string;
  detectionMethod: string;
  detectionAlgorithm?: string;
  evidence: Record<string, unknown>;
  coordinatedActivityIndicators?: Record<string, unknown>;
  networkAnalysis?: Record<string, unknown>;
  contentAnalysis?: Record<string, unknown>;
  temporalAnalysis?: Record<string, unknown>;
  investigatorId?: string;
  investigationNotes?: string;
  mitigationActions?: string[];
  isMitigated?: boolean;
  mitigatedAt?: Date;
  mitigatedBy?: string;
}

export interface CIBDetectionResult {
  success: boolean;
  detectionId?: string;
  anomalyId?: string;
  activityLogId?: string;
  error?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ==================== Helper Functions ====================

/** Safely extract error message from unknown error type */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Extract the ID from a .returning() result.
 * readDatabase's returning() is typed as unknown, so we cast the whole array here.
 */
function extractId(rows: unknown): string | undefined {
  return (rows as Array<{ id?: string }>)[0]?.id;
}

/**
 * Cast a readDatabase query result to the expected typed array.
 * readDatabase returns unknown for select/delete results.
 */
function castRows<T>(rows: unknown): T[] {
  return rows as T[];
}

/** Validate suspicious activity context */
function validateActivityContext(context: SuspiciousActivityContext): void {
  if (!context.userId && !context.ipAddress && !context.deviceFingerprint) {
    throw new Error(
      'At least one identifier (userId, ipAddress, or deviceFingerprint) is required'
    );
  }
  if (!context.activityType) throw new Error('Activity type is required');
  if (!context.suspicionReason) throw new Error('Suspicion reason is required');
  if (context.severityLevel < 1 || context.severityLevel > 5) {
    throw new Error('Severity level must be between 1 and 5');
  }
}

/** Validate behavioral anomaly context */
function validateAnomalyContext(context: BehavioralAnomalyContext): void {
  if (!context.userId) throw new Error('User ID is required');
  if (!context.anomalyType) throw new Error('Anomaly type is required');
  if (!context.anomalyDescription) throw new Error('Anomaly description is required');
  if (context.anomalyScore < 0 || context.anomalyScore > 10) {
    throw new Error('Anomaly score must be between 0 and 10');
  }
  if (!context.detectionMethod) throw new Error('Detection method is required');
}

/** Validate CIB detection context */
function validateCIBContext(context: CIBDetectionContext): void {
  if (!context.patternType) throw new Error('Pattern type is required');
  if (!context.affectedUserIds || context.affectedUserIds.length === 0) {
    throw new Error('At least one affected user is required');
  }
  if (context.affectedUserIds.length > 1000) {
    throw new Error('Cannot process more than 1000 affected users at once');
  }
  if (!context.investigationStatus) throw new Error('Investigation status is required');
  if (context.confidenceScore < 0 || context.confidenceScore > 1) {
    throw new Error('Confidence score must be between 0 and 1');
  }
  if (!context.severity) throw new Error('Severity is required');
  if (!context.detectionMethod) throw new Error('Detection method is required');
}

// ==================== Service Class ====================

/**
 * Service for detecting and managing Coordinated Inauthentic Behavior (CIB).
 * Handles suspicious activities, behavioral anomalies, and CIB pattern detection.
 *
 * SECURITY & CONCURRENCY FEATURES:
 * - Input validation on all operations
 * - Atomic cleanup operations
 * - Comprehensive audit trail
 */
export class CIBDetectionService {
  private static instance: CIBDetectionService;
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 500;
  private static readonly DEFAULT_CLEANUP_DAYS = 30;

  static getInstance(): CIBDetectionService {
    if (!CIBDetectionService.instance) {
      CIBDetectionService.instance = new CIBDetectionService();
    }
    return CIBDetectionService.instance;
  }

  // ==================== Suspicious Activity Logging ====================

  /** Log suspicious activity with validation. */
  async logSuspiciousActivity(
    context: SuspiciousActivityContext
  ): Promise<CIBDetectionResult> {
    try {
      validateActivityContext(context);

      const activity: NewSuspiciousActivityLog = {
        user_id: context.userId,
        ip_address: context.ipAddress,
        device_fingerprint: context.deviceFingerprint,
        activity_type: context.activityType,
        suspicion_reason: context.suspicionReason,
        severity_level: context.severityLevel,
        related_entities: (context.relatedEntities ?? {}) as Record<string, unknown>,
        activity_metadata: context.activityMetadata as Record<string, unknown> | undefined,
        auto_action_taken: context.autoActionTaken,
        requires_manual_review: context.requiresManualReview ?? false,
      };

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .insert(suspiciousActivityLogs)
        .values(activity)
        .returning();
      
      const rows = result as Array<{ id?: string }>;
      const activityLogId = extractId(rows);

      logger.info(
        { activityLogId, userId: context.userId, activityType: context.activityType, severity: context.severityLevel },
        'Suspicious activity logged'
      );

      return { success: true, activityLogId };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), context },
        'Failed to log suspicious activity'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /** Get suspicious activities for a user. */
  async getUserSuspiciousActivities(
    userId: string,
    limit = 100
  ): Promise<SuspiciousActivityLog[]> {
    try {
      if (!userId) throw new Error('User ID is required');

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .select()
        .from(suspiciousActivityLogs)
        .where(eq(suspiciousActivityLogs.user_id, userId))
        .orderBy(desc(suspiciousActivityLogs.created_at))
        .limit(Math.min(limit, 500));

      const rows = result as SuspiciousActivityLog[];
      return castRows<SuspiciousActivityLog>(rows);
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), userId },
        'Failed to get user suspicious activities'
      );
      return [];
    }
  }

  /** Get activities requiring manual review. */
  async getActivitiesForReview(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<SuspiciousActivityLog>> {
    try {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .select()
        .from(suspiciousActivityLogs)
        .where(eq(suspiciousActivityLogs.requires_manual_review, true))
        .orderBy(
          desc(suspiciousActivityLogs.severity_level),
          desc(suspiciousActivityLogs.created_at)
        )
        .limit(limit + 1)
        .offset(offset);

      const rows = result as SuspiciousActivityLog[];
      const activities = castRows<SuspiciousActivityLog>(rows);
      const hasMore = activities.length > limit;
      const data = hasMore ? activities.slice(0, limit) : activities;

      return { data, total: data.length, hasMore };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error) },
        'Failed to get activities for review'
      );
      return { data: [], total: 0, hasMore: false };
    }
  }

  // ==================== Behavioral Anomaly Detection ====================

  /**
   * Record behavioral anomaly with validation.
   *
   * Schema mapping notes:
   * - `anomalyDescription`  → `explanation` (direct column)
   * - `temporalEvidence`, `contentEvidence`, `networkEvidence`, `statisticalMeasures`,
   *   `detectionMethod`, `detectionAlgorithm` → packed into `metadata` (no direct columns)
   */
  async recordBehavioralAnomaly(
    context: BehavioralAnomalyContext
  ): Promise<CIBDetectionResult> {
    try {
      validateAnomalyContext(context);

      const anomaly: NewBehavioralAnomaly = {
        anomaly_type: context.anomalyType,
        anomaly_score: context.anomalyScore.toString(),
        explanation: context.anomalyDescription,
        affected_users: context.affectedUsers ?? [],
        affected_content: (context.affectedContent ?? []) as unknown,
        detected_at: context.detectedAt ?? new Date(),
        is_escalated: context.isEscalated ?? false,
        false_positive: context.isFalsePositive ?? false,
        // Store additional fields in metadata since they're not in the schema
        metadata: {
          userId: context.userId,
          detectionMethod: context.detectionMethod,
          detectionAlgorithm: context.detectionAlgorithm,
          escalatedAt: context.escalatedAt,
          escalatedToModeration: context.escalatedToModeration,
          verifiedBy: context.verifiedBy,
          resolutionNotes: context.resolutionNotes,
          temporalEvidence: context.temporalEvidence ?? {},
          contentEvidence: context.contentEvidence ?? {},
          networkEvidence: context.networkEvidence ?? {},
          statisticalMeasures: context.statisticalMeasures ?? {},
        } as unknown,
      };

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .insert(behavioralAnomalies)
        .values(anomaly)
        .returning();

      const rows = result as Array<{ id?: string }>;
      const anomalyId = extractId(rows);

      logger.info(
        { anomalyId, userId: context.userId, type: context.anomalyType, score: context.anomalyScore },
        'Behavioral anomaly recorded'
      );

      return { success: true, anomalyId };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), context },
        'Failed to record behavioral anomaly'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /** Get high-severity anomalies. */
  async getHighSeverityAnomalies(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<BehavioralAnomaly>> {
    try {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .select()
        .from(behavioralAnomalies)
        .where(
          and(
            sql`CAST(${behavioralAnomalies.anomaly_score} AS DECIMAL) >= 7.0`,
            eq(behavioralAnomalies.false_positive, false)
          )
        )
        .orderBy(
          desc(behavioralAnomalies.anomaly_score),
          desc(behavioralAnomalies.detected_at)
        )
        .limit(limit + 1)
        .offset(offset);

      const rows = result as BehavioralAnomaly[];
      const anomalies = castRows<BehavioralAnomaly>(rows);
      const hasMore = anomalies.length > limit;
      const data = hasMore ? anomalies.slice(0, limit) : anomalies;

      return { data, total: data.length, hasMore };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error) },
        'Failed to get high severity anomalies'
      );
      return { data: [], total: 0, hasMore: false };
    }
  }

  /** Get user anomalies by querying metadata field. */
  async getUserAnomalies(userId: string): Promise<BehavioralAnomaly[]> {
    try {
      if (!userId) throw new Error('User ID is required');

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .select()
        .from(behavioralAnomalies)
        .where(
          sql`${behavioralAnomalies.metadata}->>'userId' = ${userId} AND ${behavioralAnomalies.false_positive} = false`
        )
        .orderBy(desc(behavioralAnomalies.detected_at))
        .limit(100);

      const rows = result as BehavioralAnomaly[];
      return castRows<BehavioralAnomaly>(rows);
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), userId },
        'Failed to get user anomalies'
      );
      return [];
    }
  }

  // ==================== CIB Detection ====================

  /**
   * Record CIB detection with validation.
   *
   * Schema mapping notes:
   * - `detectionMethod`, `detectionAlgorithm`, `severity` → packed into `metadata`
   *   (no direct columns on NewCIBDetection)
   */
  async recordCIBDetection(
    context: CIBDetectionContext
  ): Promise<CIBDetectionResult> {
    try {
      validateCIBContext(context);

      const detection: NewCIBDetection = {
        pattern_type: context.patternType,
        confidence_score: context.confidenceScore.toString(),
        pattern_description: context.patternDescription ?? `${context.patternType} pattern detected`,
        suspected_accounts: context.affectedUserIds,
        status: (context.investigationStatus === 'under_review' ? 'in_review' : context.investigationStatus) as 'pending' | 'in_review' | 'resolved' | 'escalated' | 'archived',
        investigated_by: context.investigatorId,
        investigation_notes: context.investigationNotes,
        mitigation_action: context.mitigationActions?.[0],
        // Store additional fields in metadata since they're not direct schema columns
        metadata: {
          severity: context.severity,
          detectionMethod: context.detectionMethod,
          detectionAlgorithm: context.detectionAlgorithm,
          affectedUserIds: context.affectedUserIds,
          investigationStatus: context.investigationStatus,
          evidence: context.evidence,
          mitigatedAt: context.mitigatedAt,
          mitigatedBy: context.mitigatedBy,
          coordinatedActivityIndicators: context.coordinatedActivityIndicators ?? {},
          networkAnalysis: context.networkAnalysis ?? {},
          contentAnalysis: context.contentAnalysis ?? {},
          temporalAnalysis: context.temporalAnalysis ?? {},
          isMitigated: context.isMitigated ?? false,
        } as unknown,
      };

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .insert(cibDetections)
        .values(detection)
        .returning();

      const rows = result as Array<{ id?: string }>;
      const detectionId = extractId(rows);

      logger.info(
        { detectionId, patternType: context.patternType, affectedUsers: context.affectedUserIds.length, confidence: context.confidenceScore },
        'CIB detection recorded'
      );

      return { success: true, detectionId };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error), context },
        'Failed to record CIB detection'
      );
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /** Get active CIB detections. */
  async getActiveCIBDetections(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<CIBDetection>> {
    try {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .select()
        .from(cibDetections)
        .where(
          sql`${cibDetections.metadata}->>'isMitigated' = 'false' AND ${cibDetections.metadata}->>'investigationStatus' IN ('under_investigation', 'confirmed')`
        )
        .orderBy(
          desc(cibDetections.confidence_score),
          desc(cibDetections.created_at)
        )
        .limit(limit + 1)
        .offset(offset);

      const rows = result as CIBDetection[];
      const detections = castRows<CIBDetection>(rows);
      const hasMore = detections.length > limit;
      const data = hasMore ? detections.slice(0, limit) : detections;

      return { data, total: data.length, hasMore };
    } catch (error) {
      logger.error(
        { error: getErrorMessage(error) },
        'Failed to get active CIB detections'
      );
      return { data: [], total: 0, hasMore: false };
    }
  }

  // ==================== Cleanup Operations ====================

  /**
   * Clean up old suspicious activity logs.
   * Note: DatabaseTransaction does not expose .delete() — cleanup runs directly
   * on readDatabase without a transaction wrapper.
   */
  async cleanupOldActivityLogs(
    daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS
  ): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .delete(suspiciousActivityLogs)
        .where(
          and(
            lte(suspiciousActivityLogs.created_at, cutoffDate),
            eq(suspiciousActivityLogs.requires_manual_review, false)
          )
        )
        .returning({ id: suspiciousActivityLogs.id });

      const rows = result as Array<{ id: string }>;
      const count = castRows<{ id: string }>(rows).length;
      logger.info({ count, daysOld }, 'Cleaned up old activity logs');
      return count;
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'Failed to cleanup old activity logs');
      return 0;
    }
  }

  /** Clean up resolved anomalies. */
  async cleanupResolvedAnomalies(
    daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS
  ): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      // @ts-expect-error - readDatabase returns unknown, but we know the shape
      const result: any = await readDatabase
        .delete(behavioralAnomalies)
        .where(
          and(
            lte(behavioralAnomalies.detected_at, cutoffDate),
            eq(behavioralAnomalies.false_positive, true)
          )
        )
        .returning({ id: behavioralAnomalies.id });

      const rows = result as Array<{ id: string }>;
      const count = castRows<{ id: string }>(rows).length;
      logger.info({ count, daysOld }, 'Cleaned up resolved anomalies');
      return count;
    } catch (error) {
      logger.error({ error: getErrorMessage(error) }, 'Failed to cleanup resolved anomalies');
      return 0;
    }
  }
}

export const cibDetectionService = CIBDetectionService.getInstance();