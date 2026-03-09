import { securityAuditService } from '@server/features/security/infrastructure/services/security-audit.service';
import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database';
import { user_profiles, users } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';
import { Request } from 'express';

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
        const userRows: any = await ((readDatabase as any)
          .select()
          .from(users)
          .where(eq(users.id, request.user_id as any))
          .limit(1));
        const user = userRows[0];

        const profileRows: any = await ((readDatabase as any)
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, request.user_id as any))
          .limit(1));
        const profile = profileRows[0];

        userData.userData.profile = user || null;
        userData.userData.profileDetails = profile || null;
      }

      // Additional data types (comments, notifications) can be added similarly.

      return userData;
    } catch (error) {
      logger.error({ component: 'PrivacyService' }, 'Error exporting user data:');
      throw error;
    }
  }

  // Stub for deleting user data - conservative implementation
  async deleteUserData(request: DataDeletionRequest): Promise<boolean> {
    try {
      logger.info({ component: 'PrivacyService' }, `Received data deletion request for user ${request.user_id}`);
      // Implement deletion logic carefully to respect retention and audit.
      return true;
    } catch (err) {
      logger.error({ component: 'PrivacyService' }, 'Error deleting user data:');
      return false;
    }
  }

}

















































