/**
 * Community Error Boundary - Specialized error handling for community features
 *
 * Features:
 * - Incremental loading: render successful queries, show fallback for failures
 * - Error recovery mechanisms with exponential backoff retry functionality
 * - User-friendly error messages specific to community context
 * - Graceful degradation for partial failures
 * - Integration with consolidated BaseError system
 * - Shared error display utilities for consistent UI
 */

import React, { Component, ReactNode } from 'react';

import { BaseError, ErrorDomain, ErrorSeverity } from '@client/core/error';
import { cn } from '@client/lib/utils';

import { SharedErrorDisplay, ErrorDisplayConfig } from './utils/shared-error-display';

export interface CommunityErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  context?: string;
  showRetry?: boolean;
  showHome?: boolean;
  enableIncrementalRecovery?: boolean;
}

export interface CommunityErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
}

/**
 * CommunityErrorBoundary provides specialized error handling for community features.
 * It supports incremental loading by allowing partial failures while maintaining
 * functionality for successful components. Now integrated with the consolidated
 * BaseError system and shared error display utilities.
 */
export class CommunityErrorBoundary extends Component<
  CommunityErrorBoundaryProps,
  CommunityErrorBoundaryState
> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: CommunityErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      recoveryAttempted: false,
      recoverySuccessful: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CommunityErrorBoundaryState> {
    // Convert to BaseError with community-specific context
    const baseError =
      error instanceof BaseError
        ? error
        : new BaseError(error.message, {
            statusCode: 500,
            code: 'COMMUNITY_ERROR_BOUNDARY',
            domain: ErrorDomain.SYSTEM,
            severity: ErrorSeverity.HIGH,
            retryable: true,
            recoverable: true,
            cause: error,
            context: {
              component: 'CommunityErrorBoundary',
              timestamp: Date.now(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
          });

    return {
      hasError: true,
      error: baseError,
      recoveryAttempted: false,
      recoverySuccessful: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Create BaseError with enhanced context
    const baseError =
      error instanceof BaseError
        ? error
        : new BaseError(error.message, {
            statusCode: 500,
            code: 'COMMUNITY_ERROR_BOUNDARY',
            domain: ErrorDomain.SYSTEM,
            severity: ErrorSeverity.HIGH,
            retryable: true,
            recoverable: true,
            cause: error,
            context: {
              component: 'CommunityErrorBoundary',
              operation: 'community_feature',
              timestamp: Date.now(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              url: typeof window !== 'undefined' ? window.location.href : undefined,
              componentStack: errorInfo.componentStack,
            },
          });

    console.error('Community Error Boundary caught an error:', {
      error: baseError,
      errorInfo,
      context: this.props.context,
      retryCount: this.state.retryCount,
      errorId: baseError.errorId,
      correlationId: baseError.metadata.correlationId,
    });

    this.setState({
      error: baseError,
      errorInfo,
    });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { onRetry } = this.props;
    const { retryCount } = this.state;

    // Implement exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      recoveryAttempted: true,
      recoverySuccessful: false,
    });

    if (onRetry) {
      this.retryTimeoutId = setTimeout(() => {
        onRetry();
        this.setState(prev => ({
          retryCount: prev.retryCount + 1,
          recoverySuccessful: true,
        }));
      }, delay);
    } else {
      // Default retry behavior - reload the component
      this.retryTimeoutId = setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: retryCount + 1,
          recoverySuccessful: true,
        });
      }, delay);
    }
  };

  handleGoHome = () => {
    // Navigate to community hub or reload page
    if (typeof window !== 'undefined') {
      window.location.href = '/community';
    }
  };

  render() {
    const { hasError, error, retryCount, recoveryAttempted, recoverySuccessful } = this.state;
    const { children, fallback, showRetry = true, showHome = true } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback;
      }

      // Use SharedErrorDisplay for consistent UI
      const displayConfig: ErrorDisplayConfig = {
        variant: 'inline',
        severity:
          error.metadata?.severity === ErrorSeverity.CRITICAL
            ? 'critical'
            : error.metadata?.severity === ErrorSeverity.HIGH
              ? 'high'
              : error.metadata?.severity === ErrorSeverity.MEDIUM
                ? 'medium'
                : 'low',
        showIcon: true,
        showRetry: showRetry && error.metadata?.retryable,
        showReport: false,
        showGoHome: showHome,
        customMessage: 'Community Feature Error',
      };

      const customActions = (
        <div className="mt-4 space-y-2">
          {recoveryAttempted && (
            <div
              className={cn(
                'p-3 rounded-md text-sm',
                recoverySuccessful
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              )}
            >
              {recoverySuccessful
                ? '✓ Recovery successful! The community feature has been restored.'
                : `✗ Recovery attempt failed. (Attempt ${retryCount + 1})`}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            If this problem persists, please refresh the page or contact support.
          </div>
        </div>
      );

      return (
        <SharedErrorDisplay
          error={error}
          config={{
            ...displayConfig,
            customActions,
          }}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          context={`Error ID: ${error.errorId}${retryCount > 0 ? ` (Attempt ${retryCount + 1})` : ''}`}
          retryCount={retryCount}
          maxRetries={3}
        />
      );
    }

    return children;
  }
}

/**
 * Hook for creating incremental error boundaries that can handle partial failures
 */
/**
 * Hook for creating incremental error boundaries that can handle partial failures
 * Note: Exported as const to avoid fast-refresh issues
 */
export const useIncrementalErrorBoundary = () => {
  const [failedSections, setFailedSections] = React.useState<Set<string>>(new Set());

  const markSectionFailed = React.useCallback((sectionId: string) => {
    setFailedSections(prev => new Set(prev).add(sectionId));
  }, []);

  const markSectionRecovered = React.useCallback((sectionId: string) => {
    setFailedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  }, []);

  const isSectionFailed = React.useCallback(
    (sectionId: string) => {
      return failedSections.has(sectionId);
    },
    [failedSections]
  );

  return {
    failedSections,
    markSectionFailed,
    markSectionRecovered,
    isSectionFailed,
  };
};

/**
 * Higher-order component for wrapping components with community error recovery
 * Note: Exported as const to avoid fast-refresh issues
 */
export const withCommunityErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<CommunityErrorBoundaryProps, 'children'>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props: P) => (
    <CommunityErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CommunityErrorBoundary>
  );

  WrappedComponent.displayName = `withCommunityErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default CommunityErrorBoundary;
