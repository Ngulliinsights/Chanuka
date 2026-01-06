/**
 * Request Deduplication Utility - Shared Infrastructure
 *
 * Prevents race conditions by deduplicating concurrent identical requests
 */

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

      console.debug('Request deduplicated', {
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
          console.info('Deduplicated request completed', {
            key,
            totalRequests: totalCount,
            savedRequests: totalCount - 1
          });
        }
        return result;
      })
      .catch(error => {
        console.error('Deduplicated request failed', {
          key,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      })
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
        this.requestCounts.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clear(): void {
    this.pendingRequests.clear();
    this.requestCounts.clear();
  }

  /**
   * Get statistics about current deduplication state
   */
  getStats(): {
    pendingRequests: number;
    totalDuplicates: number;
  } {
    const totalDuplicates = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + Math.max(0, count - 1), 0);

    return {
      pendingRequests: this.pendingRequests.size,
      totalDuplicates
    };
  }

  /**
   * Check if a request is currently pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();
