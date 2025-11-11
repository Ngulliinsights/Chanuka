/**
 * Infinite Scroll Component
 * 
 * Provides infinite scrolling functionality with loading states and error handling.
 * Optimized for mobile performance with intersection observer and virtual scrolling support.
 * 
 * Features:
 * - Intersection Observer for efficient scroll detection
 * - Loading states and error handling
 * - Customizable loading threshold and buffer
 * - Accessibility support with screen reader announcements
 * - Performance optimizations for large lists
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface InfiniteScrollProps<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error?: string | null;
  onLoadMore: () => Promise<void> | void;
  onRetry?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  className?: string;
  loadingThreshold?: number; // Distance from bottom to trigger load (in pixels)
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  endComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  containerTag?: keyof JSX.IntrinsicElements;
  itemTag?: keyof JSX.IntrinsicElements;
}

export function InfiniteScroll<T>({
  items,
  hasMore,
  isLoading,
  error,
  onLoadMore,
  onRetry,
  renderItem,
  getItemKey,
  className,
  loadingThreshold = 200,
  loadingComponent,
  errorComponent,
  endComponent,
  emptyComponent,
  containerTag: Container = 'div',
  itemTag: ItemContainer = 'div',
}: InfiniteScrollProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const loadingRef = useRef(false);

  // Handle loading more items
  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || isLoading || error) return;

    loadingRef.current = true;
    try {
      await onLoadMore();
    } catch (err) {
      console.error('Failed to load more items:', err);
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, isLoading, error, onLoadMore]);

  // Set up intersection observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting && hasMore && !isLoading && !error) {
          handleLoadMore();
        }
      },
      {
        rootMargin: `${loadingThreshold}px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasMore, isLoading, error, loadingThreshold, handleLoadMore]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      handleLoadMore();
    }
  }, [onRetry, handleLoadMore]);

  // Default loading component
  const defaultLoadingComponent = (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading more items...</span>
      </div>
    </div>
  );

  // Default error component
  const defaultErrorComponent = (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="flex items-center gap-2 text-destructive mb-4">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load more items</span>
      </div>
      {error && (
        <p className="text-sm text-muted-foreground mb-4 text-center">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );

  // Default end component
  const defaultEndComponent = (
    <div className="flex items-center justify-center py-8">
      <div className="text-sm text-muted-foreground">
        No more items to load
      </div>
    </div>
  );

  // Default empty component
  const defaultEmptyComponent = (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-muted-foreground mb-2">No items found</div>
        <div className="text-sm text-muted-foreground">
          Try adjusting your filters or search terms
        </div>
      </div>
    </div>
  );

  // Show empty state if no items
  if (items.length === 0 && !isLoading && !error) {
    return (
      <Container className={cn('w-full', className)}>
        {emptyComponent || defaultEmptyComponent}
      </Container>
    );
  }

  return (
    <Container className={cn('w-full', className)}>
      {/* Items */}
      {items.map((item, index) => (
        <ItemContainer key={getItemKey(item, index)}>
          {renderItem(item, index)}
        </ItemContainer>
      ))}

      {/* Loading/Error/End States */}
      <div
        ref={sentinelRef}
        className="w-full"
        role="status"
        aria-live="polite"
        aria-label={
          isLoading 
            ? 'Loading more items' 
            : error 
            ? 'Error loading items' 
            : !hasMore 
            ? 'All items loaded' 
            : 'Ready to load more items'
        }
      >
        {error ? (
          errorComponent || defaultErrorComponent
        ) : isLoading ? (
          loadingComponent || defaultLoadingComponent
        ) : !hasMore ? (
          endComponent || defaultEndComponent
        ) : null}
      </div>
    </Container>
  );
}

/**
 * Hook for managing infinite scroll state
 */
export function useInfiniteScroll<T>() {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const loadMore = useCallback(async (
    loadFn: (page: number) => Promise<{ items: T[]; hasMore: boolean }>
  ) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadFn(page);
      
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, page]);

  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setIsLoading(false);
    setError(null);
    setPage(0);
  }, []);

  const retry = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    hasMore,
    isLoading,
    error,
    page,
    loadMore,
    reset,
    retry,
  };
}