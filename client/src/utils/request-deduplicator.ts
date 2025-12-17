/**
 * Request Deduplication Utility
 * Prevents race conditions by deduplicating concurrent identical requests
 */

import { logger } from './logger';

export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestCounts = new Map<string, number>();

  /**
   * Deduplicate concurrent requests with the same key
   * If a request with the same key is already pending, return the existing promise
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      const count = this.requestCounts.get(key) || 0;
      this.requestCounts.set(key, count + 1);
      
      logger.debug('Request deduplicated', {
        component: 'RequestDeduplicator',
        key,
        duplicateCount: count + 1
      });
      
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    this.requestCounts.set(key, 1);
    const promise = requestFn()
      .then(result => {
        const totalCount = this.requestCounts.get(key) || 1;
        if (totalCount > 1) {
          logger.info('Deduplicated request completed', {
            component: 'RequestDeduplicator',
            key,
            totalRequests: totalCount,
            savedRequests: totalCount - 1
          });
        }
        return result;
      })
      .catch(error => {
        logger.error('Deduplicated request failed', {
          component: 'RequestDeduplicator',
          key,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      })
      .finally(() => {
        // Clean up when request completes
        this.pendingRequests.delete(key);
        this.requestCounts.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clear() {
    this.pendingRequests.clear();
    this.requestCounts.clear();
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get pending request keys (for debugging)
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Check if a specific request is pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Cancel a specific pending request
   */
  cancel(key: string): boolean {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
      this.requestCounts.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Get statistics about request deduplication
   */
  getStats(): {
    pendingRequests: number;
    totalSavedRequests: number;
    activeKeys: string[];
  } {
    const totalSaved = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + Math.max(0, count - 1), 0);

    return {
      pendingRequests: this.pendingRequests.size,
      totalSavedRequests: totalSaved,
      activeKeys: Array.from(this.pendingRequests.keys())
    };
  }
}

// Create singleton instances for common use cases
export const tokenRefreshDeduplicator = new RequestDeduplicator();
export const apiRequestDeduplicator = new RequestDeduplicator();

// Helper function to create request keys
export const createRequestKey = (method: string, url: string, params?: Record<string, any>): string => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramString}`;
};

// Helper function for API request deduplication
export const deduplicateApiRequest = async <T>(
  method: string,
  url: string,
  requestFn: () => Promise<T>,
  params?: Record<string, any>
): Promise<T> => {
  const key = createRequestKey(method, url, params);
  return apiRequestDeduplicator.deduplicate(key, requestFn);
};