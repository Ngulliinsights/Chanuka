/**
 * useInfiniteScroll Hook
 *
 * Manages infinite scroll pagination state.
 * Extracted from InfiniteScroll component.
 *
 * @hook
 * @example
 * ```tsx
 * import { useInfiniteScroll } from '@client/lib/hooks/mobile';
 *
 * export function MyFeed() {
 *   const { isLoading, hasMore, onLoadMore } = useInfiniteScroll({
 *     onLoadMore: async () => {
 *       const newData = await fetchMoreData();
 *       // Update your data state
 *       // Return true if more data available, false otherwise
 *       return newData.length > 0;
 *     },
 *     hasMore: true,
 *   });
 *
 *   return (
 *     <InfiniteScroll onLoadMore={onLoadMore} hasMore={hasMore} isLoading={isLoading}>
 *       <div>Items</div>
 *     </InfiniteScroll>
 *   );
 * }
 * ```
 */

import { useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore?: () => Promise<boolean>;
  initialHasMore?: boolean;
}

interface UseInfiniteScrollReturn {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing infinite scroll pagination.
 *
 * @param options - Configuration options
 * @returns Object with pagination state and handlers
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const { onLoadMore: loadMore, initialHasMore = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const onLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || !loadMore) return;

    setIsLoading(true);
    try {
      const hasMoreData = await loadMore();
      setHasMore(hasMoreData);
    } catch (error) {
      console.error('Error loading more data:', error);
      // Keep hasMore as is on error, or set to false depending on requirements
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, loadMore]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setHasMore(initialHasMore);
  }, [initialHasMore]);

  return {
    isLoading,
    hasMore,
    onLoadMore,
    reset,
  };
}
