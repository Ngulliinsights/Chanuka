/**
 * User Profile Service
 * 
 * Service layer for user profile operations using modern error handling.
 * Migrated from direct controller logic to service layer with AsyncServiceResult.
 */

import { safeAsync, type AsyncServiceResult, createSystemError, createNotFoundError, createAuthorizationError } from '@server/infrastructure/error-handling';
import { user_profileservice } from '@shared/domain/user-profile';
import { logger } from '@server/infrastructure/observability';
import type { z } from 'zod';

/**
 * Profile data types
 */
export interface ProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

export interface BasicInfoData {
  first_name?: string;
  last_name?: string;
  name?: string;
}

export interface InterestsData {
  interests: string[];
}

export interface PreferencesData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  billCategories?: string[];
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface VerificationData {
  verification_status: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: any;
  verificationNotes?: string;
}

export interface EngagementData {
  engagement_type: 'view' | 'comment' | 'share';
}

/**
 * User Profile Service
 * 
 * Provides business logic for user profile operations with type-safe error handling.
 */
export class UserProfileService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching user profile');
      
      const profile = await user_profileservice.getUserProfile(userId);
      
      if (!profile) {
        throw createNotFoundError('UserProfile', userId, {
          service: 'UserProfileService',
          operation: 'getUserProfile'
        });
      }
      
      return profile;
    }, {
      service: 'UserProfileService',
      operation: 'getUserProfile',
      metadata: { userId }
    });
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: ProfileData): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId, fields: Object.keys(profileData) }, 'Updating user profile');
      
      const updatedProfile = await user_profileservice.updateUserProfile(userId, profileData);
      
      return updatedProfile;
    }, {
      service: 'UserProfileService',
      operation: 'updateUserProfile',
      metadata: { userId, fields: Object.keys(profileData) }
    });
  }

  /**
   * Update basic user information
   */
  async updateUserBasicInfo(userId: string, basicInfo: BasicInfoData): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId, fields: Object.keys(basicInfo) }, 'Updating basic info');
      
      const updatedProfile = await user_profileservice.updateUserBasicInfo(userId, basicInfo);
      
      return updatedProfile;
    }, {
      service: 'UserProfileService',
      operation: 'updateUserBasicInfo',
      metadata: { userId, fields: Object.keys(basicInfo) }
    });
  }

  /**
   * Update user interests
   */
  async updateUserInterests(userId: string, interests: string[]): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId, interestCount: interests.length }, 'Updating user interests');
      
      const updatedProfile = await user_profileservice.updateUserInterests(userId, { interests });
      
      return updatedProfile;
    }, {
      service: 'UserProfileService',
      operation: 'updateUserInterests',
      metadata: { userId, interestCount: interests.length }
    });
  }

  /**
   * Get complete user profile (profile + preferences)
   */
  async getCompleteProfile(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching complete profile');
      
      const profile = await user_profileservice.getCompleteProfile(userId);
      
      if (!profile) {
        throw createNotFoundError('UserProfile', userId, {
          service: 'UserProfileService',
          operation: 'getCompleteProfile'
        });
      }
      
      return profile;
    }, {
      service: 'UserProfileService',
      operation: 'getCompleteProfile',
      metadata: { userId }
    });
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching user preferences');
      
      const preferences = await user_profileservice.getUserPreferences(userId);
      
      return preferences;
    }, {
      service: 'UserProfileService',
      operation: 'getUserPreferences',
      metadata: { userId }
    });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: PreferencesData): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId, fields: Object.keys(preferences) }, 'Updating user preferences');
      
      const updatedPreferences = await user_profileservice.updateUserPreferences(userId, preferences);
      
      return updatedPreferences;
    }, {
      service: 'UserProfileService',
      operation: 'updateUserPreferences',
      metadata: { userId, fields: Object.keys(preferences) }
    });
  }

  /**
   * Get user verification status
   */
  async getUserVerificationStatus(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching verification status');
      
      const verification = await user_profileservice.getUserVerificationStatus(userId);
      
      return verification;
    }, {
      service: 'UserProfileService',
      operation: 'getUserVerificationStatus',
      metadata: { userId }
    });
  }

  /**
   * Update user verification status
   * Requires admin role for non-pending status changes
   */
  async updateUserVerificationStatus(
    userId: string,
    verificationData: VerificationData,
    requestingUserRole: string
  ): AsyncServiceResult<any> {
    return safeAsync(async () => {
      // Authorization check: only admins can approve/reject verification
      if (verificationData.verification_status !== 'pending' && requestingUserRole !== 'admin') {
        throw createAuthorizationError(
          'UserVerification',
          'update_status',
          {
            service: 'UserProfileService',
            operation: 'updateUserVerificationStatus',
            metadata: { userId, requestingUserRole, requestedStatus: verificationData.verification_status }
          }
        );
      }

      logger.info({ userId, status: verificationData.verification_status }, 'Updating verification status');
      
      const updatedVerification = await user_profileservice.updateUserVerificationStatus(userId, verificationData);
      
      return updatedVerification;
    }, {
      service: 'UserProfileService',
      operation: 'updateUserVerificationStatus',
      metadata: { userId, status: verificationData.verification_status }
    });
  }

  /**
   * Get user engagement history
   */
  async getUserEngagementHistory(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching engagement history');
      
      const engagement = await user_profileservice.getUserEngagementHistory(userId);
      
      return engagement;
    }, {
      service: 'UserProfileService',
      operation: 'getUserEngagementHistory',
      metadata: { userId }
    });
  }

  /**
   * Track user engagement with a bill
   */
  async trackBillEngagement(
    userId: string,
    billId: string,
    engagementType: 'view' | 'comment' | 'share'
  ): AsyncServiceResult<void> {
    return safeAsync(async () => {
      logger.info({ userId, billId, engagementType }, 'Tracking bill engagement');
      
      await user_profileservice.trackBillEngagement(userId, billId, { engagement_type: engagementType });
    }, {
      service: 'UserProfileService',
      operation: 'trackBillEngagement',
      metadata: { userId, billId, engagementType }
    });
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string): AsyncServiceResult<any[]> {
    return safeAsync(async () => {
      logger.info({ query }, 'Searching users');
      
      const users = await user_profileservice.searchUsers(query);
      
      return users;
    }, {
      service: 'UserProfileService',
      operation: 'searchUsers',
      metadata: { query }
    });
  }

  /**
   * Get public user profile
   */
  async getPublicProfile(userId: string): AsyncServiceResult<any> {
    return safeAsync(async () => {
      logger.info({ userId }, 'Fetching public profile');
      
      const profile = await user_profileservice.getPublicProfile(userId);
      
      if (!profile) {
        throw createNotFoundError('UserProfile', userId, {
          service: 'UserProfileService',
          operation: 'getPublicProfile'
        });
      }
      
      return profile;
    }, {
      service: 'UserProfileService',
      operation: 'getPublicProfile',
      metadata: { userId }
    });
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();
