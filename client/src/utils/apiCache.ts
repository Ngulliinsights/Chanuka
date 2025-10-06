// API response caching strategies and utilities

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxAge?: number; // Maximum age in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  cacheKey?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
}

export interface CachedResponse<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  etag?: string;
  lastModified?: string;
}

// In-memory cache for API responses
class ApiCache {
  private cache = new Map<string, CachedResponse>();
  private maxSize = 100; // Maximum number of cached items
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  // Generate cache key
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    const headers = options?.headers ? JSON.stringify(options.headers) : '';
    
    return `${method}:${url}:${body}:${headers}`;
  }

  // Check if cached response is still valid
  private isValid(cached: CachedResponse): boolean {
    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  // Check if cached response is stale
  private isStale(cached: CachedResponse): boolean {
    const now = Date.now();
    const staleTime = cached.ttl * 0.8; // Consider stale at 80% of TTL
    return (now - cached.timestamp) > staleTime;
  }

  // Get cached response
  get<T = any>(key: string): CachedResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (this.isValid(cached)) {
      return cached as CachedResponse<T>;
    }

    // Remove expired cache
    this.cache.delete(key);
    return null;
  }

  // Set cached response
  set<T = any>(key: string, data: T, config: CacheConfig = {}): void {
    const {
      ttl = 5 * 60 * 1000, // Default 5 minutes
      tags = [],
    } = config;

    // Prevent race condition by checking if key already exists with newer data
    const existing = this.cache.get(key);
    if (existing && existing.timestamp > Date.now() - 1000) {
      // If existing entry is less than 1 second old, don't overwrite
      return;
    }

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const cached: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
    };

    this.cache.set(key, cached);
  }

  // Invalidate cache by key
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  // Invalidate cache by tag
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, cached] of this.cache.entries()) {
      if (cached.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Start cleanup timer to remove expired entries
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (!this.isValid(cached)) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  // Stop cleanup timer
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global API cache instance
export const apiCache = new ApiCache();

// Enhanced fetch with caching
export async function fetchWithCache<T = any>(
  url: string,
  options: RequestInit & { cache?: CacheConfig } = {}
): Promise<T> {
  const { cache: cacheConfig, ...fetchOptions } = options;
  const cacheKey = cacheConfig?.cacheKey || apiCache['generateKey'](url, fetchOptions);

  // Try to get from cache first
  const cached = apiCache.get<T>(cacheKey);
  
  if (cached) {
    // Return cached data if valid
    if (cacheConfig?.staleWhileRevalidate && apiCache['isStale'](cached)) {
      // Return stale data immediately and fetch fresh data in background
      fetchFreshData();
      return cached.data;
    }
    return cached.data;
  }

  // Fetch fresh data
  return fetchFreshData();

  async function fetchFreshData(): Promise<T> {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      apiCache.set(cacheKey, data, cacheConfig);
      
      return data;
    } catch (error) {
      // If we have stale cached data, return it as fallback
      if (cached) {
        console.warn('Fetch failed, returning stale cached data:', error);
        return cached.data;
      }
      throw error;
    }
  }
}

// Cache-aware query client configuration for React Query
export const cacheAwareQueryConfig = {
  defaultOptions: {
    queries: {
      // Use stale-while-revalidate strategy
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Use network-first strategy for critical data
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Invalidate related cache on mutations
      onSuccess: (data: any, variables: any, context: any) => {
        // Implement cache invalidation logic based on mutation type
        if (context?.invalidateTags) {
          context.invalidateTags.forEach((tag: string) => {
            apiCache.invalidateByTag(tag);
          });
        }
      },
    },
  },
};

// Offline-first data management
export class OfflineDataManager {
  private pendingRequests = new Map<string, any>();
  private syncQueue: Array<{ url: string; options: RequestInit; timestamp: number }> = [];

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.processSyncQueue();
    });
  }

  // Queue request for when online
  async queueRequest(url: string, options: RequestInit): Promise<void> {
    this.syncQueue.push({
      url,
      options,
      timestamp: Date.now(),
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.processSyncQueue();
    }
  }

  // Process queued requests when online
  private async processSyncQueue(): Promise<void> {
    if (!navigator.onLine || this.syncQueue.length === 0) {
      return;
    }

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const request of queue) {
      try {
        await fetch(request.url, request.options);
        console.log('Synced queued request:', request.url);
      } catch (error) {
        console.error('Failed to sync request:', request.url, error);
        // Re-queue failed requests
        this.syncQueue.push(request);
      }
    }
  }

  // Get offline data with fallback
  async getOfflineData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    try {
      // Try to fetch fresh data if online
      if (navigator.onLine) {
        const data = await fetchFn();
        // Cache the data
        localStorage.setItem(`offline_${key}`, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
        return data;
      }
    } catch (error) {
      console.warn('Failed to fetch fresh data, trying offline cache:', error);
    }

    // Try to get from offline cache
    try {
      const cached = localStorage.getItem(`offline_${key}`);
      if (cached) {
        const { data } = JSON.parse(cached);
        return data;
      }
    } catch (error) {
      console.error('Failed to get offline cache:', error);
    }

    // Return fallback data if available
    if (fallbackData !== undefined) {
      return fallbackData;
    }

    throw new Error('No data available offline');
  }

  // Clear offline cache
  clearOfflineCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('offline_')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Get sync queue status
  getSyncStatus() {
    return {
      queueLength: this.syncQueue.length,
      isOnline: navigator.onLine,
      oldestRequest: this.syncQueue.length > 0 ? this.syncQueue[0].timestamp : null,
    };
  }
}

// Global offline data manager
export const offlineDataManager = new OfflineDataManager();

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate bills-related cache
  invalidateBills: () => {
    apiCache.invalidateByTag('bills');
  },

  // Invalidate sponsors-related cache
  invalidateSponsors: () => {
    apiCache.invalidateByTag('sponsors');
  },

  // Invalidate analysis-related cache
  invalidateAnalysis: () => {
    apiCache.invalidateByTag('analysis');
  },

  // Invalidate community-related cache
  invalidateCommunity: () => {
    apiCache.invalidateByTag('community');
  },

  // Invalidate all cache
  invalidateAll: () => {
    apiCache.clear();
  },
};

// Hook for using cached API data
export function useCachedApi<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try cache first
        const cached = apiCache.get<T>(key);
        if (cached && mounted) {
          setData(cached.data);
          setLoading(false);
          return;
        }

        // Fetch fresh data
        const freshData = await fetchFn();
        if (mounted) {
          setData(freshData);
          apiCache.set(key, freshData, config);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key]);

  const invalidate = React.useCallback(() => {
    apiCache.invalidate(key);
  }, [key]);

  return { data, loading, error, invalidate };
}

// React import for the hook
import React from 'react';