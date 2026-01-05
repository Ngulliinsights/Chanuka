/**
 * Analytics Provider Component
 *
 * Provides comprehensive analytics tracking context to the entire application
 * Initializes and manages the analytics system lifecycle
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { ComprehensiveAnalyticsTracker } from './comprehensive-tracker';
import { logger } from '@client/utils/logger';

/**
 * Analytics context interface
 */
interface AnalyticsContextType {
  tracker: ComprehensiveAnalyticsTracker | null;
  isInitialized: boolean;
  isEnabled: boolean;
  error: string | null;
  setEnabled: (enabled: boolean) => void;
  reinitialize: () => void;
}

/**
 * Analytics context
 */
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

/**
 * Analytics provider props
 */
interface AnalyticsProviderProps {
  children: ReactNode;
  enabled?: boolean;
  config?: {
    flushInterval?: number;
    maxEvents?: number;
    enablePerformanceTracking?: boolean;
    enableErrorTracking?: boolean;
    enableJourneyTracking?: boolean;
    debugMode?: boolean;
  };
}

/**
 * Analytics Provider Component
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  enabled = true,
  config = {}
}) => {
  const [tracker, setTracker] = useState<ComprehensiveAnalyticsTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize the analytics tracker
   */
  const initializeTracker = async () => {
    try {
      setError(null);

      // Get the singleton instance
      const trackerInstance = ComprehensiveAnalyticsTracker.getInstance();

      // Configure the tracker
      trackerInstance.setEnabled(isEnabled);

      // Apply configuration if provided
      if (config.debugMode) {
        logger.info('Analytics Provider initialized in debug mode', { config });
      }

      setTracker(trackerInstance);
      setIsInitialized(true);

      logger.info('Analytics Provider initialized successfully', {
        enabled: isEnabled,
        config
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize analytics: ${errorMessage}`);
      logger.error('Failed to initialize Analytics Provider', { error: err, config });
    }
  };

  /**
   * Initialize tracker on mount
   */
  useEffect(() => {
    initializeTracker();
  }, []);

  /**
   * Update tracker enabled state when prop changes
   */
  useEffect(() => {
    if (tracker) {
      tracker.setEnabled(isEnabled);
      logger.info(`Analytics tracking ${isEnabled ? 'enabled' : 'disabled'}`);
    }
  }, [tracker, isEnabled]);

  /**
   * Set enabled state
   */
  const setEnabled = (enabled: boolean) => {
    setIsEnabledState(enabled);
  };

  /**
   * Reinitialize the tracker
   */
  const reinitialize = () => {
    setIsInitialized(false);
    setTracker(null);
    setError(null);
    initializeTracker();
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (tracker) {
        try {
          tracker.destroy();
          logger.info('Analytics Provider cleaned up');
        } catch (err) {
          logger.warn('Error during analytics cleanup', { error: err });
        }
      }
    };
  }, [tracker]);

  const contextValue: AnalyticsContextType = {
    tracker,
    isInitialized,
    isEnabled,
    error,
    setEnabled,
    reinitialize
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Hook to use analytics context
 */
export const useAnalyticsContext = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);

  if (context === undefined) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }

  return context;
};

/**
 * HOC for components that need analytics tracking
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const { tracker, isInitialized } = useAnalyticsContext();

    // Track component mount
    useEffect(() => {
      if (tracker && isInitialized) {
        const componentName = Component.displayName || Component.name || 'UnknownComponent';

        tracker.trackEvent({
          type: 'user_interaction',
          data: {
            action: 'component_mount',
            component: componentName,
            timestamp: new Date().toISOString()
          }
        }).catch(err => {
          logger.warn('Failed to track component mount', { error: err, component: componentName });
        });
      }
    }, [tracker, isInitialized]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withAnalytics(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Analytics initialization status component
 */
export const AnalyticsStatus: React.FC = () => {
  const { isInitialized, isEnabled, error, reinitialize } = useAnalyticsContext();

  if (error) {
    return (
      <div className="analytics-status error">
        <p>Analytics Error: {error}</p>
        <button onClick={reinitialize}>Retry</button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="analytics-status loading">
        <p>Initializing analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-status success">
      <p>Analytics: {isEnabled ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
};

export default AnalyticsProvider;
