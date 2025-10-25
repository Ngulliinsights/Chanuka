/**
 * Legacy Adapter for error-handling directory
 * 
 * Provides backward compatibility for code that imports from the old error-handling directory.
 * This adapter maps old interfaces to the new consolidated error management system.
 */

// Re-export everything from the new consolidated system
export * from '../errors/base-error';
export * from '../errors/specialized-errors';
export * from '../patterns/circuit-breaker';
export * from '../patterns/retry-patterns';

// Legacy type aliases for backward compatibility
export type {
    BaseErrorOptions,
    ErrorMetadata,
    RecoveryStrategy
} from '../errors/base-error.js';

export type {
    CircuitBreakerOptions,
    CircuitBreakerMetrics,
    CircuitBreakerState
} from '../patterns/circuit-breaker.js';

// Legacy class aliases
export { BaseError as BaseError } from '../errors/base-error';
export { CircuitBreaker as CircuitBreaker } from '../patterns/circuit-breaker';

// Legacy constants
export const ERROR_DOMAINS = {
    SYSTEM: 'system',
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
    BUSINESS_LOGIC: 'business_logic'
} as const;

export const ERROR_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
} as const;

// Legacy factory functions
export function createError(message: string, options?: any) {
    const { BaseError } = require('../errors/base-error.js');
    return new BaseError(message, options);
}

export function createCircuitBreaker(options?: any) {
    const { CircuitBreaker } = require('../patterns/circuit-breaker.js');
    return new CircuitBreaker(options);
}

// Deprecation warnings
console.warn(
    '[DEPRECATED] Importing from error-handling is deprecated. ' +
    'Please import from @shared/core/observability/error-management instead.'
);




































