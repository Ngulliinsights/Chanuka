import { useLoadingRecovery } from './hooks/useLoadingRecovery';
import { AssetLoadingIndicatorProps, LoadingProgress } from './types';
import { Loader2, Network, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import React from 'react';

import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';


import { 
  LoadingError, 
  LoadingAssetError, 
  LoadingValidationError,
  getErrorDisplayMessage,
  getErrorRecoveryStrategy 
} from './errors';
import { 
  validateLoadingProgress, 
  safeValidateLoadingProgress,
  isValidProgressPercentage 
} from './validation';


export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: 'fixed' | 'relative' | 'absolute';
}

export const AssetLoadingIndicator = React.memo(<AssetLoadingIndicatorProps> = ({
  className,
  showDetails = false,
  showProgress = true,
  minimal = false,
  position = 'fixed',
}) => {
  const { progress, enhancementLevel, getStats, applyDegradedMode } = useAssetLoading();
  const [stats, setStats] = React.useState(getStats());
  const [isVisible, setIsVisible] = React.useState(true);
  const [validationError, setValidationError] = React.useState<LoadingValidationError | null>(null);
  const [assetError, setAssetError] = React.useState<LoadingAssetError | null>(null);

  const { recoveryState, recover } = useLoadingRecovery({
    maxRecoveryAttempts: 3,
    onRecoverySuccess: () => {
      setAssetError(null);
      setValidationError(null);
      applyDegradedMode(); // Re-evaluate enhancement level
    }
  });

  // Validate progress data
  const validatedProgress = React.useMemo(() => {
    const validation = safeValidateLoadingProgress(progress);
    if (!validation.success) {
      setValidationError(validation.error!);
      logger.error('Asset loading progress validation failed', { 
        error: validation.error, 
        progress 
      });
      return { loaded: 0, total: 0, phase: 'preload' as const, currentAsset: undefined };
    }
    setValidationError(null);
    return validation.data;
  }, [progress]);

  // Update stats periodically with error handling
  React.useEffect(() => {
    const interval = setInterval(() => {
      try {
        const newStats = getStats();
        setStats(newStats);
        
        // Check for asset loading failures
        if (newStats.failed > stats.failed) {
          const error = new LoadingAssetError(
            progress.currentAsset || 'unknown',
            'Asset failed to load',
            { previousFailed: stats.failed, currentFailed: newStats.failed }
          );
          setAssetError(error);
        }
      } catch (error) {
        logger.error('Failed to update asset loading stats', { error });
        const loadingError = new LoadingError(
          'Failed to retrieve loading statistics',
          undefined,
          undefined,
          { originalError: error }
        );
        setAssetError(loadingError as LoadingAssetError);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [getStats, stats.failed, progress.currentAsset]);

  // Update recovery when errors change
  React.useEffect(() => {
    const error = validationError || assetError;
    if (error) {
      // Trigger recovery for new errors
      recover();
    }
  }, [validationError, assetError, recover]);

  // Auto-hide when loading is complete
  React.useEffect(() => {
    if (validatedProgress.phase === 'complete') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [validatedProgress.phase]);

  // Don't render if not visible or no loading activity
  if (!isVisible || (validatedProgress.total === 0 && validatedProgress.loaded === 0)) {
    return null;
  }

  const progressPercentage = validatedProgress.total > 0 
    ? Math.min(100, Math.max(0, (validatedProgress.loaded / validatedProgress.total) * 100))
    : 0;
  
  const isComplete = validatedProgress.phase === 'complete';
  const hasErrors = stats.failed > 0 || validationError || assetError;
  const currentError = validationError || assetError;

  const getPhaseMessage = () => {
    switch (progress.phase) {
      case 'preload':
        return 'Preloading critical assets...';
      case 'critical':
        return 'Loading essential resources...';
      case 'lazy':
        return 'Loading additional content...';
      case 'complete':
        return 'Assets loaded successfully';
      default:
        return 'Loading assets...';
    }
  };

  const getConnectionIcon = () => {
    if (!stats.isOnline) {
      return <Network className="h-4 w-4 text-red-500" />;
    }
    if (stats.connectionType === 'slow') {
      return <Network className="h-4 w-4 text-yellow-500" />;
    }
    return <Network className="h-4 w-4 text-green-500" />;
  };

  if (minimal) {
    return (
      <div className={cn(
        'flex items-center space-x-2 text-sm text-muted-foreground',
        className
      )}>
        {currentError ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <span>
          {currentError 
            ? getErrorDisplayMessage(currentError)
            : getPhaseMessage()
          }
        </span>
        {showProgress && validatedProgress.total > 0 && !currentError && (
          <span className="text-xs">
            ({validatedProgress.loaded}/{validatedProgress.total})
          </span>
        )}
        {currentError && recoveryState.canRecover && (
          <button
            onClick={recover}
            className="text-xs text-primary hover:text-primary/80"
            disabled={recoveryState.isRecovering}
          >
            {recoveryState.isRecovering ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  const positionClasses = {
    fixed: 'fixed top-4 right-4 z-50',
    relative: 'relative',
    absolute: 'absolute top-4 right-4',
  };

  return (
    <div className={cn(
      'bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 max-w-sm',
      positionClasses[position],
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {currentError ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : hasErrors ? (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className={cn(
              'text-sm font-medium',
              currentError ? 'text-red-600' : 'text-foreground'
            )}>
              {currentError 
                ? getErrorDisplayMessage(currentError)
                : getPhaseMessage()
              }
            </p>
            {showDetails && getConnectionIcon()}
          </div>
          
          {currentError && recoveryState.suggestions.length > 0 && (
            <div className="mb-2 text-xs text-red-500">
              {recoveryState.suggestions[0]}
            </div>
          )}
          
          {showProgress && validatedProgress.total > 0 && !currentError && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{validatedProgress.loaded} of {validatedProgress.total} loaded</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    isComplete ? 'bg-green-500' : hasErrors ? 'bg-yellow-500' : 'bg-primary'
                  )}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {validatedProgress.currentAsset && !isComplete && !currentError && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              Loading: {validatedProgress.currentAsset.split('/').pop()}
            </p>
          )}
          
          {currentError && recoveryState.canRecover && (
            <div className="mt-2">
              <button
                onClick={recover}
                disabled={recoveryState.isRecovering}
                className="inline-flex items-center px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {recoveryState.isRecovering ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </>
                )}
              </button>
            </div>
          )}
          
          {showDetails && !currentError && (
            <div className="mt-3 pt-2 border-t border-muted">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Loaded:</span> {stats.loaded}
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {stats.failed}
                </div>
                <div>
                  <span className="font-medium">Connection:</span> {stats.connectionType}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {stats.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          )}
          
          {hasErrors && showDetails && !currentError && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
              <p className="text-yellow-700 dark:text-yellow-300">
                Some assets failed to load. The app will continue to function with reduced features.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
);

function 1(
};

// Hook for controlling asset loading indicator visibility
export function useAssetLoadingIndicator() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [config, setConfig] = React.useState<Partial<AssetLoadingIndicatorProps>>({});
  
  const show = (options?: Partial<AssetLoadingIndicatorProps>) => {
    setConfig(options || {});
    setIsVisible(true);
  };
  
  const hide = () => {
    setIsVisible(false);
  };
  
  return {
    isVisible,
    config,
    show,
    hide,
  };
}

// Context for managing global asset loading state
interface AssetLoadingContextType {
  showIndicator: (options?: Partial<AssetLoadingIndicatorProps>) => void;
  hideIndicator: () => void;
  isIndicatorVisible: boolean;
}

const AssetLoadingContext = React.createContext<AssetLoadingContextType | undefined>(undefined);

export const AssetLoadingProvider = React.memo(<{ children: React.ReactNode }> = ({ children }) => {
  const { isVisible, config, show, hide } = useAssetLoadingIndicator();
  
  const contextValue = useMemo(() => ({
    showIndicator: show,
    hideIndicator: hide,
    isIndicatorVisible: isVisible,
  }), [show, hide, isVisible]);

  return (
    <AssetLoadingContext.Provider value={contextValue}>
      {children}
      {isVisible && <AssetLoadingIndicator {...config} />}
    </AssetLoadingContext.Provider>
  );
);

function 1(
};

export const useAssetLoadingContext = () => {
  const context = React.useContext(AssetLoadingContext);
  if (!context) {
    throw new Error('useAssetLoadingContext must be used within AssetLoadingProvider');
  }
  return context;
);

function 1(
};

// Specialized loading indicators for different scenarios
export const CriticalAssetLoader = React.memo(<{ className?: string }> = ({ className }) => {
  return (
    <AssetLoadingIndicator
      className={className}
      showDetails={false}
      showProgress={true}
      minimal={false}
      position="fixed"
    />
  );
);

function 1(
};

export const InlineAssetLoader = React.memo(<{ className?: string }> = ({ className }) => {
  return (
    <AssetLoadingIndicator
      className={className}
      showDetails={false}
      showProgress={false}
      minimal={true}
      position="relative"
    />
  );
);

function 1(
};

// Component for showing asset loading progress in development
export const DevAssetLoadingDebug = React.memo( = () => {
  const { progress, getStats } = useAssetLoading();
  const [stats, setStats] = React.useState(getStats());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getStats]);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Asset Loading Debug</div>
      <div>Phase: {progress.phase}</div>
      <div>Progress: {progress.loaded}/{progress.total}</div>
      <div>Connection: {stats.connectionType}</div>
      <div>Online: {stats.isOnline ? 'Yes' : 'No'}</div>
      <div>Failed: {stats.failed}</div>
      {progress.currentAsset && (
        <div className="mt-1 truncate">
          Current: {progress.currentAsset.split('/').pop()}
        </div>
      )}
    </div>
  );
);

function 1(
};

