import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { logger } from '@server/infrastructure/observability';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { db } from '@server/infrastructure/database';
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

function extractId(rows: unknown): string | undefined {
  return (rows as Array<{ id?: string }>)[0]?.id;
}

function castRows<T>(rows: unknown): T[] {
  return rows as T[];
}

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

function validateAnomalyContext(context: BehavioralAnomalyContext): void {
  if (!context.userId) throw new Error('User ID is required');
  if (!context.anomalyType) throw new Error('Anomaly type is required');
  if (!context.anomalyDescription) throw new Error('Anomaly description is required');
  if (context.anomalyScore < 0 || context.anomalyScore > 10) {
    throw new Error('Anomaly score must be between 0 and 10');
  }
  if (!context.detectionMethod) throw new Error('Detection method is required');
}

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

  async logSuspiciousActivity(context: SuspiciousActivityContext) {
    return safeAsync(async () => {
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

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'logSuspiciousActivity' });
  }

  async getUserSuspiciousActivities(userId: string, limit = 100) {
    return safeAsync(async () => {
      if (!userId) throw new Error('User ID is required');

      const result = await db
        .select()
        .from(suspiciousActivityLogs)
        .where(eq(suspiciousActivityLogs.user_id, userId))
        .orderBy(desc(suspiciousActivityLogs.created_at))
        .limit(Math.min(limit, 500));

      const rows = result as SuspiciousActivityLog[];
      return castRows<SuspiciousActivityLog>(rows);
    }, { service: 'CIBDetectionService', operation: 'getUserSuspiciousActivities' });
  }

  async getActivitiesForReview(params: PaginationParams = {}) {
    return safeAsync(async () => {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'getActivitiesForReview' });
  }

  async recordBehavioralAnomaly(context: BehavioralAnomalyContext) {
    return safeAsync(async () => {
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

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'recordBehavioralAnomaly' });
  }

  async getHighSeverityAnomalies(params: PaginationParams = {}) {
    return safeAsync(async () => {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'getHighSeverityAnomalies' });
  }

  async getUserAnomalies(userId: string) {
    return safeAsync(async () => {
      if (!userId) throw new Error('User ID is required');

      const result = await db
        .select()
        .from(behavioralAnomalies)
        .where(
          sql`${behavioralAnomalies.metadata}->>'userId' = ${userId} AND ${behavioralAnomalies.false_positive} = false`
        )
        .orderBy(desc(behavioralAnomalies.detected_at))
        .limit(100);

      const rows = result as BehavioralAnomaly[];
      return castRows<BehavioralAnomaly>(rows);
    }, { service: 'CIBDetectionService', operation: 'getUserAnomalies' });
  }

  async recordCIBDetection(context: CIBDetectionContext) {
    return safeAsync(async () => {
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

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'recordCIBDetection' });
  }

  async getActiveCIBDetections(params: PaginationParams = {}) {
    return safeAsync(async () => {
      const limit = Math.min(
        params.limit ?? CIBDetectionService.DEFAULT_LIMIT,
        CIBDetectionService.MAX_LIMIT
      );
      const offset = params.offset ?? 0;

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'getActiveCIBDetections' });
  }

  async cleanupOldActivityLogs(daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS) {
    return safeAsync(async () => {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'cleanupOldActivityLogs' });
  }

  async cleanupResolvedAnomalies(daysOld: number = CIBDetectionService.DEFAULT_CLEANUP_DAYS) {
    return safeAsync(async () => {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await db
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
    }, { service: 'CIBDetectionService', operation: 'cleanupResolvedAnomalies' });
  }
}

export const cibDetectionService = CIBDetectionService.getInstance();
