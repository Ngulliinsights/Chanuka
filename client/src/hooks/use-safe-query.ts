/**
 * Enhanced React Query hooks with race condition prevention and robust error handling
 * 
 * These hooks solve common problems when fetching data in React applications:
 * - Race conditions: When a new request starts before the previous one finishes
 * - Duplicate requests: Multiple components triggering the same fetch
 * - Memory leaks: Requests completing after component unmounts
 * - Poor error handling: Uncaught errors or unclear error states
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import AuthenticatedAPI, { APIResponse } from '../utils/authenticated-api';
import { logger } from '../../../shared/core/src/observability/logging';

export interface SafeQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  endpoint: string;
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

/**
 * Enhanced useQuery hook with built-in race condition prevention.
 * 
 * Race conditions occur when multiple requests are in flight and responses arrive
 * out of order. This hook prevents that by canceling previous requests when a new
 * one starts, ensuring only the most recent request's response is used.
 * 
 * Example usage:
 * const { data, isLoading, error, refetchSafely } = useSafeQuery({
 *   queryKey: ['user', userId],
 *   endpoint: `/api/users/${userId}`,
 *   requireAuth: true
 * });
 */
export function useSafeQuery<T = any>(
  options: SafeQueryOptions<T>
): UseQueryResult<T> & {
  refetchSafely: () => Promise<void>;
  isRefetching: boolean;
} {
  const {
    endpoint,
    requireAuth = false,
    timeout = 10000,
    retries = 2,
    retryDelay = 1000,
    onError,
    onSuccess,
    ...queryOptions
  } = options;

  // Store the current abort controller to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track refetch state to prevent duplicate manual refetches
  const isRefetchingRef = useRef(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Clean up on unmount: abort any pending requests
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  /**
   * Core query function that handles the actual data fetching.
   * This is where race condition prevention happens through AbortController.
   */
  const queryFn = useCallback(async ({ signal }: { signal?: AbortSignal }): Promise<T> => {
    // Step 1: Cancel any existing request to prevent race conditions
    // If a previous request is still running, abort it before starting a new one
    abortControllerRef.current?.abort();

    // Step 2: Create a new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Step 3: Link React Query's signal to our controller
    // This ensures the request is canceled if React Query unmounts the component
    const abortHandler = () => controller.abort();
    signal?.addEventListener('abort', abortHandler);

    try {
      let result: APIResponse<T>;

      // Step 4: Make the actual API request based on auth requirements
      if (requireAuth) {
        // Use authenticated API with built-in retry logic
        result = await AuthenticatedAPI.get<T>(endpoint, {
          signal: controller.signal,
          timeout,
          retries,
          retryDelay
        });
      } else {
        // Use standard fetch for public endpoints with timeout handling
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          result = { data, status: response.status };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

      // Step 5: Handle API-level errors
      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.data!;

      // Only trigger success callback if component is still mounted
      if (isMountedRef.current) {
        onSuccess?.(data);
      }

      return data;

    } catch (error) {
      // Don't handle abort errors - they're expected when canceling requests
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      // Transform error into a consistent format and trigger error callback
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const queryError = new Error(errorMessage);

      if (isMountedRef.current) {
        onError?.(queryError);
      }

      throw queryError;
    } finally {
      // Clean up: remove the controller reference if this was the active request
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      // Clean up event listener
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }, [endpoint, requireAuth, timeout, retries, retryDelay, onError, onSuccess]);

  // Configure React Query with our enhanced query function
  const query = useQuery<T>({
    ...queryOptions,
    queryFn,
    retry: (failureCount, error) => {
      // Never retry abort errors - they indicate intentional cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }
      // Retry other errors up to the specified limit
      return failureCount < retries;
    },
    // Set sensible defaults for caching behavior
    staleTime: queryOptions.staleTime ?? 5 * 60 * 1000, // Data fresh for 5 minutes
    gcTime: queryOptions.gcTime ?? 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  /**
   * Safe refetch function that prevents duplicate refetch requests.
   * Use this instead of query.refetch() to avoid race conditions during manual refreshes.
   */
  const refetchSafely = useCallback(async () => {
    // Prevent duplicate refetch calls
    if (isRefetchingRef.current) {
      console.warn('Refetch already in progress, skipping duplicate request');
      return;
    }

    isRefetchingRef.current = true;
    try {
      await query.refetch();
    } finally {
      // Always reset the flag, even if refetch fails
      isRefetchingRef.current = false;
    }
  }, [query]);

  return {
    ...query,
    refetchSafely,
    isRefetching: isRefetchingRef.current
  };
}

/**
 * Specialized hook for admin-specific queries with enhanced security and longer timeouts.
 * 
 * Admin operations typically require:
 * - Authentication
 * - Longer timeouts (complex operations)
 * - Fewer retries (fail fast for security)
 * 
 * Example:
 * const { data: users } = useAdminQuery({
 *   queryKey: ['admin', 'users'],
 *   endpoint: '/api/admin/users'
 * });
 */
export function useAdminQuery<T = any>(
  options: Omit<SafeQueryOptions<T>, 'requireAuth'>
): UseQueryResult<T> & {
  refetchSafely: () => Promise<void>;
  isRefetching: boolean;
} {
  return useSafeQuery<T>({
    ...options,
    requireAuth: true,
    timeout: options.timeout ?? 15000, // 15s timeout for admin operations
    retries: options.retries ?? 1, // Fewer retries for security
  });
}

/**
 * Hook for coordinating multiple related queries to prevent race conditions
 * when fetching interdependent data.
 * 
 * This is useful when you need to fetch multiple pieces of data that should be
 * loaded together, like user profile + settings + preferences. It ensures:
 * - All queries complete before allowing refetch
 * - No duplicate queries while refetching
 * - Coordinated error handling
 * 
 * Example:
 * const { data, isLoading, refetchAll } = useCoordinatedQueries([
 *   { key: 'profile', endpoint: '/api/profile' },
 *   { key: 'settings', endpoint: '/api/settings' }
 * ]);
 * // Access data.profile and data.settings
 */
export function useCoordinatedQueries<T extends Record<string, any>>(
  queries: Array<{
    key: string;
    endpoint: string;
    options?: Partial<SafeQueryOptions<any>>;
  }>
): {
  data: Partial<T>;
  isLoading: boolean;
  error: Error | null;
  refetchAll: () => Promise<void>;
} {
  // Track which queries are currently being refetched to prevent duplicates
  const activeQueriesRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeQueriesRef.current.clear();
    };
  }, []);

  // Create a separate query for each endpoint
  const queryResults = useMemo(() => 
    queries.map(({ key, endpoint, options = {} }) => {
      // We need to handle the query creation inside a hook, so we'll return a factory
      return { key, endpoint, options };
    }), 
    [queries]
  );

  // Execute queries
  const results = queryResults.map(({ key, endpoint, options = {} }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useSafeQuery({
      queryKey: [key],
      endpoint,
      // Disable query if it's currently being refetched
      enabled: (options.enabled !== false) && !activeQueriesRef.current.has(key),
      ...options,
      onSuccess: (data) => {
        if (isMountedRef.current) {
          activeQueriesRef.current.delete(key);
          options.onSuccess?.(data);
        }
      },
      onError: (error) => {
        if (isMountedRef.current) {
          activeQueriesRef.current.delete(key);
          options.onError?.(error);
        }
      }
    });

    return { key, result };
  });

  // Aggregate data from all queries into a single object
  const data = useMemo(() => 
    results.reduce((acc, { key, result }) => {
      if (result.data) {
        acc[key as keyof T] = result.data;
      }
      return acc;
    }, {} as Partial<T>),
    [results]
  );

  // Overall loading state: true if ANY query is loading
  const isLoading = results.some(({ result }) => result.isLoading);

  // Return the first error encountered, or null if no errors
  const error = results.find(({ result }) => result.error)?.result.error || null;

  /**
   * Refetch all queries in a coordinated manner.
   * Uses Promise.allSettled to ensure all refetches complete even if some fail.
   */
  const refetchAll = useCallback(async () => {
    // Mark all queries as active to prevent concurrent refetches
    results.forEach(({ key }) => {
      activeQueriesRef.current.add(key);
    });

    const refetchPromises = results.map(({ result }) => result.refetchSafely());

    try {
      // Wait for all refetches to complete (success or failure)
      await Promise.allSettled(refetchPromises);
    } finally {
      // Clean up: clear all active query markers
      if (isMountedRef.current) {
        activeQueriesRef.current.clear();
      }
    }
  }, [results]);

  return {
    data,
    isLoading,
    error,
    refetchAll
  };
}

export default useSafeQuery;











































