import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

import { AuthenticatedAPI } from '@client/utils/api';

/**
 * A wrapper around React Query's useMutation that provides a simplified API for common mutations.
 * It integrates with our AuthenticatedAPI for consistent error handling and authentication.
 *
 * @param mutationFn The async function that performs the mutation.
 * @param options React Query mutation options.
 */
export function useSafeMutation<TData = any, TError = Error, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
): UseMutationResult<TData, TError, TVariables> {
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
  });
}

/**
 * A hook for performing POST requests with a simplified API.
 * 
 * @param endpoint The API endpoint to hit.
 * @param options Mutation options.
 */
export function useSafePost<TData = any, TVariables = any>(
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
  return useSafeMutation<TData, Error, TVariables>(
    (variables: TVariables) => AuthenticatedAPI.post(endpoint, variables).then(res => res.data as TData),
    options
  );
}

/**
 * A hook for performing PUT requests with a simplified API.
 * 
 * @param endpoint The API endpoint to hit.
 * @param options Mutation options.
 */
export function useSafePut<TData = any, TVariables = any>(
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
  return useSafeMutation<TData, Error, TVariables>(
    (variables: TVariables) => AuthenticatedAPI.put(endpoint, variables).then(res => res.data as TData),
    options
  );
}

/**
 * A hook for performing DELETE requests with a simplified API.
 *
 * @param endpoint The API endpoint to hit.
 * @param options Mutation options.
 */
export function useSafeDelete<TData = any>(
  endpoint: string,
  options?: Omit<UseMutationOptions<TData, Error, void>, 'mutationFn'>
) {
  return useSafeMutation<TData, Error, void>(
    () => AuthenticatedAPI.delete(endpoint).then(res => res.data as TData),
    options
  );
}













































