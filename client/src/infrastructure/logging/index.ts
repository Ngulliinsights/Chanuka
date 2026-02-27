/**
 * Unified Logging Infrastructure
 *
 * Provides structured logging aligned with server-side patterns.
 * Replaces console.* calls with structured logging that integrates
 * with observability for tracking and monitoring.
 *
 * ARCHITECTURE NOTE:
 * This module re-exports the logger from lib/utils/logger.ts.
 * The logger is intentionally kept in lib/utils to avoid circular dependencies
 * with infrastructure/error (which needs to log errors).
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

// Re-export error types for convenience (these are defined in logger to avoid cycles)
export { ErrorSeverity, ErrorDomain } from '@client/lib/utils/logger';
export type { BaseError } from '@client/lib/utils/logger';

// Default export for convenience
export { logger as default } from '@client/lib/utils/logger';
