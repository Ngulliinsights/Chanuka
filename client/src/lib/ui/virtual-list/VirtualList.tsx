/**
 * VirtualList Component
 * 
 * Implements virtual scrolling for efficient rendering of large lists.
 * Only renders visible items plus overscan for smooth scrolling.
 * 
 * Feature: comprehensive-bug-fixes
 * Requirements: 12.1, 12.2
 */

import React, { useState, useRef, useEffect, CSSProperties } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

/**
 * VirtualList component that renders only visible items for performance
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  onScroll,
}: VirtualListProps<T>): JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  // Reset scroll position when items change significantly
  useEffect(() => {
    if (containerRef.current && scrollTop > totalHeight) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length, totalHeight, scrollTop]);

  const containerStyle: CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
  };

  const innerStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const contentStyle: CSSProperties = {
    transform: `translateY(${offsetY}px)`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
      data-testid="virtual-list-container"
    >
      <div style={innerStyle} data-testid="virtual-list-inner">
        <div style={contentStyle} data-testid="virtual-list-content">
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={actualIndex}
                style={{ height: itemHeight }}
                data-index={actualIndex}
                data-testid={`virtual-list-item-${actualIndex}`}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing virtual list state
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  return {
    scrollTop,
    setScrollTop,
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight,
  };
}

/**
 * VirtualList with dynamic item heights (more complex, for future use)
 */
export interface DynamicVirtualListProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function DynamicVirtualList<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  getItemKey,
}: DynamicVirtualListProps<T>): JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate cumulative heights
  const cumulativeHeights = React.useMemo(() => {
    const heights: number[] = [0];
    for (let i = 0; i < items.length; i++) {
      const height = itemHeights.get(i) || estimatedItemHeight;
      heights.push(heights[i] + height);
    }
    return heights;
  }, [items.length, itemHeights, estimatedItemHeight]);

  const totalHeight = cumulativeHeights[cumulativeHeights.length - 1];

  // Find visible range using binary search
  const findIndexAtPosition = (position: number): number => {
    let left = 0;
    let right = cumulativeHeights.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (cumulativeHeights[mid] < position) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return Math.max(0, left - 1);
  };

  const startIndex = Math.max(0, findIndexAtPosition(scrollTop) - overscan);
  const endIndex = Math.min(
    items.length,
    findIndexAtPosition(scrollTop + containerHeight) + overscan + 1
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = cumulativeHeights[startIndex];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Measure item heights after render
  useEffect(() => {
    const newHeights = new Map(itemHeights);
    let hasChanges = false;

    itemRefs.current.forEach((element, index) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        if (itemHeights.get(index) !== height) {
          newHeights.set(index, height);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setItemHeights(newHeights);
    }
  }, [visibleItems, itemHeights]);

  const containerStyle: CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
  };

  const innerStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const contentStyle: CSSProperties = {
    transform: `translateY(${offsetY}px)`,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
      data-testid="dynamic-virtual-list-container"
    >
      <div style={innerStyle}>
        <div style={contentStyle}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const key = getItemKey ? getItemKey(item, actualIndex) : actualIndex;
            
            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(actualIndex, el);
                  } else {
                    itemRefs.current.delete(actualIndex);
                  }
                }}
                data-index={actualIndex}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
