/**
 * Performance Utilities for Design System
 * Optimizations for CSS, animations, and rendering
 */

/**
 * CSS performance optimizations
 */
export const cssPerformance = {
  /**
   * Create GPU-accelerated transform
   */
  gpuAccelerate: (element: HTMLElement): void => {
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.willChange = 'transform';
  },

  /**
   * Remove GPU acceleration when not needed
   */
  removeGpuAcceleration: (element: HTMLElement): void => {
    element.style.transform = '';
    element.style.backfaceVisibility = '';
    element.style.willChange = 'auto';
  },

  /**
   * Optimize for layout stability
   */
  preventLayoutShift: (element: HTMLElement): void => {
    element.style.contain = 'layout style';
  },

  /**
   * Create efficient CSS transitions
   */
  createOptimizedTransition: (
    properties: string[],
    duration: string = '200ms',
    easing: string = 'ease-out'
  ): string => {
    // Only animate transform and opacity for best performance
    const optimizedProperties = properties.filter(prop => 
      ['transform', 'opacity', 'filter'].includes(prop)
    );
    
    return optimizedProperties
      .map(prop => `${prop} ${duration} ${easing}`)
      .join(', ');
  },
};

/**
 * Animation performance utilities
 */
export const animationPerformance = {
  /**
   * Check if animations should be reduced
   */
  shouldReduceMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Create performance-optimized keyframes
   */
  createOptimizedKeyframes: (name: string, keyframes: Record<string, Record<string, string>>): string => {
    const keyframeString = Object.entries(keyframes)
      .map(([percentage, styles]) => {
        const styleString = Object.entries(styles)
          .map(([prop, value]) => `${prop}: ${value}`)
          .join('; ');
        return `${percentage} { ${styleString} }`;
      })
      .join(' ');

    return `@keyframes ${name} { ${keyframeString} }`;
  },

  /**
   * Debounce animation triggers
   */
  debounceAnimation: (
    callback: () => void,
    delay: number = 16 // ~60fps
  ): (() => void) => {
    let timeoutId: number;
    
    return () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(callback, delay);
    };
  },

  /**
   * Use RAF for smooth animations
   */
  requestAnimationFrame: (callback: () => void): number => {
    return window.requestAnimationFrame(callback);
  },
};

/**
 * Rendering performance utilities
 */
export const renderingPerformance = {
  /**
   * Batch DOM updates
   */
  batchDOMUpdates: (updates: (() => void)[]): void => {
    // Use DocumentFragment for multiple DOM insertions
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.warn('DOM update failed:', error);
      }
    });
  },

  /**
   * Optimize image loading
   */
  optimizeImageLoading: (img: HTMLImageElement): void => {
    img.loading = 'lazy';
    img.decoding = 'async';
  },

  /**
   * Create intersection observer for lazy loading
   */
  createLazyLoader: (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver => {
    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };

    return new IntersectionObserver(callback, defaultOptions);
  },
};

/**
 * Memory management utilities
 */
export const memoryManagement = {
  /**
   * Clean up event listeners
   */
  cleanupEventListeners: (
    element: HTMLElement,
    listeners: Array<{ event: string; handler: EventListener }>
  ): void => {
    listeners.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });
  },

  /**
   * Weak reference storage for components
   */
  createWeakStorage: <T extends object>(): {
    set: (key: T, value: any) => void;
    get: (key: T) => any;
    has: (key: T) => boolean;
    delete: (key: T) => boolean;
  } => {
    const storage = new WeakMap();
    
    return {
      set: (key: T, value: any) => storage.set(key, value),
      get: (key: T) => storage.get(key),
      has: (key: T) => storage.has(key),
      delete: (key: T) => storage.delete(key),
    };
  },
};

/**
 * Bundle size optimization utilities
 */
export const bundleOptimization = {
  /**
   * Tree-shakeable design token imports
   */
  createSelectiveImport: <T extends Record<string, any>>(
    tokens: T,
    keys: (keyof T)[]
  ): Partial<T> => {
    const result: Partial<T> = {};
    keys.forEach(key => {
      if (key in tokens) {
        result[key] = tokens[key];
      }
    });
    return result;
  },

  /**
   * Lazy load design system modules
   */
  lazyLoadModule: async <T>(
    importFn: () => Promise<{ default: T } | T>
  ): Promise<T> => {
    try {
      const module = await importFn();
      return 'default' in module ? module.default : module;
    } catch (error) {
      console.error('Failed to lazy load module:', error);
      throw error;
    }
  },
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitoring = {
  /**
   * Measure component render time
   */
  measureRenderTime: (componentName: string, renderFn: () => void): number => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
    return duration;
  },

  /**
   * Monitor layout shifts
   */
  monitorLayoutShifts: (callback: (entries: LayoutShiftEntry[]) => void): PerformanceObserver => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LayoutShiftEntry[];
      callback(entries);
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    return observer;
  },

  /**
   * Track design system performance metrics
   */
  trackMetrics: (): {
    getCLS: () => number;
    getFCP: () => number;
    getLCP: () => number;
  } => {
    let cls = 0;
    let fcp = 0;
    let lcp = 0;

    // Track Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });

    // Track First Contentful Paint and Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
        }
        if (entry.entryType === 'largest-contentful-paint') {
          lcp = entry.startTime;
        }
      }
    }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

    return {
      getCLS: () => cls,
      getFCP: () => fcp,
      getLCP: () => lcp,
    };
  },
};