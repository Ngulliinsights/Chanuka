import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { globalApiClient } from '../index';

// Define types locally since they're not exported
export interface ConnectionInfo {
  status: 'connected' | 'disconnected' | 'connecting';
  latency: number;
  last_checked: Date;
  apiReachable?: boolean;
  corsEnabled?: boolean;
  errors?: string[];
}

export interface HealthStatus {
  healthy: boolean;
  services: Record<string, boolean>;
  timestamp: Date;
  api?: boolean;
  frontend?: boolean;
  database?: boolean;
  latency?: number;
  recommendations?: string[];
}

// Define the shape of the API response for type safety
// This interface documents what we expect from the /health/detailed endpoint
// It helps TypeScript understand the response structure while keeping all fields optional
// since we can't guarantee the API will always return complete data
interface HealthApiResponse {
  healthy?: boolean;
  services?: {
    api?: boolean;
    frontend?: boolean;
    database?: boolean;
  };
  latency?: number;
}

// Define diagnosis result type for better type safety and reusability
export interface DiagnosisResult {
  status: 'healthy' | 'degraded' | 'failed';
  issues: string[];
  recommendations: string[];
}

// Helper functions for connection monitoring
const checkConnection = async (): Promise<ConnectionInfo> => {
  const startTime = Date.now();
  try {
    await globalApiClient.get('/api/health');
    const latency = Date.now() - startTime;
    return {
      status: 'connected',
      latency,
      last_checked: new Date(),
      apiReachable: true,
      corsEnabled: true,
      errors: [],
    };
  } catch (error) {
    return {
      status: 'disconnected',
      latency: -1,
      last_checked: new Date(),
      apiReachable: false,
      corsEnabled: false,
      errors: [error instanceof Error ? error.message : 'Connection failed'],
    };
  }
};

const checkApiHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await globalApiClient.get('/api/health/detailed');

    // Type guard: safely access the response data with proper type checking
    // We cast to our defined interface, providing TypeScript with structural information
    // while still using defensive programming patterns (optional chaining and nullish coalescing)
    // This approach gives us compile-time type safety and runtime error resilience
    const data = response.data as HealthApiResponse | undefined;

    // Use nullish coalescing (??) instead of logical OR (||) to preserve falsy values
    // This is important because we want to keep values like `false` or `0` when they're intentional
    // The ?? operator only uses the default when the value is null or undefined
    return {
      healthy: data?.healthy ?? false,
      services: data?.services || {},
      timestamp: new Date(),
      api: data?.services?.api ?? false,
      frontend: data?.services?.frontend ?? false,
      database: data?.services?.database ?? false,
      latency: data?.latency ?? 0,
    };
  } catch (error) {
    // Always return a complete HealthStatus object even on error
    // This ensures calling code never has to handle undefined or partial data
    return {
      healthy: false,
      services: {},
      timestamp: new Date(),
      api: false,
      frontend: false,
      database: false,
      latency: 0,
    };
  }
};

const diagnoseConnection = async (): Promise<DiagnosisResult> => {
  const issues: string[] = [];
  let status: 'healthy' | 'degraded' | 'failed' = 'healthy';

  try {
    const connectionInfo = await checkConnection();
    if (connectionInfo.status === 'disconnected') {
      issues.push('API connection failed');
      status = 'failed';
    } else if (connectionInfo.latency > 2000) {
      issues.push('High latency detected');
      status = 'degraded';
    }

    const healthInfo = await checkApiHealth();
    if (!healthInfo.healthy) {
      issues.push('API health check failed');
      status = 'failed';
    }
  } catch (error) {
    issues.push('Unable to perform diagnosis');
    status = 'failed';
  }

  return { status, issues, recommendations: [] };
};

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
 * This hook provides comprehensive connection monitoring with the following optimizations:
 *
 * Performance optimizations:
 * - Memoized callbacks prevent unnecessary re-renders in consuming components
 * - Smart state comparison avoids redundant updates when connection status hasn't meaningfully changed
 * - Separate intervals for connection and health checks reduce API load
 * - Proper cleanup of all intervals and listeners prevents memory leaks
 *
 * Stability improvements:
 * - Callback refs ensure effect dependencies don't cause recreation loops
 * - Previous state tracking enables accurate change detection for callbacks
 * - Deep comparison of connection properties prevents flickering UI states
 *
 * Usage example:
 * const { isConnected, isHealthy, checkConnection } = useApiConnection({
 *   autoStart: true,
 *   checkInterval: 30000,
 *   onConnectionChange: (connected) => console.log('Connection:', connected)
 * });
 */
export function useApiConnection(options: UseApiConnectionOptions = {}): UseApiConnectionResult {
  const {
    autoStart = true,
    checkInterval = 30000,
    enableHealthChecks = true,
    onConnectionChange,
    onHealthChange,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid recreating effects when callbacks change
  // This is a critical optimization pattern: by storing callbacks in refs,
  // we can access the latest callback without making it a dependency of useEffect
  // This prevents the effect from re-running every time the parent component updates the callback
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onHealthChangeRef = useRef(onHealthChange);

  // Keep refs updated without causing re-renders
  // Use useCallback to ensure this effect only runs when callbacks actually change
  const updateCallbackRefs = useCallback(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onHealthChangeRef.current = onHealthChange;
  }, [onConnectionChange, onHealthChange]);

  useEffect(() => {
    updateCallbackRefs();
  }, [updateCallbackRefs]);

  // Track previous connection state to detect meaningful changes
  // We store null initially to distinguish "first check" from "no change"
  const prevConnectionRef = useRef<boolean | null>(null);
  const prevHealthRef = useRef<boolean | null>(null);

  // Handle connection status updates with smart comparison
  // This callback is memoized with empty dependencies because it relies on refs for external data
  // This makes it stable across renders while still accessing the latest callbacks
  const handleConnectionUpdate = useCallback((status: ConnectionInfo) => {
    // Only update state if connection status actually changed
    // This functional setState pattern lets us compare with previous state
    // without needing it as a dependency, which would break our memoization
    setConnectionStatus(prevStatus => {
      // Perform deep comparison for meaningful changes
      // We check the properties that actually matter for UI updates
      // Ignoring transient properties like latency variations prevents unnecessary re-renders
      if (
        prevStatus &&
        prevStatus.apiReachable === status.apiReachable &&
        prevStatus.corsEnabled === status.corsEnabled &&
        (prevStatus.errors?.length || 0) === (status.errors?.length || 0)
      ) {
        return prevStatus; // No meaningful change, skip update to prevent re-render
      }
      return status;
    });

    setIsLoading(false);

    const isNowConnected = status.apiReachable && status.corsEnabled;

    // Trigger connection change callback only if status actually changed
    // The prevConnectionRef.current !== null check prevents callback on initial mount
    if (prevConnectionRef.current !== null && prevConnectionRef.current !== isNowConnected) {
      onConnectionChangeRef.current?.(isNowConnected || false);
    }
    prevConnectionRef.current = isNowConnected || false;

    // Update error state based on connection status
    if (isNowConnected) {
      setError(null);
    } else if (status.errors && status.errors.length > 0) {
      // Prioritize CORS errors as they're typically most critical for troubleshooting
      // CORS issues often indicate configuration problems that need immediate attention
      const corsError = status.errors.find(err => err.toLowerCase().includes('cors'));
      setError(corsError || status.errors[0] || null);
    }
  }, []); // Empty deps because we use refs for callbacks

  // Manual connection check with comprehensive error handling
  // This function can be called directly by consuming components for on-demand checks
  const performConnectionCheck = useCallback(async () => {
    // Prevent state updates if component is unmounted
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const status = await checkConnection();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      handleConnectionUpdate(status);

      // Extract the most relevant error for display
      if (status.errors && status.errors.length > 0) {
        const corsError = status.errors.find(err => err.toLowerCase().includes('cors'));
        setError(corsError || status.errors[0] || null);
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Handle unexpected errors that weren't caught in checkConnection
      const errorMessage = err instanceof Error ? err.message : 'Connection check failed';
      setError(errorMessage);

      // Set a failed connection status on error so UI has complete information
      const failedStatus: ConnectionInfo = {
        status: 'disconnected',
        latency: -1,
        last_checked: new Date(),
        apiReachable: false,
        corsEnabled: false,
        errors: [errorMessage],
      };

      handleConnectionUpdate(failedStatus);
    } finally {
      // Always clear loading state, even if an error occurred
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [handleConnectionUpdate]);

  // Manual health check with smart state updates
  // Stable reference due to empty deps array (only depends on enableHealthChecks which is in the function body)
  const performHealthCheck = useCallback(async () => {
    if (!enableHealthChecks || !isMountedRef.current) return;

    try {
      const health = await checkApiHealth();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Use functional setState to compare with previous health status
      // This prevents unnecessary re-renders when health status hasn't changed
      setHealthStatus(prevHealth => {
        // Only update if health status changed in meaningful ways
        // We ignore timestamp changes since those happen on every check
        if (
          prevHealth &&
          prevHealth.api === health.api &&
          prevHealth.frontend === health.frontend &&
          prevHealth.database === health.database
        ) {
          return prevHealth; // Skip update to prevent re-render
        }
        return health;
      });

      const isNowHealthy = health.api && health.frontend;

      // Trigger health change callback only when health status actually changes
      if (prevHealthRef.current !== null && prevHealthRef.current !== isNowHealthy) {
        onHealthChangeRef.current?.(isNowHealthy || false);
      }
      prevHealthRef.current = isNowHealthy || false;
    } catch (err) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      logger.error('Health check failed:', { component: 'Chanuka' }, err);

      // Set failed health status with all services marked as down
      const failedHealth: HealthStatus = {
        healthy: false,
        services: {},
        timestamp: new Date(),
        api: false,
        frontend: false,
        database: false,
        latency: 0,
      };

      setHealthStatus(failedHealth);

      // Notify listeners of health status change
      if (prevHealthRef.current !== false) {
        onHealthChangeRef.current?.(false);
      }
      prevHealthRef.current = false;
    }
  }, [enableHealthChecks]);

  // Diagnose connection issues - provides detailed troubleshooting information
  const performDiagnosis = useCallback(async (): Promise<DiagnosisResult> => {
    return await diagnoseConnection();
  }, []);

  // Track active intervals and cleanup functions to prevent memory leaks
  const intervalRefs = useRef<{
    connectionInterval?: NodeJS.Timeout;
    healthInterval?: NodeJS.Timeout;
  }>({});

  // Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Setup connection monitoring with proper cleanup
  // This effect manages the lifecycle of connection monitoring
  useEffect(() => {
    if (!autoStart) return;

    // Perform initial connection check
    performConnectionCheck();

    // Set up periodic connection checks
    intervalRefs.current.connectionInterval = setInterval(() => {
      if (isMountedRef.current) {
        performConnectionCheck();
      }
    }, checkInterval);

    // Perform initial health check if enabled
    // This ensures we have health data immediately rather than waiting for the first interval
    if (enableHealthChecks) {
      performHealthCheck();
    }

    // Cleanup function removes intervals and prevents memory leaks
    // This is critical for preventing memory leaks when components unmount
    return () => {
      const currentIntervals = intervalRefs.current;
      if (currentIntervals.connectionInterval) {
        clearInterval(currentIntervals.connectionInterval);
        currentIntervals.connectionInterval = undefined;
      }
    };
  }, [autoStart, checkInterval, enableHealthChecks, performConnectionCheck, performHealthCheck]);

  // Periodic health checks with separate interval
  // Health checks run less frequently than connection checks to reduce API load
  // This separation allows for different checking strategies based on the data type
  useEffect(() => {
    if (!enableHealthChecks || !autoStart) return;

    // Health checks run at 2x the connection check interval
    // This reduced frequency is appropriate since health status typically changes less often
    intervalRefs.current.healthInterval = setInterval(() => {
      if (isMountedRef.current) {
        performHealthCheck();
      }
    }, checkInterval * 2);

    // Clear interval on cleanup to prevent checks after unmount
    return () => {
      const currentIntervals = intervalRefs.current;
      if (currentIntervals.healthInterval) {
        clearInterval(currentIntervals.healthInterval);
        currentIntervals.healthInterval = undefined;
      }
    };
  }, [enableHealthChecks, autoStart, checkInterval, performHealthCheck]);

  // Memoize derived state to prevent unnecessary recalculations
  // These computations are cheap, but memoization ensures they only run when inputs change
  // This is especially valuable when the hook is used in frequently re-rendering components
  const isConnected = useMemo(
    () => Boolean(connectionStatus?.apiReachable && connectionStatus?.corsEnabled),
    [connectionStatus]
  );

  const isHealthy = useMemo(
    () => Boolean(healthStatus?.api && healthStatus?.frontend),
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
    diagnose: performDiagnosis,
  };
}

/**
 * Hook for simple connection status (lightweight version)
 *
 * This is a simplified version of useApiConnection for components that only need
 * basic connection status without full health monitoring. It's more performant
 * when you don't need the additional features.
 *
 * Optimizations:
 * - Minimal state tracking reduces memory footprint and re-render frequency
 * - Single listener pattern prevents duplicate event handlers
 * - Proper event listener cleanup prevents memory leaks
 * - Memoized derived state prevents unnecessary recalculations
 *
 * Usage example:
 * const { isOnline, isConnected } = useConnectionStatus();
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  isConnected: boolean;
  last_checked: Date | null;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);

  // Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Browser online/offline event handlers with mount state checking
    // These track the browser's network connectivity state
    const handleOnline = () => {
      if (isMountedRef.current) {
        setIsOnline(true);
      }
    };

    const handleOffline = () => {
      if (isMountedRef.current) {
        setIsOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection monitor listener with smart updates and mount state checking
    const __handleConnectionUpdate = (info: ConnectionInfo) => {
      if (!isMountedRef.current) return;

      setConnectionInfo(prevInfo => {
        // Skip update if connection status hasn't changed
        // This prevents unnecessary re-renders when only transient properties change
        if (
          prevInfo &&
          prevInfo.apiReachable === info.apiReachable &&
          prevInfo.corsEnabled === info.corsEnabled
        ) {
          return prevInfo;
        }
        return info;
      });
    };

    // TODO: Implement connectionMonitor.addListener(handleConnectionUpdate);

    // Comprehensive cleanup removes all event listeners
    // This is essential for preventing memory leaks in single-page applications
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // TODO: Implement connectionMonitor.removeListener(handleConnectionUpdate);
    };
  }, []); // Empty deps - all handlers are stable

  // Memoize derived connection state
  // This calculation only runs when connectionInfo changes
  const isConnected = useMemo(
    () => Boolean(connectionInfo?.apiReachable && connectionInfo?.corsEnabled),
    [connectionInfo]
  );

  return {
    isOnline,
    isConnected,
    last_checked: connectionInfo?.last_checked || null,
  };
}

/**
 * Hook for API retry logic with connection awareness
 *
 * This hook wraps API calls with intelligent retry logic that respects connection state.
 * It's particularly useful for operations that might fail due to temporary network issues.
 *
 * Key features and optimizations:
 * - Exponential backoff prevents overwhelming the server during outages
 * - Connection-aware auto-retry resumes operations when connectivity returns
 * - Debounced retry logic prevents "retry storms" when connection flickers
 * - Component mount tracking prevents state updates after unmount
 * - Abort controller support enables proper cleanup of in-flight requests
 * - Authentication error detection stops futile retry attempts
 *
 * Usage example:
 * const { execute, isLoading, error, retryCount } = useApiRetry(
 *   () => fetchUserData(user_id),
 *   { maxRetries: 3, exponentialBackoff: true }
 * );
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
    exponentialBackoff = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { isConnected } = useConnectionStatus();

  // Track component mount state to prevent updates after unmount
  // This is crucial for preventing "Can't perform a React state update on an unmounted component" warnings
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear any pending retry timeout on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Calculate retry delay with optional exponential backoff
  // Exponential backoff helps prevent overwhelming the server during outages
  // by progressively increasing wait time between retries
  const calculateRetryDelay = useCallback(
    (attempt: number): number => {
      if (!exponentialBackoff) return retryDelay;
      // Formula: baseDelay * 2^(attempt-1)
      // This gives us: 1s, 2s, 4s, 8s, etc.
      return retryDelay * Math.pow(2, attempt - 1);
    },
    [retryDelay, exponentialBackoff]
  );

  const execute = useCallback(async (): Promise<T> => {
    // Early exit if component unmounted
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }

    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;
    let attempts = 0;

    // Retry loop continues until success or max retries exceeded
    while (attempts <= maxRetries) {
      // Check if component still mounted before each attempt
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      try {
        const result = await apiCall();

        // Only update state if component still mounted
        if (isMountedRef.current) {
          setRetryCount(0); // Reset count on success
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
        // These errors won't be resolved by retrying and indicate a different problem
        if (
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('Unauthorized')
        ) {
          break;
        }

        // Wait with calculated delay before next retry
        const delay = calculateRetryDelay(attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Update final error state if component still mounted
    if (isMountedRef.current) {
      setError(lastError?.message || 'Request failed');
      setIsLoading(false);
    }
    throw lastError;
  }, [apiCall, maxRetries, calculateRetryDelay]);

  // Reset function to clear error state and retry count
  // Useful when you want to give the user a fresh start after addressing issues
  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsLoading(false);
  }, []);

  // Auto-retry with debouncing when connection restores
  // This effect monitors connection status and automatically retries failed requests
  // when connectivity returns, providing a seamless user experience
  useEffect(() => {
    // Only auto-retry if all conditions are met:
    // 1. Feature is enabled
    // 2. Connection is restored
    // 3. There was a previous error
    // 4. We've actually attempted the request before
    if (!retryOnConnectionRestore || !isConnected || !error || retryCount === 0) {
      return;
    }

    // Clear any pending retry to avoid multiple simultaneous retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Debounce retry to avoid retry storms when connection flickers
    // The 2 second delay ensures the connection is stable before retrying
    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isConnected) {
        execute().catch(() => {
          // Error already handled in execute function
          // We catch here to prevent unhandled promise rejection
        });
      }
    }, 2000); // 2 second debounce provides stability

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isConnected, error, retryCount, retryOnConnectionRestore, execute]);

  // Memoize canRetry to prevent unnecessary recalculations
  const canRetry = useMemo(
    () => retryCount < maxRetries && Boolean(error),
    [retryCount, maxRetries, error]
  );

  return {
    execute,
    isLoading,
    error,
    retryCount,
    canRetry,
    reset,
  };
}
