/**
 * Monitoring Policy
 * 
 * Centralized configuration for monitoring thresholds, intervals, and limits.
 * All monitoring-related constants should be defined here.
 */

// ─── Performance Thresholds ───────────────────────────────────────────────────

/** Database query is considered slow above this threshold (milliseconds) */
export const DB_SLOW_QUERY_MS = 1000;

/** Database query is considered very slow above this threshold (milliseconds) */
export const DB_VERY_SLOW_QUERY_MS = 5000;

/** HTTP request is considered slow above this threshold (milliseconds) */
export const HTTP_SLOW_REQUEST_MS = 3000;

/** Operation is considered slow above this threshold (milliseconds) */
export const OP_WARNING_THRESHOLD_MS = 2000;

/** Operation is considered critically slow above this threshold (milliseconds) */
export const OP_CRITICAL_THRESHOLD_MS = 5000;

// ─── System Resource Thresholds ───────────────────────────────────────────────

/** Memory usage warning threshold (bytes) */
export const MEMORY_WARN_BYTES = 512 * 1024 * 1024; // 512 MB

/** Memory usage critical threshold (bytes) */
export const MEMORY_CRITICAL_BYTES = 1024 * 1024 * 1024; // 1 GB

/** CPU usage warning threshold (percent) */
export const CPU_WARN_PERCENT = 70;

/** CPU usage critical threshold (percent) */
export const CPU_CRITICAL_PERCENT = 90;

// ─── Cache Thresholds ─────────────────────────────────────────────────────────

/** Cache hit rate warning threshold (percent) */
export const CACHE_WARN_HIT_RATE = 70;

/** Cache hit rate critical threshold (percent) */
export const CACHE_CRITICAL_HIT_RATE = 50;

// ─── Monitoring Intervals ─────────────────────────────────────────────────────

export const INTERVALS = {
  /** Health check interval (milliseconds) */
  HEALTH_CHECK: 60_000, // 1 minute
  
  /** Memory monitoring interval (milliseconds) */
  MEMORY_MONITOR: 30_000, // 30 seconds
  
  /** Schema validation interval (milliseconds) */
  SCHEMA_VALIDATION: 300_000, // 5 minutes
  
  /** System metrics collection interval (milliseconds) */
  SYSTEM_METRICS: 10_000, // 10 seconds
  
  /** Log aggregation interval (milliseconds) */
  LOG_AGGREGATION: 60_000, // 1 minute
} as const;

// ─── History Limits ───────────────────────────────────────────────────────────

/** Maximum number of metrics to keep in memory */
export const MAX_METRICS_HISTORY = 10_000;

/** Maximum number of operation records to keep in memory */
export const MAX_OPERATIONS_HISTORY = 5_000;

/** Maximum number of logs to keep in memory */
export const MAX_LOGS_HISTORY = 10_000;

// ─── Alert Defaults ───────────────────────────────────────────────────────────

export const ALERT_DEFAULTS = {
  /** Error rate threshold for alerts (percent) */
  ERROR_RATE_THRESHOLD: 5,
  
  /** Error rate alert cooldown (minutes) */
  ERROR_RATE_COOLDOWN_MIN: 15,
  
  /** Slow request count threshold for alerts */
  SLOW_REQUEST_THRESHOLD: 100,
  
  /** Slow request alert cooldown (minutes) */
  SLOW_REQUEST_COOLDOWN_MIN: 15,
  
  /** Security event count threshold for alerts */
  SECURITY_EVENT_THRESHOLD: 10,
  
  /** Security event alert cooldown (minutes) */
  SECURITY_EVENT_COOLDOWN_MIN: 5,
} as const;

// ─── Retry Configuration ──────────────────────────────────────────────────────

export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,
  
  /** Initial retry delay (milliseconds) */
  INITIAL_DELAY_MS: 1000,
  
  /** Retry delay multiplier (exponential backoff) */
  BACKOFF_MULTIPLIER: 2,
  
  /** Maximum retry delay (milliseconds) */
  MAX_DELAY_MS: 10_000,
} as const;
