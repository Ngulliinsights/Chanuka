import { api } from '../../../services/api';
import type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  AnalyticsResponse,
  UserActivity
} from '../types';

/**
 * Analytics API service - handles all analytics-related API calls
 * Centralizes API endpoints and response handling for the analytics feature
 */
export const analyticsApi = {
  /**
   * Get analytics dashboard data
   */
  async getDashboard(filters?: AnalyticsFilters): Promise<DashboardData> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    if (filters?.billStatus?.length) {
      filters.billStatus.forEach(status => params.append('status', status));
    }

    return api.get(`/api/analytics/dashboard?${params.toString()}`);
  },

  /**
   * Get analytics summary for a date range
   */
  async getSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return api.get(`/api/analytics/summary?${params.toString()}`);
  },

  /**
   * Get detailed analytics for a specific bill
   */
  async getBillAnalytics(bill_id: string, filters?: AnalyticsFilters): Promise<BillAnalytics> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return api.get(`/api/analytics/bills/${ bill_id }?${params.toString()}`);
  },

  /**
   * Get engagement report for a bill
   */
  async getEngagementReport(bill_id: string, filters?: AnalyticsFilters): Promise<EngagementReport> {
    const params = new URLSearchParams();

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return api.get(`/api/analytics/bills/${ bill_id }/engagement?${params.toString()}`);
  },

  /**
   * Get conflict analysis for a bill
   */
  async getConflictReport(bill_id: string): Promise<ConflictReport> { return api.get(`/api/analytics/bills/${bill_id }/conflicts`);
  },

  /**
   * Get user activity analytics
   */
  async getUserActivity(user_id?: string, filters?: AnalyticsFilters): Promise<AnalyticsResponse<UserActivity[]>> { const params = new URLSearchParams();

    if (user_id) {
      params.append('user_id', user_id);
     }

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return api.get(`/api/analytics/users/activity?${params.toString()}`);
  },

  /**
   * Get top bills by engagement
   */
  async getTopBills(limit = 10, filters?: AnalyticsFilters): Promise<BillAnalytics[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    if (filters?.billStatus?.length) {
      filters.billStatus.forEach(status => params.append('status', status));
    }

    return api.get(`/api/analytics/bills/top?${params.toString()}`);
  },

  /**
   * Get analytics alerts
   */
  async getAlerts(acknowledged = false): Promise<any[]> {
    return api.get(`/api/analytics/alerts?acknowledged=${acknowledged}`);
  },

  /**
   * Acknowledge an analytics alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    return api.post(`/api/analytics/alerts/${alertId}/acknowledge`);
  },

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit = 20): Promise<{ topic: string; count: number; trend: 'up' | 'down' | 'stable' }[]> {
    return api.get(`/api/analytics/trends/topics?limit=${limit}`);
  },

  /**
   * Get stakeholder impact analysis
   */
  async getStakeholderAnalysis(bill_id?: string): Promise<any> { const endpoint = bill_id ? `/api/analytics/stakeholders/${bill_id }` : '/api/analytics/stakeholders';
    return api.get(endpoint);
  },

  /**
   * Export analytics data
   */
  async exportAnalytics(filters?: AnalyticsFilters, format: 'csv' | 'json' = 'json'): Promise<any> {
    const params = new URLSearchParams();
    params.append('format', format);

    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return api.get(`/api/analytics/export?${params.toString()}`);
  },

  /**
   * Get real-time analytics metrics
   */
  async getRealtimeMetrics(): Promise<{
    activeUsers: number;
    currentEngagement: number;
    recentAlerts: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  }> {
    return api.get('/api/analytics/realtime');
  }
};





































