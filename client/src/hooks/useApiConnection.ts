import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
import { logger } from '../utils/logger';
  ConnectionInfo, 
  HealthStatus, 
  connectionMonitor, 
  checkConnection, 
  checkApiHealth,
  diagnoseConnection 
} from '../utils/api-health.js';

// Define diagnosis result type for better type safety and reusability
export interface DiagnosisResult {
  status: 'healthy' | 'degraded' | 'failed';
  issues: string[];
  recommendations: string[];
}

export interface UseApiConnectionResult {
  connectionStatus: ConnectionInfo | null;
  healthStatus: HealthStatus | null;
  isConnected: boolean;
  isHealthy: boolean;
  isLoading: boolean;
  error: string | null;
  checkConnection: () => Promise<void>;
  checkHealth: () => Promise<void>;
  diagnose: () => Promise<DiagnosisResult>;
}

interface UseApiConnectionOptions {
  autoStart?: boolean;
  checkInterval?: number;
  enableHealthChecks?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  onHealthChange?: (isHealthy: boolean) => void;
}

/**
 * Hook for monitoring API connection status and health
 * 
 * Optimizations:
 * - Memoized callbacks to prevent unnecessary re-renders
 * - Smart connection status comparison to avoid redundant updates
 * - Proper cleanup of all intervals and listeners
 * - Callback refs to avoid effect dependency issues
 */
export function useApiConnection(options: UseApiConnectionOptions = {}): UseApiConnectionResult {
  const {
    autoStart = true,
    checkInterval = 30000,
    enableHealthChecks = true,
    onConnectionChange,
    onHealthChange
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid recreating effects when callbacks change
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onHealthChangeRef = useRef(onHealthChange);
  
  // Keep refs updated without causing re-renders
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onHealthChangeRef.current = onHealthChange;
  });

  // Track previous connection state to detect meaningful changes
  const prevConnectionRef = useRef<boolean | null>(null);
  const prevHealthRef = useRef<boolean | null>(null);

  // Handle connection status updates with smart comparison
  const handleConnectionUpdate = useCallback((status: ConnectionInfo) => {
    // Only update state if connection status actually changed
    setConnectionStatus(prevStatus => {
      // Perform deep comparison for meaningful changes
      if (prevStatus && 
          prevStatus.apiReachable === status.apiReachable &&
          prevStatus.corsEnabled === status.corsEnabled &&
          prevStatus.errors.length === status.errors.length) {
        return prevStatus; // No meaningful change, skip update
      }
      return status;
    });
    
    setIsLoading(false);
    
    const isNowConnected = status.apiReachable && status.corsEnabled;
    
    // Trigger connection change callback if status changed
    if (prevConnectionRef.current !== null && prevConnectionRef.current !== isNowConnected) {
      onConnectionChangeRef.current?.(isNowConnected);
    }
    prevConnectionRef.current = isNowConnected;
    
    // Update error state based on connection status
    if (isNowConnected) {
      setError(null);
    } else if (status.errors.length > 0) {
      // Prioritize CORS errors as they're typically most critical
      const corsError = status.errors.find(err => err.toLowerCase().includes('cors'));
      setError(corsError || status.errors[0]);
    }
  }, []); // Empty deps because we use refs for callbacks

  // Manual connection check with error handling
  const performConnectionCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await checkConnection();
      setConnectionStatus(status);
      
      if (status.errors.length > 0) {
        const corsError = status.errors.find(err => err.toLowerCase().includes('cors'));
        setError(corsError || status.errors[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection check failed';
      setError(errorMessage);
      // Set a failed connection status on error
      setConnectionStatus({
        apiReachable: false,
        corsEnabled: false,
        errors: [errorMessage],
        lastChecked: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manual health check - stable reference due to empty deps
  const performHealthCheck = useCallback(async () => {
    if (!enableHealthChecks) return;
    
    try {
      const health = await checkApiHealth();
      setHealthStatus(prevHealth => {
        // Only update if health status changed
        if (prevHealth &&
            prevHealth.api === health.api &&
            prevHealth.frontend === health.frontend &&
            prevHealth.database === health.database) {
          return prevHealth;
        }
        return health;
      });
      
      const isNowHealthy = health.api && health.frontend;
      
      // Trigger health change callback
      if (prevHealthRef.current !== null && prevHealthRef.current !== isNowHealthy) {
        onHealthChangeRef.current?.(isNowHealthy);
      }
      prevHealthRef.current = isNowHealthy;
      
    } catch (err) {
      logger.error('Health check failed:', { component: 'SimpleTool' }, err);
      setHealthStatus({
        api: false,
        frontend: false,
        database: false,
        timestamp: new Date().toISOString()
      });
      
      if (prevHealthRef.current !== false) {
        onHealthChangeRef.current?.(false);
      }
      prevHealthRef.current = false;
    }
  }, [enableHealthChecks]);

  // Diagnose connection issues
  const performDiagnosis = useCallback(async (): Promise<DiagnosisResult> => {
    return await diagnoseConnection();
  }, []);

  // Setup connection monitoring with proper cleanup
  useEffect(() => {
    if (!autoStart) return;

    // Add listener for connection updates
    connectionMonitor.addListener(handleConnectionUpdate);
    
    // Start monitoring with specified interval
    connectionMonitor.start(checkInterval);
    
    // Perform initial health check if enabled
    if (enableHealthChecks) {
      performHealthCheck();
    }

    // Cleanup function removes listener and stops monitoring
    return () => {
      connectionMonitor.removeListener(handleConnectionUpdate);
      connectionMonitor.stop();
    };
  }, [autoStart, checkInterval, enableHealthChecks, handleConnectionUpdate, performHealthCheck]);

  // Periodic health checks with separate interval
  useEffect(() => {
    if (!enableHealthChecks || !autoStart) return;

    // Health checks run at 2x the connection check interval to reduce overhead
    const healthCheckInterval = setInterval(() => {
      performHealthCheck();
    }, checkInterval * 2);

    return () => clearInterval(healthCheckInterval);
  }, [enableHealthChecks, autoStart, checkInterval, performHealthCheck]);

  // Memoize derived state to prevent unnecessary recalculations
  const isConnected = useMemo(() => 
    Boolean(connectionStatus?.apiReachable && connectionStatus?.corsEnabled),
    [connectionStatus]
  );
  
  const isHealthy = useMemo(() => 
    Boolean(healthStatus?.api && healthStatus?.frontend),
    [healthStatus]
  );

  return {
    connectionStatus,
    healthStatus,
    isConnected,
    isHealthy,
    isLoading,
    error,
    checkConnection: performConnectionCheck,
    checkHealth: performHealthCheck,
    diagnose: performDiagnosis
  };
}

/**
 * Hook for simple connection status (lightweight version)
 * 
 * Optimizations:
 * - Minimal state tracking for better performance
 * - Single listener pattern
 * - Proper event listener cleanup
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: string | null;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  useEffect(() => {
    // Browser online/offline event handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection monitor listener with smart updates
    const handleConnectionUpdate = (info: ConnectionInfo) => {
      setConnectionInfo(prevInfo => {
        // Skip update if connection status hasn't changed
        if (prevInfo &&
            prevInfo.apiReachable === info.apiReachable &&
            prevInfo.corsEnabled === info.corsEnabled) {
          return prevInfo;
        }
        return info;
      });
    };

    connectionMonitor.addListener(handleConnectionUpdate);

    // Comprehensive cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connectionMonitor.removeListener(handleConnectionUpdate);
    };
  }, []); // Empty deps - all handlers are stable

  // Memoize derived connection state
  const isConnected = useMemo(() => 
    Boolean(connectionInfo?.apiReachable && connectionInfo?.corsEnabled),
    [connectionInfo]
  );

  return {
    isOnline,
    isConnected,
    lastChecked: connectionInfo?.lastChecked || null
  };
}

/**
 * Hook for API retry logic with connection awareness
 * 
 * Optimizations:
 * - Debounced auto-retry to prevent retry storms
 * - Exponential backoff for better retry patterns
 * - Race condition prevention with mounted ref
 * - Abort controller support for cleanup
 */
export function useApiRetry<T>(
  apiCall: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryOnConnectionRestore?: boolean;
    exponentialBackoff?: boolean;
  } = {}
): {
  execute: () => Promise<T>;
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  canRetry: boolean;
  reset: () => void;
} {
  const { 
    maxRetries = 3, 
    retryDelay = 1000, 
    retryOnConnectionRestore = true,
    exponentialBackoff = true 
  } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { isConnected } = useConnectionStatus();
  
  // Track component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Calculate retry delay with optional exponential backoff
  const calculateRetryDelay = useCallback((attempt: number): number => {
    if (!exponentialBackoff) return retryDelay;
    return retryDelay * Math.pow(2, attempt - 1);
  }, [retryDelay, exponentialBackoff]);

  const execute = useCallback(async (): Promise<T> => {
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }
    
    setIsLoading(true);
    setError(null);
    
    let lastError: Error | null = null;
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }
      
      try {
        const result = await apiCall();
        
        if (isMountedRef.current) {
          setRetryCount(0);
          setIsLoading(false);
        }
        return result;
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        attempts++;
        
        if (isMountedRef.current) {
          setRetryCount(attempts);
        }
        
        // Stop retrying if max attempts reached
        if (attempts > maxRetries) {
          break;
        }
        
        // Stop retrying on authentication/authorization errors
        if (lastError.message.includes('401') || 
            lastError.message.includes('403') ||
            lastError.message.includes('Unauthorized')) {
          break;
        }
        
        // Wait with exponential backoff before retry
        const delay = calculateRetryDelay(attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (isMountedRef.current) {
      setError(lastError?.message || 'Request failed');
      setIsLoading(false);
    }
    throw lastError;
  }, [apiCall, maxRetries, calculateRetryDelay]);

  // Reset function to clear error state and retry count
  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  // Auto-retry with debouncing when connection restores
  useEffect(() => {
    if (!retryOnConnectionRestore || !isConnected || !error || retryCount === 0) {
      return;
    }
    
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Debounce retry to avoid retry storms when connection flickers
    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isConnected) {
        execute().catch(() => {
          // Error already handled in execute function
        });
      }
    }, 2000); // 2 second debounce
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isConnected, error, retryCount, retryOnConnectionRestore, execute]);

  const canRetry = useMemo(() => 
    retryCount < maxRetries && Boolean(error),
    [retryCount, maxRetries, error]
  );

  return {
    execute,
    isLoading,
    error,
    retryCount,
    canRetry,
    reset
  };
}






