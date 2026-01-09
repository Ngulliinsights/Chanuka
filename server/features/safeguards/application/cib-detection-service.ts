import { and, desc, eq, lte, or, sql } from 'drizzle-orm';

import { logger } from '@shared/core';
import { readDatabase, withTransaction, writeDatabase } from '@shared/database/connection';
import {
  anomaly_events,
  coordinated_activity_clusters,
  suspicious_activity_patterns,
  user_behavior_profiles,
  type AnomalyEvent,
  type CoordinatedActivityCluster,
  type NewAnomalyEvent,
  type NewCoordinatedActivityCluster,
  type NewSuspiciousActivityPattern,
  type NewUserBehaviorProfile,
  type SuspiciousActivityPattern,
  type UserBehaviorProfile,
} from '@shared/schema/safeguards';

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

export interface SuspiciousPatternContext {
  patternType: string;
  patternSignature: string;
  affectedUserIds?: string[];
  affectedContent?: AffectedContent[];
  confidenceScore: number;
  severity: string;
  detectionMethod: string;
  detectionAlgorithm?: string;
  evidence: Record<string, unknown>;
  temporalEvidence?: TemporalEvidence;
  contentEvidence?: ContentEvidence;
  networkEvidence?: NetworkEvidence;
  statisticalMeasures?: StatisticalMeasures;
  firstOccurrence?: Date;
  lastOccurrence?: Date;
  occurrenceCount?: number;
  patternDurationHours?: number;
  contentManipulatedCount?: number;
  votesManipulatedCount?: number;
  usersInfluencedCount?: number;
  estimatedReach?: number;
}

interface TypicalLocation {
  country?: string;
  city?: string;
  region?: string;
}

interface CommonPhrase {
  phrase: string;
  frequency: number;
}

export interface UserBehaviorContext {
  userId: string;
  typicalPostingHours?: Record<string, number[]>;
  averageSessionDurationMinutes?: number;
  typicalSessionCountPerDay?: number;
  typicalDevices?: string[];
  typicalLocations?: TypicalLocation[];
  typicalBrowsers?: string[];
  averagePostsPerSession?: number;
  commentToViewRatio?: number;
  topicsOfInterest?: string[];
  billInteractionPattern?: string;
  averageCommentLength?: number;
  medianCommentLength?: number;
  lexicalDiversityScore?: number;
  vocabularySophistication?: number;
  sentimentDistribution?: Record<string, number>;
  commonPhrases?: CommonPhrase[];
  socialGraphCentrality?: number;
  interactionDiversity?: number;
  followerCount?: number;
  followingCount?: number;
  engagementReciprocity?: number;
  anomalyCount?: number;
  lastAnomalyDetected?: Date;
  anomalyTypes?: string[];
  anomalySeverityDistribution?: Record<string, number>;
  behavioralTrustScore?: number;
  accountAgeDays?: number;
  consistencyScore?: number;
  authenticityScore?: number;
  isSuspicious?: boolean;
  suspicionLevel?: string;
  suspicionReasons?: string[];
  flaggedForReview?: boolean;
  flaggedAt?: Date;
  flaggedBySystem?: string;
  relatedSuspiciousAccounts?: string[];
  profileLastUpdated?: Date;
  samplesCount?: number;
  profileCompleteness?: number;
}

interface SharedFingerprints {
  ipAddresses?: string[];
  deviceIds?: string[];
  userAgents?: string[];
}

interface BehavioralSimilarity {
  postingPattern?: number;
  contentStyle?: number;
  timingCorrelation?: number;
}

interface TargetContent {
  contentId: string;
  contentType: string;
  votes?: number;
}

interface ActivityTimelineItem {
  timestamp: string;
  action: string;
  userId: string;
}

export interface CoordinatedClusterContext {
  clusterSignature: string;
  clusterType: string;
  memberUserIds: string[];
  suspectedController?: string;
  temporalCorrelation: number;
  contentSimilarityScore: number;
  networkDensity: number;
  sharedFingerprints?: SharedFingerprints;
  behavioralSimilarity?: BehavioralSimilarity;
  targetContent?: TargetContent[];
  activityTimeline?: ActivityTimelineItem[];
  coordinationPattern?: string;
  detectionConfidence: number;
  detectionMethod: string;
  firstActivity?: Date;
  lastActivity?: Date;
  activityDurationHours?: number;
  contentManipulatedCount?: number;
  votesManipulatedCount?: number;
  commentsPostedCount?: number;
  usersInfluencedCount?: number;
  estimatedReach?: number;
  impactSeverity?: string;
}

export interface AnomalyEventContext {
  userId: string;
  sessionId?: string;
  anomalyType: string;
  anomalyDescription: string;
  severity: string;
  confidenceScore: number;
  expectedBehavior?: Record<string, unknown>;
  actualBehavior?: Record<string, unknown>;
  deviationMetrics?: Record<string, unknown>;
  relatedPatternId?: string;
  relatedClusterId?: string;
  relatedAnomalies?: string[];
  actionRequired?: boolean;
  actionTaken?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  resolved?: boolean;
  resolvedAt?: Date;
  resolutionReason?: string;
}

export interface CIBDetectionResult {
  success: boolean;
  patternId?: string;
  profileId?: string;
  clusterId?: string;
  anomalyId?: string;
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

// ==================== Service Class ====================

/**
 * Service for detecting and managing Coordinated Inauthentic Behavior (CIB)
 * Handles suspicious patterns, user behavior profiles, coordinated clusters, and anomaly events
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

  // ==================== Detection Methods ====================

  /**
   * Detect and record a suspicious activity pattern
   * If pattern exists, updates occurrence count; otherwise creates new pattern
   * @param context - Pattern detection context with evidence and metrics
   * @returns Detection result with pattern ID
   */
  async detectSuspiciousPattern(context: SuspiciousPatternContext): Promise<CIBDetectionResult> {
    try {
      this.validatePatternContext(context);

      const existing = await this.findExistingPattern(context.patternSignature);

      if (existing) {
        await this.updatePatternOccurrences(existing.id, context);
        logger.info('Existing suspicious pattern updated', {
          patternId: existing.id,
          patternType: context.patternType,
          occurrenceCount: (existing.occurrence_count || 0) + 1,
        });
        return { success: true, patternId: existing.id };
      }

      const pattern = this.buildPatternRecord(context);
      const result = await writeDatabase
        .insert(suspicious_activity_patterns)
        .values(pattern)
        .returning();

      logger.info('New suspicious pattern detected', {
        patternId: result[0].id,
        patternType: context.patternType,
        severity: context.severity,
        affectedUsers: context.affectedUserIds?.length || 0,
      });

      return { success: true, patternId: result[0].id };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to detect suspicious pattern', {
        error: errorMessage,
        patternType: context.patternType,
        patternSignature: context.patternSignature,
      });
      return { success: false, error: `Failed to detect suspicious pattern: ${errorMessage}` };
    }
  }

  /**
   * Update or create user behavior profile
   * Uses upsert to handle both new and existing profiles
   * @param context - User behavior context with metrics and patterns
   * @returns Detection result with profile ID
   */
  async updateUserBehaviorProfile(context: UserBehaviorContext): Promise<CIBDetectionResult> {
    try {
      this.validateUserContext(context);

      const profile = this.buildProfileRecord(context);
      const result = await writeDatabase
        .insert(user_behavior_profiles)
        .values(profile)
        .onConflictDoUpdate({
          target: user_behavior_profiles.user_id,
          set: {
            ...profile,
            updated_at: new Date(),
          },
        })
        .returning();

      logger.info('User behavior profile updated', {
        userId: context.userId,
        profileId: result[0].id,
        isSuspicious: context.isSuspicious,
        behavioralTrustScore: context.behavioralTrustScore,
      });

      return { success: true, profileId: result[0].id };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to update user behavior profile', {
        error: errorMessage,
        userId: context.userId,
      });
      return { success: false, error: `Failed to update user profile: ${errorMessage}` };
    }
  }

  /**
   * Identify and record coordinated activity cluster
   * Detects groups of accounts engaging in coordinated behavior
   * @param context - Cluster context with member IDs and coordination metrics
   * @returns Detection result with cluster ID
   */
  async identifyCoordinatedCluster(context: CoordinatedClusterContext): Promise<CIBDetectionResult> {
    try {
      this.validateClusterContext(context);

      const existing = await this.findExistingCluster(context.clusterSignature);

      if (existing) {
        logger.info('Existing coordinated cluster found', {
          clusterId: existing.id,
          clusterType: context.clusterType,
        });
        return { success: true, clusterId: existing.id };
      }

      const cluster = this.buildClusterRecord(context);
      const result = await writeDatabase
        .insert(coordinated_activity_clusters)
        .values(cluster)
        .returning();

      logger.info('New coordinated cluster identified', {
        clusterId: result[0].id,
        clusterType: context.clusterType,
        memberCount: context.memberUserIds.length,
        detectionConfidence: context.detectionConfidence,
      });

      return { success: true, clusterId: result[0].id };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to identify coordinated cluster', {
        error: errorMessage,
        clusterSignature: context.clusterSignature,
        memberCount: context.memberUserIds.length,
      });
      return { success: false, error: `Failed to identify cluster: ${errorMessage}` };
    }
  }

  /**
   * Log anomaly event for a user
   * Records behavioral anomalies and updates user profile
   * @param context - Anomaly context with deviation metrics
   * @returns Detection result with anomaly ID
   */
  async logAnomalyEvent(context: AnomalyEventContext): Promise<CIBDetectionResult> {
    try {
      this.validateAnomalyContext(context);

      const anomaly = this.buildAnomalyRecord(context);
      const result = await writeDatabase.insert(anomaly_events).values(anomaly).returning();

      // Update user profile anomaly metrics
      await this.incrementUserAnomalyCount(context.userId, context.anomalyType);

      logger.info('Anomaly event logged', {
        anomalyId: result[0].id,
        userId: context.userId,
        anomalyType: context.anomalyType,
        severity: context.severity,
        actionRequired: context.actionRequired,
      });

      return { success: true, anomalyId: result[0].id };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to log anomaly event', {
        error: errorMessage,
        userId: context.userId,
        anomalyType: context.anomalyType,
      });
      return { success: false, error: `Failed to log anomaly: ${errorMessage}` };
    }
  }

  /**
   * Log multiple anomaly events in batch for better performance
   * @param contexts - Array of anomaly contexts
   * @returns Array of detection results
   */
  async logAnomalyEventsBatch(contexts: AnomalyEventContext[]): Promise<CIBDetectionResult[]> {
    if (!contexts.length) return [];

    try {
      const anomalies = contexts.map((ctx) => this.buildAnomalyRecord(ctx));
      const results = await writeDatabase.insert(anomaly_events).values(anomalies).returning();

      // Update user profiles in batch
      const userIdCounts = new Map<string, { count: number; types: Set<string> }>();
      contexts.forEach((ctx) => {
        const existing = userIdCounts.get(ctx.userId) || { count: 0, types: new Set() };
        existing.count++;
        existing.types.add(ctx.anomalyType);
        userIdCounts.set(ctx.userId, existing);
      });

      await Promise.all(
        Array.from(userIdCounts.entries()).map(([userId, { types }]) =>
          this.incrementUserAnomalyCount(userId, Array.from(types))
        )
      );

      logger.info('Batch anomaly events logged', {
        count: results.length,
        affectedUsers: userIdCounts.size,
      });

      return results.map((result) => ({ success: true, anomalyId: result.id }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to log batch anomaly events', {
        error: errorMessage,
        batchSize: contexts.length,
      });
      return contexts.map(() => ({
        success: false,
        error: `Failed to log batch anomalies: ${errorMessage}`,
      }));
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get suspicious patterns filtered by severity
   * @param severity - Pattern severity level (optional)
   * @param limit - Maximum number of results
   * @returns Array of suspicious patterns
   */
  async getSuspiciousPatterns(
    severity?: string,
    limit = CIBDetectionService.DEFAULT_LIMIT
  ): Promise<SuspiciousActivityPattern[]> {
    try {
      const safeLimit = Math.min(limit, CIBDetectionService.MAX_LIMIT);
      const conditions = severity ? [eq(suspicious_activity_patterns.severity, severity)] : [];
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const patterns = await readDatabase
        .select()
        .from(suspicious_activity_patterns)
        .where(whereClause)
        .orderBy(desc(suspicious_activity_patterns.detected_at))
        .limit(safeLimit);

      return patterns;
    } catch (error) {
      logger.error('Failed to get suspicious patterns', { error, severity });
      return [];
    }
  }

  /**
   * Get user behavior profile by user ID
   * @param userId - User identifier
   * @returns User behavior profile or null
   */
  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
    try {
      const profiles = await readDatabase
        .select()
        .from(user_behavior_profiles)
        .where(eq(user_behavior_profiles.user_id, userId))
        .limit(1);

      return profiles[0] || null;
    } catch (error) {
      logger.error('Failed to get user behavior profile', { error, userId });
      return null;
    }
  }

  /**
   * Get multiple user behavior profiles in batch
   * @param userIds - Array of user identifiers
   * @returns Map of user IDs to profiles
   */
  async getUserBehaviorProfilesBatch(userIds: string[]): Promise<Map<string, UserBehaviorProfile>> {
    if (!userIds.length) return new Map();

    try {
      const profiles = await readDatabase
        .select()
        .from(user_behavior_profiles)
        .where(sql`${user_behavior_profiles.user_id} = ANY(${userIds})`);

      return new Map(profiles.map((profile) => [profile.user_id, profile]));
    } catch (error) {
      logger.error('Failed to get batch user behavior profiles', { error, count: userIds.length });
      return new Map();
    }
  }

  /**
   * Get active coordinated clusters
   * @param limit - Maximum number of results
   * @returns Array of active clusters
   */
  async getActiveClusters(
    limit = CIBDetectionService.DEFAULT_LIMIT
  ): Promise<CoordinatedActivityCluster[]> {
    try {
      const safeLimit = Math.min(limit, CIBDetectionService.MAX_LIMIT);
      const clusters = await readDatabase
        .select()
        .from(coordinated_activity_clusters)
        .where(eq(coordinated_activity_clusters.status, 'active'))
        .orderBy(desc(coordinated_activity_clusters.detected_at))
        .limit(safeLimit);

      return clusters;
    } catch (error) {
      logger.error('Failed to get active clusters', { error });
      return [];
    }
  }

  /**
   * Get unresolved anomaly events requiring action
   * @param limit - Maximum number of results
   * @returns Array of unresolved anomalies
   */
  async getUnresolvedAnomalies(limit = CIBDetectionService.DEFAULT_LIMIT): Promise<AnomalyEvent[]> {
    try {
      const safeLimit = Math.min(limit, CIBDetectionService.MAX_LIMIT);
      const anomalies = await readDatabase
        .select()
        .from(anomaly_events)
        .where(
          and(eq(anomaly_events.action_required, true), eq(anomaly_events.resolved, false))
        )
        .orderBy(desc(anomaly_events.detected_at))
        .limit(safeLimit);

      return anomalies;
    } catch (error) {
      logger.error('Failed to get unresolved anomalies', { error });
      return [];
    }
  }

  /**
   * Get suspicious users flagged for review
   * @param limit - Maximum number of results
   * @returns Array of suspicious user profiles
   */
  async getSuspiciousUsers(limit = CIBDetectionService.DEFAULT_LIMIT): Promise<UserBehaviorProfile[]> {
    try {
      const safeLimit = Math.min(limit, CIBDetectionService.MAX_LIMIT);
      const users = await readDatabase
        .select()
        .from(user_behavior_profiles)
        .where(
          or(
            eq(user_behavior_profiles.is_suspicious, true),
            eq(user_behavior_profiles.flagged_for_review, true)
          )
        )
        .orderBy(desc(user_behavior_profiles.behavioral_trust_score))
        .limit(safeLimit);

      return users;
    } catch (error) {
      logger.error('Failed to get suspicious users', { error });
      return [];
    }
  }

  /**
   * Get anomaly events for a specific user
   * @param userId - User identifier
   * @param limit - Maximum number of results
   * @returns Array of user's anomaly events
   */
  async getUserAnomalies(userId: string, limit = CIBDetectionService.DEFAULT_LIMIT): Promise<AnomalyEvent[]> {
    try {
      const safeLimit = Math.min(limit, CIBDetectionService.MAX_LIMIT);
      const anomalies = await readDatabase
        .select()
        .from(anomaly_events)
        .where(eq(anomaly_events.user_id, userId))
        .orderBy(desc(anomaly_events.detected_at))
        .limit(safeLimit);

      return anomalies;
    } catch (error) {
      logger.error('Failed to get user anomalies', { error, userId });
      return [];
    }
  }

  // ==================== Update Methods ====================

  /**
   * Update suspicious pattern status and actions
   * @param patternId - Pattern identifier
   * @param status - New status
   * @param actionTaken - Description of action taken
   * @param mitigationDetails - Additional mitigation details
   * @returns Success boolean
   */
  async updatePatternStatus(
    patternId: string,
    status: string,
    actionTaken?: string,
    mitigationDetails?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .update(suspicious_activity_patterns)
          .set({
            status,
            action_taken: actionTaken,
            mitigated_at: actionTaken ? new Date() : undefined,
            mitigation_details: mitigationDetails,
            updated_at: new Date(),
          })
          .where(eq(suspicious_activity_patterns.id, patternId));
      });

      logger.info('Pattern status updated', { patternId, status, actionTaken });
      return true;
    } catch (error) {
      logger.error('Failed to update pattern status', { error, patternId, status });
      return false;
    }
  }

  /**
   * Update coordinated cluster status and actions
   * @param clusterId - Cluster identifier
   * @param status - New status
   * @param actionTaken - Description of action taken
   * @param actionDetails - Additional action details
   * @returns Success boolean
   */
  async updateClusterStatus(
    clusterId: string,
    status: string,
    actionTaken?: string,
    actionDetails?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .update(coordinated_activity_clusters)
          .set({
            status,
            action_taken: actionTaken,
            action_taken_at: actionTaken ? new Date() : undefined,
            action_details: actionDetails,
            updated_at: new Date(),
          })
          .where(eq(coordinated_activity_clusters.id, clusterId));
      });

      logger.info('Cluster status updated', { clusterId, status, actionTaken });
      return true;
    } catch (error) {
      logger.error('Failed to update cluster status', { error, clusterId, status });
      return false;
    }
  }

  /**
   * Resolve anomaly event
   * @param anomalyId - Anomaly identifier
   * @param resolved - Resolution status
   * @param resolutionReason - Reason for resolution
   * @param reviewedBy - Reviewer identifier
   * @returns Success boolean
   */
  async resolveAnomaly(
    anomalyId: string,
    resolved: boolean,
    resolutionReason?: string,
    reviewedBy?: string
  ): Promise<boolean> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .update(anomaly_events)
          .set({
            resolved,
            resolved_at: resolved ? new Date() : null,
            resolution_reason: resolutionReason,
            reviewed_by: reviewedBy,
            updated_at: new Date(),
          })
          .where(eq(anomaly_events.id, anomalyId));
      });

      logger.info('Anomaly resolved', { anomalyId, resolved, resolutionReason, reviewedBy });
      return true;
    } catch (error) {
      logger.error('Failed to resolve anomaly', { error, anomalyId });
      return false;
    }
  }

  /**
   * Batch resolve multiple anomalies
   * @param anomalyIds - Array of anomaly identifiers
   * @param resolved - Resolution status
   * @param resolutionReason - Reason for resolution
   * @param reviewedBy - Reviewer identifier
   * @returns Number of successfully resolved anomalies
   */
  async resolveAnomaliesBatch(
    anomalyIds: string[],
    resolved: boolean,
    resolutionReason?: string,
    reviewedBy?: string
  ): Promise<number> {
    if (!anomalyIds.length) return 0;

    try {
      const result = await withTransaction(async (tx) => {
        return await tx
          .update(anomaly_events)
          .set({
            resolved,
            resolved_at: resolved ? new Date() : null,
            resolution_reason: resolutionReason,
            reviewed_by: reviewedBy,
            updated_at: new Date(),
          })
          .where(sql`${anomaly_events.id} = ANY(${anomalyIds})`);
      });

      const count = result.rowCount || 0;
      logger.info('Batch anomalies resolved', { count, resolved, reviewedBy });
      return count;
    } catch (error) {
      logger.error('Failed to batch resolve anomalies', { error, count: anomalyIds.length });
      return 0;
    }
  }

  // ==================== Maintenance Methods ====================

  /**
   * Clean up old resolved anomalies (background job)
   * @param olderThanDays - Remove anomalies older than this many days
   * @returns Number of deleted records
   */
  async cleanupResolvedAnomalies(olderThanDays = CIBDetectionService.DEFAULT_CLEANUP_DAYS): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await writeDatabase
        .delete(anomaly_events)
        .where(and(eq(anomaly_events.resolved, true), lte(anomaly_events.resolved_at, cutoffDate)));

      const deletedCount = result.rowCount || 0;
      logger.info('Cleaned up resolved anomalies', {
        deletedCount,
        olderThanDays,
        cutoffDate: cutoffDate.toISOString(),
      });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup resolved anomalies', { error, olderThanDays });
      return 0;
    }
  }

  /**
   * Archive old patterns (for data retention compliance)
   * @param olderThanDays - Archive patterns older than this many days
   * @returns Number of archived records
   */
  async archiveOldPatterns(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await writeDatabase
        .update(suspicious_activity_patterns)
        .set({
          status: 'archived',
          updated_at: new Date(),
        })
        .where(
          and(
            lte(suspicious_activity_patterns.detected_at, cutoffDate),
            or(
              eq(suspicious_activity_patterns.status, 'detected'),
              eq(suspicious_activity_patterns.status, 'mitigated')
            )
          )
        );

      const archivedCount = result.rowCount || 0;
      logger.info('Archived old patterns', { archivedCount, olderThanDays });
      return archivedCount;
    } catch (error) {
      logger.error('Failed to archive old patterns', { error, olderThanDays });
      return 0;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Find existing pattern by signature
   */
  private async findExistingPattern(signature: string): Promise<SuspiciousActivityPattern | null> {
    try {
      const results = await readDatabase
        .select()
        .from(suspicious_activity_patterns)
        .where(eq(suspicious_activity_patterns.pattern_signature, signature))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      logger.error('Failed to find existing pattern', { error, signature });
      return null;
    }
  }

  /**
   * Find existing cluster by signature
   */
  private async findExistingCluster(signature: string): Promise<CoordinatedActivityCluster | null> {
    try {
      const results = await readDatabase
        .select()
        .from(coordinated_activity_clusters)
        .where(eq(coordinated_activity_clusters.cluster_signature, signature))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      logger.error('Failed to find existing cluster', { error, signature });
      return null;
    }
  }

  /**
   * Update pattern occurrence count and timestamp
   */
  private async updatePatternOccurrences(
    patternId: string,
    context: SuspiciousPatternContext
  ): Promise<void> {
    try {
      await withTransaction(async (tx) => {
        await tx
          .update(suspicious_activity_patterns)
          .set({
            occurrence_count: sql`${suspicious_activity_patterns.occurrence_count} + 1`,
            last_occurrence: context.lastOccurrence || new Date(),
            updated_at: new Date(),
          })
          .where(eq(suspicious_activity_patterns.id, patternId));
      });
    } catch (error) {
      logger.error('Failed to update pattern occurrences', { error, patternId });
      throw error;
    }
  }

  /**
   * Increment user anomaly count and update last detected timestamp
   */
  private async incrementUserAnomalyCount(
    userId: string,
    anomalyTypes: string | string[]
  ): Promise<void> {
    try {
      const types = Array.isArray(anomalyTypes) ? anomalyTypes : [anomalyTypes];

      await withTransaction(async (tx) => {
        await tx
          .update(user_behavior_profiles)
          .set({
            anomaly_count: sql`${user_behavior_profiles.anomaly_count} + ${types.length}`,
            last_anomaly_detected: new Date(),
            anomaly_types: sql`array_cat(COALESCE(${user_behavior_profiles.anomaly_types}, ARRAY[]::text[]), ${types})`,
            updated_at: new Date(),
          })
          .where(eq(user_behavior_profiles.user_id, userId));
      });
    } catch (error) {
      logger.error('Failed to increment user anomaly count', { error, userId });
      throw error;
    }
  }

  /**
   * Build pattern record from context
   */
  private buildPatternRecord(context: SuspiciousPatternContext): NewSuspiciousActivityPattern {
    return {
      pattern_type: context.patternType,
      pattern_signature: context.patternSignature,
      affected_user_ids: context.affectedUserIds,
      affected_content: context.affectedContent,
      confidence_score: context.confidenceScore.toString(),
      severity: context.severity,
      detection_method: context.detectionMethod,
      detection_algorithm: context.detectionAlgorithm,
      evidence: context.evidence,
      first_occurrence: context.firstOccurrence,
      last_occurrence: context.lastOccurrence,
      occurrence_count: context.occurrenceCount || 1,
      pattern_duration_hours: context.patternDurationHours?.toString(),
      content_manipulated_count: context.contentManipulatedCount,
      votes_manipulated_count: context.votesManipulatedCount,
      users_influenced_count: context.usersInfluencedCount,
      estimated_reach: context.estimatedReach,
    };
  }

  /**
   * Build profile record from context
   */
  private buildProfileRecord(context: UserBehaviorContext): NewUserBehaviorProfile {
    const followerFollowingRatio = this.calculateFollowerRatio(
      context.followerCount,
      context.followingCount
    );

    return {
      user_id: context.userId,
      typical_posting_hours: context.typicalPostingHours,
      average_session_duration_minutes: context.averageSessionDurationMinutes,
      typical_session_count_per_day: context.typicalSessionCountPerDay?.toString(),
      typical_devices: context.typicalDevices,
      typical_locations: context.typicalLocations,
      typical_browsers: context.typicalBrowsers,
      average_posts_per_session: context.averagePostsPerSession?.toString(),
      comment_to_view_ratio: context.commentToViewRatio?.toString(),
      topics_of_interest: context.topicsOfInterest,
      bill_interaction_pattern: context.billInteractionPattern,
      average_comment_length: context.averageCommentLength,
      median_comment_length: context.medianCommentLength,
      lexical_diversity_score: context.lexicalDiversityScore?.toString(),
      vocabulary_sophistication: context.vocabularySophistication?.toString(),
      sentiment_distribution: context.sentimentDistribution,
      common_phrases: context.commonPhrases,
      social_graph_centrality: context.socialGraphCentrality?.toString(),
      interaction_diversity: context.interactionDiversity?.toString(),
      follower_count: context.followerCount,
      following_count: context.followingCount,
      follower_following_ratio: followerFollowingRatio,
      engagement_reciprocity: context.engagementReciprocity?.toString(),
      anomaly_count: context.anomalyCount,
      last_anomaly_detected: context.lastAnomalyDetected,
      anomaly_types: context.anomalyTypes,
      anomaly_severity_distribution: context.anomalySeverityDistribution,
      behavioral_trust_score: context.behavioralTrustScore?.toString(),
      account_age_days: context.accountAgeDays,
      consistency_score: context.consistencyScore?.toString(),
      authenticity_score: context.authenticityScore?.toString(),
      is_suspicious: context.isSuspicious,
      suspicion_level: context.suspicionLevel,
      suspicion_reasons: context.suspicionReasons,
      flagged_for_review: context.flaggedForReview,
      flagged_at: context.flaggedAt,
      flagged_by_system: context.flaggedBySystem,
      related_suspicious_accounts: context.relatedSuspiciousAccounts,
      profile_last_updated: context.profileLastUpdated || new Date(),
      samples_count: context.samplesCount,
      profile_completeness: context.profileCompleteness?.toString(),
    };
  }

  /**
   * Build cluster record from context
   */
  private buildClusterRecord(context: CoordinatedClusterContext): NewCoordinatedActivityCluster {
    return {
      cluster_signature: context.clusterSignature,
      cluster_type: context.clusterType,
      member_user_ids: context.memberUserIds,
      member_count: context.memberUserIds.length,
      suspected_controller: context.suspectedController,
      temporal_correlation: context.temporalCorrelation.toString(),
      content_similarity_score: context.contentSimilarityScore.toString(),
      network_density: context.networkDensity.toString(),
      shared_fingerprints: context.sharedFingerprints,
      behavioral_similarity: context.behavioralSimilarity,
      target_content: context.targetContent,
      activity_timeline: context.activityTimeline,
      coordination_pattern: context.coordinationPattern,
      detection_confidence: context.detectionConfidence.toString(),
      detection_method: context.detectionMethod,
      first_activity: context.firstActivity,
      last_activity: context.lastActivity,
      activity_duration_hours: context.activityDurationHours?.toString(),
      content_manipulated_count: context.contentManipulatedCount,
      votes_manipulated_count: context.votesManipulatedCount,
      comments_posted_count: context.commentsPostedCount,
      users_influenced_count: context.usersInfluencedCount,
      estimated_reach: context.estimatedReach,
      impact_severity: context.impactSeverity,
    };
  }

  /**
   * Build anomaly record from context
   */
  private buildAnomalyRecord(context: AnomalyEventContext): NewAnomalyEvent {
    return {
      user_id: context.userId,
      session_id: context.sessionId,
      anomaly_type: context.anomalyType,
      anomaly_description: context.anomalyDescription,
      severity: context.severity,
      confidence_score: context.confidenceScore.toString(),
      expected_behavior: context.expectedBehavior,
      actual_behavior: context.actualBehavior,
      deviation_metrics: context.deviationMetrics,
      related_pattern_id: context.relatedPatternId,
      related_cluster_id: context.relatedClusterId,
      related_anomalies: context.relatedAnomalies,
      action_required: context.actionRequired,
      action_taken: context.actionTaken,
      reviewed_by: context.reviewedBy,
      review_notes: context.reviewNotes,
      resolved: context.resolved,
      resolved_at: context.resolvedAt,
      resolution_reason: context.resolutionReason,
    };
  }

  /**
   * Calculate follower to following ratio
   */
  private calculateFollowerRatio(
    followerCount?: number,
    followingCount?: number
  ): string | undefined {
    if (followerCount === undefined || followingCount === undefined) {
      return undefined;
    }
    return (followerCount / Math.max(followingCount, 1)).toFixed(3);
  }

  /**
   * Validate pattern context
   */
  private validatePatternContext(context: SuspiciousPatternContext): void {
    if (!context.patternType) {
      throw new Error('Pattern type is required');
    }
    if (!context.patternSignature) {
      throw new Error('Pattern signature is required');
    }
    if (context.confidenceScore < 0 || context.confidenceScore > 1) {
      throw new Error('Confidence score must be between 0 and 1');
    }
    if (!context.severity) {
      throw new Error('Severity is required');
    }
  }

  /**
   * Validate user context
   */
  private validateUserContext(context: UserBehaviorContext): void {
    if (!context.userId) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Validate cluster context
   */
  private validateClusterContext(context: CoordinatedClusterContext): void {
    if (!context.clusterSignature) {
      throw new Error('Cluster signature is required');
    }
    if (!context.clusterType) {
      throw new Error('Cluster type is required');
    }
    if (!context.memberUserIds || context.memberUserIds.length === 0) {
      throw new Error('Cluster must have at least one member');
    }
    if (context.detectionConfidence < 0 || context.detectionConfidence > 1) {
      throw new Error('Detection confidence must be between 0 and 1');
    }
  }

  /**
   * Validate anomaly context
   */
  private validateAnomalyContext(context: AnomalyEventContext): void {
    if (!context.userId) {
      throw new Error('User ID is required');
    }
    if (!context.anomalyType) {
      throw new Error('Anomaly type is required');
    }
    if (!context.anomalyDescription) {
      throw new Error('Anomaly description is required');
    }
    if (context.confidenceScore < 0 || context.confidenceScore > 1) {
      throw new Error('Confidence score must be between 0 and 1');
    }
  }
}

// Export singleton instance
export const cibDetectionService = CIBDetectionService.getInstance();
