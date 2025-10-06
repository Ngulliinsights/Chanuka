/**
 * Mobile Performance Optimizations
 * Components and utilities for optimizing mobile performance
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  Suspense,
  lazy,
  memo
} from 'react';
import { useResponsiveLayoutContext } from './responsive-layout-manager';

// Intersection Observer hook for lazy loading
function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Lazy loading wrapper component
interface LazyLoadWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
  placeholder?: React.ReactNode;
  once?: boolean;
}

export const LazyLoadWrapper = memo(function LazyLoadWrapper({
  children,
  height = 200,
  className = '',
  placeholder,
  once = true
}: LazyLoadWrapperProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { isIntersecting, hasIntersected } = useIntersectionObserver(elementRef);

  const shouldRender = once ? hasIntersected : isIntersecting;

  const defaultPlaceholder = (
    <div 
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={{ height: `${height}px` }}
    />
  );

  return (
    <div ref={elementRef} className={className}>
      {shouldRender ? children : (placeholder || defaultPlaceholder)}
    </div>
  );
});

// Virtual scrolling component for large lists
interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetY: i * itemHeight
      });
    }
    return result;
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, offsetY }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Image optimization component with lazy loading and WebP support
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  placeholder?: string;
  lazy?: boolean;
  webpSupport?: boolean;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  placeholder,
  lazy = true,
  webpSupport = true,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imageRef = useRef<HTMLImageElement>(null);
  const { isIntersecting, hasIntersected } = useIntersectionObserver(imageRef);

  const shouldLoad = lazy ? hasIntersected : true;

  // Generate optimized image URL
  const generateImageUrl = useCallback((originalSrc: string) => {
    // This would typically integrate with an image optimization service
    // For now, we'll just return the original src
    let url = originalSrc;
    
    // Add query parameters for optimization if supported by your image service
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (quality !== 80) params.append('q', quality.toString());
    
    if (params.toString()) {
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }
    
    return url;
  }, [width, height, quality]);

  // Check WebP support
  const checkWebPSupport = useCallback(() => {
    if (!webpSupport) return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, [webpSupport]);

  useEffect(() => {
    if (shouldLoad && !imageSrc) {
      let optimizedSrc = generateImageUrl(src);
      
      // Try WebP version if supported
      if (checkWebPSupport() && !src.endsWith('.webp')) {
        const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        optimizedSrc = generateImageUrl(webpSrc);
      }
      
      setImageSrc(optimizedSrc);
    }
  }, [shouldLoad, src, imageSrc, generateImageUrl, checkWebPSupport]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    // Fallback to original image if WebP fails
    if (imageSrc.endsWith('.webp')) {
      setImageSrc(generateImageUrl(src));
      setHasError(false);
    }
  }, [imageSrc, src, generateImageUrl]);

  if (hasError && !imageSrc.endsWith('.webp')) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={imageRef}>
      {/* Placeholder */}
      {!isLoaded && placeholder && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      
      {/* Actual image */}
      {shouldLoad && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          loading={lazy ? 'lazy' : 'eager'}
          {...props}
        />
      )}
    </div>
  );
});

// Performance monitoring hook
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  fps: number;
  loadTime: number;
}

export function usePerformanceMonitoring(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    fps: 0,
    loadTime: 0
  });
  
  const renderStartTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  // Measure render time
  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  }, []);

  // Measure FPS
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCount.current++;
    
    if (now - lastFrameTime.current >= 1000) {
      const fps = frameCount.current;
      frameCount.current = 0;
      lastFrameTime.current = now;
      setMetrics(prev => ({ ...prev, fps }));
    }
    
    requestAnimationFrame(measureFPS);
  }, []);

  // Measure memory usage (if available)
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  useEffect(() => {
    const loadTime = performance.now();
    setMetrics(prev => ({ ...prev, loadTime }));
    
    // Start FPS monitoring
    requestAnimationFrame(measureFPS);
    
    // Memory monitoring interval
    const memoryInterval = setInterval(measureMemory, 5000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, [measureFPS, measureMemory]);

  // Log performance metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, metrics);
    }
  }, [componentName, metrics]);

  return { metrics, startRender, endRender };
}

// Debounced input component for better performance
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput = memo(function DebouncedInput({
  onChange,
  debounceMs = 300,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(props.value || '');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(value as string);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onChange, debounceMs]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
});

// Memoized list component
interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
}

export function MemoizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = ''
}: MemoizedListProps<T>) {
  const MemoizedItem = memo(({ item, index }: { item: T; index: number }) => (
    <>{renderItem(item, index)}</>
  ));

  return (
    <div className={className}>
      {items.map((item, index) => (
        <MemoizedItem
          key={keyExtractor(item, index)}
          item={item}
          index={index}
        />
      ))}
    </div>
  );
}

// Bundle splitting utility
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <div className="animate-pulse bg-gray-200 h-32 rounded" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export default {
  LazyLoadWrapper,
  VirtualScroll,
  OptimizedImage,
  usePerformanceMonitoring,
  DebouncedInput,
  MemoizedList,
  createLazyComponent
};