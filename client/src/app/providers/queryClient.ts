import { QueryClient } from '@tanstack/react-query';

/**
 * Default QueryClient instance with optimized settings for the Chanuka platform.
 * Configuration balances data freshness with performance.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});