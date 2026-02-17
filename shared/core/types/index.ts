/**
 * Core Types Index
 *
 * Central export point for all core types
 * Explicit re-exports with aliases to resolve naming conflicts
 */

// Export all type files with explicit exports to avoid conflicts
export * from './auth.types';
export * from './realtime';

// Export services types with explicit exports to resolve ValidationResult conflict
export type {
  Services,
  CacheService as ServicesCacheService,
  ValidationService as ServicesValidationService,
  ValidationResult as ServicesValidationResult,
  RateLimitStore as ServicesRateLimitStore,
  RateLimitInfo,
  HealthChecker as ServicesHealthChecker,
  HealthStatus as ServicesHealthStatus
} from './services';

// Export validation types with explicit exports
export type {
  ValidationError,
  ValidationErrorDetail,
  ValidationResult,
  ValidationContext
} from './validation-types';

// Export types from other modules with conflict resolution



// TODO: Fix import path - observability is in server/infrastructure, not shared/core
// export { CircuitBreakerState as ObservabilityCircuitBreakerState } from '../observability/error-management/patterns/circuit-breaker';
// Database CircuitBreakerState is defined inline in connection-manager.ts, skip aliasing

// HealthStatus conflicts resolved with aliases
// TODO: Fix import path - observability is in server/infrastructure, not shared/core
// export type { HealthStatus as ObservabilityHealthStatus } from '../observability/health/types';




// ValidationError conflicts resolved with aliases
export * from './validation-types';
// TODO: Fix import path - observability is in server/infrastructure, not shared/core
// export { ValidationError as ErrorManagementValidationError } from '../observability/error-management/errors/specialized-errors';
export type { ValidationError as ValidationTypesAlias } from './validation-types';


// ValidationResult conflicts resolved with aliases
// Note: Primary ValidationResult is from validation-types, others are aliased
// Already exported above as primary ValidationResult from validation-types



// Middleware types (excluding conflicting ones already aliased above)
export type {
  RegularMiddleware,
  ErrorMiddleware,
  AnyMiddleware,
  PerformanceMetrics,
  MiddlewareProvider
} from '../middleware/types';





// Observability types (excluding conflicting ones already aliased above)
// TODO: Fix import paths - observability is in server/infrastructure, not shared/core
// These types should be imported from @server/infrastructure/observability if needed
/*
export type {
  ObservabilityConfig,
  ObservabilityContext,
  ObservabilityEvent,
  ObservabilityProvider,
  ObservabilityMiddleware,
  ObservabilityStack,
  TelemetryData,
  TelemetryExporter,

  HealthCheckResult
} from '../observability/types';

// Circuit breaker types
export type {
  CircuitBreakerMetrics
} from '../observability/error-management/types';
*/







