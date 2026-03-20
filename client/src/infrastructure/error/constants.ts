/**
 * Error Constants and Enums
 *
 * Client-specific error constants; ErrorDomain and ErrorSeverity are
 * imported from @shared/core (single source of truth).
 * Separated to avoid circular dependencies.
 */

// ============================================================================
// Error Domain & Severity — re-exported from shared single source of truth
// ============================================================================
export { ErrorDomain, ErrorSeverity } from '@shared/core';

/**
 * Recovery action types
 */
export enum RecoveryAction {
  RETRY = 'retry',
  CACHE_CLEAR = 'cache_clear',
  RELOAD = 'reload',
  REDIRECT = 'redirect',
  IGNORE = 'ignore',
  RESET = 'reset',
  CLEANUP = 'cleanup',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  ESCALATE = 'escalate',
  RECOVER = 'recover',
  NOTIFY = 'notify',
  PAGE_RELOAD = 'page_reload',
  DEGRADED_MODE = 'degraded_mode',
  MANUAL_RECOVERY = 'manual_recovery',
  SYSTEM_RESTART = 'system_restart',
  NETWORK_RETRY = 'network_retry',
  AUTH_REFRESH = 'auth_refresh',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  OFFLINE_MODE = 'offline_mode',
  REDUCED_FUNCTIONALITY = 'reduced_functionality',
}

// ============================================================================
// Error Propagation Modes
// ============================================================================

export enum ErrorPropagationMode {
  IMMEDIATE = 'immediate',               // Propagate immediately
  BATCHED = 'batched',                   // Batch errors before propagation
  THROTTLED = 'throttled',               // Throttle propagation rate
  FILTERED = 'filtered',                 // Filter errors before propagation
  NONE = 'none',                         // No propagation
}

// ============================================================================
// Error Handling Modes
// ============================================================================

export enum ErrorHandlingMode {
  STRICT = 'strict',                     // Strict error handling, no recovery
  RECOVERABLE = 'recoverable',           // Allow recovery strategies
  GRACEFUL = 'graceful',                 // Graceful degradation
  MONITORING_ONLY = 'monitoring_only',   // Only log and monitor
  DISABLED = 'disabled',                 // Disable error handling
}

// ============================================================================
// Error Recovery Strategy Types
// ============================================================================

export enum ErrorRecoveryStrategyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FAIL_FAST = 'fail_fast',
  CACHE_FALLBACK = 'cache_fallback',
  DEGRADED_MODE = 'degraded_mode',
  MANUAL_RECOVERY = 'manual_recovery',
  SYSTEM_RESTART = 'system_restart',
  NETWORK_RETRY = 'network_retry',
  AUTH_REFRESH = 'auth_refresh',
  PAGE_RELOAD = 'page_reload',
  CACHE_CLEAR = 'cache_clear',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  OFFLINE_MODE = 'offline_mode',
  REDUCED_FUNCTIONALITY = 'reduced_functionality',
}

// ============================================================================
// Circuit Breaker States
// ============================================================================

export enum CircuitBreakerState {
  CLOSED = 'closed',                     // Normal operation
  OPEN = 'open',                         // Circuit breaker open, blocking calls
  HALF_OPEN = 'half_open',               // Testing if service is recovered
}

// ============================================================================
// System Identifiers
// ============================================================================

export enum SystemIdentifier {
  SECURITY = 'security',
  HOOKS = 'hooks',
  LIBRARY_SERVICES = 'library_services',
  SERVICE_ARCHITECTURE = 'service_architecture',
  CORE = 'core',
  SHARED = 'shared',
  CLIENT = 'client',
  SERVER = 'server',
  BROWSER = 'browser',
  MOBILE = 'mobile',
}

// ============================================================================
// Recovery Condition Operators
// ============================================================================

export enum RecoveryConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  MATCHES = 'matches',
}
