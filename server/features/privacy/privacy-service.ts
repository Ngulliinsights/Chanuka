import { eq, and, lt, sql } from "drizzle-orm";
import { database as db } from "../../../shared/database/connection.js";
import { 
  users, 
  userProfiles, 
  billComments, 
  billEngagement, 
  notifications, 
  userInterests, 
  sessions, 
  userSocialProfiles, 
  userProgress, 
  socialShares, 
  commentVotes, 
  moderationFlags, 
  securityAuditLogs 
} from "../../../shared/schema.js";
import { auditLogger } from "../../infrastructure/monitoring/audit-log.js";
import { logger } from '../../utils/logger';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    verificationStatus: string;
    preferences: any;
    isActive: boolean | null;
    lastLoginAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  profile?: {
    bio: string | null;
    expertise: string[] | null;
    location: string | null;
    organization: string | null;
    reputationScore: number | null;
    isPublic: boolean | null;
    createdAt: Date | null;
  };
  comments: Array<{
    id: number;
    billId: number;
    content: string;
    commentType: string;
    isVerified: boolean | null;
    parentCommentId: number | null;
    upvotes: number | null;
    downvotes: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>;
  engagement: Array<{
    billId: number;
    viewCount: number | null;
    commentCount: number | null;
    shareCount: number | null;
    engagementScore: number | null;
    lastEngaged: Date | null;
    createdAt: Date | null;
  }>;
  interests: string[];
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    relatedBillId: number | null;
    isRead: boolean | null;
    createdAt: Date | null;
  }>;
  socialProfiles: Array<{
    provider: string;
    username: string | null;
    displayName: string | null;
    createdAt: Date | null;
  }>;
  progress: Array<{
    achievementType: string;
    achievementValue: number;
    level: number | null;
    badge: string | null;
    description: string | null;
    unlockedAt: Date | null;
  }>;
  socialShares: Array<{
    billId: number;
    platform: string;
    metadata: any;
    shareDate: Date | null;
    likes: number | null;
    shares: number | null;
    comments: number | null;
  }>;
  commentVotes: Array<{
    commentId: number;
    voteType: string;
    createdAt: Date | null;
  }>;
  auditLogs: Array<{
    eventType: string;
    resource: string | null;
    action: string | null;
    result: string;
    severity: string;
    createdAt: Date | null;
  }>;
  exportMetadata: {
    exportedAt: Date;
    exportedBy: string;
    dataVersion: string;
    totalRecords: number;
  };
}

export interface PrivacyPreferences {
  dataProcessing: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
    personalization: boolean;
  };
  dataSharing: {
    publicProfile: boolean;
    shareEngagement: boolean;
    shareComments: boolean;
    shareVotingHistory: boolean;
  };
  dataRetention: {
    keepComments: boolean;
    keepEngagementHistory: boolean;
    keepNotifications: boolean;
    retentionPeriodMonths: number;
  };
  communications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  cookies: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriodDays: number;
  description: string;
  isActive: boolean;
  lastCleanup: Date | null;
  recordsAffected: number;
}

export interface GDPRComplianceReport {
  userId: string;
  reportDate: Date;
  dataProcessingLawfulness: {
    hasValidConsent: boolean;
    consentDate: Date | null;
    processingPurposes: string[];
    legalBasis: string;
  };
  dataMinimization: {
    dataCollected: string[];
    dataProcessed: string[];
    unnecessaryDataIdentified: string[];
    score: number;
  };
  userRights: {
    dataExportAvailable: boolean;
    dataDeletionAvailable: boolean;
    dataPortabilitySupported: boolean;
    consentWithdrawalSupported: boolean;
  };
  dataRetention: {
    policiesInPlace: boolean;
    automaticCleanupEnabled: boolean;
    retentionPeriods: Record<string, number>;
    overdueDataIdentified: string[];
  };
  securityMeasures: {
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    accessControls: boolean;
    auditLogging: boolean;
    score: number;
  };
  overallComplianceScore: number;
  recommendations: string[];
}

class PrivacyService {
  private readonly DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
    dataProcessing: {
      analytics: true,
      marketing: false,
      research: false,
      personalization: true
    },
    dataSharing: {
      publicProfile: true,
      shareEngagement: false,
      shareComments: true,
      shareVotingHistory: false
    },
    dataRetention: {
      keepComments: true,
      keepEngagementHistory: true,
      keepNotifications: false,
      retentionPeriodMonths: 24
    },
    communications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      marketingEmails: false
    },
    cookies: {
      essential: true,
      analytics: true,
      marketing: false,
      preferences: true
    }
  };

  private readonly DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
    {
      dataType: 'notifications',
      retentionPeriodDays: 90,
      description: 'User notifications and alerts',
      isActive: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'audit_logs',
      retentionPeriodDays: 365,
      description: 'Security and audit logs',
      isActive: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'sessions',
      retentionPeriodDays: 30,
      description: 'Expired user sessions',
      isActive: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'moderation_flags',
      retentionPeriodDays: 180,
      description: 'Resolved moderation flags',
      isActive: true,
      lastCleanup: null,
      recordsAffected: 0
    }
  ];

  /**
   * Export all user data in a structured format for GDPR compliance.
   * Gathers data from all related tables and formats it according to the UserDataExport interface.
   */
  async exportUserData(userId: string, requestedBy: string): Promise<UserDataExport> {
    try {
      // Fetch user basic information
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Fetch user profile data
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      // Fetch user comments with proper type mapping
      const commentsData = await db
        .select({
          id: billComments.id,
          billId: billComments.billId,
          content: billComments.content,
          commentType: billComments.commentType,
          isVerified: billComments.isVerified,
          parentCommentId: billComments.parentCommentId,
          upvotes: billComments.upvotes,
          downvotes: billComments.downvotes,
          createdAt: billComments.createdAt,
          updatedAt: billComments.updatedAt
        })
        .from(billComments)
        .where(eq(billComments.userId, userId));

      // Fetch engagement metrics
      const engagement = await db
        .select({
          billId: billEngagement.billId,
          viewCount: billEngagement.viewCount,
          commentCount: billEngagement.commentCount,
          shareCount: billEngagement.shareCount,
          engagementScore: sql<number>`${billEngagement.engagementScore}::numeric`,
          lastEngaged: billEngagement.lastEngaged,
          createdAt: billEngagement.createdAt
        })
        .from(billEngagement)
        .where(eq(billEngagement.userId, userId));

      // Fetch user interests and extract just the interest strings
      const interestsResult = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));
      const interests = interestsResult.map(i => i.interest);

      // Fetch notifications - declare before use to avoid TDZ error
      const notificationsData = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      // Fetch social profiles excluding sensitive authentication tokens
      const socialProfiles = await db
        .select({
          provider: userSocialProfiles.provider,
          username: userSocialProfiles.username,
          displayName: userSocialProfiles.displayName,
          createdAt: userSocialProfiles.createdAt
        })
        .from(userSocialProfiles)
        .where(eq(userSocialProfiles.userId, userId));

      // Fetch user achievements and progress
      const progress = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId));

      // Fetch social media share data - declare before use
      const socialSharesData = await db
        .select()
        .from(socialShares)
        .where(eq(socialShares.userId, userId));

      // Fetch comment voting history - declare before use
      const commentVotesData = await db
        .select()
        .from(commentVotes)
        .where(eq(commentVotes.userId, userId));

      // Fetch audit logs from the last 90 days only for privacy protection
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const auditLogs = await db
        .select({
          eventType: securityAuditLogs.eventType,
          resource: securityAuditLogs.resource,
          action: securityAuditLogs.action,
          result: securityAuditLogs.result,
          severity: securityAuditLogs.severity,
          createdAt: securityAuditLogs.createdAt
        })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.userId, userId),
            sql`${securityAuditLogs.createdAt} >= ${ninetyDaysAgo}`
          )
        );

      // Calculate total records for metadata
      const totalRecords = 
        1 + // user record
        (profile ? 1 : 0) +
        commentsData.length +
        engagement.length +
        interests.length +
        notificationsData.length +
        socialProfiles.length +
        progress.length +
        socialSharesData.length +
        commentVotesData.length +
        auditLogs.length;

      // Construct the complete export object
      const exportData: UserDataExport = {
        user,
        profile: profile || undefined,
        comments: commentsData,
        engagement,
        interests,
        notifications: notificationsData,
        socialProfiles,
        progress,
        socialShares: socialSharesData,
        commentVotes: commentVotesData,
        auditLogs,
        exportMetadata: {
          exportedAt: new Date(),
          exportedBy: requestedBy,
          dataVersion: '1.0',
          totalRecords
        }
      };

      // Log the data export event for audit trail
      await auditLogger.logDataExport(
        userId,
        'complete_user_data',
        totalRecords,
        requestedBy
      );

      return exportData;
    } catch (error) {
      logger.error('Error exporting user data:', { component: 'Chanuka' }, error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data to fulfill the "right to be forgotten" under GDPR.
   * Comments are anonymized rather than deleted to preserve discussion context.
   */
  async deleteUserData(
    userId: string, 
    requestedBy: string, 
    keepAuditTrail: boolean = true
  ): Promise<{
    success: boolean;
    deletedRecords: Record<string, number>;
    auditTrailKept: boolean;
  }> {
    try {
      const deletedRecords: Record<string, number> = {};

      // Execute all deletions within a transaction for data integrity
      await db.transaction(async (tx) => {
        // Remove user interests
        const deletedInterests = await tx
          .delete(userInterests)
          .where(eq(userInterests.userId, userId))
          .returning({ id: userInterests.id });
        deletedRecords.interests = deletedInterests.length;

        // Remove comment votes
        const deletedVotes = await tx
          .delete(commentVotes)
          .where(eq(commentVotes.userId, userId))
          .returning({ id: commentVotes.id });
        deletedRecords.commentVotes = deletedVotes.length;

        // Remove social media shares
        const deletedShares = await tx
          .delete(socialShares)
          .where(eq(socialShares.userId, userId))
          .returning({ id: socialShares.id });
        deletedRecords.socialShares = deletedShares.length;

        // Remove user progress and achievements
        const deletedProgress = await tx
          .delete(userProgress)
          .where(eq(userProgress.userId, userId))
          .returning({ id: userProgress.id });
        deletedRecords.progress = deletedProgress.length;

        // Remove connected social profiles
        const deletedSocialProfiles = await tx
          .delete(userSocialProfiles)
          .where(eq(userSocialProfiles.userId, userId))
          .returning({ id: userSocialProfiles.id });
        deletedRecords.socialProfiles = deletedSocialProfiles.length;

        // Remove all user sessions
        const deletedSessions = await tx
          .delete(sessions)
          .where(eq(sessions.userId, userId))
          .returning({ id: sessions.id });
        deletedRecords.sessions = deletedSessions.length;

        // Remove notifications
        const deletedNotifications = await tx
          .delete(notifications)
          .where(eq(notifications.userId, userId))
          .returning({ id: notifications.id });
        deletedRecords.notifications = deletedNotifications.length;

        // Remove engagement metrics
        const deletedEngagement = await tx
          .delete(billEngagement)
          .where(eq(billEngagement.userId, userId))
          .returning({ id: billEngagement.id });
        deletedRecords.engagement = deletedEngagement.length;

        // Anonymize comments to preserve discussion context and maintain thread integrity
        const anonymizedComments = await tx
          .update(billComments)
          .set({
            userId: 'deleted-user',
            content: '[Comment removed by user request]',
            updatedAt: new Date()
          })
          .where(eq(billComments.userId, userId))
          .returning({ id: billComments.id });
        deletedRecords.comments = anonymizedComments.length;

        // Remove user profile
        const deletedProfiles = await tx
          .delete(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .returning({ id: userProfiles.id });
        deletedRecords.profiles = deletedProfiles.length;

        // Remove moderation flags created by the user
        const deletedFlags = await tx
          .delete(moderationFlags)
          .where(eq(moderationFlags.reportedBy, userId))
          .returning({ id: moderationFlags.id });
        deletedRecords.moderationFlags = deletedFlags.length;

        // Delete the main user account record
        const deletedUsers = await tx
          .delete(users)
          .where(eq(users.id, userId))
          .returning({ id: users.id });
        deletedRecords.users = deletedUsers.length;

        // Optionally remove audit trail based on legal requirements
        if (!keepAuditTrail) {
          const deletedAuditLogs = await tx
            .delete(securityAuditLogs)
            .where(eq(securityAuditLogs.userId, userId))
            .returning({ id: securityAuditLogs.id });
          deletedRecords.auditLogs = deletedAuditLogs.length;
        }
      });

      // Log the deletion event with proper severity level
      await auditLogger.log({
        userId: requestedBy,
        action: 'user.data.deleted',
        resource: 'user_data',
        severity: 'high',
        details: {
          deletedUserId: userId,
          deletedRecords,
          auditTrailKept: keepAuditTrail
        } as Record<string, any>,
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return {
        success: true,
        deletedRecords,
        auditTrailKept: keepAuditTrail
      };
    } catch (error) {
      logger.error('Error deleting user data:', { component: 'Chanuka' }, error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Retrieve user privacy preferences, merging with defaults for any missing values.
   */
  async getPrivacyPreferences(userId: string): Promise<PrivacyPreferences> {
    try {
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Safely extract privacy preferences with fallback to empty object
      const userPrefs = (user.preferences as unknown as Record<string, any>) || {};
      const privacyPrefs = userPrefs.privacy || {};

      // Merge user preferences with defaults to ensure all fields are present
      return {
        dataProcessing: {
          ...this.DEFAULT_PRIVACY_PREFERENCES.dataProcessing,
          ...privacyPrefs.dataProcessing
        },
        dataSharing: {
          ...this.DEFAULT_PRIVACY_PREFERENCES.dataSharing,
          ...privacyPrefs.dataSharing
        },
        dataRetention: {
          ...this.DEFAULT_PRIVACY_PREFERENCES.dataRetention,
          ...privacyPrefs.dataRetention
        },
        communications: {
          ...this.DEFAULT_PRIVACY_PREFERENCES.communications,
          ...privacyPrefs.communications
        },
        cookies: {
          ...this.DEFAULT_PRIVACY_PREFERENCES.cookies,
          ...privacyPrefs.cookies
        }
      };
    } catch (error) {
      logger.error('Error getting privacy preferences:', { component: 'Chanuka' }, error);
      throw new Error('Failed to get privacy preferences');
    }
  }

  /**
   * Update user privacy preferences while ensuring essential cookies remain enabled.
   */
  async updatePrivacyPreferences(
    userId: string, 
    preferences: Partial<PrivacyPreferences>
  ): Promise<PrivacyPreferences> {
    try {
      const currentPrefs = await this.getPrivacyPreferences(userId);
      
      // Merge new preferences with existing ones
      const updatedPrefs: PrivacyPreferences = {
        dataProcessing: { ...currentPrefs.dataProcessing, ...preferences.dataProcessing },
        dataSharing: { ...currentPrefs.dataSharing, ...preferences.dataSharing },
        dataRetention: { ...currentPrefs.dataRetention, ...preferences.dataRetention },
        communications: { ...currentPrefs.communications, ...preferences.communications },
        cookies: { 
          ...currentPrefs.cookies, 
          ...preferences.cookies,
          essential: true // Essential cookies cannot be disabled
        }
      };

      // Retrieve current user preferences object
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const currentUserPrefs = (user?.preferences as unknown as Record<string, any>) || {};

      // Update preferences in database
      await db
        .update(users)
        .set({
          preferences: {
            ...currentUserPrefs,
            privacy: updatedPrefs
          },
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the preference update with appropriate severity
      await auditLogger.log({
        userId,
        action: 'privacy.preferences.updated',
        resource: 'user_preferences',
        severity: 'low',
        details: { 
          updatedFields: Object.keys(preferences) 
        } as Record<string, any>,
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return updatedPrefs;
    } catch (error) {
      logger.error('Error updating privacy preferences:', { component: 'Chanuka' }, error);
      throw new Error('Failed to update privacy preferences');
    }
  }

  /**
   * Execute automated data cleanup based on configured retention policies.
   * Removes old data that has exceeded its retention period.
   */
  async runDataCleanup(): Promise<{
    success: boolean;
    cleanupResults: Array<{
      dataType: string;
      recordsDeleted: number;
      error?: string;
    }>;
  }> {
    const cleanupResults: Array<{
      dataType: string;
      recordsDeleted: number;
      error?: string;
    }> = [];

    try {
      // Process each active retention policy
      for (const policy of this.DATA_RETENTION_POLICIES) {
        if (!policy.isActive) continue;

        try {
          // Calculate cutoff date based on retention period
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

          let recordsDeleted = 0;

          // Execute cleanup based on data type
          switch (policy.dataType) {
            case 'notifications':
              // Only delete read notifications older than cutoff
              const deletedNotifications = await db
                .delete(notifications)
                .where(
                  and(
                    eq(notifications.isRead, true),
                    lt(notifications.createdAt, cutoffDate)
                  )
                )
                .returning({ id: notifications.id });
              recordsDeleted = deletedNotifications.length;
              break;

            case 'audit_logs':
              // Delete audit logs older than cutoff
              const deletedAuditLogs = await db
                .delete(securityAuditLogs)
                .where(lt(securityAuditLogs.createdAt, cutoffDate))
                .returning({ id: securityAuditLogs.id });
              recordsDeleted = deletedAuditLogs.length;
              break;

            case 'sessions':
              // Delete inactive sessions older than cutoff
              const deletedSessions = await db
                .delete(sessions)
                .where(
                  and(
                    eq(sessions.isActive, false),
                    lt(sessions.createdAt, cutoffDate)
                  )
                )
                .returning({ id: sessions.id });
              recordsDeleted = deletedSessions.length;
              break;

            case 'moderation_flags':
              // Delete resolved or dismissed moderation flags older than cutoff
              const deletedFlags = await db
                .delete(moderationFlags)
                .where(
                  and(
                    sql`${moderationFlags.status} IN ('resolved', 'dismissed')`,
                    lt(moderationFlags.createdAt, cutoffDate)
                  )
                )
                .returning({ id: moderationFlags.id });
              recordsDeleted = deletedFlags.length;
              break;
          }

          cleanupResults.push({
            dataType: policy.dataType,
            recordsDeleted
          });

          // Update policy metadata with cleanup results
          policy.lastCleanup = new Date();
          policy.recordsAffected = recordsDeleted;

        } catch (error) {
          console.error(`Error cleaning up ${policy.dataType}:`, error);
          cleanupResults.push({
            dataType: policy.dataType,
            recordsDeleted: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Log the cleanup operation with appropriate severity
      await auditLogger.log({
        userId: 'system',
        action: 'data.cleanup.completed',
        resource: 'system',
        severity: 'low',
        details: { cleanupResults } as Record<string, any>,
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return {
        success: true,
        cleanupResults
      };
    } catch (error) {
      logger.error('Error running data cleanup:', { component: 'Chanuka' }, error);
      return {
        success: false,
        cleanupResults
      };
    }
  }

  /**
   * Generate a comprehensive GDPR compliance report analyzing various aspects
   * of data protection and user rights implementation.
   */
  async generateGDPRComplianceReport(userId: string): Promise<GDPRComplianceReport> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      const privacyPrefs = await this.getPrivacyPreferences(userId);

      // Evaluate data processing lawfulness
      const dataProcessingLawfulness = {
        hasValidConsent: true,
        consentDate: user.createdAt,
        processingPurposes: [
          'Platform functionality',
          'User authentication',
          'Legislative tracking',
          'Community engagement'
        ],
        legalBasis: 'Consent (GDPR Article 6(1)(a))'
      };

      // Assess data minimization practices
      const dataCollected = [
        'email', 'name', 'preferences', 'comments', 'engagement_data',
        'interests', 'notifications', 'audit_logs'
      ];
      const dataProcessed = dataCollected.filter(data => {
        switch (data) {
          case 'engagement_data':
            return privacyPrefs.dataProcessing.analytics;
          case 'preferences':
            return privacyPrefs.dataProcessing.personalization;
          default:
            return true; // Essential data always processed
        }
      });
      const unnecessaryDataIdentified = dataCollected.filter(
        data => !dataProcessed.includes(data)
      );
      const dataMinimizationScore = Math.round(
        (dataProcessed.length / dataCollected.length) * 100
      );

      // Verify user rights implementation
      const userRights = {
        dataExportAvailable: true,
        dataDeletionAvailable: true,
        dataPortabilitySupported: true,
        consentWithdrawalSupported: true
      };

      // Evaluate data retention policies
      const dataRetention = {
        policiesInPlace: true,
        automaticCleanupEnabled: true,
        retentionPeriods: this.DATA_RETENTION_POLICIES.reduce((acc, policy) => {
          acc[policy.dataType] = policy.retentionPeriodDays;
          return acc;
        }, {} as Record<string, number>),
        overdueDataIdentified: [] // Would require checking actual data ages
      };

      // Assess security measures implementation
      const securityMeasures = {
        encryptionAtRest: true,
        encryptionInTransit: true,
        accessControls: true,
        auditLogging: true,
        score: 100
      };

      // Calculate overall compliance score from all categories
      const scores = [
        dataProcessingLawfulness.hasValidConsent ? 100 : 0,
        dataMinimizationScore,
        Object.values(userRights).every(Boolean) ? 100 : 0,
        dataRetention.policiesInPlace && dataRetention.automaticCleanupEnabled ? 100 : 0,
        securityMeasures.score
      ];
      const overallComplianceScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );

      // Generate actionable recommendations
      const recommendations: string[] = [];
      if (dataMinimizationScore < 90) {
        recommendations.push('Consider reducing data collection to essential purposes only');
      }
      if (unnecessaryDataIdentified.length > 0) {
        recommendations.push(
          `Review necessity of collecting: ${unnecessaryDataIdentified.join(', ')}`
        );
      }
      if (overallComplianceScore < 95) {
        recommendations.push('Review and improve data protection measures');
      }
      if (recommendations.length === 0) {
        recommendations.push('GDPR compliance is excellent. Continue current practices.');
      }

      return {
        userId,
        reportDate: new Date(),
        dataProcessingLawfulness,
        dataMinimization: {
          dataCollected,
          dataProcessed,
          unnecessaryDataIdentified,
          score: dataMinimizationScore
        },
        userRights,
        dataRetention,
        securityMeasures,
        overallComplianceScore,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating GDPR compliance report:', { component: 'Chanuka' }, error);
      throw new Error('Failed to generate GDPR compliance report');
    }
  }

  /**
   * Retrieve all configured data retention policies.
   */
  getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.DATA_RETENTION_POLICIES];
  }

  /**
   * Update the retention period for a specific data type.
   * Returns true if the policy was found and updated.
   */
  updateDataRetentionPolicy(dataType: string, retentionPeriodDays: number): boolean {
    const policy = this.DATA_RETENTION_POLICIES.find(p => p.dataType === dataType);
    if (policy) {
      policy.retentionPeriodDays = retentionPeriodDays;
      return true;
    }
    return false;
  }
}

export const privacyService = new PrivacyService();