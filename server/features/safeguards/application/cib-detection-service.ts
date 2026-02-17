import { and, desc, eq, lte, sql } from 'drizzle-orm';

import { logger } from '@server/infrastructure/observability';
import {
  readDatabase,
  withTransaction,
  type DatabaseTransaction,
} from '@server/infrastructure/database/connection';
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

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Validate suspicious activity context
 */
function validateActivityContext(context: SuspiciousActivityContext): void {
  if (!context.userId && !context.ipAddress && !context.deviceFingerprint) {
    throw new Error(
      'At least one identifier (userId, ipAddress, or deviceFingerprint) is required'
    );
  }
  if (!context.activityType) {
    throw new Error('Activity type is required');
  }
  if (!context.suspicionReason) {
    throw new Error('Suspicion reason is required');
  }
  if (context.severityLevel < 1 || context.severityLevel > 5) {
    throw new Error('Severity level must be between 1 and 5');
  }
}

/**
 * Validate behavioral anomaly context
 */
function validateAnomalyContext(context: BehavioralAnomalyContext): void {
  if (!context.userId) {
    throw new Error('User ID is required');
  }
  if (!context.anomalyType) {
    throw new Error('Anomaly type is required');
  }
  if (!context.anomalyDescription) {
    throw new Error('Anomaly description is required');
  }
  if (context.anomalyScore < 0 || context.anomalyScore > 10) {
    throw new Error('Anomaly score must be between 0 and 10');
  }
  if (!context.detectionMethod) {
    throw new Error('Detection method is required');
  }
}

/**
 * Validate CIB detection context
 */
function validateCIBContext(context: CIBDetectionContext): void {
  if (!context.patternType) {
    throw new Error('Pattern type is required');
  }
  if (!context.affectedUserIds || context.affectedUserIds.length === 0) {
    throw new Error('At least one affected user is required');
  }
  if (context.affectedUserIds.length > 1000) {
    throw new Error('Cannot process more than 1000 affected users at once');
  }
  if (!context.investigationStatus) {
    throw new Error('Investigation status is required');
  }
  if (context.confidenceScore < 0 || context.confidenceScore > 1) {
    throw new Error('Confidence score must be between 0 and 1');
  }
  if (!context.severity) {
    throw new Error('Severity is required');
  }
  if (!context.detectionMethod) {
    throw new Error('Detection method is required');
  }
}

// ==================== Service Class ====================

/**
 * Service for detecting and managing Coordinated Inauthentic Behavior (CIB)
 * Handles suspicious activities, behavioral anomalies, and CIB pattern detection
 *
 * SECURITY & CONCURRENCY FEATURES:
 * - Transaction-based operations for data consistency
 * - Input validation on all operations
 * - Atomic operations using database transactions
 * - Comprehensive audit trail
 */
export class CIBDetectionService {
  private static instance: CIBDetectionService;
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 500;
  private static readonly DEFAULT_CLEANUP_DAYS = 30;

  /**
   * Get singleton instance of CIBDetectionService
   */
  static getInstance(): CIBDetectionService {
    if (!CIBDetectionService.instance) {
      CIBDetectionService.instance = new CIBDetectionService();
    }
    return CIBDetectionService.instance;
  }

  // ==================== Suspicious Activity Logging ====================

  /**
   * Log suspicious activity with validation
   * @param context - Activity context with details
   * @returns Result with activity log ID
   */
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
        related_entities: (context.relatedEntities || {}) as Record<string, unknown>,
        activity_metadata: context.activityMetadata as Record<string, unknown> | undefined,
        auto_action_taken: context.autoActionTaken,
        requires_manual_review: context.requiresManualReview ?? false,
      };

      const result = await readDatabase
        .insert(suspiciousActivityLogs)
        .values(activity)
        .returning();

      logger.info('Suspicious activity logged', {
        activityLogId: result[0]?.id,
        userId: context.userId,
        activityType: context.activityType,
        severity: context.severityLevel,
      });

      return {
        success: true,
        activityLogId: result[0]?.id,
      };
    } catch (error) {
      logger.error('Failed to log suspicious activity', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get suspicious activities for a user
   * @param userId - User identifier
   * @param limit - Maximum number of records
   * @returns Array of suspicious activity logs
   */
  async getUserSuspiciousActivities(
    userId: string,
    limit = 100
  ): Promise<SuspiciousActivityLog[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const activities = await readDatabase
        .select()
        .from(suspiciousActivityLogs)
        .where(eq(suspiciousActivityLogs.user_id, userId))
        .orderBy(desc(suspiciousActivityLogs.created_at))
        .limit(Math.min(limit, 500));

      return activities;
    } catch (error) {
      logger.error('Failed to get user suspicious activities', {
        error: getErrorMessage(error),
        userId,
      });
      return [];
    }
  }

  /**
   * Get activities requiring manual review
   * @param params - Pagination parameters
   * @returns Paginated activities
   */
  async getActivitiesForReview(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<SuspiciousActivityLog>> {
    try {
      const limit = Math.min(
        params.limit || CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset || 0;

      const activities = await readDatabase
        .select()
        .from(suspiciousActivityLogs)
        .where(eq(suspiciousActivityLogs.requires_manual_review, true))
        .orderBy(
          desc(suspiciousActivityLogs.severity_level),
          desc(suspiciousActivityLogs.created_at)
        )
        .limit(limit + 1)
        .offset(offset);

      const hasMore = activities.length > limit;
      const data = hasMore ? activities.slice(0, limit) : activities;

      return {
        data,
        total: data.length,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get activities for review', {
        error: getErrorMessage(error),
      });
      return { data: [], total: 0, hasMore: false };
    }
  }

  // ==================== Behavioral Anomaly Detection ====================

  /**
   * Record behavioral anomaly with validation
   * @param context - Anomaly context with evidence
   * @returns Result with anomaly ID
   */
  async recordBehavioralAnomaly(
    context: BehavioralAnomalyContext
  ): Promise<CIBDetectionResult> {
    try {
      validateAnomalyContext(context);

      const anomaly: NewBehavioralAnomaly = {
        anomaly_type: context.anomalyType,
        anomaly_score: context.anomalyScore.toString(),
        anomaly_description: context.anomalyDescription,
        affected_users: context.affectedUsers || [],
        affected_content: (context.affectedContent || []) as unknown,
        temporal_evidence: (context.temporalEvidence || {}) as unknown,
        content_evidence: (context.contentEvidence || {}) as unknown,
        network_evidence: (context.networkEvidence || {}) as unknown,
        statistical_measures: (context.statisticalMeasures || {}) as unknown,
        detection_method: context.detectionMethod,
        detection_algorithm: context.detectionAlgorithm,
        detected_at: context.detectedAt || new Date(),
        is_escalated: context.isEscalated ?? false,
        escalated_at: context.escalatedAt,
        escalated_to_moderation: context.escalatedToModeration ?? false,
        false_positive: context.isFalsePositive ?? false,
        verified_by: context.verifiedBy,
        resolution_notes: context.resolutionNotes,
        metadata: { userId: context.userId } as unknown,
      };

      const result = await readDatabase
        .insert(behavioralAnomalies)
        .values(anomaly)
        .returning();

      logger.info('Behavioral anomaly recorded', {
        anomalyId: result[0]?.id,
        userId: context.userId,
        type: context.anomalyType,
        score: context.anomalyScore,
      });

      return {
        success: true,
        anomalyId: result[0]?.id,
      };
    } catch (error) {
      logger.error('Failed to record behavioral anomaly', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get high-severity anomalies
   * @param params - Pagination parameters
   * @returns Paginated anomalies
   */
  async getHighSeverityAnomalies(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<BehavioralAnomaly>> {
    try {
      const limit = Math.min(
        params.limit || CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset || 0;

      const anomalies = await readDatabase
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

      const hasMore = anomalies.length > limit;
      const data = hasMore ? anomalies.slice(0, limit) : anomalies;

      return {
        data,
        total: data.length,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get high severity anomalies', {
        error: getErrorMessage(error),
      });
      return { data: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get user anomalies by querying metadata field
   * @param userId - User identifier
   * @returns Array of anomalies
   */
  async getUserAnomalies(userId: string): Promise<BehavioralAnomaly[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const anomalies = await readDatabase
        .select()
        .from(behavioralAnomalies)
        .where(
          sql`${behavioralAnomalies.metadata}->>'userId' = ${userId} AND ${behavioralAnomalies.false_positive} = false`
        )
        .orderBy(desc(behavioralAnomalies.detected_at))
        .limit(100);

      return anomalies;
    } catch (error) {
      logger.error('Failed to get user anomalies', {
        error: getErrorMessage(error),
        userId,
      });
      return [];
    }
  }

  // ==================== CIB Detection ====================

  /**
   * Record CIB detection with validation
   * @param context - CIB detection context
   * @returns Result with detection ID
   */
  async recordCIBDetection(
    context: CIBDetectionContext
  ): Promise<CIBDetectionResult> {
    try {
      validateCIBContext(context);

      const detection: NewCIBDetection = {
        pattern_type: context.patternType as CIBPatternType,
        confidence_score: context.confidenceScore.toString(),
        severity: context.severity,
        detection_method: context.detectionMethod,
        detection_algorithm: context.detectionAlgorithm,
        investigator_id: context.investigatorId,
        investigation_notes: context.investigationNotes,
        mitigation_actions: context.mitigationActions || [],
        mitigated_at: context.mitigatedAt,
        mitigated_by: context.mitigatedBy,
        metadata: {
          affectedUserIds: context.affectedUserIds,
          investigationStatus: context.investigationStatus,
          evidence: context.evidence,
          coordinatedActivityIndicators: context.coordinatedActivityIndicators || {},
          networkAnalysis: context.networkAnalysis || {},
          contentAnalysis: context.contentAnalysis || {},
          temporalAnalysis: context.temporalAnalysis || {},
          isMitigated: context.isMitigated ?? false,
        } as unknown,
      };

      const result = await readDatabase
        .insert(cibDetections)
        .values(detection)
        .returning();

      logger.info('CIB detection recorded', {
        detectionId: result[0]?.id,
        patternType: context.patternType,
        affectedUsers: context.affectedUserIds.length,
        confidence: context.confidenceScore,
      });

      return {
        success: true,
        detectionId: result[0]?.id,
      };
    } catch (error) {
      logger.error('Failed to record CIB detection', {
        error: getErrorMessage(error),
        context,
      });
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Get active CIB detections
   * @param params - Pagination parameters
   * @returns Paginated detections
   */
  async getActiveCIBDetections(
    params: PaginationParams = {}
  ): Promise<PaginatedResult<CIBDetection>> {
    try {
      const limit = Math.min(
        params.limit || CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset || 0;

      const detections = await readDatabase
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

      const hasMore = detections.length > limit;
      const data = hasMore ? detections.slice(0, limit) : detections;

      return {
        data,
        total: data.length,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get active CIB detections', {
        error: getErrorMessage(error),
      });
      return { data: [], total: 0, hasMore: false };
    }
  }

  // ==================== Cleanup Operations ====================

  /**
   * Clean up old suspicious activity logs
   * @param daysOld - Number of days old
   * @returns Number of records deleted
   */
  async cleanupOldActivityLogs(
    daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS
  ): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await withTransaction(async (tx: DatabaseTransaction) => {
        const deleted = await readDatabase
          .delete(suspiciousActivityLogs)
          .where(
            and(
              lte(suspiciousActivityLogs.created_at, cutoffDate),
              eq(suspiciousActivityLogs.requires_manual_review, false)
            )
          )
          .returning({ id: suspiciousActivityLogs.id });

        return deleted.length;
      });

      logger.info('Cleaned up old activity logs', { count: result, daysOld });
      return result;
    } catch (error) {
      logger.error('Failed to cleanup old activity logs', {
        error: getErrorMessage(error),
      });
      return 0;
    }
  }

  /**
   * Clean up resolved anomalies
   * @param daysOld - Number of days old
   * @returns Number of records deleted
   */
  async cleanupResolvedAnomalies(
    daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS
  ): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await withTransaction(async (tx: DatabaseTransaction) => {
        const deleted = await readDatabase
          .delete(behavioralAnomalies)
          .where(
            and(
              lte(behavioralAnomalies.detected_at, cutoffDate),
              eq(behavioralAnomalies.false_positive, true)
            )
          )
          .returning({ id: behavioralAnomalies.id });

        return deleted.length;
      });

      logger.info('Cleaned up resolved anomalies', { count: result, daysOld });
      return result;
    } catch (error) {
      logger.error('Failed to cleanup resolved anomalies', {
        error: getErrorMessage(error),
      });
      return 0;
    }
  }
}

// Export singleton instance
export const cibDetectionService = CIBDetectionService.getInstance();