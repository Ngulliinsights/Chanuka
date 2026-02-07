/**
 * Safe Query Hook
 * Provides type-safe query functionality with error handling
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export interface SafeQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: unknown[];
  queryFn: () => Promise<TData>;
  onError?: (error: TError) => void;
}

export function useSafeQuery<TData = unknown, TError = Error>(
  options: SafeQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const { onError, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    onError: (error: TError) => {
      console.error('Query error:', error);
      onError?.(error);
    },
  } as UseQueryOptions<TData, TError>);
}

export default useSafeQuery;
