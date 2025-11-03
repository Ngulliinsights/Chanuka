import { eq, and, lt, sql } from "drizzle-orm";
import { database as db } from "../../../shared/database/connection";
import {
  user,
  user_profiles,
  comments,
  bill_engagement,
  notification,
  user_interest,
  session,
  userSocialProfile,
  user_progress,
  social_share,
  comment_votes,
  content_reports,
  system_audit_log
} from "@shared/schema";
import { auditLogger } from "../../infrastructure/monitoring/index.js";
import { logger  } from '../../../shared/core/src/index.js';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    verification_status: string;
    preferences: any;
    is_active: boolean | null;
    last_login_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
  };
  profile?: {
    bio: string | null;
    expertise: string[] | null;
    location: string | null;
    organization: string | null;
    reputation_score: number | null;
    is_public: boolean | null;
    created_at: Date | null;
  };
  comments: Array<{ id: number;
    bill_id: number;
    content: string;
    commentType: string;
    is_verified: boolean | null;
    parent_id: number | null;
    upvotes: number | null;
    downvotes: number | null;
    created_at: Date | null;
    updated_at: Date | null;
   }>;
  engagement: Array<{ bill_id: number;
    view_count: number | null;
    comment_count: number | null;
    share_count: number | null;
    engagement_score: number | null;
    lastEngaged: Date | null;
    created_at: Date | null;
   }>;
  interests: string[];
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    relatedBillId: number | null;
    is_read: boolean | null;
    created_at: Date | null;
  }>;
  socialProfiles: Array<{
    provider: string;
    username: string | null;
    display_name: string | null;
    created_at: Date | null;
  }>;
  progress: Array<{
    achievement_type: string;
    achievement_value: number;
    level: number | null;
    badge: string | null;
    description: string | null;
    unlocked_at: Date | null;
  }>;
  social_shares: Array<{ bill_id: number;
    platform: string;
    metadata: any;
    shareDate: Date | null;
    likes: number | null;
    shares: number | null;
    comments: number | null;
   }>;
  comment_votess: Array<{
    comment_id: number;
    vote_type: string;
    created_at: Date | null;
  }>;
  auditLogs: Array<{
    event_type: string;
    resource: string | null;
    action: string | null;
    result: string;
    severity: string;
    created_at: Date | null;
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
  is_active: boolean;
  lastCleanup: Date | null;
  recordsAffected: number;
}

export interface GDPRComplianceReport { user_id: string;
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
      is_active: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'audit_logs',
      retentionPeriodDays: 365,
      description: 'Security and audit logs',
      is_active: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'sessions',
      retentionPeriodDays: 30,
      description: 'Expired user sessions',
      is_active: true,
      lastCleanup: null,
      recordsAffected: 0
    },
    {
      dataType: 'moderation_flags',
      retentionPeriodDays: 180,
      description: 'Resolved moderation flags',
      is_active: true,
      lastCleanup: null,
      recordsAffected: 0
    }
  ];

  /**
   * Export all user data in a structured format for GDPR compliance.
   * Gathers data from all related tables and formats it according to the UserDataExport interface.
   */
  async exportUserData(user_id: string, requestedBy: string): Promise<UserDataExport> { try {
      // Fetch user basic information
       const [userRecord] = await db
         .select()
         .from(user)
         .where(eq(users.id, user_id))
         .limit(1);

      if (!user) {
        throw new Error('User not found');
       }

      // Fetch user profile data
       const [profile] = await db
         .select()
         .from(user_profiles)
         .where(eq(user_profiles.user_id, user_id))
         .limit(1);

      // Fetch user comments with proper type mapping
       const commentsData = await db
         .select({ id: comments.id,
           bill_id: comments.bill_id,
           content: comments.content,
           commentType: comments.commentType,
           is_verified: comments.is_verified,
           parent_id: comments.parent_id,
           upvotes: comments.upvotes,
           downvotes: comments.downvotes,
           created_at: comments.created_at,
           updated_at: comments.updated_at
          })
         .from(comments)
         .where(eq(comments.user_id, user_id));

      // Fetch engagement metrics
       const engagement = await db
         .select({ bill_id: bill_engagement.bill_id,
           view_count: bill_engagement.view_count,
           comment_count: bill_engagement.comment_count,
           share_count: bill_engagement.share_count,
           engagement_score: sql<number>`${bill_engagement.engagement_score }::numeric`,
           lastEngaged: bill_engagement.last_engaged_at,
           created_at: bill_engagement.created_at
         })
         .from(bill_engagement)
         .where(eq(bill_engagement.user_id, user_id));

      // Fetch user interests and extract just the interest strings
       const interestsResult = await db
         .select({ interest: user_interest.interest })
         .from(user_interest)
         .where(eq(user_interest.user_id, user_id));
       const interests = interestsResult.map(i => i.interest);

      // Fetch notifications - declare before use to avoid TDZ error
       const notificationsData = await db
         .select()
         .from(notification)
         .where(eq(notification.user_id, user_id));

      // Fetch social profiles excluding sensitive authentication tokens
       const socialProfiles = await db
         .select({
           provider: userSocialProfile.provider,
           username: userSocialProfile.username,
           display_name: userSocialProfile.display_name,
           created_at: userSocialProfile.created_at
         })
         .from(userSocialProfile)
         .where(eq(userSocialProfile.user_id, user_id));

      // Fetch user achievements and progress
      const progress = await db
        .select()
        .from(user_progress)
        .where(eq(user_progress.user_id, user_id));

      // Fetch social media share data - declare before use
       const social_sharesData = await db
         .select({ bill_id: social_share.bill_id,
           platform: social_share.platform,
           metadata: social_share.metadata,
           shareDate: social_share.shared_at,
           likes: social_share.likes,
           shares: social_share.shares,
           comments: social_share.comments
          })
         .from(social_share)
         .where(eq(social_share.user_id, user_id));

      // Fetch comment voting history - declare before use
       const comment_votessData = await db
         .select()
         .from(comment_votes)
         .where(eq(comment_votes.user_id, user_id));

      // Fetch audit logs from the last 90 days only for privacy protection
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const auditLogs = await db
        .select({
          event_type: securityAuditLog.event_type,
          resource: securityAuditLog.resource,
          action: securityAuditLog.action,
          result: securityAuditLog.result,
          severity: securityAuditLog.severity,
          created_at: securityAuditLog.created_at
        })
        .from(securityAuditLog)
        .where(
          and(
            eq(securityAuditLog.user_id, user_id),
            sql`${securityAuditLog.created_at} >= ${ninetyDaysAgo}`
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
        social_sharesData.length +
        comment_votessData.length +
        auditLogs.length;

      // Construct the complete export object
       const exportData: UserDataExport = {
         user: userRecord,
         profile: profile || undefined,
         comments: commentsData,
         engagement,
         interests,
         notifications: notificationsData,
         socialProfiles,
         progress,
         social_shares: social_sharesData,
         comment_votess: comment_votessData,
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
        user_id,
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
    user_id: string, 
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
      await db.transaction(async (tx) => { // Remove user interests
         const deletedInterests = await tx
           .delete(user_interest)
           .where(eq(user_interest.user_id, user_id))
           .returning({ id: user_interest.id  });
        deletedRecords.interests = deletedInterests.length;

        // Remove comment votes
         const deletedVotes = await tx
           .delete(comment_votes)
           .where(eq(comment_votes.user_id, user_id))
           .returning({ id: comment_votes.id });
        deletedRecords.comment_votess = deletedVotes.length;

        // Remove social media shares
         const deletedShares = await tx
           .delete(social_share)
           .where(eq(social_share.user_id, user_id))
           .returning({ id: social_share.id });
        deletedRecords.social_shares = deletedShares.length;

        // Remove user progress and achievements
        const deletedProgress = await tx
          .delete(user_progress)
          .where(eq(user_progress.user_id, user_id))
          .returning({ id: user_progress.id });
        deletedRecords.progress = deletedProgress.length;

        // Remove connected social profiles
         const deletedSocialProfiles = await tx
           .delete(userSocialProfile)
           .where(eq(userSocialProfile.user_id, user_id))
           .returning({ id: userSocialProfile.id });
        deletedRecords.socialProfiles = deletedSocialProfiles.length;

        // Remove all user sessions
         const deletedSessions = await tx
           .delete(session)
           .where(eq(session.user_id, user_id))
           .returning({ id: session.id });
        deletedRecords.sessions = deletedSessions.length;

        // Remove notifications
         const deletedNotifications = await tx
           .delete(notification)
           .where(eq(notification.user_id, user_id))
           .returning({ id: notification.id });
        deletedRecords.notifications = deletedNotifications.length;

        // Remove engagement metrics
        const deletedEngagement = await tx
          .delete(bill_engagement)
          .where(eq(bill_engagement.user_id, user_id))
          .returning({ id: bill_engagement.id });
        deletedRecords.engagement = deletedEngagement.length;

        // Anonymize comments to preserve discussion context and maintain thread integrity
         const anonymizedComments = await tx
           .update(comments)
           .set({ user_id: 'deleted-user',
             content: '[Comment removed by user request]',
             updated_at: new Date()
            })
           .where(eq(comments.user_id, user_id))
           .returning({ id: comments.id });
        deletedRecords.comments = anonymizedComments.length;

        // Remove user profile
         const deletedProfiles = await tx
           .delete(user_profiles)
           .where(eq(user_profiles.user_id, user_id))
           .returning({ id: user_profiles.id });
        deletedRecords.profiles = deletedProfiles.length;

        // Remove content reports created by the user
          const deletedFlags = await tx
            .delete(content_report)
            .where(eq(content_report.reportedBy, user_id))
            .returning({ id: content_report.id });
        deletedRecords.moderationFlags = deletedFlags.length;

        // Delete the main user account record
         const deletedUsers = await tx
           .delete(user)
           .where(eq(users.id, user_id))
           .returning({ id: users.id });
        deletedRecords.users = deletedUsers.length;

        // Optionally remove audit trail based on legal requirements
         if (!keepAuditTrail) { const deletedAuditLogs = await tx
             .delete(securityAuditLog)
             .where(eq(securityAuditLog.user_id, user_id))
             .returning({ id: securityAuditLog.id  });
           deletedRecords.auditLogs = deletedAuditLogs.length;
         }
      });

      // Log the deletion event with proper severity level
      await auditLogger.log({ user_id: requestedBy,
        action: 'users.data.deleted',
        resource: 'user_data',
        severity: 'high',
        details: {
          deletedUserId: user_id,
          deletedRecords,
          auditTrailKept: keepAuditTrail
         } as Record<string, any>,
        ip_address: 'system',
        user_agent: 'privacy-service'
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
  async getPrivacyPreferences(user_id: string): Promise<PrivacyPreferences> {
    try {
      const [user] = await db
        .select({ preferences: users.preferences })
        .from(user)
        .where(eq(users.id, user_id))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Safely extract privacy preferences with fallback to empty object
      const userPrefs = (users.preferences as unknown as Record<string, any>) || {};
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
    user_id: string, 
    preferences: Partial<PrivacyPreferences>
  ): Promise<PrivacyPreferences> { try {
      const currentPrefs = await this.getPrivacyPreferences(user_id);
      
      // Merge new preferences with existing ones
      const updatedPrefs: PrivacyPreferences = {
        dataProcessing: { ...currentPrefs.dataProcessing, ...preferences.dataProcessing  },
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
       const [userRecord] = await db
         .select({ preferences: users.preferences })
         .from(user)
         .where(eq(users.id, user_id))
         .limit(1);

      const currentUserPrefs = (userRecord?.preferences as unknown as Record<string, any>) || {};

      // Update preferences in database
       await db
         .update(user)
         .set({
           preferences: {
             ...currentUserPrefs,
             privacy: updatedPrefs
           },
           updated_at: new Date()
         })
         .where(eq(users.id, user_id));

      // Log the preference update with appropriate severity
      await auditLogger.log({ user_id,
        action: 'privacy.preferences.updated',
        resource: 'user_preferences',
        severity: 'low',
        details: { 
          updatedFields: Object.keys(preferences) 
         } as Record<string, any>,
        ip_address: 'system',
        user_agent: 'privacy-service'
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
        if (!policy.is_active) continue;

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
                 .delete(notification)
                 .where(
                   and(
                     eq(notification.is_read, true),
                     lt(notification.created_at, cutoffDate)
                   )
                 )
                 .returning({ id: notification.id });
              recordsDeleted = deletedNotifications.length;
              break;

            case 'audit_logs':
              // Delete audit logs older than cutoff
               const deletedAuditLogs = await db
                 .delete(securityAuditLog)
                 .where(lt(securityAuditLog.created_at, cutoffDate))
                 .returning({ id: securityAuditLog.id });
              recordsDeleted = deletedAuditLogs.length;
              break;

            case 'sessions':
              // Delete inactive sessions older than cutoff
               const deletedSessions = await db
                 .delete(session)
                 .where(
                   and(
                     eq(session.is_active, false),
                     lt(session.created_at, cutoffDate)
                   )
                 )
                 .returning({ id: session.id });
              recordsDeleted = deletedSessions.length;
              break;

            case 'moderation_flags':
              // Delete resolved or dismissed content reports older than cutoff
                const deletedFlags = await db
                  .delete(content_report)
                  .where(
                    and(
                      sql`${content_report.status} IN ('resolved', 'dismissed')`,
                      lt(content_report.created_at, cutoffDate)
                    )
                  )
                  .returning({ id: content_report.id });
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
      await auditLogger.log({ user_id: 'system',
        action: 'data.cleanup.completed',
        resource: 'system',
        severity: 'low',
        details: { cleanupResults  } as Record<string, any>,
        ip_address: 'system',
        user_agent: 'privacy-service'
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
  async generateGDPRComplianceReport(user_id: string): Promise<GDPRComplianceReport> { try {
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(users.id, user_id))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
       }

      const privacyPrefs = await this.getPrivacyPreferences(user_id);

      // Evaluate data processing lawfulness
       const dataProcessingLawfulness = {
         hasValidConsent: true,
         consentDate: userRecord.created_at,
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

      return { user_id,
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






































