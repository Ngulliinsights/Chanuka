/**
 * Community Error Boundary - Specialized error handling for community features
 *
 * Features:
 * - Incremental loading: render successful queries, show fallback for failures
 * - Error recovery mechanisms with retry functionality
 * - User-friendly error messages specific to community context
 * - Graceful degradation for partial failures
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface CommunityErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  context?: string;
  showRetry?: boolean;
  showHome?: boolean;
}

interface CommunityErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

/**
 * CommunityErrorBoundary provides specialized error handling for community features.
 * It supports incremental loading by allowing partial failures while maintaining
 * functionality for successful components.
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CommunityErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Community Error Boundary caught an error:', {
      error,
      errorInfo,
      context: this.props.context,
      retryCount: this.state.retryCount,
    });

    this.setState({
      error,
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

    this.setState({ hasError: false, error: undefined, errorInfo: undefined });

    if (onRetry) {
      this.retryTimeoutId = setTimeout(() => {
        onRetry();
        this.setState(prev => ({ retryCount: prev.retryCount + 1 }));
      }, delay);
    } else {
      // Default retry behavior - reload the component
      this.retryTimeoutId = setTimeout(() => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined, retryCount: retryCount + 1 });
      }, delay);
    }
  };

  handleGoHome = () => {
    // Navigate to community hub or reload page
    window.location.href = '/community';
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, showRetry = true, showHome = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <Card className="chanuka-card border-destructive/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-destructive">
                    Community Feature Error
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Something went wrong while loading this community section.
                    {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && error && (
                  <details className="text-xs bg-muted p-3 rounded-md">
                    <summary className="cursor-pointer font-medium">Error Details (Dev)</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-destructive">
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  </details>
                )}

                <div className="flex items-center gap-2">
                  {showRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.handleRetry}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  )}

                  {showHome && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={this.handleGoHome}
                      className="flex items-center gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Back to Community
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  If this problem persists, please refresh the page or contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

/**
 * Hook for creating incremental error boundaries that can handle partial failures
 */
export function useIncrementalErrorBoundary() {
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

  const isSectionFailed = React.useCallback((sectionId: string) => {
    return failedSections.has(sectionId);
  }, [failedSections]);

  return {
    failedSections,
    markSectionFailed,
    markSectionRecovered,
    isSectionFailed,
  };
}

/**
 * Higher-order component for wrapping components with error recovery
 */
export function withCommunityErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<CommunityErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CommunityErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CommunityErrorBoundary>
  );

  WrappedComponent.displayName = `withCommunityErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default CommunityErrorBoundary;