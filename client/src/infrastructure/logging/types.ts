/**
 * Logging Type Definitions
 *
 * Re-exports types from the core logger implementation for consistency
 * with the infrastructure module pattern.
 */

export type {
  Logger,
  LogContext,
  ExtendedLogger,
  RenderTrackingData,
  ComponentLifecycleData,
  PerformanceImpactData,
  RenderStats,
} from '@client/lib/utils/logger';
