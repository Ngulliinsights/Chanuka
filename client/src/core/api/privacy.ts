/**
 * Privacy Analytics API Service
 * 
 * Handles server communication for privacy-compliant analytics
 * Implements GDPR/CCPA data protection requirements
 */

import { logger } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsEvent {
  id: string;
  type: 'track' | 'page_view' | 'engagement' | 'performance' | 'error';
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  userId?: string;
  anonymized: boolean;
  consentGiven: boolean;
  metadata?: Record<string, unknown>;
}

interface UserConsent {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

interface AnalyticsMetrics {
  totalEvents: number;
  anonymizedEvents: number;
  consentedEvents: number;
  categoriesTracked: string[];
  retentionCompliance: boolean;
  lastFlush: string;
}

interface ExportResponse {
  events: AnalyticsEvent[];
  summary: AnalyticsMetrics;
  consent: UserConsent | null;
}

interface DeleteResponse {
  eventsDeleted: number;
  success: boolean;
}

// ============================================================================
// API SERVICE
// ============================================================================

class PrivacyAnalyticsApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.VITE_API_BASE_URL || '/api';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Sends analytics events to the server
   */
  async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      const response = await this.fetchWithTimeout('/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.status} ${response.statusText}`);
      }

      logger.debug('Analytics events sent successfully', {
        component: 'PrivacyAnalyticsApiService',
        eventCount: events.length,
      });
    } catch (error) {
      logger.error('Failed to send analytics events', {
        component: 'PrivacyAnalyticsApiService',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventCount: events.length,
      });
      throw error;
    }
  }

  /**
   * Gets user consent settings
   */
  async getUserConsent(userId: string): Promise<UserConsent | null> {
    try {
      const response = await this.fetchWithTimeout(`/analytics/consent/${encodeURIComponent(userId)}`);
      
      if (response.status === 404) {
        return null; // No consent record found
      }

      if (!response.ok) {
        throw new Error(`Failed to get consent: ${response.status} ${response.statusText}`);
      }

      const consent = await response.json();
      return consent;
    } catch (error) {
      logger.error('Failed to get user consent', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Updates user consent settings
   */
  async updateUserConsent(userId: string, consent: UserConsent): Promise<UserConsent> {
    try {
      const response = await this.fetchWithTimeout(`/analytics/consent/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consent),
      });

      if (!response.ok) {
        throw new Error(`Failed to update consent: ${response.status} ${response.statusText}`);
      }

      const updatedConsent = await response.json();
      
      logger.info('User consent updated', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        consent: updatedConsent,
      });

      return updatedConsent;
    } catch (error) {
      logger.error('Failed to update user consent', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Withdraws all user consent and triggers data deletion
   */
  async withdrawConsent(userId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`/analytics/consent/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to withdraw consent: ${response.status} ${response.statusText}`);
      }

      logger.info('User consent withdrawn', {
        component: 'PrivacyAnalyticsApiService',
        userId,
      });
    } catch (error) {
      logger.error('Failed to withdraw consent', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Exports all user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<ExportResponse> {
    try {
      const response = await this.fetchWithTimeout(`/analytics/export/${encodeURIComponent(userId)}`);

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info('User data exported', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        eventCount: data.events?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Failed to export user data', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Deletes all user data for GDPR compliance
   */
  async deleteUserData(userId: string): Promise<DeleteResponse> {
    try {
      const response = await this.fetchWithTimeout(`/analytics/data/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      logger.info('User data deleted', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        eventsDeleted: result.eventsDeleted,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete user data', {
        component: 'PrivacyAnalyticsApiService',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const privacyAnalyticsApiService = new PrivacyAnalyticsApiService();