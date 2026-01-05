import { QueryClient } from '@tanstack/react-query';

/**
 * Default QueryClient instance with optimized settings for the Chanuka platform.
 * Configuration balances data freshness with performance.
 */
export const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});