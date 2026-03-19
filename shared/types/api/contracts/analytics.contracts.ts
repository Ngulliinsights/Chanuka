/**
 * Analytics API Contracts (Engagement Metrics)
 * Type-safe, platform-wide analytics and engagement tracking.
 *
 * Timestamp convention: all timestamps are ISO 8601 strings on the wire.
 * Use `Date` only at the application boundary after parsing.
 */

import { ApiResponse, BaseQueryParams } from './core.contracts';
import { BillId, UserId } from '../../core/branded';

export type { BillId, UserId };

// ============================================================================
// Primitive Aliases
// ============================================================================

/** ISO 8601 date-time string, e.g. "2025-03-19T14:00:00Z" */
type ISODateString = string;

/** A ratio in the closed interval [0, 1] */
type Ratio = number;

/** Percentage change relative to prior period. Positive = growth, negative = decline. */
type PercentageChange = number;

// ============================================================================
// Enums
// ============================================================================

export enum EngagementEntityType {
  BILL      = 'bill',
  COMMENT   = 'comment',
  USER      = 'user',
  SPONSOR   = 'sponsor',
  COMMITTEE = 'committee',
  AMENDMENT = 'amendment',
  REPORT    = 'report',
}

export enum EngagementEventType {
  VIEW     = 'view',
  CLICK    = 'click',
  SCROLL   = 'scroll',
  COMMENT  = 'comment',
  VOTE     = 'vote',
  SHARE    = 'share',
  DOWNLOAD = 'download',
  BOOKMARK = 'bookmark',
  SEARCH   = 'search',
  FILTER   = 'filter',
  SORT     = 'sort',
  EXPORT   = 'export',
}

export enum TimePeriod {
  HOUR     = 'hour',
  DAY      = 'day',
  WEEK     = 'week',
  MONTH    = 'month',
  QUARTER  = 'quarter',
  YEAR     = 'year',
  ALL_TIME = 'all_time',
}

export enum MetricType {
  COUNT      = 'count',
  SUM        = 'sum',
  AVERAGE    = 'average',
  UNIQUE     = 'unique',
  RATE       = 'rate',
  PERCENTAGE = 'percentage',
}

// ============================================================================
// Shared / Primitive Types
// ============================================================================

export interface DateRange {
  startDate: ISODateString;
  endDate:   ISODateString;
}

export interface EngagementMetadata {
  source:     string;
  userAgent?: string;
  referrer?:  string;
  location?: {
    country?: string;
    region?:  string;
    city?:    string;
  };
  device?: {
    type:     'desktop' | 'mobile' | 'tablet';
    os?:      string;
    browser?: string;
  };
  /**
   * Arbitrary additional context. Prefer explicit fields above over
   * reaching for this — it exists only for truly unstructured extension.
   */
  context?: Record<string, unknown>;
}

// ============================================================================
// Domain / Entity Types
// ============================================================================

export interface EngagementMetrics {
  id:         string;
  entityId:   BillId | UserId;
  entityType: EngagementEntityType;
  userId?:    UserId;
  sessionId?: string;
  eventType:  EngagementEventType;
  metadata:   EngagementMetadata;
  timestamp:  ISODateString;
  /** Interaction duration in seconds. */
  duration?:  number;
  /** Numeric payload whose meaning depends on `eventType` (e.g. scroll depth). */
  value?:     number;
}

export interface EngagementSummary {
  entityId:   BillId | UserId;
  entityType: EngagementEntityType;
  period:     TimePeriod;
  metrics: {
    views:          number;
    uniqueViews:    number;
    comments:       number;
    shares:         number;
    votes:          number;
    downloads:      number;
    /** Total time spent in seconds. */
    timeSpent:      number;
    /** Ratio of sessions that ended without further interaction. */
    bounceRate:     Ratio;
    engagementRate: Ratio;
  };
  /**
   * Period-over-period percentage change for each metric.
   * Positive = growth, negative = decline.
   */
  trends: {
    viewsChange:    PercentageChange;
    commentsChange: PercentageChange;
    sharesChange:   PercentageChange;
    votesChange:    PercentageChange;
  };
  topSources: Array<{
    source:     string;
    count:      number;
    /** Share of total traffic from this source [0, 1]. */
    percentage: Ratio;
  }>;
}

/** Aggregated analytics specific to a single bill. */
export interface BillAnalytics {
  billId:            BillId;
  views:             number;
  uniqueViewers:     number;
  comments:          number;
  votes:             number;
  shares:            number;
  engagementRate:    Ratio;
  /** Average time spent on the bill in seconds. */
  averageTimeSpent:  number;
}

/** Platform-wide aggregate metrics. */
export interface AnalyticsMetrics {
  totalUsers:     number;
  activeUsers:    number;
  totalBills:     number;
  totalComments:  number;
  totalVotes:     number;
  engagementRate: Ratio;
}

export interface UserEngagementProfile {
  userId:                  UserId;
  period:                  TimePeriod;
  totalSessions:           number;
  /** Total time spent across all sessions in seconds. */
  totalTimeSpent:          number;
  /** Mean session length in seconds. */
  averageSessionDuration:  number;
  billsViewed:             number;
  commentsPosted:          number;
  votesGiven:              number;
  sharesPerformed:         number;
  /** Composite engagement score in [0, 1]. */
  engagementScore:         Ratio;
  interests: Array<{
    category: string;
    /** Affinity score in [0, 1]. */
    score:    Ratio;
    billIds:  BillId[];
  }>;
  activityPattern: Array<{
    /** Hour of day, 0–23. */
    hour:          number;
    /** Day of week: 0 = Sunday … 6 = Saturday. */
    dayOfWeek:     number;
    /** Relative activity level in [0, 1]. */
    activityLevel: Ratio;
  }>;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardWidget {
  id:    string;
  type:  'chart' | 'table' | 'metric' | 'heatmap';
  title: string;
  query: AnalyticsQueryParams;
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    xAxis?:     string;
    yAxis?:     string;
    groupBy?:   string;
  };
  position: {
    x:      number;
    y:      number;
    width:  number;
    height: number;
  };
}

/** Resolved widget: the static definition plus its fetched data snapshot. */
export interface PopulatedDashboardWidget {
  widget:      DashboardWidget;
  /** Raw query result for this widget. Shape varies by widget type. */
  data:        EngagementSummary[] | AnalyticsMetrics | BillAnalytics | unknown;
  lastUpdated: ISODateString;
}

// ============================================================================
// Query Params
// ============================================================================

export interface EngagementQueryParams extends BaseQueryParams {
  entityId?:   string;
  entityType?: EngagementEntityType;
  userId?:     UserId;
  eventType?:  EngagementEventType;
  dateFrom?:   ISODateString;
  dateTo?:     ISODateString;
  period?:     TimePeriod;
  source?:     string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  country?:    string;
}

export interface AnalyticsQueryParams extends BaseQueryParams {
  entityIds?:         string[];
  entityType?:        EngagementEntityType;
  period:             TimePeriod;
  dateFrom?:          ISODateString;
  dateTo?:            ISODateString;
  metrics?:           MetricType[];
  groupBy?:           string[];
  includeComparison?: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Track a single engagement event via the API.
 * For multiple events in one request, prefer {@link BatchTrackEngagementRequest}.
 */
export interface TrackEngagementRequest {
  entityId:   string;
  entityType: EngagementEntityType;
  eventType:  EngagementEventType;
  metadata?:  Partial<EngagementMetadata>;
  /** Interaction duration in seconds. */
  duration?:  number;
  value?:     number;
}

/**
 * Track multiple engagement events in a single request.
 * Prefer this over issuing N individual {@link TrackEngagementRequest} calls.
 */
export interface BatchTrackEngagementRequest {
  events:     TrackEngagementRequest[];
  sessionId?: string;
}

/**
 * Low-level event emitted by client instrumentation before any server-side
 * enrichment. The API normalises this into a full {@link EngagementMetrics}
 * record.
 */
export interface TrackEventRequest {
  eventType:  EngagementEventType;
  eventData:  Partial<EngagementMetadata> & Record<string, unknown>;
  userId?:    UserId;
  sessionId?: string;
  /** Defaults to server receipt time when omitted. */
  timestamp?: ISODateString;
}

export interface GetAnalyticsMetricsRequest {
  startDate?:   ISODateString;
  endDate?:     ISODateString;
  granularity?: TimePeriod;
}

export interface GetBillAnalyticsRequest {
  billId:     BillId;
  startDate?: ISODateString;
  endDate?:   ISODateString;
}

export interface GetUserAnalyticsRequest {
  userId:     UserId;
  startDate?: ISODateString;
  endDate?:   ISODateString;
}

export interface CreateDashboardRequest {
  name:        string;
  description?: string;
  widgets:     DashboardWidget[];
  isPublic?:   boolean;
  tags?:       string[];
}

// ============================================================================
// Response Types
// ============================================================================

export type TrackEventResponse = ApiResponse<{
  eventId:   string;
  timestamp: ISODateString;
}>;

export type GetAnalyticsMetricsResponse = ApiResponse<{
  metrics: AnalyticsMetrics;
  period:  DateRange;
}>;

export type GetBillAnalyticsResponse = ApiResponse<{
  analytics: BillAnalytics;
  period:    DateRange;
}>;

export type GetUserAnalyticsResponse = ApiResponse<{
  analytics: UserEngagementProfile;
  period:    DateRange;
}>;

export type EngagementSummaryResponse     = ApiResponse<EngagementSummary>;
export type EngagementSummaryListResponse = ApiResponse<EngagementSummary[]>;

export type EngagementMetricsResponse     = ApiResponse<EngagementMetrics>;
export type EngagementMetricsListResponse = ApiResponse<EngagementMetrics[]>;

export type UserEngagementProfileResponse = ApiResponse<UserEngagementProfile>;

export type TopContentResponse = ApiResponse<
  Array<{
    entityId:         string;
    entityType:       EngagementEntityType;
    title:            string;
    metrics: {
      views:      number;
      engagement: Ratio;
      score:      number;
    };
    trend:            'up' | 'down' | 'stable';
    changePercentage: PercentageChange;
  }>
>;

export type RealTimeMetricsResponse = ApiResponse<{
  activeUsers:     number;
  currentSessions: number;
  topPages: Array<{
    path:        string;
    activeUsers: number;
  }>;
  recentEvents: Array<{
    eventType: EngagementEventType;
    entityId:  string;
    timestamp: ISODateString;
  }>;
  systemLoad: {
    /** CPU utilisation [0, 1]. */
    cpu:      Ratio;
    /** Memory utilisation [0, 1]. */
    memory:   Ratio;
    /** Inbound requests per second. */
    requests: number;
  };
}>;

export type AnalyticsDashboardResponse = ApiResponse<{
  id:           string;
  name:         string;
  description?: string;
  widgets:      PopulatedDashboardWidget[];
  lastUpdated:  ISODateString;
}>;

export type CreateDashboardResponse = ApiResponse<{
  id:          string;
  name:        string;
  description?: string;
  widgets:     DashboardWidget[];
  isPublic:    boolean;
  tags:        string[];
  createdAt:   ISODateString;
}>;