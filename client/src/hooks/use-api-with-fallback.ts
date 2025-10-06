import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ApiResponse, 
  ApiError, 
  FetchOptions, 
  apiService, 
  fallbackDataManager,
  getErrorMessage 
} from '@/services/api-error-handling';

export interface UseApiOptions extends Omit<FetchOptions, 'method'> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  fallbackKey?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export interface UseApiResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  fromCache: boolean;
  fromFallback: boolean;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useApiWithFallback<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    fallbackKey,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  // Use refs for callbacks to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change, but don't trigger re-fetches
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Memoize fetchOptions to prevent unnecessary re-renders
  // Only recreate when the actual values change
  const stableFetchOptions = useMemo(() => fetchOptions, [
    JSON.stringify(fetchOptions)
  ]);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    // Only set loading if we're still mounted
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Retrieve fallback data if a key is provided
      const fallbackData = fallbackKey 
        ? fallbackDataManager.getFallbackData(fallbackKey) 
        : undefined;
      
      const response: ApiResponse<T> = await apiService.get(endpoint, {
        ...stableFetchOptions,
        fallbackData,
        signal: abortControllerRef.current.signal,
      });

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      if (response.success) {
        setData(response.data);
        setFromCache(response.fromCache || false);
        setFromFallback(response.fromFallback || false);
        // Use ref to get latest callback without re-running effect
        onSuccessRef.current?.(response.data);
      } else if (response.fromFallback) {
        // Fallback data is available even though request failed
        setData(response.data);
        setFromFallback(true);
        setError(response.error || null);
        onErrorRef.current?.(response.error!);
      }
    } catch (err) {
      // Only handle error if we're still mounted and it's not an abort
      if (!isMountedRef.current) return;
      
      if ((err as any).name === 'AbortError') {
        // Request was cancelled, don't treat as error
        return;
      }

      const apiError = err as ApiError;
      setError(apiError);
      setFromFallback(false);
      setFromCache(false);
      onErrorRef.current?.(apiError);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [endpoint, enabled, fallbackKey, stableFetchOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch - runs when fetchData reference changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup refetch interval if specified
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [fetchData, refetchInterval, enabled]);

  // Setup window focus refetching if enabled
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      // Use visibilitychange for more reliable detection
      if (!document.hidden) {
        fetchData();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, refetchOnWindowFocus, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    isSuccess: !!data && !error,
    fromCache,
    fromFallback,
    refetch: fetchData,
    clearError,
  };
}

// Hook for mutations (POST, PUT, DELETE)
export interface UseMutationOptions<TData = any, TVariables = any> extends Omit<FetchOptions, 'method'> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: ApiError | null, variables: TVariables) => void;
}

export interface UseMutationResult<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  // Use refs for callbacks to keep them stable
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track mounted state to prevent updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    if (!isMountedRef.current) {
      throw new Error('Cannot mutate: component is unmounted');
    }

    setIsLoading(true);
    setError(null);

    // Store references for the onSettled callback
    let resultData: TData | null = null;
    let resultError: ApiError | null = null;

    try {
      const response = await mutationFn(variables);
      
      if (!isMountedRef.current) {
        throw new Error('Component unmounted during mutation');
      }
      
      if (response.success) {
        resultData = response.data;
        setData(response.data);
        onSuccessRef.current?.(response.data, variables);
        return response.data;
      } else {
        resultError = response.error!;
        setError(resultError);
        onErrorRef.current?.(resultError, variables);
        throw resultError;
      }
    } catch (err) {
      const apiError = err as ApiError;
      resultError = apiError;
      
      if (isMountedRef.current) {
        setError(apiError);
      }
      
      onErrorRef.current?.(apiError, variables);
      throw apiError;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      // Always call onSettled, even if unmounted
      onSettledRef.current?.(resultData, resultError, variables);
    }
  }, [mutationFn]);

  const mutate = useCallback(async (variables: TVariables): Promise<void> => {
    try {
      await mutateAsync(variables);
    } catch {
      // Error is already handled in mutateAsync and callbacks
      // Silently catch to provide non-throwing mutation option
    }
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isError: !!error,
    isSuccess: !!data && !error,
    reset,
  };
}

// Specialized hooks for common API patterns
export function useApiQuery<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  return useApiWithFallback<T>(endpoint, options);
}

export function useApiPost<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  return useMutation<TData, TVariables>(
    (variables: TVariables) => apiService.post(endpoint, variables),
    options
  );
}

export function useApiPut<TData = any, TVariables = any>(
  endpoint: string,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  return useMutation<TData, TVariables>(
    (variables: TVariables) => apiService.put(endpoint, variables),
    options
  );
}

export function useApiDelete<TData = any>(
  endpoint: string,
  options: UseMutationOptions<TData, void> = {}
): UseMutationResult<TData, void> {
  return useMutation<TData, void>(
    () => apiService.delete(endpoint),
    options
  );
}