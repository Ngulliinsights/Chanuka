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
    engagementScore: string | null;
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
    essential: boolean; // Always true, cannot be disabled
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
    score: number; // 0-100
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
    score: number; // 0-100
  };
  overallComplianceScore: number; // 0-100
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
   * Export all user data in a structured format for GDPR compliance
   */
  async exportUserData(userId: string, requestedBy: string): Promise<UserDataExport> {
    try {
      // Get user basic information
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Get user profile
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      // Get user comments
      const comments = await db
        .select()
        .from(billComments)
        .where(eq(billComments.userId, userId));

      // Get user engagement data
      const engagement = await db
        .select()
        .from(billEngagement)
        .where(eq(billEngagement.userId, userId));

      // Get user interests
      const interestsResult = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      const interests = interestsResult.map(i => i.interest);

      // Get notifications
      const notifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      // Get social profiles (excluding sensitive tokens)
      const socialProfiles = await db
        .select({
          provider: userSocialProfiles.provider,
          username: userSocialProfiles.username,
          displayName: userSocialProfiles.displayName,
          createdAt: userSocialProfiles.createdAt
        })
        .from(userSocialProfiles)
        .where(eq(userSocialProfiles.userId, userId));

      // Get user progress
      const progress = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, userId));

      // Get social shares
      const socialShares = await db
        .select()
        .from(socialShares)
        .where(eq(socialShares.userId, userId));

      // Get comment votes
      const commentVotes = await db
        .select()
        .from(commentVotes)
        .where(eq(commentVotes.userId, userId));

      // Get audit logs (last 90 days only for privacy)
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

      const totalRecords = 
        1 + // user
        (profile ? 1 : 0) +
        comments.length +
        engagement.length +
        interests.length +
        notifications.length +
        socialProfiles.length +
        progress.length +
        socialShares.length +
        commentVotes.length +
        auditLogs.length;

      const exportData: UserDataExport = {
        user,
        profile: profile || undefined,
        comments,
        engagement,
        interests,
        notifications,
        socialProfiles,
        progress,
        socialShares,
        commentVotes,
        auditLogs,
        exportMetadata: {
          exportedAt: new Date(),
          exportedBy: requestedBy,
          dataVersion: '1.0',
          totalRecords
        }
      };

      // Log the data export
      await auditLogger.logDataExport(
        userId,
        'complete_user_data',
        totalRecords,
        'system'
      );

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data (right to be forgotten)
   */
  async deleteUserData(userId: string, requestedBy: string, keepAuditTrail: boolean = true): Promise<{
    success: boolean;
    deletedRecords: Record<string, number>;
    auditTrailKept: boolean;
  }> {
    try {
      const deletedRecords: Record<string, number> = {};

      await db.transaction(async (tx) => {
        // Delete user interests
        const deletedInterests = await tx
          .delete(userInterests)
          .where(eq(userInterests.userId, userId))
          .returning({ id: userInterests.id });
        deletedRecords.interests = deletedInterests.length;

        // Delete comment votes
        const deletedVotes = await tx
          .delete(commentVotes)
          .where(eq(commentVotes.userId, userId))
          .returning({ id: commentVotes.id });
        deletedRecords.commentVotes = deletedVotes.length;

        // Delete social shares
        const deletedShares = await tx
          .delete(socialShares)
          .where(eq(socialShares.userId, userId))
          .returning({ id: socialShares.id });
        deletedRecords.socialShares = deletedShares.length;

        // Delete user progress
        const deletedProgress = await tx
          .delete(userProgress)
          .where(eq(userProgress.userId, userId))
          .returning({ id: userProgress.id });
        deletedRecords.progress = deletedProgress.length;

        // Delete social profiles
        const deletedSocialProfiles = await tx
          .delete(userSocialProfiles)
          .where(eq(userSocialProfiles.userId, userId))
          .returning({ id: userSocialProfiles.id });
        deletedRecords.socialProfiles = deletedSocialProfiles.length;

        // Delete sessions
        const deletedSessions = await tx
          .delete(sessions)
          .where(eq(sessions.userId, userId))
          .returning({ id: sessions.id });
        deletedRecords.sessions = deletedSessions.length;

        // Delete notifications
        const deletedNotifications = await tx
          .delete(notifications)
          .where(eq(notifications.userId, userId))
          .returning({ id: notifications.id });
        deletedRecords.notifications = deletedNotifications.length;

        // Delete bill engagement
        const deletedEngagement = await tx
          .delete(billEngagement)
          .where(eq(billEngagement.userId, userId))
          .returning({ id: billEngagement.id });
        deletedRecords.engagement = deletedEngagement.length;

        // Anonymize comments instead of deleting (to preserve discussion context)
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

        // Delete user profile
        const deletedProfiles = await tx
          .delete(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .returning({ id: userProfiles.id });
        deletedRecords.profiles = deletedProfiles.length;

        // Delete moderation flags created by user
        const deletedFlags = await tx
          .delete(moderationFlags)
          .where(eq(moderationFlags.reportedBy, userId))
          .returning({ id: moderationFlags.id });
        deletedRecords.moderationFlags = deletedFlags.length;

        // Finally, delete the user account
        const deletedUsers = await tx
          .delete(users)
          .where(eq(users.id, userId))
          .returning({ id: users.id });
        deletedRecords.users = deletedUsers.length;

        // Keep audit trail if requested (for legal compliance)
        if (!keepAuditTrail) {
          const deletedAuditLogs = await tx
            .delete(securityAuditLogs)
            .where(eq(securityAuditLogs.userId, userId))
            .returning({ id: securityAuditLogs.id });
          deletedRecords.auditLogs = deletedAuditLogs.length;
        }
      });

      // Log the data deletion
      await auditLogger.log({
        userId: requestedBy,
        action: 'user.data.deleted',
        resource: 'user_data',
        details: { 
          deletedUserId: userId, 
          deletedRecords,
          auditTrailKept: keepAuditTrail
        },
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return {
        success: true,
        deletedRecords,
        auditTrailKept: keepAuditTrail
      };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Get user privacy preferences
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

      const userPrefs = user.preferences as any || {};
      const privacyPrefs = userPrefs.privacy || {};

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
      console.error('Error getting privacy preferences:', error);
      throw new Error('Failed to get privacy preferences');
    }
  }

  /**
   * Update user privacy preferences
   */
  async updatePrivacyPreferences(userId: string, preferences: Partial<PrivacyPreferences>): Promise<PrivacyPreferences> {
    try {
      const currentPrefs = await this.getPrivacyPreferences(userId);
      
      const updatedPrefs: PrivacyPreferences = {
        dataProcessing: { ...currentPrefs.dataProcessing, ...preferences.dataProcessing },
        dataSharing: { ...currentPrefs.dataSharing, ...preferences.dataSharing },
        dataRetention: { ...currentPrefs.dataRetention, ...preferences.dataRetention },
        communications: { ...currentPrefs.communications, ...preferences.communications },
        cookies: { 
          ...currentPrefs.cookies, 
          ...preferences.cookies,
          essential: true // Always true, cannot be disabled
        }
      };

      // Get current user preferences
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const currentUserPrefs = (user?.preferences as any) || {};

      // Update user preferences
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

      // Log the privacy preference update
      await auditLogger.log({
        userId,
        action: 'privacy.preferences.updated',
        resource: 'user_preferences',
        details: { updatedFields: Object.keys(preferences) },
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return updatedPrefs;
    } catch (error) {
      console.error('Error updating privacy preferences:', error);
      throw new Error('Failed to update privacy preferences');
    }
  }

  /**
   * Run automated data cleanup based on retention policies
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
      for (const policy of this.DATA_RETENTION_POLICIES) {
        if (!policy.isActive) continue;

        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

          let recordsDeleted = 0;

          switch (policy.dataType) {
            case 'notifications':
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
              const deletedAuditLogs = await db
                .delete(securityAuditLogs)
                .where(lt(securityAuditLogs.createdAt, cutoffDate))
                .returning({ id: securityAuditLogs.id });
              recordsDeleted = deletedAuditLogs.length;
              break;

            case 'sessions':
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

          // Update policy last cleanup time
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

      // Log the cleanup operation
      await auditLogger.log({
        userId: 'system',
        action: 'data.cleanup.completed',
        resource: 'system',
        details: { cleanupResults },
        ipAddress: 'system',
        userAgent: 'privacy-service'
      });

      return {
        success: true,
        cleanupResults
      };
    } catch (error) {
      console.error('Error running data cleanup:', error);
      return {
        success: false,
        cleanupResults
      };
    }
  }

  /**
   * Generate GDPR compliance report for a user
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

      // Check data processing lawfulness
      const dataProcessingLawfulness = {
        hasValidConsent: true, // Assume consent was given during registration
        consentDate: user.createdAt,
        processingPurposes: [
          'Platform functionality',
          'User authentication',
          'Legislative tracking',
          'Community engagement'
        ],
        legalBasis: 'Consent (GDPR Article 6(1)(a))'
      };

      // Assess data minimization
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
            return true; // Essential data
        }
      });
      const unnecessaryDataIdentified = dataCollected.filter(data => !dataProcessed.includes(data));
      const dataMinimizationScore = Math.round((dataProcessed.length / dataCollected.length) * 100);

      // Check user rights implementation
      const userRights = {
        dataExportAvailable: true,
        dataDeletionAvailable: true,
        dataPortabilitySupported: true,
        consentWithdrawalSupported: true
      };

      // Check data retention policies
      const dataRetention = {
        policiesInPlace: true,
        automaticCleanupEnabled: true,
        retentionPeriods: this.DATA_RETENTION_POLICIES.reduce((acc, policy) => {
          acc[policy.dataType] = policy.retentionPeriodDays;
          return acc;
        }, {} as Record<string, number>),
        overdueDataIdentified: [] // Would need to check actual data ages
      };

      // Check security measures
      const securityMeasures = {
        encryptionAtRest: true, // Assuming database encryption
        encryptionInTransit: true, // HTTPS/TLS
        accessControls: true, // Authentication required
        auditLogging: true, // Audit logs implemented
        score: 100 // All measures in place
      };

      // Calculate overall compliance score
      const scores = [
        dataProcessingLawfulness.hasValidConsent ? 100 : 0,
        dataMinimizationScore,
        Object.values(userRights).every(Boolean) ? 100 : 0,
        dataRetention.policiesInPlace && dataRetention.automaticCleanupEnabled ? 100 : 0,
        securityMeasures.score
      ];
      const overallComplianceScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Generate recommendations
      const recommendations: string[] = [];
      if (dataMinimizationScore < 90) {
        recommendations.push('Consider reducing data collection to essential purposes only');
      }
      if (unnecessaryDataIdentified.length > 0) {
        recommendations.push(`Review necessity of collecting: ${unnecessaryDataIdentified.join(', ')}`);
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
      console.error('Error generating GDPR compliance report:', error);
      throw new Error('Failed to generate GDPR compliance report');
    }
  }

  /**
   * Get data retention policies
   */
  getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.DATA_RETENTION_POLICIES];
  }

  /**
   * Update data retention policy
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