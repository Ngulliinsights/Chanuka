/**
 * React Query Configuration
 * 
 * Centralized configuration for server state management
 * with optimized defaults for the Chanuka platform.
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

import { getStore } from '../store';
import { setOnlineStatus } from '../store/slices/uiSlice';

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

const queryConfig: DefaultOptions = {
  queries: {
    // Stale time - how long data is considered fresh
    staleTime: 5 * 60 * 1000, // 5 minutes
    
    // Cache time - how long data stays in cache after component unmounts
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus (disabled for better UX)
    refetchOnWindowFocus: false,
    
    // Refetch on reconnect
    refetchOnReconnect: true,
    
    // Refetch on mount if data is stale
    refetchOnMount: true,
  },
  
  mutations: {
    // Retry mutations once on network errors
    retry: (failureCount, error: any) => {
      if (error?.name === 'NetworkError' && failureCount < 1) {
        return true;
      }
      return false;
    },
  },
};

// Create query client instance
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// ============================================================================
// QUERY KEYS FACTORY
// ============================================================================

/**
 * Centralized query key factory for consistent cache management
 */
export const queryKeys = {
  // Bills
  bills: {
    all: ['bills'] as const,
    lists: () => [...queryKeys.bills.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.bills.lists(), filters] as const,
    details: () => [...queryKeys.bills.all, 'detail'] as const,
    detail: (id: string | number) => [...queryKeys.bills.details(), id] as const,
    analysis: (id: string | number) => [...queryKeys.bills.detail(id), 'analysis'] as const,
    comments: (id: string | number) => [...queryKeys.bills.detail(id), 'comments'] as const,
    votes: (id: string | number) => [...queryKeys.bills.detail(id), 'votes'] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    preferences: () => [...queryKeys.users.current(), 'preferences'] as const,
  },
  
  // Search
  search: {
    all: ['search'] as const,
    results: (query: string, filters: Record<string, any>) => 
      [...queryKeys.search.all, 'results', query, filters] as const,
    suggestions: (query: string) => 
      [...queryKeys.search.all, 'suggestions', query] as const,
  },
  
  // Comments
  comments: {
    all: ['comments'] as const,
    byBill: (billId: string | number) => 
      [...queryKeys.comments.all, 'bill', billId] as const,
    byUser: (userId: string) => 
      [...queryKeys.comments.all, 'user', userId] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    engagement: (billId: string | number) => 
      [...queryKeys.analytics.all, 'engagement', billId] as const,
    trends: (timeframe: string) => 
      [...queryKeys.analytics.all, 'trends', timeframe] as const,
  },
  
  // Community
  community: {
    all: ['community'] as const,
    discussions: () => [...queryKeys.community.all, 'discussions'] as const,
    events: () => [...queryKeys.community.all, 'events'] as const,
  },
} as const;

// ============================================================================
// QUERY CLIENT UTILITIES
// ============================================================================

/**
 * Invalidate queries with pattern matching
 */
export const invalidateQueries = {
  bills: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.bills.all }),
    lists: () => queryClient.invalidateQueries({ queryKey: queryKeys.bills.lists() }),
    detail: (id: string | number) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.detail(id) }),
  },
  
  users: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    current: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.current() }),
  },
  
  search: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.search.all }),
  },
  
  comments: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.comments.all }),
    byBill: (billId: string | number) => 
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byBill(billId) }),
  },
  
  notifications: {
    all: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  },
};

/**
 * Prefetch utilities for performance optimization
 */
export const prefetchQueries = {
  bills: {
    popular: async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.bills.list({ sort: 'popular', limit: 10 }),
        queryFn: () => fetch('/api/bills?sort=popular&limit=10').then(res => res.json()),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
    },
    
    recent: async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.bills.list({ sort: 'recent', limit: 10 }),
        queryFn: () => fetch('/api/bills?sort=recent&limit=10').then(res => res.json()),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
  },
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  // Clear all cached data
  clearAll: () => queryClient.clear(),
  
  // Clear specific cache patterns
  clearBills: () => queryClient.removeQueries({ queryKey: queryKeys.bills.all }),
  clearUsers: () => queryClient.removeQueries({ queryKey: queryKeys.users.all }),
  clearSearch: () => queryClient.removeQueries({ queryKey: queryKeys.search.all }),
  
  // Get cache statistics
  getStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  },
};

// ============================================================================
// OFFLINE SUPPORT
// ============================================================================

/**
 * Configure offline behavior
 */
export const configureOfflineSupport = () => {
  // Listen for online/offline events
  const handleOnline = () => {
    // Dispatch Redux action to update online status
    const store = getStore();
    store.dispatch(setOnlineStatus(true));
    queryClient.resumePausedMutations();
  };

  const handleOffline = () => {
    // Dispatch Redux action to update online status
    const store = getStore();
    store.dispatch(setOnlineStatus(false));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Set initial online status
  const store = getStore();
  store.dispatch(setOnlineStatus(navigator.onLine));

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler for React Query
 */
export const setupGlobalErrorHandler = () => {
  queryClient.setMutationDefaults(['bills', 'create'], {
    onError: (error: any) => {
      console.error('Mutation error:', error);

      // Notifications are now handled by React Query hooks in components
      // Components can use useToast or other notification systems
    },
  });

  queryClient.setQueryDefaults(['bills'], {
    onError: (error: any) => {
      console.error('Query error:', error);

      // Notifications are now handled by React Query hooks in components
      // Components can use useToast or other notification systems
    },
  });
};

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Development utilities for debugging
 */
export const devUtils = {
  // Log cache contents
  logCache: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Query Cache:', queryClient.getQueryCache().getAll());
    }
  },
  
  // Log query stats
  logStats: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Cache Stats:', cacheUtils.getStats());
    }
  },
  
  // Force refetch all queries
  refetchAll: () => {
    if (process.env.NODE_ENV === 'development') {
      queryClient.refetchQueries();
    }
  },
};

export default queryClient;