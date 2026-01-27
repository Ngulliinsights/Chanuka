/**
 * Analytics API Service
 * Core API communication layer for analytics functionality
 * Provides type-safe, consistent interface for all analytics operations
 */

import type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  AnalyticsResponse,
  UserActivity,
  AnalyticsAlert,
  StakeholderAnalysis,
  AnalyticsExport,
} from '@client/lib/types/analytics';
import { logger } from '@client/lib/utils/logger';

import { globalErrorHandler } from './errors';
import type { ApiClient, UnifiedApiClient, UnknownError, AxiosErrorResponse } from './types';

/**
 * Centralized service for all analytics-related API operations.
 * Provides consistent error handling, logging, and type safety across
 * the analytics layer.
 */
export class AnalyticsApiService {
  // private readonly _baseUrl: string;
  private readonly analyticsEndpoint: string;
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient, baseUrl: string = '/api') {
    this.apiClient = apiClient;
    // this._baseUrl = baseUrl;
    this.analyticsEndpoint = `${baseUrl}/analytics`;
  }

  /**
   * Get analytics dashboard data with optional filters
   */
  async getDashboard(filters?: AnalyticsFilters): Promise<DashboardData> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      if (filters?.billStatus?.length) {
        filters.billStatus.forEach(status => params.append('status', status));
      }

      const response = await this.apiClient.get<DashboardData>(
        `${this.analyticsEndpoint}/dashboard?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch analytics dashboard', { filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch analytics dashboard');
    }
  }

  /**
   * Get analytics summary for a date range
   */
  async getSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      const response = await this.apiClient.get<AnalyticsSummary>(
        `${this.analyticsEndpoint}/summary?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch analytics summary', { filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch analytics summary');
    }
  }

  /**
   * Get detailed analytics for a specific bill
   */
  async getBillAnalytics(bill_id: string, filters?: AnalyticsFilters): Promise<BillAnalytics> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      const response = await this.apiClient.get<BillAnalytics>(
        `${this.analyticsEndpoint}/bills/${bill_id}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bill analytics', { bill_id, filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch bill analytics');
    }
  }

  /**
   * Get engagement report for a bill
   */
  async getEngagementReport(
    bill_id: string,
    filters?: AnalyticsFilters
  ): Promise<EngagementReport> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      const response = await this.apiClient.get<EngagementReport>(
        `${this.analyticsEndpoint}/bills/${bill_id}/engagement?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch engagement report', { bill_id, filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch engagement report');
    }
  }

  /**
   * Get conflict analysis for a bill
   */
  async getConflictReport(bill_id: string): Promise<ConflictReport> {
    try {
      const response = await this.apiClient.get<ConflictReport>(
        `${this.analyticsEndpoint}/bills/${bill_id}/conflicts`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch conflict report', { bill_id, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch conflict report');
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserActivity(
    user_id?: string,
    filters?: AnalyticsFilters
  ): Promise<AnalyticsResponse<UserActivity[]>> {
    try {
      const params = new URLSearchParams();

      if (user_id) {
        params.append('user_id', user_id);
      }

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      const response = await this.apiClient.get<AnalyticsResponse<UserActivity[]>>(
        `${this.analyticsEndpoint}/users/activity?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user activity', { user_id, filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch user activity');
    }
  }

  /**
   * Get top bills by engagement
   */
  async getTopBills(limit = 10, filters?: AnalyticsFilters): Promise<BillAnalytics[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      if (filters?.billStatus?.length) {
        filters.billStatus.forEach(status => params.append('status', status));
      }

      const response = await this.apiClient.get<BillAnalytics[]>(
        `${this.analyticsEndpoint}/bills/top?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch top bills', { limit, filters, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch top bills');
    }
  }

  /**
   * Get analytics alerts
   */
  async getAlerts(acknowledged = false): Promise<AnalyticsAlert[]> {
    try {
      const response = await this.apiClient.get<AnalyticsAlert[]>(
        `${this.analyticsEndpoint}/alerts?acknowledged=${acknowledged}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch analytics alerts', { acknowledged, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch analytics alerts');
    }
  }

  /**
   * Acknowledge an analytics alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.analyticsEndpoint}/alerts/${alertId}/acknowledge`,
        {},
        { skipCache: true }
      );

      logger.info('Analytics alert acknowledged', { alertId });
    } catch (error) {
      logger.error('Failed to acknowledge alert', { alertId, error });
      throw await this.handleAnalyticsError(error, 'Failed to acknowledge alert');
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(
    limit = 20
  ): Promise<{ topic: string; count: number; trend: 'up' | 'down' | 'stable' }[]> {
    try {
      const response = await this.apiClient.get<
        { topic: string; count: number; trend: 'up' | 'down' | 'stable' }[]
      >(`${this.analyticsEndpoint}/trends/topics?limit=${limit}`);

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch trending topics', { limit, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch trending topics');
    }
  }

  /**
   * Get stakeholder impact analysis
   */
  async getStakeholderAnalysis(bill_id?: string): Promise<StakeholderAnalysis[]> {
    try {
      const endpoint = bill_id
        ? `${this.analyticsEndpoint}/stakeholders/${bill_id}`
        : `${this.analyticsEndpoint}/stakeholders`;

      const response = await this.apiClient.get<StakeholderAnalysis[]>(endpoint);

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch stakeholder analysis', { bill_id, error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch stakeholder analysis');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    filters?: AnalyticsFilters,
    format: 'csv' | 'json' = 'json'
  ): Promise<AnalyticsExport> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);

      if (filters?.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }

      const response = await this.apiClient.get<AnalyticsExport>(
        `${this.analyticsEndpoint}/export?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to export analytics', { filters, format, error });
      throw await this.handleAnalyticsError(error, 'Failed to export analytics');
    }
  }

  /**
   * Get real-time analytics metrics
   */
  async getRealtimeMetrics(): Promise<{
    activeUsers: number;
    currentEngagement: number;
    recentAlerts: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  }> {
    try {
      const response = await this.apiClient.get<{
        activeUsers: number;
        currentEngagement: number;
        recentAlerts: number;
        systemHealth: 'healthy' | 'warning' | 'error';
      }>(`${this.analyticsEndpoint}/realtime`);

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch realtime metrics', { error });
      throw await this.handleAnalyticsError(error, 'Failed to fetch realtime metrics');
    }
  }

  /**
   * Centralized error handling for analytics operations.
   */
  private async handleAnalyticsError(error: unknown, defaultMessage: string): Promise<Error> {
    const errorResponse = error as UnknownError;

    const errorMessage =
      (errorResponse as AxiosErrorResponse)?.response?.data?.message ||
      (errorResponse as Error)?.message ||
      defaultMessage;

    const analyticsError = new Error(errorMessage);

    await globalErrorHandler(analyticsError, {
      component: 'AnalyticsApiService',
      operation: 'analytics',
      status: (errorResponse as AxiosErrorResponse)?.response?.status,
      endpoint: (errorResponse as AxiosErrorResponse)?.config?.url,
    });

    return analyticsError;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Factory function to create AnalyticsApiService with API client dependency.
 */
export const createAnalyticsApiService = (apiClient: UnifiedApiClient): AnalyticsApiService => {
  return new AnalyticsApiService(apiClient);
};

/**
 * Global instance of the analytics API service.
 * Will be initialized by the API client after it's created.
 */
export let analyticsApiService: AnalyticsApiService;
