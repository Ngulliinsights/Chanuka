import { lazy, LazyExoticComponent, ComponentType, useRef, useEffect } from 'react';

/**
 * Safe lazy loading utilities with error handling and retry logic
 */

// Component loading state tracking
const componentLoadingState = new Map<string, 'loading' | 'loaded' | 'error'>();

/**
 * Creates a safe lazy component with retry logic
 */
export function createSafeLazy<P extends Record<string, never> = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const { maxRetries = 3, initialDelay = 1000, backoffFactor = 2 } = options;

  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(backoffFactor, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  });
}

/**
 * Creates a batch of lazy components
 */
export function createLazyComponentBatch<T extends Record<string, string>>(
  componentPaths: T,
  options: {
    enableRetry?: boolean;
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
  } = {}
): Record<keyof T, LazyExoticComponent<ComponentType<Record<string, never>>>> {
  const { enableRetry = false, ...retryOptions } = options;

  return Object.entries(componentPaths).reduce(
    (batch, [componentName, importPath]) => {
      const importFn = () => import(/* @vite-ignore */ importPath);
      
      batch[componentName as keyof T] = enableRetry
        ? createSafeLazy(importFn, retryOptions)
        : lazy(importFn);
      
      return batch;
    },
    {} as Record<keyof T, LazyExoticComponent<ComponentType<Record<string, never>>>>
  );
}

/**
 * Preloads a lazy component
 */
export function preloadLazyComponent<P extends object>(
  lazyComponent: LazyExoticComponent<ComponentType<P>>
): Promise<{ default: ComponentType<P> }> {
  try {
    // Check if component has preload method
    if (typeof (lazyComponent as { preload?: () => Promise<unknown> }).preload === 'function') {
      return (lazyComponent as { preload?: () => Promise<unknown> }).preload!() as Promise<{
        default: ComponentType<P>;
      }>;
    }

    // Fallback: try to access internal payload
    const payload = (lazyComponent as { _payload?: unknown })._payload;
    
    if (payload && typeof (payload as { _result?: unknown })._result === 'undefined') {
      return (payload as { _init: (p: unknown) => Promise<unknown> })._init(payload) as Promise<{
        default: ComponentType<P>;
      }>;
    }

    // Last resort: return the component as-is
    return Promise.resolve({ default: lazyComponent as unknown as ComponentType<P> });
  } catch (error) {
    return Promise.reject(new Error('Failed to preload component: ' + (error as Error).message));
  }
}

/**
 * Hook for preloading components based on conditions
 */
export function usePreloadComponents(
  components: LazyExoticComponent<ComponentType<Record<string, never>>>[],
  preloadCondition: boolean
): void {
  const hasPreloadedRef = useRef(false);
  const isMountedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create stable component identifiers
  const componentIds = components
    .map(c => (c as unknown as { $$typeof?: symbol }).$$typeof?.toString() || Math.random())
    .join(',');

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Don't preload if condition not met or already preloaded
    if (!preloadCondition || hasPreloadedRef.current || typeof window === 'undefined') {
      return;
    }

    // Check if components have changed
    const currentIds = components
      .map(c => (c as unknown as { $$typeof?: symbol }).$$typeof?.toString() || Math.random())
      .join(',');
    
    if (currentIds !== componentIds) {
      return;
    }

    // Create abort controller for cleanup
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    hasPreloadedRef.current = true;

    // Preload with delay to avoid blocking main thread
    const timeoutId = setTimeout(() => {
      if (signal.aborted || !isMountedRef.current) return;

      components.forEach(component => {
        if (signal.aborted || !isMountedRef.current) return;
        
        preloadLazyComponent(component).catch(error => {
          if (process.env.NODE_ENV === 'development' && !signal.aborted) {
            console.warn('Failed to preload component:', error);
          }
        });
      });
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [preloadCondition, componentIds]); // Use componentIds instead of components array
}

/**
 * Clears all component loading caches
 */
export function clearLazyLoadingCache(): void {
  componentLoadingState.clear();
  
  // Clear any global caches if available
  if (process.env.NODE_ENV === 'development') {
    console.log('All lazy loading caches cleared');
  }
}