/**
 * Privacy Analytics API Service
 * Core API communication layer for privacy-focused analytics
 * Extracted from services/privacyAnalyticsService.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// Define types locally since they're not exported from the privacy analytics service
export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  userId?: string;
  anonymized: boolean;
  consentGiven: boolean;
  metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
  enabledCategories: string[];
  anonymizeData: boolean;
  respectDoNotTrack: boolean;
  consentRequired: boolean;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
}

export interface UserConsent {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  anonymizedEvents: number;
  consentedEvents: number;
  categoriesTracked: string[];
  retentionCompliance: boolean;
  lastFlush: string;
}

/**
 * Privacy Analytics API Service Class
 * Handles all privacy analytics-related API communication
 */
export class PrivacyAnalyticsApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Send analytics events to the backend
   */
  async sendEvents(events: any[]): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/analytics/events`,
        { events },
        { skipCache: true }
      );

      logger.debug('Analytics events sent successfully', {
        component: 'PrivacyAnalyticsApi',
        eventCount: events.length
      });
    } catch (error) {
      logger.error('Failed to send analytics events', {
        component: 'PrivacyAnalyticsApi',
        eventCount: events.length,
        error
      });
      throw error;
    }
  }

  /**
   * Export user analytics data
   */
  async exportUserData(userId: string): Promise<{
    events: any[];
    summary: AnalyticsMetrics;
    consent: UserConsent | null;
  }> {
    try {
      const response = await globalApiClient.get(
        `${this.baseUrl}/analytics/export/${userId}`
      );

      return response.data as {
        events: any[];
        summary: AnalyticsMetrics;
        consent: UserConsent | null;
      };
    } catch (error) {
      logger.error('Failed to export user analytics data', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Delete user analytics data
   */
  async deleteUserData(userId: string): Promise<{
    eventsDeleted: number;
    success: boolean;
  }> {
    try {
      const response = await globalApiClient.delete(
        `${this.baseUrl}/analytics/user/${userId}`,
        { skipCache: true }
      );

      logger.info('User analytics data deleted', {
        component: 'PrivacyAnalyticsApi',
        userId,
        eventsDeleted: (response.data as any).eventsDeleted
      });

      return response.data as {
        eventsDeleted: number;
        success: boolean;
      };
    } catch (error) {
      logger.error('Failed to delete user analytics data', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Get analytics configuration
   */
  async getConfig(): Promise<AnalyticsConfig> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/analytics/config`);
      return response.data as AnalyticsConfig;
    } catch (error) {
      logger.error('Failed to get analytics config', {
        component: 'PrivacyAnalyticsApi',
        error
      });
      throw error;
    }
  }

  /**
   * Update analytics configuration
   */
  async updateConfig(config: Partial<AnalyticsConfig>): Promise<AnalyticsConfig> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/analytics/config`,
        config,
        { skipCache: true }
      );

      logger.info('Analytics config updated', {
        component: 'PrivacyAnalyticsApi'
      });

      return response.data as AnalyticsConfig;
    } catch (error) {
      logger.error('Failed to update analytics config', {
        component: 'PrivacyAnalyticsApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get user consent status
   */
  async getUserConsent(userId: string): Promise<UserConsent | null> {
    try {
      const response = await globalApiClient.get(
        `${this.baseUrl}/analytics/consent/${userId}`
      );

      return response.data as UserConsent | null;
    } catch (error) {
      logger.error('Failed to get user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Update user consent
   */
  async updateUserConsent(userId: string, consent: Partial<UserConsent>): Promise<UserConsent> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/analytics/consent/${userId}`,
        consent,
        { skipCache: true }
      );

      logger.info('User consent updated', {
        component: 'PrivacyAnalyticsApi',
        userId
      });

      return response.data as UserConsent;
    } catch (error) {
      logger.error('Failed to update user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(dateRange?: {
    start: string;
    end: string;
  }): Promise<{
    totalEvents: number;
    anonymizedEvents: number;
    consentedEvents: number;
    categoriesTracked: string[];
    retentionCompliance: boolean;
    lastFlush: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('start', dateRange.start);
        params.append('end', dateRange.end);
      }

      const response = await globalApiClient.get(
        `${this.baseUrl}/analytics/metrics?${params.toString()}`
      );

      return response.data as {
        totalEvents: number;
        anonymizedEvents: number;
        consentedEvents: number;
        categoriesTracked: string[];
        retentionCompliance: boolean;
        lastFlush: string;
      };
    } catch (error) {
      logger.error('Failed to get analytics metrics', {
        component: 'PrivacyAnalyticsApi',
        error
      });
      throw error;
    }
  }

  /**
   * Withdraw user consent and delete data
   */
  async withdrawConsent(userId: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/analytics/consent/${userId}/withdraw`,
        {},
        { skipCache: true }
      );

      logger.info('User consent withdrawn', {
        component: 'PrivacyAnalyticsApi',
        userId
      });
    } catch (error) {
      logger.error('Failed to withdraw user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });
      throw error;
    }
  }
}

// Global privacy analytics API service instance
export const privacyAnalyticsApiService = new PrivacyAnalyticsApiService();