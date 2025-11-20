import React, { Component, ReactNode } from 'react';
import { SharedErrorDisplay, ErrorDisplayConfig } from './utils/shared-error-display';

/**
 * Simple Error Boundary Component
 *
 * A lightweight error boundary that provides basic error catching and display.
 * Uses shared error display utilities for consistent UI patterns.
 */
interface Props {
  /** Child components to wrap with error boundary */
  children: ReactNode;
  /** Custom fallback component to render on error */
  fallback?: ReactNode;
  /** Context string for error identification */
  context?: string;
}

interface State {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error?: Error;
}

/**
 * SimpleErrorBoundary provides basic error boundary functionality with consistent UI.
 * It catches JavaScript errors in the component tree and displays a user-friendly error message.
 */
export class SimpleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Updates state when an error is caught
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs error information when an error occurs
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by SimpleErrorBoundary:', error, errorInfo);
  }

  /**
   * Renders either the error fallback or the children components
   */
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use shared error display for consistent UI
      const displayConfig: ErrorDisplayConfig = {
        variant: 'page',
        severity: 'high',
        showIcon: true,
        showRetry: false,
        showReport: false,
        showGoHome: true,
        customMessage: 'Something went wrong',
      };

      return (
        <SharedErrorDisplay
          error={this.state.error || new Error('Unknown error')}
          config={displayConfig}
          onGoHome={() => window.location.reload()}
          context={this.props.context || 'SimpleErrorBoundary'}
        />
      );
    }

    return this.props.children;
  }
}

