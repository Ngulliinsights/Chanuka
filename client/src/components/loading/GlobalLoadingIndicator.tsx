import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Wifi, WifiOff, AlertCircle, Clock, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingContext } from '@/contexts/LoadingContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/utils/browser-logger';
import { GlobalLoadingIndicatorProps } from './types';
import { 
  validateLoadingOperation, 
  safeValidateLoadingOperation,
  validateLoadingConfig 
} from './validation';
import { 
  LoadingError, 
  LoadingConfigurationError,
  LoadingOperationFailedError,
  getErrorDisplayMessage,
  getErrorRecoveryStrategy,
  isRetryableError 
} from './errors';
import { useLoadingRecovery } from './hooks/useLoadingRecovery';

export interface GlobalLoadingIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  showDetails?: boolean;
  showProgress?: boolean;
  showConnectionStatus?: boolean;
  maxVisible?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

export const GlobalLoadingIndicator: React.FC<GlobalLoadingIndicatorProps> = ({
  position = 'top-right',
  showDetails = true,
  showProgress = true,
  showConnectionStatus = true,
  maxVisible = 3,
  autoHide = true,
  autoHideDelay = 3000,
  className,
}) => {
  const {
    state,
    cancelOperation,
    retryOperation,
    getOperationsByPriority,
    shouldShowGlobalLoader,
  } = useLoadingContext();

  const [isVisible, setIsVisible] = React.useState(false);
  const [expandedOperations, setExpandedOperations] = React.useState<Set<string>>(new Set());

  // Show/hide logic
  React.useEffect(() => {
    const hasOperations = Object.keys(state.operations).length > 0;
    const shouldShow = hasOperations && shouldShowGlobalLoader();
    
    setIsVisible(shouldShow);

    if (!shouldShow && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [state.operations, shouldShowGlobalLoader, autoHide, autoHideDelay]);

  const toggleOperationDetails = (operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'center':
        return `${baseClasses} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getConnectionIcon = () => {
    if (!state.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    if (state.connectionInfo?.connectionType === 'slow') {
      return <Wifi className="h-4 w-4 text-yellow-500" />;
    }
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getOperationIcon = (operation: any) => {
    if (operation.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  };

  const getOperationStatusColor = (operation: any) => {
    if (operation.error) return 'text-red-600';
    if (operation.priority === 'high') return 'text-primary';
    return 'text-muted-foreground';
  };

  const formatTimeElapsed = (startTime: number) => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getVisibleOperations = () => {
    const highPriority = getOperationsByPriority('high');
    const mediumPriority = getOperationsByPriority('medium');
    const lowPriority = getOperationsByPriority('low');
    
    // Show high priority first, then medium, then low
    const sortedOperations = [...highPriority, ...mediumPriority, ...lowPriority];
    return sortedOperations.slice(0, maxVisible);
  };

  if (!isVisible) return null;

  const visibleOperations = getVisibleOperations();
  const totalOperations = Object.keys(state.operations).length;
  const hiddenCount = totalOperations - visibleOperations.length;

  const indicator = (
    <div className={cn(getPositionClasses(), className)}>
      <Card className="w-80 max-w-sm shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Loading ({totalOperations})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {showConnectionStatus && getConnectionIcon()}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Connection Status */}
          {showConnectionStatus && !state.isOnline && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
              You're offline. Some operations may be limited.
            </div>
          )}

          {showConnectionStatus && state.connectionInfo?.connectionType === 'slow' && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
              Slow connection detected. Operations may take longer.
            </div>
          )}

          {/* Operations List */}
          <div className="space-y-2">
            {visibleOperations.map((operation) => (
              <div
                key={operation.id}
                className="border rounded-lg p-3 bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    {getOperationIcon(operation)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          'text-xs font-medium truncate',
                          getOperationStatusColor(operation)
                        )}>
                          {operation.message || `${operation.type} loading`}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTimeElapsed(operation.startTime)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {showProgress && operation.progress !== undefined && (
                        <div className="mt-1">
                          <Progress 
                            value={operation.progress} 
                            className="h-1"
                          />
                        </div>
                      )}

                      {/* Stage info */}
                      {operation.stage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Stage: {operation.stage}
                        </p>
                      )}

                      {/* Error message */}
                      {operation.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {operation.error.message}
                        </p>
                      )}

                      {/* Retry count */}
                      {operation.retryCount > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Retry {operation.retryCount}/{operation.maxRetries}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-1 ml-2">
                    {showDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOperationDetails(operation.id)}
                        className="h-6 w-6 p-0"
                      >
                        <span className="text-xs">
                          {expandedOperations.has(operation.id) ? '−' : '+'}
                        </span>
                      </Button>
                    )}
                    
                    {operation.error && operation.retryCount < operation.maxRetries && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryOperation(operation.id)}
                        className="h-6 px-2 text-xs"
                      >
                        Retry
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelOperation(operation.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {showDetails && expandedOperations.has(operation.id) && (
                  <div className="mt-2 pt-2 border-t border-muted text-xs text-muted-foreground space-y-1">
                    <div>ID: {operation.id}</div>
                    <div>Type: {operation.type}</div>
                    <div>Priority: {operation.priority}</div>
                    <div>Started: {new Date(operation.startTime).toLocaleTimeString()}</div>
                    {operation.timeout && (
                      <div>Timeout: {operation.timeout / 1000}s</div>
                    )}
                    <div>Connection Aware: {operation.connectionAware ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hidden operations indicator */}
          {hiddenCount > 0 && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              +{hiddenCount} more operation{hiddenCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Adaptive settings info */}
          {showDetails && (
            <div className="mt-3 pt-2 border-t border-muted text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-1">
                <div>Max Concurrent: {state.adaptiveSettings.maxConcurrentOperations}</div>
                <div>Animations: {state.adaptiveSettings.enableAnimations ? 'On' : 'Off'}</div>
                <div>Default Timeout: {state.adaptiveSettings.defaultTimeout / 1000}s</div>
                <div>Retry Delay: {state.adaptiveSettings.retryDelay / 1000}s</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render to portal for proper z-index handling
  return createPortal(indicator, document.body);
};

// Simplified version for minimal display
export const MinimalGlobalLoadingIndicator: React.FC<{
  className?: string;
}> = ({ className }) => {
  const { state, shouldShowGlobalLoader } = useLoadingContext();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(shouldShowGlobalLoader());
  }, [shouldShowGlobalLoader]);

  if (!isVisible) return null;

  const operationCount = Object.keys(state.operations).length;
  const hasHighPriority = state.highPriorityLoading;

  const indicator = (
    <div className={cn(
      'fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg',
      className
    )}>
      <div className="flex items-center space-x-2">
        <Loader2 className={cn(
          'animate-spin',
          hasHighPriority ? 'h-5 w-5 text-primary' : 'h-4 w-4 text-muted-foreground'
        )} />
        <span className="text-sm text-muted-foreground">
          Loading{operationCount > 1 ? ` (${operationCount})` : ''}
        </span>
        {!state.isOnline && (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );

  return createPortal(indicator, document.body);
};

// Hook for controlling global loading indicator
export const useGlobalLoadingIndicator = () => {
  const [config, setConfig] = React.useState<Partial<GlobalLoadingIndicatorProps>>({});
  const [isEnabled, setIsEnabled] = React.useState(true);

  const show = (options?: Partial<GlobalLoadingIndicatorProps>) => {
    setConfig(options || {});
    setIsEnabled(true);
  };

  const hide = () => {
    setIsEnabled(false);
  };

  const updateConfig = (updates: Partial<GlobalLoadingIndicatorProps>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return {
    config,
    isEnabled,
    show,
    hide,
    updateConfig,
  };
};