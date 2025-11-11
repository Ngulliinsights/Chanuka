/**
 * Unified Error Handling System - Single Source of Truth
 * 
 * This file provides the complete error handling system with a clean,
 * production-ready API that eliminates redundancy and confusion.
 */

// ============================================================================
// PRIMARY: Enhanced Error Components (Recommended for all new code)
// ============================================================================

// Enhanced ErrorBoundary with full unified error handler features
export type {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  RecoveryOption,
  UserFeedback,
  ErrorMetrics
} from '../error-handling/ErrorBoundary';
export { ErrorBoundary as EnhancedErrorBoundary } from '../error-handling/ErrorBoundary';

// ============================================================================
// CORE: Unified Error Handler System
// ============================================================================

// Unified error handler core
export {
  errorHandler,
  useErrorHandler,
  useErrorBoundary,
} from '../../utils/unified-error-handler';
export type {
  AppError,
  ErrorContext,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
} from '../../utils/unified-error-handler';

// Error types (single source of truth)
export {
  ErrorSeverity,
  ErrorDomain,
  ErrorDomain as ErrorType, // Backward compatibility alias
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  NetworkError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  CacheError,
  ConflictError,
  TooManyRequestsError,
} from '../../core/error';

// Convenience error creation functions
export {
  createNetworkError,
  createValidationError,
  createAuthError,
  createPermissionError,
  createServerError,
} from '../../utils/unified-error-handler';

// Error system initialization
export { initializeErrorHandling } from '../../utils/error-setup';

// ============================================================================
// UI INTEGRATION: Error Provider and Hooks
// ============================================================================

// Unified error handling integration layer
export {
  UnifiedErrorToast,
  UnifiedErrorProvider,
  useUnifiedErrorIntegration,
  useUnifiedErrorHandler,
} from './unified-error-integration';

// ============================================================================
// LEGACY: Backward Compatible Components (Deprecated)
// ============================================================================

/**
 * @deprecated Use EnhancedErrorBoundary instead
 */
export { ErrorBoundary as LegacyErrorBoundary } from './ErrorBoundary';

// Still useful UI components
export { ErrorFallback, InlineError } from './ErrorFallback';
export { ErrorModal, useErrorModal } from './ErrorModal';

// ============================================================================
// RECOMMENDED USAGE PATTERNS
// ============================================================================

/*
PRODUCTION-READY USAGE:

1. App-level setup:
   import { UnifiedErrorProvider, initializeErrorHandling } from './components/error';
   
   // In App.tsx
   useEffect(() => {
     initializeErrorHandling({
       enableGlobalHandlers: true,
       enableRecovery: true,
       logErrors: true,
     });
   }, []);
   
   <UnifiedErrorProvider showToasts={true} enableFeedback={true}>
     <App />
   </UnifiedErrorProvider>

2. Component-level error boundaries:
   import { EnhancedErrorBoundary } from './components/error';
   
   <EnhancedErrorBoundary 
     enableRecovery={true} 
     enableFeedback={true}
     context="ComponentName"
   >
     <Component />
   </EnhancedErrorBoundary>

3. Error handling in code:
   import { createNetworkError, useUnifiedErrorHandler, ErrorDomain } from './components/error';
   
   // Convenience functions
   createNetworkError('API call failed', { status: 500 });
   
   // Advanced usage
   const { handleError } = useUnifiedErrorHandler();
   handleError({
     type: ErrorDomain.VALIDATION,
     severity: ErrorSeverity.MEDIUM,
     message: 'Form validation failed',
     context: { component: 'UserForm', field: 'email' },
     recoverable: true,
   });

4. API error handling:
   import { createNetworkError, createServerError } from './components/error';
   
   try {
     const response = await fetch('/api/data');
     if (!response.ok) {
       if (response.status >= 500) {
         createServerError('Server error', { status: response.status });
       } else {
         createNetworkError('Request failed', { status: response.status });
       }
     }
   } catch (error) {
     createNetworkError('Network error', error);
   }
*/