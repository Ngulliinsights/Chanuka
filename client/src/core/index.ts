/**
 * Core Module - Business Logic and Domain Services
 *
 * This module focuses on business logic, domain services, and feature-specific
 * functionality. Technical infrastructure has been moved to the shared module
 * following the architectural principle: "shared/ handles UI concerns and 
 * infrastructure, core/ handles business logic."
 *
 * For technical infrastructure, see the shared/infrastructure module.
 * For UI components and design system elements, see the shared module.
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
// Authentication System
// ============================================================================

export {
    // Main auth module
    default as auth,

    // Services
    AuthApiService,
    createAuthApiService,
    authApiService,
    TokenManager,
    tokenManager,
    SessionManager,
    sessionManager,

    // React Integration
    AuthProvider,
    useAuth,
    useAuthStore,

    // Redux Integration
    authReducer,
    authMiddleware,
    createAuthMiddleware,

    // HTTP Integration
    AuthenticatedApiClient,
    AuthenticationInterceptor,
    TokenRefreshInterceptor,
    createAuthInterceptors,

    // Validation
    validatePasswordComprehensive,
    checkPasswordStrength,
    validateEmailDomain,
    validateFormBatch,
    createDebouncedValidator,
    formatValidationErrors,

    // Configuration
    createAuthConfig,
    initializeAuth,
    configureAuth,

    // Constants
    AUTH_VALIDATION_RULES,
    AUTH_ERROR_MESSAGES,
    SESSION_REFRESH_BUFFER_MS,
    MINIMUM_REFRESH_DELAY_MS,

    // Error Classes
    AuthValidationError,
    AuthenticationError,
    AuthorizationError,
    SessionExpiredError,
    TokenRefreshError,

    // Types
    type AuthSettings,
    type AuthInitOptions,
    type AuthMiddlewareConfig,
    type PasswordStrength,
    type BatchValidationResult,
} from './auth';

// ============================================================================
// Performance Monitoring
// ============================================================================

export * from './performance';

// ============================================================================
// Loading States
// ============================================================================

export * from './loading';

// ============================================================================
// Storage Management (Session, Token, Cache)
// ============================================================================

// Storage Management (Session, Token, Cache)
// Note: CacheEntry, CacheConfig, EvictionPolicy, and CacheStats are exported from api
// to maintain single source of truth
export * from './storage';

// ============================================================================
// Mobile Utilities
// ============================================================================

export * from './mobile';

// ============================================================================
// Business Logic and Domain Services
// ============================================================================

// API Services (business logic focused) - includes cache types
export * from './api';

// Community Services (business logic)
export * from './community';

// Dashboard Services (business logic)
export * from './dashboard';

// Navigation Services (business logic)
export * from './navigation';

// ============================================================================
// Core Type Exports (Consolidated)
// ============================================================================

// Export core domain types from consolidated locations
export type { Bill, Comment, User, CommentStatus, Sponsor, BillAnalysis } from '../types/core';
export type { UserProfile, UserPreferences as FeatureUserPreferences } from '../features/users/types';
export type { SearchQuery, SearchResult, SearchFilters, SearchResponse, SearchMetadata } from '../features/search/types';

// ============================================================================
// Default Export
// ============================================================================

export default {};