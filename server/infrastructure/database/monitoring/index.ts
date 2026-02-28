/**
 * Database Monitoring Module
 *
 * Centralized monitoring components for database operations.
 * Provides metrics collection, health checking, and query logging.
 */

// Metrics Collector
export {
  MetricsCollector,
  createMetricsCollector,
  createProductionMetricsCollector,
  createTestMetricsCollector,
} from './metrics-collector';

export type {
  DatabaseMetrics,
  QueryMetrics,
  MetricsCollectorConfig,
} from './metrics-collector';

// Health Checker
export {
  HealthChecker,
  createHealthChecker,
  createProductionHealthChecker,
  createTestHealthChecker,
} from './health-checker';

export type {
  PoolHealthStatus,
  HealthCheckConfig,
  HealthCheckResult,
} from './health-checker';

// Query Logger
export {
  QueryLogger,
  createQueryLogger,
  createProductionQueryLogger,
  createDevelopmentQueryLogger,
  createTestQueryLogger,
} from './query-logger';

export type {
  QueryLogEntry,
  QueryLoggerConfig,
  QueryStats,
} from './query-logger';
