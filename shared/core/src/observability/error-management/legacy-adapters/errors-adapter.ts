/**
 * Legacy Adapter for errors directory
 * 
 * Provides backward compatibility for code that imports from the old errors directory.
 * This adapter maps old interfaces to the new consolidated error management system.
 */

// Re-export everything from the new consolidated system
export * from '../errors/base-error.js';
export * from '../errors/specialized-errors.js';
export * from '../patterns/circuit-breaker.js';

// Legacy type aliases for backward compatibility
export type { 
  BaseErrorOptions,
  ErrorMetadata,
  RecoveryStrategy,
  ErrorDomain,
  ErrorSeverity
} from '../errors/base-error.js';

// Legacy class aliases with exact same interface
export { BaseError } from '../errors/base-error.js';
export { ValidationError } from '../errors/specialized-errors.js';
export { NotFoundError } from '../errors/specialized-errors.js';
export { UnauthorizedError } from '../errors/specialized-errors.js';
export { ForbiddenError } from '../errors/specialized-errors.js';
export { ConflictError } from '../errors/specialized-errors.js';
export { TooManyRequestsError } from '../errors/specialized-errors.js';
export { ServiceUnavailableError } from '../errors/specialized-errors.js';
export { CircuitBreaker } from '../patterns/circuit-breaker.js';

// Deprecation warnings
console.warn(
  '[DEPRECATED] Importing from errors is deprecated. ' +
  'Please import from @shared/core/observability/error-management instead.'
);




































