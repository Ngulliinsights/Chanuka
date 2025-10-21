import React from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionAware } from '@/hooks/useConnectionAware';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { logger } from '@/shared/core/src/observability/logging';
import { 
  LoadingStateProps, 
  LoadingSize, 
  ConnectionType, 
  LoadingStage,
  ProgressiveLoaderProps,
  TimeoutAwareLoaderProps,
  NetworkAwareLoaderProps,
  LoadingStateManagerProps,
  SkeletonProps,
  LazyLoadPlaceholderProps
} from './types';
import { 
  validateLoadingProgress, 
  validateLoadingStage, 
  safeValidateLoadingProgress,
  normalizeLoadingSize,
  isValidProgressPercentage 
} from './validation';
import { 
  LoadingError, 
  LoadingTimeoutError, 
  LoadingValidationError,
  LoadingStageError,
  isLoadingError,
  getErrorRecoveryStrategy,
  getErrorDisplayMessage
} from './errors';
import { useLoadingRecovery } from './hooks/useLoadingRecovery';

// Enhanced loading state components for different contexts
export interface LoadingStateProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  showMessage?: boolean;
}

export const PageLoader: React.FC<LoadingStateProps> = ({
  className,
  size = 'lg',
  message = 'Loading page...',
  showMessage = true,
}) => {
  const [error, setError] = React.useState<LoadingError | null>(null);
  const { recoveryState, recover, updateError } = useLoadingRecovery({
    maxRecoveryAttempts: 3,
    onRecoverySuccess: () => setError(null)
  });

  // Normalize and validate size
  const validatedSize = React.useMemo(() => {
    try {
      return normalizeLoadingSize(size);
    } catch (err) {
      logger.warn('Invalid loading size provided, using default', { size, error: err });
      return 'lg';
    }
  }, [size]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  // Update recovery when error changes
  React.useEffect(() => {
    updateError(error);
  }, [error, updateError]);

  // Error boundary for internal errors
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const loadingError = new LoadingError(
        event.message || 'Page loading error',
        'LOADING_ERROR',
        500,
        { filename: event.filename, lineno: event.lineno }
      );
      setError(loadingError);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error && !recoveryState.isRecovering) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center min-h-screen bg-background',
        className
      )}>
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <p className="text-sm font-medium text-red-600 mb-2">
          {getErrorDisplayMessage(error)}
        </p>
        {recoveryState.canRecover && (
          <button
            onClick={recover}
            className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        )}
        {recoveryState.suggestions.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground max-w-md text-center">
            <p className="font-medium mb-1">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1">
              {recoveryState.suggestions.slice(0, 3).map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-screen bg-background',
      className
    )}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[validatedSize])} />
      {showMessage && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
      {recoveryState.isRecovering && (
        <p className="mt-2 text-xs text-yellow-600">
          Attempting to recover...
        </p>
      )}
    </div>
  );
};

export const ComponentLoader: React.FC<LoadingStateProps> = ({
  className,
  size = 'md',
  message = 'Loading...',
  showMessage = false,
}) => {
  const [error, setError] = React.useState<LoadingError | null>(null);
  const { recoveryState, recover, updateError } = useLoadingRecovery({
    maxRecoveryAttempts: 2,
    onRecoverySuccess: () => setError(null)
  });

  // Normalize and validate size
  const validatedSize = React.useMemo(() => {
    try {
      return normalizeLoadingSize(size);
    } catch (err) {
      logger.warn('Invalid loading size provided, using default', { size, error: err });
      return 'md';
    }
  }, [size]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  // Update recovery when error changes
  React.useEffect(() => {
    updateError(error);
  }, [error, updateError]);

  if (error && !recoveryState.isRecovering) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 border border-dashed border-red-200 rounded-lg',
        className
      )}>
        <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
        <p className="text-sm text-red-600 text-center mb-2">
          {getErrorDisplayMessage(error)}
        </p>
        {recoveryState.canRecover && (
          <button
            onClick={recover}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8',
      className
    )}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[validatedSize])} />
      {showMessage && (
        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
      {recoveryState.isRecovering && (
        <p className="mt-1 text-xs text-yellow-600">
          Recovering...
        </p>
      )}
    </div>
  );
};

export const InlineLoader: React.FC<LoadingStateProps> = ({
  className,
  size = 'sm',
  message = 'Loading...',
  showMessage = true,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {showMessage && (
        <span className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
};

// Skeleton loading components for better perceived performance
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded',
        className
      )}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 border rounded-lg space-y-3', className)}>
    <Skeleton height="20px" width="60%" />
    <Skeleton height="16px" width="100%" />
    <Skeleton height="16px" width="80%" />
    <div className="flex space-x-2">
      <Skeleton height="32px" width="80px" />
      <Skeleton height="32px" width="60px" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ 
  items?: number; 
  className?: string;
}> = ({ items = 3, className }) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded">
        <Skeleton height="40px" width="40px" className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton height="16px" width="70%" />
          <Skeleton height="14px" width="50%" />
        </div>
      </div>
    ))}
  </div>
);

// Connection-aware loading states
export interface ConnectionAwareLoaderProps extends LoadingStateProps {
  isOnline?: boolean;
  connectionType?: 'slow' | 'fast' | 'offline';
}

export const ConnectionAwareLoader: React.FC<ConnectionAwareLoaderProps> = ({
  className,
  size = 'md',
  message,
  showMessage = true,
  isOnline = true,
  connectionType = 'fast',
}) => {
  const getConnectionMessage = () => {
    if (!isOnline) return 'You appear to be offline';
    if (connectionType === 'slow') return 'Loading... (slow connection detected)';
    return message || 'Loading...';
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="h-5 w-5 text-muted-foreground" />;
    if (connectionType === 'slow') return <Wifi className="h-5 w-5 text-yellow-500" />;
    return null;
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8',
      className
    )}>
      <div className="flex items-center space-x-2 mb-2">
        {!isOnline ? (
          getConnectionIcon()
        ) : (
          <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        )}
        {connectionType === 'slow' && getConnectionIcon()}
      </div>
      {showMessage && (
        <p className={cn(
          'text-sm text-center',
          !isOnline ? 'text-muted-foreground' : 'text-muted-foreground',
          connectionType === 'slow' ? 'text-yellow-600' : ''
        )}>
          {getConnectionMessage()}
        </p>
      )}
      {!isOnline && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Some features may be limited
        </p>
      )}
    </div>
  );
};

// Progressive loading component for heavy content
export interface ProgressiveLoaderProps {
  stages: Array<{
    message: string;
    duration?: number;
  }>;
  currentStage: number;
  className?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  stages,
  currentStage,
  className,
}) => {
  const [validationError, setValidationError] = React.useState<LoadingValidationError | null>(null);
  const [stageErrors, setStageErrors] = React.useState<Record<string, LoadingError>>({});

  // Validate stages and current stage
  const { validatedStages, validatedCurrentStage, progress } = React.useMemo(() => {
    try {
      // Validate each stage
      const validated = stages.map(stage => validateLoadingStage(stage));
      
      // Validate current stage index
      const currentIndex = Math.max(0, Math.min(currentStage, validated.length - 1));
      
      // Calculate progress
      const progressValue = validated.length > 0 ? ((currentIndex + 1) / validated.length) * 100 : 0;
      
      if (!isValidProgressPercentage(progressValue)) {
        throw new LoadingValidationError(
          'Invalid progress calculation',
          'progress',
          progressValue
        );
      }

      setValidationError(null);
      return {
        validatedStages: validated,
        validatedCurrentStage: currentIndex,
        progress: progressValue
      };
    } catch (error) {
      const validationErr = error instanceof LoadingValidationError 
        ? error 
        : new LoadingValidationError('Stage validation failed', 'stages', stages);
      
      setValidationError(validationErr);
      logger.error('Progressive loader validation failed', { error: validationErr, stages, currentStage });
      
      return {
        validatedStages: [],
        validatedCurrentStage: 0,
        progress: 0
      };
    }
  }, [stages, currentStage]);

  const currentStageData = validatedStages[validatedCurrentStage];
  const hasStageError = currentStageData && stageErrors[currentStageData.id];

  // Handle stage errors
  const handleStageError = React.useCallback((stageId: string, error: LoadingError) => {
    setStageErrors(prev => ({
      ...prev,
      [stageId]: error
    }));
  }, []);

  const retryStage = React.useCallback((stageId: string) => {
    setStageErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stageId];
      return newErrors;
    });
  }, []);

  if (validationError) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 border border-dashed border-red-200 rounded-lg',
        className
      )}>
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm font-medium text-red-600 mb-1">
          Configuration Error
        </p>
        <p className="text-xs text-red-500 text-center">
          {getErrorDisplayMessage(validationError)}
        </p>
      </div>
    );
  }

  if (validatedStages.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}>
        <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-sm text-muted-foreground">
          No loading stages configured
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 space-y-4',
      className
    )}>
      {hasStageError ? (
        <AlertCircle className="h-8 w-8 text-red-500" />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
      
      <div className="text-center space-y-2">
        <p className={cn(
          'text-sm',
          hasStageError ? 'text-red-600 font-medium' : 'text-muted-foreground'
        )}>
          {hasStageError 
            ? `Error in: ${currentStageData.message}` 
            : currentStageData.message
          }
        </p>
        
        {hasStageError && (
          <p className="text-xs text-red-500">
            {stageErrors[currentStageData.id]?.message || 'Stage failed'}
          </p>
        )}
        
        <div className="w-48 bg-muted rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              hasStageError ? 'bg-red-500' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          Step {validatedCurrentStage + 1} of {validatedStages.length}
        </p>
        
        {hasStageError && currentStageData.retryable !== false && (
          <button
            onClick={() => retryStage(currentStageData.id)}
            className="mt-2 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry Stage
          </button>
        )}
      </div>
    </div>
  );
};

// Enhanced timeout-aware loading component
export interface TimeoutAwareLoaderProps extends LoadingStateProps {
  timeout?: number;
  onTimeout?: () => void;
  showTimeoutWarning?: boolean;
  timeoutMessage?: string;
}

export const TimeoutAwareLoader: React.FC<TimeoutAwareLoaderProps> = ({
  className,
  size = 'md',
  message = 'Loading...',
  showMessage = true,
  timeout = 30000, // 30 seconds default
  onTimeout,
  showTimeoutWarning = true,
  timeoutMessage = 'This is taking longer than expected...',
}) => {
  const [timeElapsed, setTimeElapsed] = React.useState(0);
  const [showWarning, setShowWarning] = React.useState(false);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    const startTime = Date.now();
    const warningThreshold = timeout * 0.7; // Show warning at 70% of timeout

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);

      if (elapsed >= warningThreshold && !showWarning && showTimeoutWarning) {
        setShowWarning(true);
      }

      if (elapsed >= timeout) {
        setHasTimedOut(true);
        clearInterval(interval);
        onTimeout?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeout, onTimeout, showTimeoutWarning, showWarning]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  if (hasTimedOut) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}>
        <Clock className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-sm font-medium text-foreground mb-1">
          Loading timeout
        </p>
        <p className="text-xs text-muted-foreground text-center">
          The operation is taking longer than expected. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8',
      className
    )}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {showMessage && (
        <p className="mt-2 text-sm text-muted-foreground">
          {showWarning ? timeoutMessage : message}
        </p>
      )}
      {showWarning && (
        <div className="mt-2 flex items-center text-xs text-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          <span>{Math.round(timeElapsed / 1000)}s elapsed</span>
        </div>
      )}
    </div>
  );
};

// Enhanced connection-aware loading with detailed network status
export interface NetworkAwareLoaderProps extends LoadingStateProps {
  showNetworkDetails?: boolean;
  adaptToConnection?: boolean;
  onConnectionChange?: (connectionInfo: any) => void;
}

export const NetworkAwareLoader: React.FC<NetworkAwareLoaderProps> = ({
  className,
  size = 'md',
  message,
  showMessage = true,
  showNetworkDetails = false,
  adaptToConnection = true,
  onConnectionChange,
}) => {
  const connectionInfo = useConnectionAware();
  const isOnline = useOnlineStatus();

  React.useEffect(() => {
    onConnectionChange?.(connectionInfo);
  }, [connectionInfo, onConnectionChange]);

  const getAdaptedMessage = () => {
    if (!isOnline) return 'You appear to be offline';
    if (connectionInfo.connectionType === 'slow') {
      return message ? `${message} (optimizing for slow connection)` : 'Loading... (slow connection detected)';
    }
    return message || 'Loading...';
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (connectionInfo.connectionType === 'slow') return <Wifi className="h-4 w-4 text-yellow-500" />;
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8',
      className
    )}>
      <div className="flex items-center space-x-2 mb-2">
        {!isOnline ? (
          getConnectionIcon()
        ) : (
          <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
        )}
        {showNetworkDetails && getConnectionIcon()}
      </div>
      
      {showMessage && (
        <p className={cn(
          'text-sm text-center',
          !isOnline ? 'text-red-600' : 'text-muted-foreground',
          connectionInfo.connectionType === 'slow' ? 'text-yellow-600' : ''
        )}>
          {getAdaptedMessage()}
        </p>
      )}
      
      {!isOnline && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Some features may be limited while offline
        </p>
      )}
      
      {showNetworkDetails && isOnline && (
        <div className="mt-3 text-xs text-muted-foreground text-center space-y-1">
          <div>Connection: {connectionInfo.effectiveType || 'Unknown'}</div>
          {connectionInfo.downlink && (
            <div>Speed: {connectionInfo.downlink} Mbps</div>
          )}
          {connectionInfo.rtt && (
            <div>Latency: {connectionInfo.rtt}ms</div>
          )}
        </div>
      )}
    </div>
  );
};

// Progressive loading with detailed stages and retry capability
export interface EnhancedProgressiveLoaderProps {
  stages: Array<{
    id: string;
    message: string;
    duration?: number;
    retryable?: boolean;
  }>;
  currentStage: number;
  className?: string;
  onStageComplete?: (stageId: string) => void;
  onStageError?: (stageId: string, error: Error) => void;
  onRetryStage?: (stageId: string) => void;
  showRetryButton?: boolean;
  allowSkip?: boolean;
  onSkipStage?: (stageId: string) => void;
}

export const EnhancedProgressiveLoader: React.FC<EnhancedProgressiveLoaderProps> = ({
  stages,
  currentStage,
  className,
  onStageComplete,
  onStageError,
  onRetryStage,
  showRetryButton = true,
  allowSkip = false,
  onSkipStage,
}) => {
  const [stageErrors, setStageErrors] = React.useState<Record<string, Error>>({});
  const [completedStages, setCompletedStages] = React.useState<Set<string>>(new Set());

  const currentStageData = stages[currentStage] || stages[0];
  const progress = ((currentStage + 1) / stages.length) * 100;
  const hasError = currentStageData && stageErrors[currentStageData.id];

  const handleRetry = () => {
    if (currentStageData && onRetryStage) {
      // Clear error for current stage
      setStageErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[currentStageData.id];
        return newErrors;
      });
      onRetryStage(currentStageData.id);
    }
  };

  const handleSkip = () => {
    if (currentStageData && onSkipStage) {
      onSkipStage(currentStageData.id);
    }
  };

  React.useEffect(() => {
    if (currentStageData && !hasError && !completedStages.has(currentStageData.id)) {
      setCompletedStages(prev => new Set([...prev, currentStageData.id]));
      onStageComplete?.(currentStageData.id);
    }
  }, [currentStage, currentStageData, hasError, completedStages, onStageComplete]);

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 space-y-4',
      className
    )}>
      {hasError ? (
        <AlertCircle className="h-8 w-8 text-red-500" />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
      
      <div className="text-center space-y-3 max-w-md">
        <p className={cn(
          'text-sm font-medium',
          hasError ? 'text-red-600' : 'text-muted-foreground'
        )}>
          {hasError ? `Error in: ${currentStageData.message}` : currentStageData.message}
        </p>
        
        {hasError && (
          <p className="text-xs text-red-500">
            {stageErrors[currentStageData.id]?.message || 'An error occurred'}
          </p>
        )}
        
        <div className="w-64 bg-muted rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              hasError ? 'bg-red-500' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <span>Step {currentStage + 1} of {stages.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        
        {/* Stage indicators */}
        <div className="flex justify-center space-x-2 mt-4">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index < currentStage ? 'bg-green-500' :
                index === currentStage ? (hasError ? 'bg-red-500' : 'bg-primary') :
                'bg-muted'
              )}
            />
          ))}
        </div>
        
        {/* Action buttons for errors */}
        {hasError && (
          <div className="flex space-x-2 mt-4">
            {showRetryButton && currentStageData.retryable !== false && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </button>
            )}
            {allowSkip && (
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center px-3 py-1.5 border border-muted text-xs font-medium rounded text-muted-foreground hover:text-foreground hover:border-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-muted"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Comprehensive loading state manager component
export interface LoadingStateManagerProps {
  type: 'page' | 'component' | 'inline' | 'progressive' | 'network-aware' | 'timeout-aware';
  state: 'loading' | 'success' | 'error' | 'timeout' | 'offline';
  message?: string;
  error?: Error;
  progress?: number;
  stages?: Array<{ id: string; message: string; duration?: number }>;
  currentStage?: number;
  timeout?: number;
  onRetry?: () => void;
  onTimeout?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  type,
  state,
  message,
  error,
  progress,
  stages,
  currentStage = 0,
  timeout,
  onRetry,
  onTimeout,
  className,
  size = 'md',
  showDetails = false,
}) => {
  const connectionInfo = useConnectionAware();
  const isOnline = useOnlineStatus();

  // Success state
  if (state === 'success') {
    return (
      <div className={cn(
        'flex items-center justify-center p-4',
        className
      )}>
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm">Loaded successfully</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 border border-dashed border-red-200 rounded-lg',
        className
      )}>
        <XCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm font-medium text-red-600 mb-1">
          Failed to load
        </p>
        {error && (
          <p className="text-xs text-red-500 text-center mb-3">
            {error.message}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </button>
        )}
      </div>
    );
  }

  // Offline state
  if (state === 'offline' || !isOnline) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}>
        <WifiOff className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          You're offline
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Some features may be limited while offline
        </p>
      </div>
    );
  }

  // Timeout state
  if (state === 'timeout') {
    return (
      <TimeoutAwareLoader
        className={className}
        size={size}
        message={message}
        timeout={timeout}
        onTimeout={onTimeout}
      />
    );
  }

  // Loading states based on type
  switch (type) {
    case 'progressive':
      if (stages) {
        return (
          <EnhancedProgressiveLoader
            stages={stages}
            currentStage={currentStage}
            className={className}
            onRetryStage={onRetry}
          />
        );
      }
      return <ProgressiveLoader stages={stages || []} currentStage={currentStage} className={className} />;

    case 'network-aware':
      return (
        <NetworkAwareLoader
          className={className}
          size={size}
          message={message}
          showNetworkDetails={showDetails}
        />
      );

    case 'timeout-aware':
      return (
        <TimeoutAwareLoader
          className={className}
          size={size}
          message={message}
          timeout={timeout}
          onTimeout={onTimeout}
        />
      );

    case 'page':
      return (
        <PageLoader
          className={className}
          size={size}
          message={message}
        />
      );

    case 'component':
      return (
        <ComponentLoader
          className={className}
          size={size}
          message={message}
        />
      );

    case 'inline':
      return (
        <InlineLoader
          className={className}
          size={size}
          message={message}
        />
      );

    default:
      return (
        <ComponentLoader
          className={className}
          size={size}
          message={message}
        />
      );
  }
};

// Lazy loading placeholder with retry functionality
export interface LazyLoadPlaceholderProps {
  onRetry?: () => void;
  error?: Error | null;
  isLoading?: boolean;
  className?: string;
}

export const LazyLoadPlaceholder: React.FC<LazyLoadPlaceholderProps> = ({
  onRetry,
  error,
  isLoading = true,
  className,
}) => {
  if (error) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 border border-dashed border-muted-foreground/25 rounded-lg',
        className
      )}>
        <div className="text-center space-y-3">
          <div className="text-muted-foreground">
            <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Failed to load content
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message || 'Something went wrong'}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center p-8',
        className
      )}>
        <ComponentLoader showMessage message="Loading content..." />
      </div>
    );
  }

  return null;
};