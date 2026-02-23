/**
 * Bills Pagination Service - Feature-Specific Pagination
 *
 * Migrated from client/src/services/billsPaginationService.ts
 * Advanced pagination service with infinite scroll, virtual scrolling support,
 * intelligent prefetching, and optimized memory management for large datasets.
 */

import { billsApiService, BillsSearchParams, PaginatedBillsResponse } from '@client/infrastructure/api/bills';
import type { Bill } from '@client/lib/types';
import { logger } from '@client/lib/utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaginationConfig {
  pageSize: number;
  prefetchPages: number;
  maxCachedPages: number;
  virtualScrollThreshold: number;
  loadingDebounceMs: number;
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

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = {
      pageSize: 12,
      prefetchPages: 2,
      maxCachedPages: 10,
      virtualScrollThreshold: 100,
      loadingDebounceMs: 300,
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config,
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
      lastLoadTime: 0,
    };

    logger.info('Bills Pagination Service initialized', {
      component: 'BillsPaginationService',
      config: this.config,
    });
  }

  /**
   * Load the first page of bills with search parameters
   */
  async loadFirstPage(
    searchParams: BillsSearchParams = {}
  ): Promise<PaginatedBillsResponse | null> {
    try {
      this.state.isLoading = true;
      this.state.error = null;
      this.state.searchParams = searchParams;
      this.state.currentPage = 1;

      this.clearPageCache();

      const response = await this.loadPage(1, searchParams);

      if (response) {
        this.updateStateFromResponse(response, 1);
        this.startPrefetching();

        logger.info('First page loaded successfully', {
          component: 'BillsPaginationService',
          totalItems: response.pagination.total,
          totalPages: response.pagination.totalPages,
          searchParams,
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
        searchParams,
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

      if (response && response.data.length > 0) {
        this.state.currentPage = nextPage;
        this.updateStateFromResponse(response, nextPage);
        this.startPrefetching();

        logger.info('Next page loaded successfully', {
          component: 'BillsPaginationService',
          page: nextPage,
          billsCount: response.data.length,
        });

        return response.data;
      }

      this.state.isLoadingMore = false;
      return null;
    } catch (error) {
      this.state.isLoadingMore = false;
      this.state.error = error instanceof Error ? error.message : 'Failed to load next page';

      logger.error('Failed to load next page', {
        component: 'BillsPaginationService',
        error: this.state.error,
        page: this.state.currentPage + 1,
      });

      throw error;
    }
  }

  /**
   * Load a specific page
   */
  async loadPage(
    page: number,
    searchParams: BillsSearchParams
  ): Promise<PaginatedBillsResponse | null> {
    const cacheKey = this.generateCacheKey(page, searchParams);

    if (this.loadingPromises.has(cacheKey)) {
      return await this.loadingPromises.get(cacheKey);
    }

    const cachedPage = this.pageCache.get(cacheKey);
    if (cachedPage && this.isCacheValid(cachedPage)) {
      logger.debug('Page loaded from cache', {
        component: 'BillsPaginationService',
        page,
        cacheAge: Date.now() - cachedPage.timestamp,
      });

      return {
        data: cachedPage.bills,
        pagination: {
          page,
          limit: this.config.pageSize,
          total: this.state.totalItems,
          totalPages: this.state.totalPages,
        },
        generatedAt: new Date().toISOString(),
      };
    }

    const loadingPromise = this.fetchPageWithRetry(page, searchParams);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const response = await loadingPromise;

      if (response) {
        this.pageCache.set(cacheKey, {
          page,
          bills: response.data,
          timestamp: Date.now(),
          searchParams,
          fromCache: false,
        });

        this.enforceCacheLimits();
      }

      return response;
    } finally {
      this.loadingPromises.delete(cacheKey);
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
            error: error instanceof Error ? error.message : 'Unknown error',
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
      containerHeight,
    };
  }

  /**
   * Get current pagination state
   */
  getState(): PaginationState {
    return { ...this.state };
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

  private async fetchPageWithRetry(
    page: number,
    searchParams: BillsSearchParams,
    attempt = 1
  ): Promise<PaginatedBillsResponse | null> {
    try {
      const params = {
        ...searchParams,
        page,
        limit: this.config.pageSize,
      };

      const response = await billsApiService.getBills(params);
      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);

        logger.warn('Page load failed, retrying', {
          component: 'BillsPaginationService',
          page,
          attempt,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchPageWithRetry(page, searchParams, attempt + 1);
      }

      logger.error('Page load failed after all retries', {
        component: 'BillsPaginationService',
        page,
        attempts: attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private startPrefetching(): void {
    if (this.state.isLoading || this.state.isLoadingMore) return;

    const currentPage = this.state.currentPage;
    const maxPage = Math.min(currentPage + this.config.prefetchPages, this.state.totalPages);

    for (let page = currentPage + 1; page <= maxPage; page++) {
      const cacheKey = this.generateCacheKey(page, this.state.searchParams);

      if (!this.pageCache.has(cacheKey) && !this.loadingPromises.has(cacheKey)) {
        this.prefetchQueue.push(cacheKey);
      }
    }

    this.processPrefetchQueue();
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) return;

    const cacheKey = this.prefetchQueue.shift()!;
    const { page, searchParams } = this.parseCacheKey(cacheKey);

    try {
      await this.loadPage(page, searchParams);

      logger.debug('Page prefetched successfully', {
        component: 'BillsPaginationService',
        page,
        remainingQueue: this.prefetchQueue.length,
      });
    } catch (error) {
      logger.warn('Page prefetch failed', {
        component: 'BillsPaginationService',
        page,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (this.prefetchQueue.length > 0) {
      setTimeout(() => this.processPrefetchQueue(), 100);
    }
  }

  private generateCacheKey(page: number, searchParams: BillsSearchParams): string {
    const paramsKey = JSON.stringify({
      ...searchParams,
      status: searchParams.status?.sort(),
      urgency: searchParams.urgency?.sort(),
      sponsors: searchParams.sponsors?.sort(),
    });

    return `page:${page}:${btoa(paramsKey)}`;
  }

  private parseCacheKey(cacheKey: string): { page: number; searchParams: BillsSearchParams } {
    const [, pageStr, paramsStr] = cacheKey.split(':');
    const page = parseInt(pageStr, 10);
    const searchParams = JSON.parse(atob(paramsStr));
    return { page, searchParams };
  }

  private isCacheValid(pageData: PageData): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - pageData.timestamp < maxAge;
  }

  private updateStateFromResponse(response: PaginatedBillsResponse, page: number): void {
    this.state.currentPage = page;
    this.state.totalPages = response.pagination.totalPages;
    this.state.totalItems = response.pagination.total;
    this.state.hasNextPage = page < response.pagination.totalPages;
    this.state.hasPreviousPage = page > 1;
    this.state.lastLoadTime = Date.now();
  }

  private clearPageCache(): void {
    this.pageCache.clear();
    logger.debug('Page cache cleared', {
      component: 'BillsPaginationService',
    });
  }

  private enforceCacheLimits(): void {
    if (this.pageCache.size <= this.config.maxCachedPages) return;

    const entries = Array.from(this.pageCache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    const toRemove = this.pageCache.size - this.config.maxCachedPages;
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.pageCache.delete(key);
    }

    logger.debug('Page cache size limit enforced', {
      component: 'BillsPaginationService',
      removedPages: toRemove,
      remainingPages: this.pageCache.size,
    });
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
      lastLoadTime: 0,
    };

    this.clearPageCache();
    this.loadingPromises.clear();
    this.prefetchQueue = [];

    if (this.loadingDebounceTimer) {
      clearTimeout(this.loadingDebounceTimer);
      this.loadingDebounceTimer = null;
    }

    logger.info('Pagination state reset', {
      component: 'BillsPaginationService',
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearPageCache();
    this.loadingPromises.clear();
    this.prefetchQueue = [];

    if (this.loadingDebounceTimer) {
      clearTimeout(this.loadingDebounceTimer);
      this.loadingDebounceTimer = null;
    }

    logger.info('Bills Pagination Service cleaned up', {
      component: 'BillsPaginationService',
    });
  }
}

// Export singleton instance
export const billsPagination = new BillsPaginationService();

export default billsPagination;
