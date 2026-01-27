import { logger } from '@client/lib/utils/logger';

import { globalApiClient } from './client';
import type { DataExportResponse, DataDeletionResponse } from './types/error-response';

// ... (Keep your interfaces: AnalyticsEvent, UserConsent, etc.)

export class PrivacyAnalyticsApiService {
  private readonly endpoint = '/analytics/data';

  async exportUserData(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<DataExportResponse> {
    try {
      // ✅ Uses globalApiClient, so Auth Token is automatically attached
      const response = await globalApiClient.get<DataExportResponse>(
        `${this.endpoint}/${encodeURIComponent(userId)}/export`,
        { params: { format } }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to export user data', { component: 'PrivacyApi', userId, error });
      throw error;
    }
  }

  async deleteUserData(userId: string): Promise<DataDeletionResponse> {
    try {
      const response = await globalApiClient.delete<DataDeletionResponse>(
        `${this.endpoint}/${encodeURIComponent(userId)}`
      );

      logger.info('User data deleted', { component: 'PrivacyApi', userId });
      return response.data;
    } catch (error) {
      logger.error('Failed to delete user data', { component: 'PrivacyApi', userId, error });
      throw error;
    }
  }
}

export const privacyAnalyticsApiService = new PrivacyAnalyticsApiService();
