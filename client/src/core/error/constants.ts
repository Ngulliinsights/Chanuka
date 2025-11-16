/**
 * Error Constants and Enums
 * 
 * Shared constants used across the error handling system.
 * Separated to avoid circular dependencies.
 */

/**
 * Categories for error classification, enabling better error routing and handling.
 */
export enum ErrorDomain {
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    PERMISSION = 'permission',
    VALIDATION = 'validation',
    NETWORK = 'network',
    DATABASE = 'database',
    EXTERNAL_SERVICE = 'external_service',
    CACHE = 'cache',
    BUSINESS_LOGIC = 'business_logic',
    SECURITY = 'security',
    SYSTEM = 'system',
    UNKNOWN = 'unknown'
}

/**
 * Severity levels for error prioritization and alerting.
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Recovery action types
 */
export enum RecoveryAction {
    RETRY = 'retry',
    CACHE_CLEAR = 'cache_clear',
    RELOAD = 'reload',
    REDIRECT = 'redirect',
    IGNORE = 'ignore',
}