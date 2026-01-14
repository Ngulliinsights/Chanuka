/**
 * System Limits and Constraints
 *
 * Centralized definition of system-wide limits, timeouts, and thresholds
 * used across client and server for consistent behavior.
 */

/**
 * Request and Response Limits
 */
export const REQUEST_LIMITS = {
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],

  // Request Body
  MAX_REQUEST_BODY_SIZE: 1024 * 1024, // 1 MB
  MAX_ARRAY_LENGTH: 1000,
  MAX_STRING_LENGTH: 100000,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

/**
 * Time-based Limits and Intervals
 */
export const TIME_LIMITS = {
  // Session and Token Timeouts
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour

  // Cache TTLs
  CACHE_SHORT_TTL_MS: 5 * 60 * 1000, // 5 minutes
  CACHE_MEDIUM_TTL_MS: 30 * 60 * 1000, // 30 minutes
  CACHE_LONG_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_REQUESTS_PER_WINDOW: 100,
  RATE_LIMIT_REQUESTS_PER_HOUR: 10000,

  // API Timeouts
  API_TIMEOUT_MS: 30 * 1000, // 30 seconds
  API_SLOW_THRESHOLD_MS: 5 * 1000, // 5 seconds
  API_VERY_SLOW_THRESHOLD_MS: 10 * 1000, // 10 seconds

  // Retry Logic
  RETRY_INITIAL_DELAY_MS: 100,
  RETRY_MAX_DELAY_MS: 30 * 1000, // 30 seconds
  RETRY_BACKOFF_MULTIPLIER: 2,
  MAX_RETRIES: 3,

  // Health Checks
  HEALTH_CHECK_INTERVAL_MS: 30 * 1000, // 30 seconds
  HEALTH_CHECK_TIMEOUT_MS: 5 * 1000, // 5 seconds

  // Analytics and Logging
  LOG_FLUSH_INTERVAL_MS: 5 * 1000, // 5 seconds
} as const;

/**
 * Thresholds for Business Logic
 */
export const BUSINESS_LIMITS = {
  // Comments and Discussions
  MAX_COMMENTS_PER_BILL: 10000,
  MAX_COMMENT_LENGTH: 5000,
  MIN_COMMENT_LENGTH: 5,
  MAX_REPLIES_PER_COMMENT: 1000,
  COMMENT_MODERATION_QUEUE_SIZE: 5000,

  // Bills and Legislation
  MAX_BILLS_PER_PAGE: 50,
  MAX_AMENDMENTS_PER_BILL: 500,
  MAX_SPONSORS_PER_BILL: 1000,
  MAX_BILL_VERSIONS: 100,

  // Users and Accounts
  MAX_ACTIVE_SESSIONS_PER_USER: 5,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  PASSWORD_HISTORY_COUNT: 5,

  // Search and Filtering
  MAX_SEARCH_RESULTS: 1000,
  MAX_FACETS_PER_FIELD: 100,
  MAX_FILTERS_PER_QUERY: 10,

  // Notifications
  MAX_NOTIFICATIONS_PER_USER: 1000,
  MAX_NOTIFICATION_BACKLOG_DAYS: 30,

  // Archives and History
  MAX_HISTORY_ENTRIES: 10000,
  HISTORY_RETENTION_DAYS: 365,
} as const;

/**
 * Data Volume Limits
 */
export const DATA_LIMITS = {
  // Database Limits
  MAX_VARCHAR_LENGTH: 65535,
  MAX_TEXT_LENGTH: 16777215,
  MAX_LONGTEXT_LENGTH: 4294967295,

  // Batch Operations
  MAX_BATCH_DELETE_SIZE: 1000,
  MAX_BATCH_UPDATE_SIZE: 1000,
  MAX_BULK_INSERT_SIZE: 10000,

  // Export Limits
  MAX_EXPORT_RECORDS: 100000,
  MAX_EXPORT_FILE_SIZE: 500 * 1024 * 1024, // 500 MB
} as const;

/**
 * Feature Limits
 */
export const FEATURE_LIMITS = {
  // Search Indexing
  MIN_SEARCH_TERM_LENGTH: 2,
  MAX_SEARCH_TERM_LENGTH: 200,
  MIN_AUTOCOMPLETE_TERM_LENGTH: 1,

  // Analytics
  MAX_ANALYTICS_EVENTS_PER_MINUTE: 10000,
  ANALYTICS_BATCH_SIZE: 100,
  ANALYTICS_RETENTION_DAYS: 90,

  // Reports
  MAX_REPORT_RECORDS: 50000,
  REPORT_GENERATION_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Helper function to get time limit in seconds
 */
export function getTimeLimitSeconds(timeLimitMs: number): number {
  return Math.ceil(timeLimitMs / 1000);
}

/**
 * Helper function to get time limit in minutes
 */
export function getTimeLimitMinutes(timeLimitMs: number): number {
  return Math.ceil(timeLimitMs / (60 * 1000));
}

/**
 * Helper function to get file size in MB
 */
export function getFileSizeMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}
