import { QueryClientConfig } from '@tanstack/react-query';

// Cache-aware query configuration for React Query
export const cacheAwareQueryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for important data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (can be overridden per query)
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
};

// Cache keys for consistent caching
export const CACHE_KEYS = {
  bills: {
    list: ['bills', 'list'],
    detail: (id: string) => ['bills', 'detail', id],
    analysis: (id: string) => ['bills', 'analysis', id],
    sponsorship: (id: string) => ['bills', 'sponsorship', id],
    comments: (id: string) => ['bills', 'comments', id],
  },
  community: {
    input: ['community', 'input'],
    verification: ['community', 'verification'],
  },
  user: {
    profile: ['user', 'profile'],
    dashboard: ['user', 'dashboard'],
    preferences: ['user', 'preferences'],
  },
  admin: {
    dashboard: ['admin', 'dashboard'],
    users: ['admin', 'users'],
    system: ['admin', 'system'],
  },
} as const;

// Cache invalidation helpers
export const invalidateCache = {
  bills: {
    all: () => ['bills'],
    detail: (id: string) => CACHE_KEYS.bills.detail(id),
    analysis: (id: string) => CACHE_KEYS.bills.analysis(id),
  },
  community: {
    all: () => ['community'],
  },
  user: {
    all: () => ['user'],
  },
} as const;