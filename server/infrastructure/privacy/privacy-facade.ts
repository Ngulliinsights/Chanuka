/**
 * Privacy Facade for Middleware
 * 
 * Provides a clean interface for middleware to access privacy functionality
 * without directly depending on features layer.
 */

import { privacyService } from '@server/features/privacy';

// Re-export types for middleware convenience
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
  cookies: {
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
  dataRetention?: {
    keepComments: boolean;
    keepEngagementHistory: boolean;
    retentionPeriodMonths: number;
  };
}

/**
 * Privacy Facade
 * 
 * Provides middleware-friendly interface to privacy services
 */
export class PrivacyFacade {
  /**
   * Get user's privacy preferences
   */
  async getPrivacyPreferences(user_id: string): Promise<PrivacyPreferences> {
    return privacyService.getPrivacyPreferences(user_id);
  }

  /**
   * Update user's privacy preferences
   */
  async updatePrivacyPreferences(user_id: string, preferences: Partial<PrivacyPreferences>): Promise<PrivacyPreferences> {
    return privacyService.updatePrivacyPreferences(user_id, preferences);
  }
}

// Export singleton instance
export const privacyFacade = new PrivacyFacade();
