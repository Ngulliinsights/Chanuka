/**
 * Time constants with type-safe values
 * All values are in milliseconds for consistency
 */

// Time unit conversions
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60000;
export const MILLISECONDS_PER_HOUR = 3600000;
export const MILLISECONDS_PER_DAY = 86400000;
export const MILLISECONDS_PER_WEEK = 604800000;

// Common time intervals
export const TIME_SECOND = 1000;
export const TIME_MINUTE = 60000;
export const TIME_HOUR = 3600000;
export const TIME_DAY = 86400000;
export const TIME_WEEK = 604800000;

// Short time intervals (for timeouts, retries, etc.)
export const TIME_100MS = 100;
export const TIME_250MS = 250;
export const TIME_500MS = 500;
export const TIME_1S = 1000;
export const TIME_2S = 2000;
export const TIME_5S = 5000;
export const TIME_10S = 10000;
export const TIME_30S = 30000;

// Medium time intervals
export const TIME_1M = 60000;
export const TIME_2M = 120000;
export const TIME_5M = 300000;
export const TIME_10M = 600000;
export const TIME_15M = 900000;
export const TIME_30M = 1800000;

// Long time intervals
export const TIME_1H = 3600000;
export const TIME_2H = 7200000;
export const TIME_6H = 21600000;
export const TIME_12H = 43200000;
export const TIME_24H = 86400000;

// Session and token timeouts
export const SESSION_TIMEOUT_DEFAULT = 86400000; // 24 hours
export const SESSION_TIMEOUT_SHORT = 3600000;    // 1 hour
export const SESSION_TIMEOUT_LONG = 604800000;   // 7 days

export const TOKEN_EXPIRY_DEFAULT = 3600000;     // 1 hour
export const TOKEN_EXPIRY_SHORT = 900000;        // 15 minutes
export const TOKEN_EXPIRY_LONG = 86400000;       // 24 hours

// Cache TTL values
export const CACHE_TTL_SHORT = 300000;           // 5 minutes
export const CACHE_TTL_MEDIUM = 1800000;         // 30 minutes
export const CACHE_TTL_LONG = 7200000;           // 2 hours
export const CACHE_TTL_VERY_LONG = 86400000;     // 24 hours

// Rate limiting windows
export const RATE_LIMIT_WINDOW_MINUTE = 60000;
export const RATE_LIMIT_WINDOW_HOUR = 3600000;
export const RATE_LIMIT_WINDOW_DAY = 86400000;

// Database timeouts
export const DB_TIMEOUT_SHORT = 5000;            // 5 seconds
export const DB_TIMEOUT_MEDIUM = 30000;          // 30 seconds
export const DB_TIMEOUT_LONG = 120000;           // 2 minutes

// HTTP timeouts
export const HTTP_TIMEOUT_SHORT = 10000;         // 10 seconds
export const HTTP_TIMEOUT_MEDIUM = 30000;        // 30 seconds
export const HTTP_TIMEOUT_LONG = 120000;         // 2 minutes

// Retry delays (exponential backoff base)
export const RETRY_DELAY_BASE = 1000;            // 1 second
export const RETRY_DELAY_MAX = 30000;            // 30 seconds

// Health check intervals
export const HEALTH_CHECK_INTERVAL = 30000;      // 30 seconds
export const HEALTH_CHECK_TIMEOUT = 10000;       // 10 seconds

// Graceful shutdown timeouts
export const SHUTDOWN_TIMEOUT = 30000;           // 30 seconds
export const SHUTDOWN_FORCE_TIMEOUT = 10000;     // 10 seconds

/**
 * Type-safe time duration type
 */
export type TimeDuration =
  | typeof TIME_100MS
  | typeof TIME_250MS
  | typeof TIME_500MS
  | typeof TIME_1S
  | typeof TIME_2S
  | typeof TIME_5S
  | typeof TIME_10S
  | typeof TIME_30S
  | typeof TIME_1M
  | typeof TIME_2M
  | typeof TIME_5M
  | typeof TIME_10M
  | typeof TIME_15M
  | typeof TIME_30M
  | typeof TIME_1H
  | typeof TIME_2H
  | typeof TIME_6H
  | typeof TIME_12H
  | typeof TIME_24H
  | typeof SESSION_TIMEOUT_DEFAULT
  | typeof SESSION_TIMEOUT_SHORT
  | typeof SESSION_TIMEOUT_LONG
  | typeof TOKEN_EXPIRY_DEFAULT
  | typeof TOKEN_EXPIRY_SHORT
  | typeof TOKEN_EXPIRY_LONG
  | typeof CACHE_TTL_SHORT
  | typeof CACHE_TTL_MEDIUM
  | typeof CACHE_TTL_LONG
  | typeof CACHE_TTL_VERY_LONG
  | typeof RATE_LIMIT_WINDOW_MINUTE
  | typeof RATE_LIMIT_WINDOW_HOUR
  | typeof RATE_LIMIT_WINDOW_DAY
  | typeof DB_TIMEOUT_SHORT
  | typeof DB_TIMEOUT_MEDIUM
  | typeof DB_TIMEOUT_LONG
  | typeof HTTP_TIMEOUT_SHORT
  | typeof HTTP_TIMEOUT_MEDIUM
  | typeof HTTP_TIMEOUT_LONG
  | typeof RETRY_DELAY_BASE
  | typeof RETRY_DELAY_MAX
  | typeof HEALTH_CHECK_INTERVAL
  | typeof HEALTH_CHECK_TIMEOUT
  | typeof SHUTDOWN_TIMEOUT
  | typeof SHUTDOWN_FORCE_TIMEOUT;

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * MILLISECONDS_PER_SECOND;
}

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * MILLISECONDS_PER_MINUTE;
}

/**
 * Convert hours to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * MILLISECONDS_PER_HOUR;
}

/**
 * Convert days to milliseconds
 */
export function daysToMs(days: number): number {
  return days * MILLISECONDS_PER_DAY;
}

/**
 * Convert milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return ms / MILLISECONDS_PER_SECOND;
}

/**
 * Convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return ms / MILLISECONDS_PER_MINUTE;
}

/**
 * Convert milliseconds to hours
 */
export function msToHours(ms: number): number {
  return ms / MILLISECONDS_PER_HOUR;
}

/**
 * Convert milliseconds to days
 */
export function msToDays(ms: number): number {
  return ms / MILLISECONDS_PER_DAY;
}








































