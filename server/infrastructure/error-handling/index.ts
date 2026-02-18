/**
 * Error Handling Infrastructure — Public API
 *
 * Structured into four distinct layers. Import only from the layer you need.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Layer          Module               Depends on                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  Types          types.ts             (nothing)                          │
 * │  Construction   error-factory.ts     types.ts                           │
 * │  Functional     result-types.ts      types.ts, error-factory.ts         │
 * │  Resilience     resilience.ts        types.ts                           │
 * │  HTTP           http-error-handler   types.ts, error-factory.ts,        │
 * │                                      result-types.ts                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Service-layer code should only import from:
 *   - error-factory.ts  (to create errors)
 *   - result-types.ts   (to work with Result types)
 *   - resilience.ts     (to protect external calls)
 *
 * Route handlers and middleware should additionally use:
 *   - http-error-handler.ts (to build responses and register middleware)
 *
 * The types module is a universal dependency — any layer may import from it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types (import in any layer)
// ─────────────────────────────────────────────────────────────────────────────
export type {
  AlertAction,
  AlertRule,
  CircuitBreakerOptions,
  CircuitBreakerStats,
  ErrorContext,
  ErrorPattern,
  ErrorResponse,
  RequestErrorContext,
  RetryOptions,
  StandardizedError,
  TrackedError,
} from './types';
export {
  CircuitState,
  ErrorCategory,
  ErrorSeverity,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Error Factory (service layer — create errors here)
// ─────────────────────────────────────────────────────────────────────────────
export type { CreateErrorOptions } from './error-factory';
export {
  // Core builder (use when no domain-specific factory fits)
  createError,
  // Domain-specific factories
  createAuthenticationError,
  createAuthorizationError,
  createBusinessLogicError,
  createConflictError,
  createDatabaseError,
  createExternalServiceError,
  createNotFoundError,
  createRateLimitError,
  createSystemError,
  createValidationError,
  // Read-only table accessors (for conversion utilities)
  categoryIsRetryable,
  httpStatusForCategory,
  severityForCategory,
  userMessageForCategory,
} from './error-factory';

// ─────────────────────────────────────────────────────────────────────────────
// Result Types (service layer — functional error handling)
// ─────────────────────────────────────────────────────────────────────────────
export type {
  AsyncBoomResult,
  AsyncServiceResult,
  BoomResult,
  ServiceResult,
} from './result-types';
export {
  // Re-exported neverthrow primitives
  err,
  ok,
  Result,
  // Safe wrappers
  safe,
  safeAsync,
  safeAsyncBoom,
  // Combinators
  combineResults,
  fromNullable,
  fromNullableAsync,
  partitionResults,
  // Boom ↔ StandardizedError conversions
  boomFromStandardized,
  standardizedFromBoom,
  // Migration helpers (Boom Result ↔ Service Result)
  toBoomResult,
  toServiceResult,
} from './result-types';

// ─────────────────────────────────────────────────────────────────────────────
// Resilience (any layer that calls external dependencies)
// ─────────────────────────────────────────────────────────────────────────────
export {
  BulkheadExecutor,
  CircuitBreaker,
  CircuitOpenError,
  RecoveryChain,
  TimeoutError,
  defaultIsRetryable,
  withFallback,
  withRetry,
  withRetryAndFallback,
  withTimeout,
} from './resilience';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Layer (route handlers and middleware registration only)
// ─────────────────────────────────────────────────────────────────────────────
export type { ErrorMiddlewareOptions } from './http-error-handler';
export {
  classifyError,
  createExpressErrorMiddleware,
  extractRequestContext,
  sendResult,
  toErrorResponse,
} from './http-error-handler';