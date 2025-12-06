/**
 * Bills Pagination Service - Infinite Scroll and Large Dataset Management
 * 
 * Advanced pagination service with infinite scroll, virtual scrolling support,
 * intelligent prefetching, and optimized memory management for large datasets.
 */

import { billsApiService, BillsSearchParams, PaginatedBillsResponse } from '@client/core/api/bills';
import { Bill } from '@client/core/api/types';
import { logger } from '@client/utils/logger';

import { billsDataCache } from './billsDataCache';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaginationConfig {
  pageSize: number;
  prefetchPages: number; // Number of pages to prefetch ahead
  maxCachedPages: number; // Maximum pages to keep in memory
  virtualScrollThreshold: number; // Items threshold for virtual scrolling
  loadingDebounceMs: number; // Debounce time for rapid scroll events
  retryAttempts: number;
  retryDelayMs: number;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  searchParams: BillsSearchParams;
  lastLoadTime: number;
}

export interface PageData {
  page: number;
  bills: Bill[];
  timestamp: number;
  searchParams: BillsSearchParams;
  fromCache: boolean;
}

export interface VirtualScrollData {
  startIndex: number;
  endIndex: number;
  visibleItems: Bill[];
  totalHeight: number;
  itemHeight: number;
  containerHeight: number;
}

// ============================================================================
// Bills Pagination Service Class
// ============================================================================

class BillsPaginationService {
  private config: PaginationConfig;
  private state: PaginationState;
  private pageCache = new Map<string, PageData>();
  private loadingPromises = new Map<string, Promise<any>>();
  private prefetchQueue: string[] = [];
  private loadingDebounceTimer: NodeJS.Timeout | null = null;
  private retryTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = {
      pageSize: 12,
      prefetchPages: 2,
      maxCachedPages: 10,
      virtualScrollThreshold: 100,
      loadingDebounceMs: 300,
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config
    };

    this.state = {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      pageSize: this.config.pageSize,
      hasNextPage: false,
      hasPreviousPage: false,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      searchParams: {},
      lastLoadTime: 0
    };

    logger.info('Bills Pagination Service initialized', {
      component: 'BillsPaginationService',
      config: this.config
    });
  }

  /**
   * Load the first page of bills with search parameters
   */
  async loadFirstPage(searchParams: BillsSearchParams = {}): Promise<PaginatedBillsResponse | null> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      this.state.searchParams = searchParams;
      this.state.currentPage = 1;

      // Clear existing cache for new search
      this.clearPageCache();

      const response = await this.loadPage(1, searchParams);
      
      if (response) {
        this.updateStateFromResponse(response, 1);
        
        // Start prefetching next pages
        this.startPrefetching();
        
        logger.info('First page loaded successfully', {
          component: 'BillsPaginationService',
          totalItems: response.pagination.total,
          totalPages: response.pagination.totalPages,
          searchParams
        });
      }

      this.state.isLoading = false;
      return response;
    } catch (error) {
      this.state.isLoading = false;
      this.state.error = error instanceof Error ? error.message : 'Failed to load first page';
      
      logger.error('Failed to load first page', {
        component: 'BillsPaginationService',
        error: this.state.error,
        searchParams
      });
      
      throw error;
    }
  }

  /**
   * Load the next page for infinite scroll
   */
  async loadNextPage(): Promise<Bill[] | null> {
    if (!this.state.hasNextPage || this.state.isLoadingMore) {
      return null;
    }

    try {
      this.state.isLoadingMore = true;
      this.state.error = null;

      const nextPage = this.state.currentPage + 1;
      const response = await this.loadPage(nextPage, this.state.searchParams);

      if (response && response.bills.length > 0) {
        this.state.currentPage = nextPage;
        this.updateStateFromResponse(response, nextPage);

        // Note: Bills are now managed by React Query hooks
        // No need to dispatch to Redux store

        // Continue prefetching
        this.startPrefetching();

        logger.info('Next page loaded successfully', {
          component: 'BillsPaginationService',
          page: nextPage,
          billsCount: response.bills.length
        });

        return response.bills;
      }

      this.state.isLoadingMore = false;
      return null;
    } catch (error) {
      this.state.isLoadingMore = false;
      this.state.error = error instanceof Error ? error.message : 'Failed to load next page';
      
      logger.error('Failed to load next page', {
        component: 'BillsPaginationService',
        error: this.state.error,
        page: this.state.currentPage + 1
      });
      
      throw error;
    }
  }

  /**
   * Load a specific page
   */
  async loadPage(page: number, searchParams: BillsSearchParams): Promise<PaginatedBillsResponse | null> {
    const cacheKey = this.generateCacheKey(page, searchParams);

    // Check if already loading this page
    if (this.loadingPromises.has(cacheKey)) {
      return await this.loadingPromises.get(cacheKey);
    }

    // Check cache first
    const cachedPage = this.pageCache.get(cacheKey);
    if (cachedPage && this.isCacheValid(cachedPage)) {
      logger.debug('Page loaded from cache', {
        component: 'BillsPaginationService',
        page,
        cacheAge: Date.now() - cachedPage.timestamp
      });

      return {
        bills: cachedPage.bills,
        pagination: {
          page,
          limit: this.config.pageSize,
          total: this.state.totalItems,
          totalPages: this.state.totalPages,
          hasNext: page < this.state.totalPages,
          hasPrevious: page > 1
        },
        stats: {
          totalBills: this.state.totalItems,
          urgentCount: 0,
          constitutionalFlags: 0,
          trendingCount: 0,
          lastUpdated: new Date().toISOString()
        }
      };
    }

    // Create loading promise
    const loadingPromise = this.fetchPageWithRetry(page, searchParams);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const response = await loadingPromise;
      
      if (response) {
        // Cache the page data
        this.pageCache.set(cacheKey, {
          page,
          bills: response.bills,
          timestamp: Date.now(),
          searchParams,
          fromCache: false
        });

        // Enforce cache limits
        this.enforceCacheLimits();
      }

      return response;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Fetch page with retry logic
   */
  private async fetchPageWithRetry(
    page: number, 
    searchParams: BillsSearchParams, 
    attempt = 1
  ): Promise<PaginatedBillsResponse | null> {
    try {
      const params = {
        ...searchParams,
        page,
        limit: this.config.pageSize
      };

      const response = await billsApiService.getBills(params);
      
      // The billsApiService.getBills() returns PaginatedBillsResponse directly
      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        
        logger.warn('Page load failed, retrying', {
          component: 'BillsPaginationService',
          page,
          attempt,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchPageWithRetry(page, searchParams, attempt + 1);
      }

      logger.error('Page load failed after all retries', {
        component: 'BillsPaginationService',
        page,
        attempts: attempt,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Start prefetching next pages
   */
  private startPrefetching(): void {
    if (this.state.isLoading || this.state.isLoadingMore) return;

    const currentPage = this.state.currentPage;
    const maxPage = Math.min(
      currentPage + this.config.prefetchPages,
      this.state.totalPages
    );

    // Queue pages for prefetching
    for (let page = currentPage + 1; page <= maxPage; page++) {
      const cacheKey = this.generateCacheKey(page, this.state.searchParams);
      
      if (!this.pageCache.has(cacheKey) && !this.loadingPromises.has(cacheKey)) {
        this.prefetchQueue.push(cacheKey);
      }
    }

    // Process prefetch queue
    this.processPrefetchQueue();
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) return;

    const cacheKey = this.prefetchQueue.shift()!;
    const { page, searchParams } = this.parseCacheKey(cacheKey);

    try {
      await this.loadPage(page, searchParams);
      
      logger.debug('Page prefetched successfully', {
        component: 'BillsPaginationService',
        page,
        remainingQueue: this.prefetchQueue.length
      });
    } catch (error) {
      logger.warn('Page prefetch failed', {
        component: 'BillsPaginationService',
        page,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Continue processing queue with a small delay
    if (this.prefetchQueue.length > 0) {
      setTimeout(() => this.processPrefetchQueue(), 100);
    }
  }

  /**
   * Handle infinite scroll trigger
   */
  handleInfiniteScroll = (threshold = 0.8): void => {
    if (this.loadingDebounceTimer) {
      clearTimeout(this.loadingDebounceTimer);
    }

    this.loadingDebounceTimer = setTimeout(() => {
      if (this.state.hasNextPage && !this.state.isLoadingMore) {
        this.loadNextPage().catch(error => {
          logger.error('Infinite scroll load failed', {
            component: 'BillsPaginationService',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }
    }, this.config.loadingDebounceMs);
  };

  /**
   * Calculate virtual scroll data for large datasets
   */
  calculateVirtualScrollData(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    bills: Bill[],
    overscan = 5
  ): VirtualScrollData {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = bills.slice(startIndex, endIndex + 1);

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight: totalItems * itemHeight,
      itemHeight,
      containerHeight
    };
  }

  /**
   * Reset pagination state
   */
  reset(): void {
    this.state = {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      pageSize: this.config.pageSize,
      hasNextPage: false,
      hasPreviousPage: false,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      searchParams: {},
      lastLoadTime: 0
    };

    this.clearPageCache();
    this.clearLoadingPromises();
    this.prefetchQueue = [];

    if (this.loadingDebounceTimer) {
      clearTimeout(this.loadingDebounceTimer);
      this.loadingDebounceTimer = null;
    }

    logger.info('Pagination state reset', {
      component: 'BillsPaginationService'
    });
  }

  /**
   * Get current pagination state
   */
  getState(): PaginationState {
    return { ...this.state };
  }

  /**
   * Get cached page data
   */
  getCachedPage(page: number, searchParams: BillsSearchParams): PageData | null {
    const cacheKey = this.generateCacheKey(page, searchParams);
    return this.pageCache.get(cacheKey) || null;
  }

  /**
   * Check if virtual scrolling should be enabled
   */
  shouldUseVirtualScrolling(): boolean {
    return this.state.totalItems > this.config.virtualScrollThreshold;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate cache key for page data
   */
  private generateCacheKey(page: number, searchParams: BillsSearchParams): string {
    const paramsKey = JSON.stringify({
      ...searchParams,
      // Sort arrays for consistent keys
      status: searchParams.status?.sort(),
      urgency: searchParams.urgency?.sort(),
      policyAreas: searchParams.policyAreas?.sort(),
      sponsors: searchParams.sponsors?.sort(),
      controversyLevels: searchParams.controversyLevels?.sort()
    });

    return `page:${page}:${btoa(paramsKey)}`;
  }

  /**
   * Parse cache key to extract page and search params
   */
  private parseCacheKey(cacheKey: string): { page: number; searchParams: BillsSearchParams } {
    const [, pageStr, paramsStr] = cacheKey.split(':');
    const page = parseInt(pageStr, 10);
    const searchParams = JSON.parse(atob(paramsStr));
    return { page, searchParams };
  }

  /**
   * Check if cached page data is still valid
   */
  private isCacheValid(pageData: PageData): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - pageData.timestamp < maxAge;
  }

  /**
   * Update state from API response
   */
  private updateStateFromResponse(response: PaginatedBillsResponse, page: number): void {
    this.state.currentPage = page;
    this.state.totalPages = response.pagination.totalPages;
    this.state.totalItems = response.pagination.total;
    this.state.hasNextPage = response.pagination.hasNext;
    this.state.hasPreviousPage = response.pagination.hasPrevious;
    this.state.lastLoadTime = Date.now();
  }

  /**
   * Clear page cache
   */
  private clearPageCache(): void {
    this.pageCache.clear();
    logger.debug('Page cache cleared', {
      component: 'BillsPaginationService'
    });
  }

  /**
   * Clear loading promises
   */
  private clearLoadingPromises(): void {
    this.loadingPromises.clear();
  }

  /**
   * Enforce cache size limits
   */
  private enforceCacheLimits(): void {
    if (this.pageCache.size <= this.config.maxCachedPages) return;

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.pageCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const toRemove = this.pageCache.size - this.config.maxCachedPages;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.pageCache.delete(key);
    }

    logger.debug('Page cache size limit enforced', {
      component: 'BillsPaginationService',
      removedPages: toRemove,
      remainingPages: this.pageCache.size
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearPageCache();
    this.clearLoadingPromises();
    this.prefetchQueue = [];

    if (this.loadingDebounceTimer) {
      clearTimeout(this.loadingDebounceTimer);
      this.loadingDebounceTimer = null;
    }

    // Clear retry timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    logger.info('Bills Pagination Service cleaned up', {
      component: 'BillsPaginationService'
    });
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const billsPaginationService = new BillsPaginationService();
