/**
 * Analytics API Contracts (Engagement Metrics)
 * Request/response types for platform-wide analytics and engagement tracking
 */

import { ApiResponse, BaseQueryParams } from './core.contracts';

// Analytics Entities
export interface EngagementMetrics {
  id: string;
  entityId: string;
  entityType: EngagementEntityType;
  userId?: string;
  sessionId?: string;
  eventType: EngagementEventType;
  metadata: EngagementMetadata;
  timestamp: string;
  duration?: number;
  value?: number;
}

export interface EngagementMetadata {
  source: string;
  userAgent?: string;
  referrer?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
  };
  context?: Record<string, any>;
}

export interface EngagementSummary {
  entityId: string;
  entityType: EngagementEntityType;
  period: TimePeriod;
  metrics: {
    views: number;
    uniqueViews: number;
    comments: number;
    shares: number;
    votes: number;
    downloads: number;
    timeSpent: number;
    bounceRate: number;
    engagementRate: number;
  };
  trends: {
    viewsChange: number;
    commentsChange: number;
    sharesChange: number;
    votesChange: number;
  };
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserEngagementProfile {
  userId: string;
  period: TimePeriod;
  totalSessions: number;
  totalTimeSpent: number;
  averageSessionDuration: number;
  billsViewed: number;
  commentsPosted: number;
  votesGiven: number;
  sharesPerformed: number;
  engagementScore: number;
  interests: Array<{
    category: string;
    score: number;
    billIds: string[];
  }>;
  activityPattern: Array<{
    hour: number;
    dayOfWeek: number;
    activityLevel: number;
  }>;
}

// Enums
export enum EngagementEntityType {
  BILL = 'bill',
  COMMENT = 'comment',
  USER = 'user',
  SPONSOR = 'sponsor',
  COMMITTEE = 'committee',
  AMENDMENT = 'amendment',
  REPORT = 'report'
}

export enum EngagementEventType {
  VIEW = 'view',
  CLICK = 'click',
  SCROLL = 'scroll',
  COMMENT = 'comment',
  VOTE = 'vote',
  SHARE = 'share',
  DOWNLOAD = 'download',
  BOOKMARK = 'bookmark',
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',
  EXPORT = 'export'
}

export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL_TIME = 'all_time'
}

export enum MetricType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  UNIQUE = 'unique',
  RATE = 'rate',
  PERCENTAGE = 'percentage'
}

// Query Parameters
export interface EngagementQueryParams extends BaseQueryParams {
  entityId?: string;
  entityType?: EngagementEntityType;
  userId?: string;
  eventType?: EngagementEventType;
  dateFrom?: string;
  dateTo?: string;
  period?: TimePeriod;
  source?: string;
  deviceType?: string;
  country?: string;
}

export interface AnalyticsQueryParams extends BaseQueryParams {
  entityIds?: string[];
  entityType?: EngagementEntityType;
  period: TimePeriod;
  dateFrom?: string;
  dateTo?: string;
  metrics?: MetricType[];
  groupBy?: string[];
  includeComparison?: boolean;
}

// Request Types
export interface TrackEngagementRequest {
  entityId: string;
  entityType: EngagementEntityType;
  eventType: EngagementEventType;
  metadata?: Partial<EngagementMetadata>;
  duration?: number;
  value?: number;
}

export interface BatchTrackEngagementRequest {
  events: TrackEngagementRequest[];
  sessionId?: string;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isPublic?: boolean;
  tags?: string[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'heatmap';
  title: string;
  query: AnalyticsQueryParams;
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Response Types
export interface EngagementMetricsResponse extends ApiResponse<EngagementMetrics> {}
export interface EngagementMetricsListResponse extends ApiResponse<EngagementMetrics[]> {}

export interface EngagementSummaryResponse extends ApiResponse<EngagementSummary> {}
export interface EngagementSummaryListResponse extends ApiResponse<EngagementSummary[]> {}

export interface UserEngagementProfileResponse extends ApiResponse<UserEngagementProfile> {}

export interface AnalyticsDashboardResponse extends ApiResponse<{
  id: string;
  name: string;
  description?: string;
  widgets: Array<{
    widget: DashboardWidget;
    data: any;
    lastUpdated: string;
  }>;
  lastUpdated: string;
}> {}

export interface TopContentResponse extends ApiResponse<Array<{
  entityId: string;
  entityType: EngagementEntityType;
  title: string;
  metrics: {
    views: number;
    engagement: number;
    score: number;
  };
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}>> {}

export interface RealTimeMetricsResponse extends ApiResponse<{
  activeUsers: number;
  currentSessions: number;
  topPages: Array<{
    path: string;
    activeUsers: number;
  }>;
  recentEvents: Array<{
    eventType: EngagementEventType;
    entityId: string;
    timestamp: string;
  }>;
  systemLoad: {
    cpu: number;
    memory: number;
    requests: number;
  };
}> {}