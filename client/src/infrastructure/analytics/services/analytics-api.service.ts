/**
 * Analytics API Service (Engagement Metrics)
 * Modernized API service for platform-wide analytics and engagement tracking
 */

import { CacheableApiService } from '@shared/core/api/base-api-service';
import { globalApiClient } from '@client/infrastructure/api/client';
import {
  EngagementMetrics,
  EngagementSummary,
  UserEngagementProfile,
  TrackEngagementRequest,
  BatchTrackEngagementRequest,
  AnalyticsQueryParams,
  EngagementQueryParams,
  EngagementMetricsResponse,
  EngagementMetricsListResponse,
  EngagementSummaryResponse,
  UserEngagementProfileResponse,
  TopContentResponse,
  RealTimeMetricsResponse,
  TimePeriod,
  EngagementEntityType,
  EngagementEventType,
} from '@shared/types/api/contracts/analytics.contracts';

class AnalyticsApiService extends CacheableApiService<
  EngagementMetrics,
  TrackEngagementRequest,
  Partial<TrackEngagementRequest>,
  EngagementQueryParams
> {
  constructor() {
    super('/api/analytics', globalApiClient);
  }

  // Engagement Tracking
  async trackEngagement(data: TrackEngagementRequest): Promise<EngagementMetricsResponse> {
    return this.client.post(`${this.baseUrl}/track`, data);
  }

  async trackBatchEngagement(
    data: BatchTrackEngagementRequest
  ): Promise<EngagementMetricsListResponse> {
    return this.client.post(`${this.baseUrl}/track/batch`, data);
  }

  // Convenience tracking methods
  async trackView(
    entityId: string,
    entityType: EngagementEntityType,
    metadata?: any
  ): Promise<void> {
    await this.trackEngagement({
      entityId,
      entityType,
      eventType: EngagementEventType.VIEW,
      metadata,
    });
  }

  async trackClick(
    entityId: string,
    entityType: EngagementEntityType,
    metadata?: any
  ): Promise<void> {
    await this.trackEngagement({
      entityId,
      entityType,
      eventType: EngagementEventType.CLICK,
      metadata,
    });
  }

  async trackShare(
    entityId: string,
    entityType: EngagementEntityType,
    metadata?: any
  ): Promise<void> {
    await this.trackEngagement({
      entityId,
      entityType,
      eventType: EngagementEventType.SHARE,
      metadata,
    });
  }

  async trackTimeSpent(
    entityId: string,
    entityType: EngagementEntityType,
    duration: number
  ): Promise<void> {
    await this.trackEngagement({
      entityId,
      entityType,
      eventType: EngagementEventType.VIEW,
      duration,
      metadata: { type: 'time_spent' },
    });
  }

  // Engagement Summaries
  async getEngagementSummary(
    entityId: string,
    entityType: EngagementEntityType,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string
  ): Promise<EngagementSummaryResponse> {
    return this.client.get(`${this.baseUrl}/summary/${entityType}/${entityId}`, {
      period,
      dateFrom,
      dateTo,
    });
  }

  async getEngagementSummaries(params: AnalyticsQueryParams): Promise<{
    summaries: EngagementSummary[];
    aggregated: {
      totalViews: number;
      totalEngagement: number;
      averageEngagementRate: number;
      topPerformers: Array<{ entityId: string; score: number }>;
    };
  }> {
    return this.client.get(`${this.baseUrl}/summaries`, params);
  }

  // User Analytics
  async getUserEngagementProfile(
    userId: string,
    period: TimePeriod,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserEngagementProfileResponse> {
    return this.client.get(`${this.baseUrl}/users/${userId}/profile`, {
      period,
      dateFrom,
      dateTo,
    });
  }

  // Content Analytics
  async getTopContent(params: {
    entityType?: EngagementEntityType;
    period: TimePeriod;
    metric?: 'views' | 'engagement' | 'shares' | 'comments';
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TopContentResponse> {
    return this.client.get(`${this.baseUrl}/content/top`, params);
  }

  // Real-time Analytics
  async getRealTimeMetrics(): Promise<RealTimeMetricsResponse> {
    return this.client.get(`${this.baseUrl}/realtime`);
  }

  // WebSocket subscriptions for real-time updates
  async subscribeToRealTimeMetrics(callback: (metrics: any) => void): Promise<() => void> {
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/analytics/realtime`);

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => ws.close();
  }

  async subscribeToEntityEngagement(
    entityId: string,
    entityType: EngagementEntityType,
    callback: (event: EngagementMetrics) => void
  ): Promise<() => void> {
    const ws = new WebSocket(
      `${process.env.REACT_APP_WS_URL}/analytics/engagement/${entityType}/${entityId}`
    );

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.type === 'engagement_event') {
        callback(data.event);
      }
    };

    return () => ws.close();
  }
}

// Export singleton instance
export const analyticsApiService = new AnalyticsApiService();
export default analyticsApiService;
