/**
 * Analytics Feature - Constants
 * 
 * Shared constants for analytics feature
 * Used by both client and server
 */

// ============================================================================
// Analytics Event Types
// ============================================================================

export const ANALYTICS_EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  BILL_VIEW: 'bill_view',
  BILL_SEARCH: 'bill_search',
  COMMENT_CREATE: 'comment_create',
  COMMENT_VOTE: 'comment_vote',
  USER_REGISTRATION: 'user_registration',
  USER_LOGIN: 'user_login',
  CAMPAIGN_CREATE: 'campaign_create',
  CAMPAIGN_ACTION: 'campaign_action',
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_READ: 'notification_read',
  SHARE: 'share',
  DOWNLOAD: 'download',
} as const;

export const ANALYTICS_EVENT_TYPE_LABELS = {
  [ANALYTICS_EVENT_TYPES.PAGE_VIEW]: 'Page View',
  [ANALYTICS_EVENT_TYPES.BILL_VIEW]: 'Bill View',
  [ANALYTICS_EVENT_TYPES.BILL_SEARCH]: 'Bill Search',
  [ANALYTICS_EVENT_TYPES.COMMENT_CREATE]: 'Comment Created',
  [ANALYTICS_EVENT_TYPES.COMMENT_VOTE]: 'Comment Vote',
  [ANALYTICS_EVENT_TYPES.USER_REGISTRATION]: 'User Registration',
  [ANALYTICS_EVENT_TYPES.USER_LOGIN]: 'User Login',
  [ANALYTICS_EVENT_TYPES.CAMPAIGN_CREATE]: 'Campaign Created',
  [ANALYTICS_EVENT_TYPES.CAMPAIGN_ACTION]: 'Campaign Action',
  [ANALYTICS_EVENT_TYPES.NOTIFICATION_SENT]: 'Notification Sent',
  [ANALYTICS_EVENT_TYPES.NOTIFICATION_READ]: 'Notification Read',
  [ANALYTICS_EVENT_TYPES.SHARE]: 'Share',
  [ANALYTICS_EVENT_TYPES.DOWNLOAD]: 'Download',
} as const;

// ============================================================================
// Analytics Metrics
// ============================================================================

export const ANALYTICS_METRICS = {
  TOTAL_USERS: 'total_users',
  ACTIVE_USERS: 'active_users',
  NEW_USERS: 'new_users',
  TOTAL_BILLS: 'total_bills',
  ACTIVE_BILLS: 'active_bills',
  TOTAL_COMMENTS: 'total_comments',
  TOTAL_VOTES: 'total_votes',
  ENGAGEMENT_RATE: 'engagement_rate',
  RETENTION_RATE: 'retention_rate',
  CONVERSION_RATE: 'conversion_rate',
  AVERAGE_SESSION_DURATION: 'average_session_duration',
  BOUNCE_RATE: 'bounce_rate',
} as const;

export const ANALYTICS_METRIC_LABELS = {
  [ANALYTICS_METRICS.TOTAL_USERS]: 'Total Users',
  [ANALYTICS_METRICS.ACTIVE_USERS]: 'Active Users',
  [ANALYTICS_METRICS.NEW_USERS]: 'New Users',
  [ANALYTICS_METRICS.TOTAL_BILLS]: 'Total Bills',
  [ANALYTICS_METRICS.ACTIVE_BILLS]: 'Active Bills',
  [ANALYTICS_METRICS.TOTAL_COMMENTS]: 'Total Comments',
  [ANALYTICS_METRICS.TOTAL_VOTES]: 'Total Votes',
  [ANALYTICS_METRICS.ENGAGEMENT_RATE]: 'Engagement Rate',
  [ANALYTICS_METRICS.RETENTION_RATE]: 'Retention Rate',
  [ANALYTICS_METRICS.CONVERSION_RATE]: 'Conversion Rate',
  [ANALYTICS_METRICS.AVERAGE_SESSION_DURATION]: 'Avg. Session Duration',
  [ANALYTICS_METRICS.BOUNCE_RATE]: 'Bounce Rate',
} as const;

// ============================================================================
// Analytics Timeframes
// ============================================================================

export const ANALYTICS_TIMEFRAMES = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  ALL_TIME: 'all_time',
} as const;

export const ANALYTICS_TIMEFRAME_LABELS = {
  [ANALYTICS_TIMEFRAMES.HOUR]: 'Last Hour',
  [ANALYTICS_TIMEFRAMES.DAY]: 'Last 24 Hours',
  [ANALYTICS_TIMEFRAMES.WEEK]: 'Last 7 Days',
  [ANALYTICS_TIMEFRAMES.MONTH]: 'Last 30 Days',
  [ANALYTICS_TIMEFRAMES.QUARTER]: 'Last 90 Days',
  [ANALYTICS_TIMEFRAMES.YEAR]: 'Last Year',
  [ANALYTICS_TIMEFRAMES.ALL_TIME]: 'All Time',
} as const;

// ============================================================================
// Analytics Dimensions
// ============================================================================

export const ANALYTICS_DIMENSIONS = {
  USER: 'user',
  BILL: 'bill',
  CATEGORY: 'category',
  DEVICE: 'device',
  BROWSER: 'browser',
  LOCATION: 'location',
  REFERRER: 'referrer',
  CAMPAIGN: 'campaign',
} as const;

export const ANALYTICS_DIMENSION_LABELS = {
  [ANALYTICS_DIMENSIONS.USER]: 'User',
  [ANALYTICS_DIMENSIONS.BILL]: 'Bill',
  [ANALYTICS_DIMENSIONS.CATEGORY]: 'Category',
  [ANALYTICS_DIMENSIONS.DEVICE]: 'Device',
  [ANALYTICS_DIMENSIONS.BROWSER]: 'Browser',
  [ANALYTICS_DIMENSIONS.LOCATION]: 'Location',
  [ANALYTICS_DIMENSIONS.REFERRER]: 'Referrer',
  [ANALYTICS_DIMENSIONS.CAMPAIGN]: 'Campaign',
} as const;

// ============================================================================
// Analytics Aggregation Types
// ============================================================================

export const ANALYTICS_AGGREGATIONS = {
  SUM: 'sum',
  COUNT: 'count',
  AVERAGE: 'average',
  MIN: 'min',
  MAX: 'max',
  UNIQUE: 'unique',
} as const;

export const ANALYTICS_AGGREGATION_LABELS = {
  [ANALYTICS_AGGREGATIONS.SUM]: 'Sum',
  [ANALYTICS_AGGREGATIONS.COUNT]: 'Count',
  [ANALYTICS_AGGREGATIONS.AVERAGE]: 'Average',
  [ANALYTICS_AGGREGATIONS.MIN]: 'Minimum',
  [ANALYTICS_AGGREGATIONS.MAX]: 'Maximum',
  [ANALYTICS_AGGREGATIONS.UNIQUE]: 'Unique',
} as const;

// ============================================================================
// Analytics Chart Types
// ============================================================================

export const ANALYTICS_CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter',
  HEATMAP: 'heatmap',
  TABLE: 'table',
} as const;

export const ANALYTICS_CHART_TYPE_LABELS = {
  [ANALYTICS_CHART_TYPES.LINE]: 'Line Chart',
  [ANALYTICS_CHART_TYPES.BAR]: 'Bar Chart',
  [ANALYTICS_CHART_TYPES.PIE]: 'Pie Chart',
  [ANALYTICS_CHART_TYPES.AREA]: 'Area Chart',
  [ANALYTICS_CHART_TYPES.SCATTER]: 'Scatter Plot',
  [ANALYTICS_CHART_TYPES.HEATMAP]: 'Heatmap',
  [ANALYTICS_CHART_TYPES.TABLE]: 'Table',
} as const;

// ============================================================================
// Analytics Limits
// ============================================================================

export const ANALYTICS_LIMITS = {
  MAX_EVENTS_PER_REQUEST: 1000,
  MAX_DIMENSIONS: 5,
  MAX_METRICS: 10,
  MAX_DATE_RANGE_DAYS: 365,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  MAX_EXPORT_ROWS: 10000,
} as const;

// ============================================================================
// Analytics Defaults
// ============================================================================

export const ANALYTICS_DEFAULTS = {
  TIMEFRAME: ANALYTICS_TIMEFRAMES.WEEK,
  AGGREGATION: ANALYTICS_AGGREGATIONS.COUNT,
  CHART_TYPE: ANALYTICS_CHART_TYPES.LINE,
  PAGE: 1,
  LIMIT: 50,
} as const;

// ============================================================================
// Analytics Export Formats
// ============================================================================

export const ANALYTICS_EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  XLSX: 'xlsx',
  PDF: 'pdf',
} as const;

export const ANALYTICS_EXPORT_FORMAT_LABELS = {
  [ANALYTICS_EXPORT_FORMATS.CSV]: 'CSV',
  [ANALYTICS_EXPORT_FORMATS.JSON]: 'JSON',
  [ANALYTICS_EXPORT_FORMATS.XLSX]: 'Excel',
  [ANALYTICS_EXPORT_FORMATS.PDF]: 'PDF',
} as const;
