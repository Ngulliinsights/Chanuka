import React from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssetLoading, LoadingProgress } from '@/utils/asset-loading';
import { logger } from '../utils/logger.js';

export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: 'fixed' | 'relative' | 'absolute';
}

export const AssetLoadingIndicator: React.FC<AssetLoadingIndicatorProps> = ({
  className,
  showDetails = false,
  showProgress = true,
  minimal = false,
  position = 'fixed',
}) => {
  const { progress, getStats } = useAssetLoading();
  const [stats, setStats] = React.useState(getStats());
  const [isVisible, setIsVisible] = React.useState(true);

  // Update stats periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
    }, 500);

    return () => clearInterval(interval);
  }, [getStats]);

  // Auto-hide when loading is complete
  React.useEffect(() => {
    if (progress.phase === 'complete') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress.phase]);

  // Don't render if not visible or no loading activity
  if (!isVisible || (progress.total === 0 && progress.loaded === 0)) {
    return null;
  }

  const progressPercentage = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
  const isComplete = progress.phase === 'complete';
  const hasErrors = stats.failed > 0;

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
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    if (stats.connectionType === 'slow') {
      return <Wifi className="h-4 w-4 text-yellow-500" />;
    }
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  if (minimal) {
    return (
      <div className={cn(
        'flex items-center space-x-2 text-sm text-muted-foreground',
        className
      )}>
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <span>{getPhaseMessage()}</span>
        {showProgress && progress.total > 0 && (
          <span className="text-xs">
            ({progress.loaded}/{progress.total})
          </span>
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
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : hasErrors ? (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {getPhaseMessage()}
            </p>
            {showDetails && getConnectionIcon()}
          </div>
          
          {showProgress && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.loaded} of {progress.total} loaded</span>
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
          
          {progress.currentAsset && !isComplete && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              Loading: {progress.currentAsset.split('/').pop()}
            </p>
          )}
          
          {showDetails && (
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
          
          {hasErrors && showDetails && (
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

export const AssetLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVisible, config, show, hide } = useAssetLoadingIndicator();
  
  return (
    <AssetLoadingContext.Provider
      value={{
        showIndicator: show,
        hideIndicator: hide,
        isIndicatorVisible: isVisible,
      }}
    >
      {children}
      {isVisible && <AssetLoadingIndicator {...config} />}
    </AssetLoadingContext.Provider>
  );
};

export const useAssetLoadingContext = () => {
  const context = React.useContext(AssetLoadingContext);
  if (!context) {
    throw new Error('useAssetLoadingContext must be used within AssetLoadingProvider');
  }
  return context;
};

// Specialized loading indicators for different scenarios
export const CriticalAssetLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <AssetLoadingIndicator
      className={className}
      showDetails={false}
      showProgress={true}
      minimal={false}
      position="fixed"
    />
  );
};

export const InlineAssetLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <AssetLoadingIndicator
      className={className}
      showDetails={false}
      showProgress={false}
      minimal={true}
      position="relative"
    />
  );
};

// Component for showing asset loading progress in development
export const DevAssetLoadingDebug: React.FC = () => {
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
};