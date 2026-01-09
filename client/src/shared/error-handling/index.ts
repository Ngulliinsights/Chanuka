/**
 * Unified Error Handling System
 *
 * Central error handling framework that provides consistent error handling
 * across all four client systems: Security, Hooks, Library Services, and Service Architecture.
 *
 * This module exports the complete error handling ecosystem including:
 * - Central error handling framework
 * - Error recovery strategies
 * - Error context and metadata standardization
 * - Cross-system error propagation utilities
 * - User-friendly error message system
 * - Error monitoring and analytics integration
 * - Error handling middleware
 */

// ============================================================================
// Core Error Types and Interfaces
// ============================================================================

export type {
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorListener,
  ErrorStats,
  ReactErrorInfo,
  ErrorBoundaryProps,
  ErrorFallbackProps,
  RecoveryResult,
  ErrorMetadata,
  ErrorAnalyticsProvider,
  ErrorReporter,
  ErrorTransformer,
  NavigationErrorType,
  CrossSystemError,
  ErrorPropagationContext,
  ErrorRecoveryAction,
  ErrorSeverityLevel,
  ErrorCategory,
  ErrorUserContext,
  ErrorSystemContext,
  ErrorRecoveryStrategyConfig,
  CircuitBreakerConfig,
  RetryConfig,
  FallbackConfig,
  FailFastConfig,
} from './types';

export {
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
  ErrorPropagationMode,
  ErrorHandlingMode,
  ErrorRecoveryStrategyType,
  CircuitBreakerState,
  ErrorCategory as ErrorCategoryEnum,
  ErrorSeverityLevel as ErrorSeverityLevelEnum,
} from './constants';

// ============================================================================
// Central Error Handling Framework
// ============================================================================

export {
  UnifiedErrorHandler,
  CrossSystemErrorHandler,
  ErrorPropagationManager,
  ErrorRecoveryManager,
  ErrorContextManager,
  ErrorMetadataManager,
} from './framework';

// ============================================================================
// Error Recovery Strategies
// ============================================================================

export {
  RetryStrategy,
  FallbackStrategy,
  CircuitBreakerStrategy,
  FailFastStrategy,
  RecoveryStrategyFactory,
  ErrorRecoveryOrchestrator,
} from './recovery';

// ============================================================================
// Error Context and Metadata
// ============================================================================

export {
  ErrorContextBuilder,
  ErrorMetadataBuilder,
  ErrorContextValidator,
  ErrorMetadataValidator,
  ContextPropagationService,
} from './context';

// ============================================================================
// Cross-System Error Propagation
// ============================================================================

export {
  ErrorPropagationService,
  CrossSystemErrorBridge,
  ErrorPropagationMiddleware,
  SystemErrorRouter,
} from './propagation';

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

export {
  UserFriendlyErrorService,
  ErrorMessageFormatter,
  ErrorRecoverySuggestionService,
  UserErrorContext,
  ErrorUserMessage,
} from './user-messages';

// ============================================================================
// Error Monitoring and Analytics
// ============================================================================

export {
  ErrorMonitoringService,
  ErrorAnalyticsCollector,
  ErrorMetricsCollector,
  ErrorTrendAnalyzer,
  ErrorAlertManager,
} from './monitoring';

// ============================================================================
// Error Handling Middleware
// ============================================================================

export {
  ErrorHandlingMiddleware,
  SystemErrorMiddleware,
  SecurityErrorMiddleware,
  LibraryErrorMiddleware,
  ServiceErrorMiddleware,
  MiddlewareChain,
} from './middleware';

// ============================================================================
// Integration Services
// ============================================================================

export {
  SecurityErrorIntegration,
  HooksErrorIntegration,
  LibraryServicesErrorIntegration,
  ServiceArchitectureErrorIntegration,
  CrossSystemErrorIntegration,
} from './integrations';

// ============================================================================
// Testing and Utilities
// ============================================================================

export {
  ErrorTestUtils,
  MockErrorReporter,
  ErrorSimulationService,
  ErrorRecoveryTestSuite,
  CrossSystemErrorTestSuite,
} from './testing';

// ============================================================================
// Configuration and Factory
// ============================================================================

export {
  ErrorHandlingConfig,
  ErrorHandlingFactory,
  CrossSystemErrorConfig,
  RecoveryStrategyConfig,
  MonitoringConfig,
} from './config';

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Core Services
  UnifiedErrorHandler,
  CrossSystemErrorHandler,
  ErrorPropagationManager,
  ErrorRecoveryManager,

  // Recovery Strategies
  RetryStrategy,
  FallbackStrategy,
  CircuitBreakerStrategy,
  FailFastStrategy,
  RecoveryStrategyFactory,

  // Context and Metadata
  ErrorContextBuilder,
  ErrorMetadataBuilder,
  ContextPropagationService,

  // Propagation
  ErrorPropagationService,
  CrossSystemErrorBridge,
  ErrorPropagationMiddleware,

  // User Experience
  UserFriendlyErrorService,
  ErrorMessageFormatter,
  ErrorRecoverySuggestionService,

  // Monitoring
  ErrorMonitoringService,
  ErrorAnalyticsCollector,
  ErrorMetricsCollector,

  // Middleware
  ErrorHandlingMiddleware,
  SystemErrorMiddleware,
  SecurityErrorMiddleware,
  LibraryErrorMiddleware,
  ServiceErrorMiddleware,

  // Integrations
  SecurityErrorIntegration,
  HooksErrorIntegration,
  LibraryServicesErrorIntegration,
  ServiceArchitectureErrorIntegration,
  CrossSystemErrorIntegration,

  // Testing
  ErrorTestUtils,
  MockErrorReporter,
  ErrorSimulationService,

  // Configuration
  ErrorHandlingConfig,
  ErrorHandlingFactory,
  CrossSystemErrorConfig,

  // Constants
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
  ErrorPropagationMode,
  ErrorHandlingMode,
  ErrorRecoveryStrategyType,
  CircuitBreakerState,
};
