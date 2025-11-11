/**
 * Core Cross-Cutting Concerns Module
 *
 * Unified exports for all core client-side functionality including
 * error handling, loading states, navigation, and other shared concerns.
 */

// ============================================================================
// Error Management
// ============================================================================

export {
    // Types
    type AppError,
    type ErrorContext,
    type ErrorRecoveryStrategy,
    type ErrorHandlerConfig,
    type ErrorListener,
    type ErrorStats,
    type ReactErrorInfo,
    type ErrorBoundaryProps,
    type ErrorFallbackProps,
    type RecoveryResult,

    // Enums
    ErrorDomain,
    ErrorSeverity,
    RecoveryAction,

    // Core handler
    coreErrorHandler,

    // Convenience functions
    createNetworkError,
    createValidationError,
    createAuthError,

    // Error boundary components
    EnhancedErrorBoundary,
    useErrorBoundary,
    withErrorBoundary,

    // Recovery strategies
    networkRetryStrategy,
    cacheClearStrategy,
    pageReloadStrategy,
    authRefreshStrategy,
    defaultRecoveryStrategies,
    registerDefaultRecoveryStrategies,
    executeRecovery,
    useRecovery,
    isRecoverable,

    // Initialization and utilities
    initializeCoreErrorHandling,
    getErrorStats,
    handleError,
    createError,
    logError,
    useCoreErrorHandler,
} from './error';

// ============================================================================
// Loading States (Placeholder - to be implemented)
// ============================================================================

// export { ... } from './loading';

// ============================================================================
// Navigation (Placeholder - to be implemented)
// ============================================================================

// export { ... } from './navigation';

// ============================================================================
// Dashboard (Placeholder - to be implemented)
// ============================================================================

// export { ... } from './dashboard';

// ============================================================================
// Default Export
// ============================================================================

export default {};