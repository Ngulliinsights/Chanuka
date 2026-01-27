import { AlertCircle, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
// Remove unused import

/**
 * Script fallback props
 */
export interface ScriptFallbackProps {
  src: string;
  fallbackSrc?: string;
  retryAttempts?: number;
  timeout?: number;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

/**
 * Script fallback component with retry logic
 */
export const ScriptFallback = React.memo<ScriptFallbackProps>(
  ({
    src,
    fallbackSrc,
    retryAttempts = 2,
    timeout = 10000,
    async = true,
    defer = false,
    crossOrigin,
    integrity,
    onLoad,
    onError,
    children,
    loadingComponent,
    errorComponent,
  }) => {
    const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'fallback'>(
      'loading'
    );
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState<Error | null>(null);

    const loadScript = useCallback(
      (scriptSrc: string, _isFallback = false): Promise<void> => {
        return new Promise((resolve, reject) => {
          // Check if script already exists
          const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
          if (existingScript) {
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = scriptSrc;
          script.async = async;
          script.defer = defer;

          if (crossOrigin) {
            script.crossOrigin = crossOrigin;
          }

          if (integrity) {
            script.integrity = integrity;
          }

          const timeoutId = setTimeout(() => {
            script.remove();
            reject(new Error(`Script loading timeout: ${scriptSrc}`));
          }, timeout);

          const cleanup = () => {
            clearTimeout(timeoutId);
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
          };

          const handleLoad = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            script.remove();
            reject(new Error(`Failed to load script: ${scriptSrc}`));
          };

          script.addEventListener('load', handleLoad);
          script.addEventListener('error', handleError);

          document.head.appendChild(script);
        });
      },
      [async, defer, crossOrigin, integrity, timeout]
    );

    const attemptLoad = useCallback(
      async (scriptSrc: string, attempt: number) => {
        try {
          await loadScript(scriptSrc, attempt > 0);
          setLoadState('loaded');
          onLoad?.();
        } catch (err) {
          const error = err as Error;
          setError(error);

          // Try fallback if available and this is the first attempt
          if (fallbackSrc && attempt === 0) {
            setLoadState('fallback');
            try {
              await loadScript(fallbackSrc);
              setLoadState('loaded');
              onLoad?.();
            } catch (fallbackError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Script fallback failed:', fallbackError);
              }
            }
          }

          // Retry if attempts remaining
          if (attempt < retryAttempts) {
            setRetryCount(attempt + 1);
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);

            setTimeout(() => {
              attemptLoad(scriptSrc, attempt + 1);
            }, delay);
          } else {
            // Final failure
            setLoadState('error');
            onError?.(error);
          }
        }
      },
      [loadScript, fallbackSrc, retryAttempts, onLoad, onError]
    );

    useEffect(() => {
      attemptLoad(src, 0);
    }, [src, attemptLoad]);

    // Loading state
    if (loadState === 'loading' || loadState === 'fallback') {
      return children ? (
        <div className="relative">
          {children}
          {loadingComponent}
        </div>
      ) : (
        loadingComponent || (
          <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Loading script...
              {loadState === 'fallback' && ' (using fallback)'}
              {retryCount > 0 && ` (attempt ${retryCount + 1})`}
            </span>
          </div>
        )
      );
    }

    // Error state
    if (loadState === 'error') {
      return children ? (
        <div className="relative">
          {children}
          {errorComponent}
        </div>
      ) : (
        errorComponent || (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="flex-1">
              <span className="text-sm text-red-700 dark:text-red-300">Failed to load script</span>
              {error && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">{error.message}</div>
              )}
            </div>
          </div>
        )
      );
    }

    // Success state
    return <>{children}</>;
  }
);

ScriptFallback.displayName = 'ScriptFallback';

/**
 * Hook for script loading with fallback
 */
export function useScriptFallback(
  src: string,
  options: {
    fallbackSrc?: string;
    retryAttempts?: number;
    timeout?: number;
    async?: boolean;
    defer?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials';
    integrity?: string;
  } = {}
) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadScript = (scriptSrc: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = options.async ?? true;
        script.defer = options.defer ?? false;

        if (options.crossOrigin) {
          script.crossOrigin = options.crossOrigin;
        }

        if (options.integrity) {
          script.integrity = options.integrity;
        }

        const timeoutId = setTimeout(() => {
          script.remove();
          reject(new Error(`Script loading timeout: ${scriptSrc}`));
        }, options.timeout || 10000);

        const cleanup = () => {
          clearTimeout(timeoutId);
          script.removeEventListener('load', handleLoad);
          script.removeEventListener('error', handleError);
        };

        const handleLoad = () => {
          cleanup();
          resolve();
        };

        const handleError = () => {
          cleanup();
          script.remove();
          reject(new Error(`Failed to load script: ${scriptSrc}`));
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        document.head.appendChild(script);
      });
    };

    const attemptLoad = async (scriptSrc: string, attempt: number) => {
      try {
        await loadScript(scriptSrc);
        if (mounted) {
          setState('loaded');
        }
      } catch (err) {
        const error = err as Error;
        setError(error);

        if (options.fallbackSrc && attempt === 0) {
          if (mounted) {
            setState('fallback');
          }
          try {
            await loadScript(options.fallbackSrc);
            if (mounted) {
              setState('loaded');
            }
          } catch (fallbackError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Script retry fallback failed:', fallbackError);
            }
          }
        }

        if (attempt < (options.retryAttempts || 2)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setTimeout(() => {
            attemptLoad(scriptSrc, attempt + 1);
          }, delay);
        } else {
          if (mounted) {
            setState('error');
          }
        }
      }
    };

    attemptLoad(src, 0);

    return () => {
      mounted = false;
    };
  }, [
    src,
    options.fallbackSrc,
    options.retryAttempts,
    options.timeout,
    options.async,
    options.defer,
    options.crossOrigin,
    options.integrity,
  ]);

  return { state, error };
}

export default ScriptFallback;
