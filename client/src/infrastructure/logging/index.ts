/**
 * Unified Logging Infrastructure
 *
 * Provides structured logging aligned with server-side patterns.
 * Replaces console.* calls with structured logging that integrates
 * with observability for tracking and monitoring.
 *
 * @module infrastructure/logging
 */

// Re-export the unified logger from lib/utils
export { logger, coreLogger } from '@client/lib/utils/logger';

// Re-export types
export type {
  Logger,
  LogContext,
  ExtendedLogger,
  RenderTrackingData,
  ComponentLifecycleData,
  PerformanceImpactData,
  RenderStats,
} from '@client/lib/utils/logger';

// Default export for convenience
export { logger as default } from '@client/lib/utils/logger';
