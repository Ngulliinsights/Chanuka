/**
 * Core Utilities - Main Entry Point
 *
 * Consolidated cross-cutting utilities for the Chanuka platform
 * Only exports modules that actually exist (no adapters/legacy code)
 */

// Configuration Management
import { configManager, getConfig } from './config';
export {
  ConfigManager,
  configManager,
  getConfig,
  configSchema,
  defaultFeatures
} from './config';
export type {
  AppConfig,
  ConfigLoadOptions,
  ConfigChangeEvent,
  FeatureFlagContext,
  FeatureFlagResult,
  ConfigValidationResult,
  DependencyValidationResult
} from './config/types';

// Core modules with explicit re-exports to resolve conflicts

// Caching module (primary for caching-related exports)
export type {
  CacheOptions,
  CacheMetrics,
  CacheEvent,
  SingleFlightOptions,
  CacheService
} from './caching/types';
export type {
  CacheHealthStatus
} from './caching/core/interfaces';
export {
  MemoryAdapter
} from './caching';

// Observability module (primary for observability-related exports)
export type {
  LogLevel,
  LogContext,
  LogMetrics,
  RequestLogData,
  DatabaseQueryLogData,
  CacheOperationLogData,
  SecurityEventLogData,
  BusinessEventLogData,
  PerformanceLogData,
  StoredLogEntry,
  LogQueryFilters,
  LogAggregation,
  LogRotationConfig,
  LoggerOptions,
  ErrorTrackerInterface,
  LogTransport,
  LoggerChild
} from './observability/types';
export {
  UnifiedLogger,
  logger
} from './observability';

// Middleware module (primary for middleware-related exports)
export type {
  RegularMiddleware,
  ErrorMiddleware,
  AnyMiddleware,
  CacheService as MiddlewareCacheService,
  ValidationService as MiddlewareValidationService,
  HealthChecker,
  HealthStatus as MiddlewareHealthStatus,
  RateLimitStore as MiddlewareRateLimitStore,
  ValidationResult as MiddlewareValidationResult
} from './middleware/types';

// Primitives module
export * from './primitives';

// Types module
export type {
  FeatureFlagsService,
  FeatureFlagConfig
} from './types/feature-flags';
export {
  MockFeatureFlagsService
} from './types/feature-flags';

// Validation module (primary for validation-related exports)
export type {
  ValidationOptions,
  BatchValidationResult,
  CachedValidationResult,
  SchemaRegistration,
  ValidationContext,
  ValidationMetrics,
  ValidationServiceConfig,
  ValidationErrorDetail,
  LegacyValidationResult,
  ValidationResult as ValidationResult
} from './validation/types';
export {
  ValidationError
} from './validation/types';

// Rate limiting module (primary for rate-limiting-related exports)
export type {
  RateLimitOptions,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitBucket,
  RateLimitData,
  IRateLimitStore,
  RateLimitConfig,
  AIRateLimitOptions
} from './rate-limiting/types';
export {
  RateLimitFactory,
  AIRateLimiter,
  RateLimitMiddleware,
  rateLimitMiddleware
} from './rate-limiting';

// Utils module (primary for utility-related exports)
export * from './utils';

// Concurrency utilities (migration support)
export type {
  RaceConditionPreventionOptions
} from './utils/concurrency-adapter';
export {
  Mutex,
  Semaphore,
  ConcurrencyAdapter,
  globalMutex,
  apiMutex,
  cacheMutex,
  apiSemaphore,
  fileSemaphore,
  concurrencyAdapter,
  cleanup
} from './utils/concurrency-adapter';
export {
  ConcurrencyMigrationRouter,
  getConcurrencyRouter,
  setConcurrencyRouter
} from './utils/concurrency-migration-router';

// Performance module (primary for performance-related exports)
export type {
  PerformanceBudget,
  CoreWebVitalsBudgets,
  BundleSizeBudgets,
  StylingBudgets,
  PerformanceBudgetConfig
} from './performance/budgets';
export {
  DEFAULT_CORE_WEB_VITALS_BUDGETS,
  DEFAULT_BUNDLE_SIZE_BUDGETS,
  DEFAULT_STYLING_BUDGETS,
  PRODUCTION_BUDGETS,
  DEVELOPMENT_BUDGETS,
  getPerformanceBudgets,
  validateBudgetConfig
} from './performance/budgets';
export type {
  PerformanceMetric,
  BudgetViolation,
  PerformanceReport,
  AlertConfig
} from './performance/monitoring';
export {
  PerformanceMonitoringService,
  performanceMonitor
} from './performance/monitoring';
export type {
  MethodTimingData,
  MethodTimingStats,
  MethodTimingConfig,
  TimingHandle
} from './performance/method-timing';
export {
  MethodTimingService,
  methodTimingService,
  timed,
  timeMethod,
  getGlobalMethodTimingService,
  setGlobalMethodTimingService
} from './performance/method-timing';
export type {
  UnifiedPerformanceMetric,
  EnvironmentPerformanceReport,
  PerformanceInsight,
  CrossEnvironmentComparison,
  UnifiedMonitoringConfig
} from './performance/unified-monitoring';
export {
  UnifiedPerformanceMonitoringService,
  unifiedPerformanceMonitor
} from './performance/unified-monitoring';
export {
  createPerformanceMonitor,
  startPerformanceMonitoring
} from './performance';

// Modernization module
export * from './modernization';

// Testing utilities (development only)
export type * as Testing from './testing';

// Version information
export const VERSION = '1.0.0';
export const CORE_UTILITIES_VERSION = VERSION;

// Feature detection (only for modules that exist)
export const FEATURES = {
  CONFIG_MANAGEMENT: true,
  CACHE_SERVICE: true,
  OBSERVABILITY: true,
  VALIDATION_SERVICE: true,
  RATE_LIMITING: true,
  PERFORMANCE_TESTING: true,
  MODERNIZATION_INFRASTRUCTURE: true,
} as const;

// Logger is already exported from the main shared/core/index.ts file

// Default export for convenience
export default {
  configManager,
  getConfig,
  VERSION,
  FEATURES,
};












































