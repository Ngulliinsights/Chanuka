/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Please use `useSafeQuery` for data fetching and `useSafeMutation` for mutations.
 *
 * See `use-safe-query.ts` and `use-safe-mutation.ts` for the new, consolidated API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { BaseError, ErrorDomain, ErrorSeverity, handleError } from '@client/core/error';

import { globalApiClient } from '../client';
import type { UnifiedError } from '../types/common';
import type { ApiResponse, RequestOptions } from '../types/request';

export interface UseApiOptions extends Omit<RequestOptions, 'method'> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  fallbackKey?: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: UnifiedError) => void;
}

export interface UseApiResult<T> {
  data: T | null;
  error: UnifiedError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  fromCache: boolean;
  fromFallback: boolean;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useApiWithFallback<T = unknown>(
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
  const isMountedRef = useRef(true);
  const fetchOptionsRef = useRef(fetchOptions);

  // Update refs when values change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  }, [fetchOptions]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<UnifiedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      // Retrieve fallback data if a key is provided (simplified for deprecated hook)
      const fallbackData = fallbackKey
        ? null // Simplified fallback - this hook is deprecated
        : undefined;

      const response: ApiResponse<T> = await globalApiClient.get(endpoint, {
        ...fetchOptionsRef.current,
        fallbackData,
        signal: abortControllerRef.current.signal,
      });

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      if (response.status >= 200 && response.status < 300) {
        setData(response.data);
        setFromCache(response.cached || false);
        setFromFallback(response.fromFallback || false);
        // Use ref to get latest callback without re-running effect
        onSuccessRef.current?.(response.data);
      } else if (response.fromFallback) {
        // Fallback data is available even though request failed
        setData(response.data as T | null);
        setFromFallback(true);
        const fetchError = handleError({
          code: 'NETWORK_ERROR',
          message: response.message || `Request failed with status ${response.status}`,
          type: ErrorDomain.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          recoverable: true,
          retryable: true,
        });
        setError(fetchError);
        onErrorRef.current?.(fetchError);
      }
    } catch (err) {
      // Only handle error if we're still mounted and it's not an abort
      if (!isMountedRef.current) return;

      if ((err as Error).name === 'AbortError') {
        // Request was cancelled, don't treat as error
        return;
      }

      const apiError = err as UnifiedError;
      setError(apiError);
      setFromFallback(false);
      setFromCache(false);
      onErrorRef.current?.(apiError);
    } finally {
      // Only update loading state if component is mounted
      // AND this is still the active request
      if (isMountedRef.current && abortControllerRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [endpoint, enabled, fallbackKey]);

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

    return undefined;
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
export interface UseMutationOptions<TData = unknown, TVariables = unknown>
  extends Omit<RequestOptions, 'method'> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: UnifiedError, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: UnifiedError | null, variables: TVariables) => void;
}

export interface UseMutationResult<TData = unknown, TVariables = unknown> {
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  error: UnifiedError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
}

export function useMutation<TData = unknown, TVariables = unknown>(
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
  const [error, setError] = useState<UnifiedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track mounted state to prevent updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      if (!isMountedRef.current) {
        throw new Error('Cannot mutate: component is unmounted');
      }

      setIsLoading(true);
      setError(null);

      // Store references for the onSettled callback
      let resultData: TData | null = null;
      let resultError: UnifiedError | null = null;

      try {
        const response = await mutationFn(variables);

        if (!isMountedRef.current) {
          throw new Error('Component unmounted during mutation');
        }

        if (response.status >= 200 && response.status < 300) {
          resultData = response.data;
          setData(response.data);
          onSuccessRef.current?.(response.data, variables);
          return response.data;
        } else {
          // Create a unified error from the response
          const safeError = handleError({
            code: 'NETWORK_ERROR',
            message: response.message || `Request failed with status ${response.status}`,
            type: ErrorDomain.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            recoverable: true,
            retryable: true,
          });
          resultError = safeError;
          setError(resultError || null);
          onErrorRef.current?.(resultError, variables);
          throw resultError;
        }
      } catch (err) {
        const apiError = err as UnifiedError;
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
    },
    [mutationFn]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<void> => {
      try {
        await mutateAsync(variables);
      } catch {
        // Error is already handled in mutateAsync and callbacks
        // Silently catch to provide non-throwing mutation option
        // The error state is available via the error property
      }
    },
    [mutateAsync]
  );

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
export function useApiQuery<T = unknown>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  return useApiWithFallback<T>(endpoint, options);
}

export function useApiPost<TData = unknown, TVariables = unknown>(
  endpoint: string,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  return useMutation<TData, TVariables>(
    (variables: TVariables) => globalApiClient.post(endpoint, variables),
    options
  );
}

export function useApiPut<TData = unknown, TVariables = unknown>(
  endpoint: string,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  return useMutation<TData, TVariables>(
    (variables: TVariables) => globalApiClient.put(endpoint, variables),
    options
  );
}

export function useApiDelete<TData = unknown>(
  endpoint: string,
  options: UseMutationOptions<TData, void> = {}
): UseMutationResult<TData, void> {
  return useMutation<TData, void>(() => globalApiClient.delete(endpoint), options);
}
