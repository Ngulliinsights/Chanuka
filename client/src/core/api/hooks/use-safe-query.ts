/**
 * Enhanced React Query hooks with race condition prevention and robust error handling
 * 
 * These hooks solve common problems when fetching data in React applications:
 * - Race conditions: When a new request starts before the previous one finishes
 * - Duplicate requests: Multiple components triggering the same fetch
 * - Memory leaks: Requests completing after component unmounts
 * - Poor error handling: Uncaught errors or unclear error states
 */

import { useQuery, useQueries, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import AuthenticatedAPI, { APIResponse } from '@client/utils/authenticated-api';
import { logger } from '@client/utils/logger';

export interface SafeQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  endpoint?: string;
  queryFn?: () => Promise<T>;
  requireAuth?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

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
        result = await AuthenticatedAPI.get<T>(endpoint!, {
          signal: controller.signal,
          timeout,
          retries,
          retryDelay
        });
      } else {
        // Use standard fetch for public endpoints with timeout handling
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(endpoint!, {
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
 * - Fewer retries (fail security)
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
 * Fixed: Uses useQueries to comply with Rules of Hooks
 * Hook for coordinating multiple related queries to prevent race conditions
 * when fetching interdependent data.
 * 
 * IMPORTANT: This hook is designed for a FIXED number of queries (max 5).
 * For dynamic query lists, use React Query's useQueries hook directly.
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
  // Validate input to prevent hook rule violations
  if (queries.length > 5) {
    throw new Error('useCoordinatedQueries supports maximum 5 queries. Use React Query\'s useQueries for more.');
  }

  // Create stable query configurations
  const queryConfigs = useMemo(() => {
    return queries.map(q => ({
      queryKey: [q.key],
      queryFn: () => AuthenticatedAPI.get(q.endpoint).then(res => res.data),
      enabled: q.options?.enabled !== false,
      staleTime: q.options?.staleTime ?? 5 * 60 * 1000,
      gcTime: q.options?.gcTime ?? 10 * 60 * 1000,
      ...q.options,
    }));
  }, [queries]);

  // Execute queries using useQueries (Rules of Hooks compliant)
  const results = useQueries({ queries: queryConfigs });

  // Aggregate data from all queries into a single object
  const data = useMemo(() => {
    const result: Partial<T> = {};
    queries.forEach((queryConfig, index) => {
      const queryResult = results[index];
      if (queryResult?.data) {
        result[queryConfig.key as keyof T] = queryResult.data;
      }
    });
    return result;
  }, [queries, results]);

  // Overall loading state: true if ANY query is loading
  const isLoading = results.some(query => query.isLoading);

  // Return the first error encountered, or null if no errors
  const error = results.find(query => query.error)?.error || null;

  /**
   * Refetch all queries in a coordinated manner.
   * Uses Promise.allSettled to ensure all refetches complete even if some fail.
   */
  const refetchAll = useCallback(async () => {
    const refetchPromises = results.map(query => query.refetch());
    await Promise.allSettled(refetchPromises);
  }, [results]);

  return {
    data,
    isLoading,
    error,
    refetchAll
  };
}

export default useSafeQuery;