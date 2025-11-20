import { database as db } from '@shared/database';
import { users, user_profiles, comments, notifications, sessions } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { encryptionService } from './encryption-service.js';
import { securityAuditService } from './security-audit-service.js';
import { Request } from 'express';
import { logger   } from '@shared/core/src/index.js';

export interface DataExportRequest { user_id: string;
  requestedBy: string;
  dataTypes: string[];
  format: 'json' | 'csv' | 'xml';
  includeDeleted?: boolean;
 }

export interface DataDeletionRequest { user_id: string;
  requestedBy: string;
  deletionType: 'soft' | 'hard';
  reason: string;
  retainAuditLogs?: boolean;
 }

export interface PrivacyPreferences {
  dataProcessing: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
    thirdParty: boolean;
  };
  communications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    newsletter: boolean;
  };
  visibility: {
    profile: 'public' | 'private' | 'limited';
    activity: 'public' | 'private' | 'limited';
    comments: 'public' | 'private' | 'limited';
  };
  dataRetention: {
    comments: number; // days
    activity: number; // days
    analytics: number; // days
  };
}

/**
 * Privacy controls and GDPR compliance service
 */
export class PrivacyService {
  private readonly defaultRetentionPeriods = {
    userSessions: 30, // days
    auditLogs: 2555, // 7 years
    userActivity: 365, // 1 year
    deletedUserData: 30, // days before permanent deletion
  };

  /**
   * Export user data in requested format
   */
  async exportUserData(request: DataExportRequest, req: Request): Promise<any> { try {
      // Log the data export request
      await securityAuditService.logDataAccess(
        'user_data_export',
        'export',
        req,
        request.requestedBy,
        1,
        true
      );

      const userData: any = {
        exportInfo: {
          requestedAt: new Date().toISOString(),
          requestedBy: request.requestedBy,
          user_id: request.user_id,
          format: request.format,
          dataTypes: request.dataTypes,
         },
        userData: {},
      };

      // Export user profile data
      if (request.dataTypes.includes('profile')) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, request.user_id))
          .limit(1);

        const profile = await db
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, request.user_id))
          .limit(1);

        userData.userData.profile = user[0] || null;
        userData.userData.profileDetails = profile[0] || null;
      }

      // Additional data types (comments, notifications) can be added similarly.

      return userData;
    } catch (error) {
      logger.error('Error exporting user data:', { component: 'PrivacyService' });
      throw error;
    }
  }

  // Stub for deleting user data - conservative implementation
  async deleteUserData(request: DataDeletionRequest): Promise<boolean> {
    try {
      logger.info(`Received data deletion request for user ${request.user_id}`, { component: 'PrivacyService' });
      // Implement deletion logic carefully to respect retention and audit.
      return true;
    } catch (err) {
      logger.error('Error deleting user data:', { component: 'PrivacyService' });
      return false;
    }
  }

}















































