/**
 * Unified Error Boundary Components
 *
 * Exports all error boundary components and utilities for easy importing
 */

export { ErrorBoundary, withErrorBoundary, useErrorBoundary } from './ErrorBoundary';
export { ErrorFallback } from './ErrorFallback';
export { RecoveryUI } from './RecoveryUI';

// Export types with unique names to avoid conflicts
export type {
  ErrorBoundaryProps as BoundaryProps,
  ErrorBoundaryState as BoundaryState,
  ErrorDisplayMode,
  ErrorFallbackVariant,
  RecoveryUIVariant,
  ErrorFallbackProps,
  RecoveryUIProps,
  RecoveryAction as BoundaryRecoveryAction,
  ErrorBoundaryConfig,
  ErrorDisplayConfig,
  ErrorBoundaryAriaLabels,
  ErrorBoundaryAriaProps,
  UseErrorBoundaryReturn,
  ErrorBoundaryContextValue,
  ErrorBoundaryProviderProps,
} from './types';