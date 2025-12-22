/**
 * Base Configuration for WebSocket Service
 * 
 * Immutable configuration constants that never change during runtime.
 * These values are set once during service initialization and remain
 * constant throughout the service lifecycle.
 */

import type { BaseConfigType } from '../types';

/**
 * Immutable base configuration constants.
 * These values define the core operational parameters of the WebSocket service
 * and should not be modified during runtime.
 */
export const BASE_CONFIG: BaseConfigType = {
  /**
   * Interval for sending heartbeat/ping messages to clients (milliseconds)
   */
  HEARTBEAT_INTERVAL: 30000,

  /**
   * Interval for performing health checks on the service (milliseconds)
   */
  HEALTH_CHECK_INTERVAL: 60000,

  /**
   * Threshold for considering a connection stale (milliseconds)
   */
  STALE_CONNECTION_THRESHOLD: 60000,

  /**
   * Maximum number of connections in the connection pool
   */
  CONNECTION_POOL_SIZE: 10000,

  /**
   * Maximum size of the operation queue
   */
  MAX_QUEUE_SIZE: 1000,

  /**
   * Maximum payload size for WebSocket messages (bytes)
   */
  MAX_PAYLOAD: 100 * 1024, // 100KB

  /**
   * Maximum number of latency samples to keep for performance tracking
   */
  MAX_LATENCY_SAMPLES: 200,

  /**
   * Age threshold for cleaning up dedupe cache entries (milliseconds)
   */
  DEDUPE_CACHE_CLEANUP_AGE: 1800000, // 30 minutes

  /**
   * Maximum number of reconnection attempts for clients
   */
  MAX_RECONNECT_ATTEMPTS: 3,

  /**
   * Delay between reconnection attempts (milliseconds)
   */
  RECONNECT_DELAY: 1000,

  /**
   * Memory usage threshold for triggering high memory warnings (percentage)
   */
  HIGH_MEMORY_THRESHOLD: 85,

  /**
   * Memory usage threshold for triggering critical memory actions (percentage)
   */
  CRITICAL_MEMORY_THRESHOLD: 95,

  /**
   * Maximum size of performance history buffer
   */
  PERFORMANCE_HISTORY_MAX_SIZE: 100,

  /**
   * Grace period for graceful shutdown (milliseconds)
   */
  SHUTDOWN_GRACE_PERIOD: 5000,
} as const;

/**
 * Type guard to validate base configuration values
 */
export function isValidBaseConfig(config: unknown): config is BaseConfigType {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const requiredKeys: Array<keyof BaseConfigType> = [
    'HEARTBEAT_INTERVAL',
    'HEALTH_CHECK_INTERVAL',
    'STALE_CONNECTION_THRESHOLD',
    'CONNECTION_POOL_SIZE',
    'MAX_QUEUE_SIZE',
    'MAX_PAYLOAD',
    'MAX_LATENCY_SAMPLES',
    'DEDUPE_CACHE_CLEANUP_AGE',
    'MAX_RECONNECT_ATTEMPTS',
    'RECONNECT_DELAY',
    'HIGH_MEMORY_THRESHOLD',
    'CRITICAL_MEMORY_THRESHOLD',
    'PERFORMANCE_HISTORY_MAX_SIZE',
    'SHUTDOWN_GRACE_PERIOD',
  ];

  const configObj = config as Record<string, unknown>;

  return requiredKeys.every(key => {
    const value = configObj[key];
    return typeof value === 'number' && value > 0;
  });
}

/**
 * Get a frozen copy of the base configuration to prevent accidental mutations
 */
export function getBaseConfig(): BaseConfigType {
  return Object.freeze({ ...BASE_CONFIG });
}