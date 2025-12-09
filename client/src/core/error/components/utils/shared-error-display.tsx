import { AlertTriangle, RefreshCw, Building } from 'lucide-react';
import React from 'react';

import { Button } from '../../ui/button';

/**
 * Shared error display utilities for consistent error UI patterns
 */

/**
 * Configuration for error display components
 */
export interface ErrorDisplayConfig {
  /** Layout variant: 'page' for full-screen errors, 'inline' for embedded errors, 'modal' for overlay */
  variant: 'page' | 'inline' | 'modal';
  /** Error severity level affecting colors and styling */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Whether to show an error icon */
  showIcon?: boolean;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Whether to show a report error button */
  showReport?: boolean;
  /** Whether to show a "go home" button */
  showGoHome?: boolean;
  /** Custom error message to display */
  customMessage?: string;
  /** Custom action buttons or components */
  customActions?: React.ReactNode;
}

export interface ErrorDisplayProps {
  error: Error;
  config: ErrorDisplayConfig;
  onRetry?: () => void;
  onReport?: () => void;
  onGoHome?: () => void;
  context?: string;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Get severity-based styling
 */
export function getSeverityStyles(severity: ErrorDisplayConfig['severity']) {
  const styles = {
    low: {
      container: 'bg-yellow-50 border border-yellow-200',
      icon: 'text-yellow-500',
      title: 'text-yellow-800',
      desc: 'text-yellow-700',
      button: 'text-yellow-800 hover:bg-yellow-100'
    },
    medium: {
      container: 'bg-orange-50 border border-orange-200',
      icon: 'text-orange-500',
      title: 'text-orange-800',
      desc: 'text-orange-700',
      button: 'text-orange-800 hover:bg-orange-100'
    },
    high: {
      container: 'bg-red-50 border border-red-200',
      icon: 'text-red-500',
      title: 'text-red-800',
      desc: 'text-red-700',
      button: 'text-red-800 hover:bg-red-100'
    },
    critical: {
      container: 'bg-red-50 border border-red-200',
      icon: 'text-red-500',
      title: 'text-red-900',
      desc: 'text-red-700',
      button: 'text-red-800 hover:bg-red-100'
    }
  };

  return styles[severity];
}

/**
 * Shared error actions component
 */
export function ErrorActions({
  config,
  onRetry,
  onReport,
  onGoHome,
  retryCount = 0,
  maxRetries = 3
}: Pick<ErrorDisplayProps, 'config' | 'onRetry' | 'onReport' | 'onGoHome' | 'retryCount' | 'maxRetries'>) {
  const styles = getSeverityStyles(config.severity);

  return (
    <div className="space-y-2">
      {config.showRetry && onRetry && (
        <Button onClick={onRetry} className="w-full" variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
        </Button>
      )}

      {config.showGoHome && onGoHome && config.variant !== 'page' && (
        <Button
          onClick={onGoHome}
          className="w-full"
          variant="outline"
        >
          <Building className="h-4 w-4 mr-2" />
          Go to Homepage
        </Button>
      )}

      {config.showReport && onReport && (
        <Button
          onClick={onReport}
          className="w-full"
          variant="ghost"
          size="sm"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report this issue
        </Button>
      )}

      {config.customActions}
    </div>
  );
}

/**
 * Shared error display component
 */
export function SharedErrorDisplay({
  error,
  config,
  onRetry,
  onReport,
  onGoHome,
  context,
  retryCount = 0,
  maxRetries = 3
}: ErrorDisplayProps) {
  const styles = getSeverityStyles(config.severity);
  const isPageVariant = config.variant === 'page';

  const containerClasses = isPageVariant
    ? "min-h-screen bg-gray-50 flex items-center justify-center p-4"
    : `${styles.container} rounded-md p-4 m-4`;

  const contentClasses = isPageVariant
    ? "w-full max-w-md bg-white rounded-lg shadow-lg"
    : "flex items-start";

  const textClasses = isPageVariant
    ? "text-center p-6"
    : "flex-1";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {isPageVariant && (
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        )}

        <div className={textClasses}>
          {config.showIcon && !isPageVariant && (
            <AlertTriangle className={`h-5 w-5 ${styles.icon} mt-0.5 mr-3 flex-shrink-0`} />
          )}

          <h3 className={`text-sm font-medium ${styles.title} ${isPageVariant ? 'text-2xl mb-2' : 'mb-1'}`}>
            {config.customMessage || 'Something went wrong'}
          </h3>

          <p className={`text-sm ${styles.desc} ${isPageVariant ? 'mb-4' : 'mt-1'}`}>
            {error.message || 'An unexpected error occurred'}
          </p>

          {context && isPageVariant && (
            <p className="text-xs text-gray-500 mb-4">
              Context: {context}
            </p>
          )}
        </div>

        {(config.showRetry || config.showReport || config.showGoHome || config.customActions) && (
          <div className={isPageVariant ? "space-y-4 p-6" : "flex space-x-2 ml-2"}>
            <ErrorActions
              config={config}
              onRetry={onRetry}
              onReport={onReport}
              onGoHome={onGoHome}
              retryCount={retryCount}
              maxRetries={maxRetries}
            />
          </div>
        )}
      </div>
    </div>
  );
}