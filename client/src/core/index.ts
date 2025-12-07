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
// Browser Compatibility
// ============================================================================

export {
    // Types
    type BrowserInfo,
    type FeatureSet,
    type CompatibilityStatus,
    type CompatibilityRecommendation,
    type PolyfillStatus,
    type FetchOptions,
    type FetchResponse,
    type IntersectionObserverEntry,
    type IntersectionObserverOptions,
    type StoragePolyfill,

    // Classes
    FeatureDetector,
    BrowserDetector,
    PolyfillManager,
    BrowserCompatibilityManager,

    // Singleton instances
    featureDetector,
    browserDetector,
    polyfillManager,
    browserCompatibilityManager,

    // Constants
    MINIMUM_VERSIONS,
    CRITICAL_FEATURES,
    BROWSER_NAME_MAP,

    // Utilities
    isBrowserEnv,
    isTestEnv,

    // Convenience functions
    getBrowserInfo,
    isBrowserSupported,
    hasFeature,
    hasCriticalFeatures,
    initializeBrowserCompatibility,
    getBrowserCompatibilityStatus,
    shouldBlockBrowser,
    getCompatibilityWarnings,
    loadPolyfills,
} from './browser';

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