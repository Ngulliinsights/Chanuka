/**
 * Privacy Analytics API Service
 * 
 * This service handles all privacy-focused analytics communication with the backend.
 * It provides a clean interface for tracking user events while respecting consent
 * preferences and data protection requirements (GDPR, CCPA compliance).
 * 
 * Key Features:
 * - Event batching for efficient network usage
 * - User consent management with versioning
 * - Data export for transparency (user data portability)
 * - Right to be forgotten implementation
 * - Anonymization support
 * 
 * @module PrivacyAnalyticsApiService
 */

import { globalApiClient } from './client';
import { logger } from '@client/utils/logger';
import { ErrorCode, ErrorFactory } from './errors';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a single analytics event with privacy controls
 */
export interface AnalyticsEvent {
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly action: string;
  readonly label?: string;
  readonly value?: number;
  readonly timestamp: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly anonymized: boolean;
  readonly consentGiven: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Configuration for the analytics system
 */
export interface AnalyticsConfig {
  enabledCategories: string[];
  anonymizeData: boolean;
  respectDoNotTrack: boolean;
  consentRequired: boolean;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
}

/**
 * User consent preferences with versioning for compliance tracking
 */
export interface UserConsent {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

/**
 * Aggregated metrics about the analytics system
 */
export interface AnalyticsMetrics {
  totalEvents: number;
  anonymizedEvents: number;
  consentedEvents: number;
  categoriesTracked: string[];
  retentionCompliance: boolean;
  lastFlush: string;
}

/**
 * Response structure for data export requests
 */
export interface DataExportResponse {
  events: AnalyticsEvent[];
  summary: AnalyticsMetrics;
  consent: UserConsent | null;
}

/**
 * Response structure for data deletion requests
 */
export interface DataDeletionResponse {
  eventsDeleted: number;
  success: boolean;
}

// ============================================================================
// Privacy Analytics API Service
// ============================================================================

/**
 * Service class that encapsulates all privacy analytics API operations.
 * This class follows the single responsibility principle by focusing solely
 * on API communication, while business logic remains in higher-level services.
 */
export class PrivacyAnalyticsApiService {
  private readonly baseUrl: string;

  /**
   * Creates a new Privacy Analytics API Service instance
   * @param baseUrl - Base URL for API endpoints (defaults to '/api')
   */
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Sends a batch of analytics events to the backend.
   * 
   * This method is designed for batch processing to reduce network overhead.
   * Events are validated on the backend, and any validation errors will be
   * thrown as exceptions.
   * 
   * @param events - Array of analytics events to send
   * @throws {UnifiedError} When the network request fails or validation errors occur
   * 
   * @example
   * ```typescript
   * await service.sendEvents([
   *   { id: '1', type: 'pageview', category: 'navigation', ... },
   *   { id: '2', type: 'click', category: 'interaction', ... }
   * ]);
   * ```
   */
  async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (!events || events.length === 0) {
      logger.warn('Attempted to send empty events array', {
        component: 'PrivacyAnalyticsApi'
      });
      return;
    }

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

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to send analytics events to the server',
        { eventCount: events.length, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'sendEvents' }
      );
    }
  }

  // ==========================================================================
  // Data Export & Privacy Rights
  // ==========================================================================

  /**
   * Exports all analytics data for a specific user.
   * 
   * This implements the "right to data portability" under GDPR. Users can
   * request a complete export of their analytics data in a machine-readable format.
   * 
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to the complete data export
   * @throws {UnifiedError} When the user is not found or access is denied
   * 
   * @example
   * ```typescript
   * const export = await service.exportUserData('user_123');
   * console.log(`Total events: ${export.summary.totalEvents}`);
   * ```
   */
  async exportUserData(userId: string): Promise<DataExportResponse> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'User ID is required for data export',
        { userId },
        { component: 'PrivacyAnalyticsApi', operation: 'exportUserData' }
      );
    }

    try {
      const response = await globalApiClient.get<DataExportResponse>(
        `${this.baseUrl}/analytics/export/${encodeURIComponent(userId)}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to export user analytics data', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to export user analytics data',
        { userId, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'exportUserData' }
      );
    }
  }

  /**
   * Deletes all analytics data for a specific user.
   * 
   * This implements the "right to be forgotten" under GDPR. Once data is deleted,
   * it cannot be recovered. This operation is irreversible.
   * 
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to deletion confirmation with count
   * @throws {UnifiedError} When deletion fails or user is not found
   * 
   * @example
   * ```typescript
   * const result = await service.deleteUserData('user_123');
   * console.log(`Deleted ${result.eventsDeleted} events`);
   * ```
   */
  async deleteUserData(userId: string): Promise<DataDeletionResponse> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'User ID is required for data deletion',
        { userId },
        { component: 'PrivacyAnalyticsApi', operation: 'deleteUserData' }
      );
    }

    try {
      const response = await globalApiClient.delete<DataDeletionResponse>(
        `${this.baseUrl}/analytics/user/${encodeURIComponent(userId)}`,
        { skipCache: true }
      );

      logger.info('User analytics data deleted', {
        component: 'PrivacyAnalyticsApi',
        userId,
        eventsDeleted: response.data.eventsDeleted
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to delete user analytics data', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to delete user analytics data',
        { userId, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'deleteUserData' }
      );
    }
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  /**
   * Retrieves the current analytics configuration.
   * 
   * Configuration includes settings like enabled categories, anonymization rules,
   * data retention policies, and batch processing parameters.
   * 
   * @returns Promise resolving to the current configuration
   * @throws {UnifiedError} When configuration cannot be retrieved
   */
  async getConfig(): Promise<AnalyticsConfig> {
    try {
      const response = await globalApiClient.get<AnalyticsConfig>(
        `${this.baseUrl}/analytics/config`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get analytics config', {
        component: 'PrivacyAnalyticsApi',
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to retrieve analytics configuration',
        { originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'getConfig' }
      );
    }
  }

  /**
   * Updates the analytics configuration.
   * 
   * Only administrators should have access to this endpoint. Partial updates
   * are supported - you only need to provide the fields you want to change.
   * 
   * @param config - Partial configuration object with fields to update
   * @returns Promise resolving to the updated complete configuration
   * @throws {UnifiedError} When update fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const updated = await service.updateConfig({
   *   retentionDays: 90,
   *   batchSize: 50
   * });
   * ```
   */
  async updateConfig(config: Partial<AnalyticsConfig>): Promise<AnalyticsConfig> {
    if (!config || Object.keys(config).length === 0) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'Configuration update requires at least one field',
        { config },
        { component: 'PrivacyAnalyticsApi', operation: 'updateConfig' }
      );
    }

    try {
      const response = await globalApiClient.put<AnalyticsConfig>(
        `${this.baseUrl}/analytics/config`,
        config,
        { skipCache: true }
      );

      logger.info('Analytics config updated', {
        component: 'PrivacyAnalyticsApi',
        updatedFields: Object.keys(config)
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update analytics config', {
        component: 'PrivacyAnalyticsApi',
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to update analytics configuration',
        { config, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'updateConfig' }
      );
    }
  }

  // ==========================================================================
  // Consent Management
  // ==========================================================================

  /**
   * Retrieves the current consent preferences for a user.
   * 
   * Returns null if the user hasn't provided consent yet. Consent includes
   * version tracking to handle changes in privacy policies over time.
   * 
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to consent object or null if not set
   * @throws {UnifiedError} When retrieval fails
   */
  async getUserConsent(userId: string): Promise<UserConsent | null> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'User ID is required to retrieve consent',
        { userId },
        { component: 'PrivacyAnalyticsApi', operation: 'getUserConsent' }
      );
    }

    try {
      const response = await globalApiClient.get<UserConsent | null>(
        `${this.baseUrl}/analytics/consent/${encodeURIComponent(userId)}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to retrieve user consent preferences',
        { userId, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'getUserConsent' }
      );
    }
  }

  /**
   * Updates a user's consent preferences.
   * 
   * Partial updates are supported. The timestamp is automatically updated
   * by the backend to track when consent was last modified.
   * 
   * @param userId - The unique identifier of the user
   * @param consent - Partial consent object with preferences to update
   * @returns Promise resolving to the updated complete consent object
   * @throws {UnifiedError} When update fails or validation errors occur
   * 
   * @example
   * ```typescript
   * const consent = await service.updateUserConsent('user_123', {
   *   analytics: true,
   *   performance: false
   * });
   * ```
   */
  async updateUserConsent(
    userId: string,
    consent: Partial<UserConsent>
  ): Promise<UserConsent> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'User ID is required to update consent',
        { userId },
        { component: 'PrivacyAnalyticsApi', operation: 'updateUserConsent' }
      );
    }

    if (!consent || Object.keys(consent).length === 0) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'Consent update requires at least one preference',
        { userId, consent },
        { component: 'PrivacyAnalyticsApi', operation: 'updateUserConsent' }
      );
    }

    try {
      const response = await globalApiClient.put<UserConsent>(
        `${this.baseUrl}/analytics/consent/${encodeURIComponent(userId)}`,
        consent,
        { skipCache: true }
      );

      logger.info('User consent updated', {
        component: 'PrivacyAnalyticsApi',
        userId,
        updatedPreferences: Object.keys(consent)
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to update user consent preferences',
        { userId, consent, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'updateUserConsent' }
      );
    }
  }

  /**
   * Withdraws all user consent and deletes associated data.
   * 
   * This is a destructive operation that both revokes consent and deletes
   * all analytics data. This cannot be undone. Use with caution.
   * 
   * @param userId - The unique identifier of the user
   * @throws {UnifiedError} When withdrawal fails
   * 
   * @example
   * ```typescript
   * await service.withdrawConsent('user_123');
   * // User data is now deleted and consent is withdrawn
   * ```
   */
  async withdrawConsent(userId: string): Promise<void> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'User ID is required to withdraw consent',
        { userId },
        { component: 'PrivacyAnalyticsApi', operation: 'withdrawConsent' }
      );
    }

    try {
      await globalApiClient.post(
        `${this.baseUrl}/analytics/consent/${encodeURIComponent(userId)}/withdraw`,
        {},
        { skipCache: true }
      );

      logger.info('User consent withdrawn and data deleted', {
        component: 'PrivacyAnalyticsApi',
        userId
      });
    } catch (error) {
      logger.error('Failed to withdraw user consent', {
        component: 'PrivacyAnalyticsApi',
        userId,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to withdraw user consent and delete data',
        { userId, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'withdrawConsent' }
      );
    }
  }

  // ==========================================================================
  // Metrics & Reporting
  // ==========================================================================

  /**
   * Retrieves aggregated analytics metrics.
   * 
   * Optionally filter metrics by date range. Without a date range, returns
   * all-time metrics. Useful for dashboard displays and compliance reporting.
   * 
   * @param dateRange - Optional date range filter
   * @returns Promise resolving to aggregated metrics
   * @throws {UnifiedError} When retrieval fails
   * 
   * @example
   * ```typescript
   * const metrics = await service.getMetrics({
   *   start: '2024-01-01',
   *   end: '2024-01-31'
   * });
   * ```
   */
  async getMetrics(dateRange?: {
    start: string;
    end: string;
  }): Promise<AnalyticsMetrics> {
    try {
      const params = new URLSearchParams();
      
      if (dateRange) {
        if (!dateRange.start || !dateRange.end) {
          throw ErrorFactory.createValidationError(
            ErrorCode.VALIDATION_INVALID_INPUT,
            'Date range must include both start and end dates',
            { dateRange },
            { component: 'PrivacyAnalyticsApi', operation: 'getMetrics' }
          );
        }
        params.append('start', dateRange.start);
        params.append('end', dateRange.end);
      }

      const queryString = params.toString();
      const url = queryString 
        ? `${this.baseUrl}/analytics/metrics?${queryString}`
        : `${this.baseUrl}/analytics/metrics`;

      const response = await globalApiClient.get<AnalyticsMetrics>(url);

      return response.data;
    } catch (error) {
      logger.error('Failed to get analytics metrics', {
        component: 'PrivacyAnalyticsApi',
        dateRange,
        error
      });

      throw ErrorFactory.createNetworkError(
        ErrorCode.NETWORK_REQUEST_FAILED,
        'Failed to retrieve analytics metrics',
        { dateRange, originalError: error },
        { component: 'PrivacyAnalyticsApi', operation: 'getMetrics' }
      );
    }
  }
}

// ============================================================================
// Global Instance
// ============================================================================

/**
 * Global singleton instance of the Privacy Analytics API Service.
 * Use this instance throughout your application for consistent behavior.
 * 
 * @example
 * ```typescript
 * import { privacyAnalyticsApiService } from './api/privacy';
 * 
 * await privacyAnalyticsApiService.sendEvents(events);
 * ```
 */
export const privacyAnalyticsApiService = new PrivacyAnalyticsApiService();