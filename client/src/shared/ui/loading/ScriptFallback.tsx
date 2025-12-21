import { AlertCircle, FileText, RefreshCw } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';

import { cn } from '@client/lib/utils';

export interface ScriptFallbackProps {
  src: string;
  fallbackSrc?: string;
  children?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  timeout?: number;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  className?: string;
}

/**
 * ScriptFallback component provides graceful script loading with fallbacks
 * and error recovery mechanisms.
 */
export const ScriptFallback = React.memo(<ScriptFallbackProps> = ({
  src,
  fallbackSrc,
  children,
  onLoad,
  onError,
  retryAttempts = 2,
  timeout = 10000,
  async = true,
  defer = false,
  crossOrigin,
  integrity,
  className,
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const loadScript = useCallback((
    scriptSrc: string,
    _isRetry = false
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
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

      // Set up timeout
      const timeoutId = setTimeout(() => {
        script.remove();
        reject(new Error(`Script load timeout: ${scriptSrc}`));
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
  }, [async, defer, crossOrigin, integrity, timeout]);

  const attemptLoad = useCallback(async (scriptSrc: string, attempt: number) => {
    try {
      await loadScript(scriptSrc, attempt > 0);
      setLoadState('loaded');
      onLoad?.();
    } catch (err) {
      const error = err as Error;

      // Try fallback if available and not already using it
      if (fallbackSrc && scriptSrc !== fallbackSrc && attempt === 0) {
        setLoadState('fallback');
        try {
          await loadScript(fallbackSrc, true);
          setLoadState('loaded');
          onLoad?.();
          return;
        } catch (fallbackError) {
          // Fallback also failed - log for debugging
          if (process.env.NODE_ENV === 'development') {
            console.warn('Script fallback failed:', fallbackError);
          }
          onError?.(fallbackError as Error);
        }
      }

      // Try retry if attempts remaining
      if (attempt < retryAttempts) {
        setRetryCount(attempt + 1);
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        setTimeout(() => {
          attemptLoad(scriptSrc, attempt + 1);
        }, delay);
        return;
      }

      // All attempts failed
      setLoadState('error');
      setError(error);
      onError?.(error);
    }
  }, [loadScript, fallbackSrc, retryAttempts, onLoad, onError]);

  useEffect(() => {
    attemptLoad(src, 0);
  }, [src, attemptLoad]);

  // Render loading state
  if (loadState === 'loading') {
    return children ? (
      <div className={cn('opacity-50 pointer-events-none', className)}>
        {children}
      </div>
    ) : null;
  }

  // Render error state with recovery option
  if (loadState === 'error') {
    return (
      <div className={cn('flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md', className)}>
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Script failed to load
          </p>
          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
            {error?.message || 'Unknown error occurred'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-red-500 mt-1">
              Retried {retryCount} time{retryCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setLoadState('loading');
            setRetryCount(0);
            setError(null);
            attemptLoad(src, 0);
          }}
          className="inline-flex items-center px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  // Render fallback state
  if (loadState === 'fallback') {
    return children ? (
      <div className={cn('relative', className)}>
        {children}
        <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded">
          <FileText className="h-3 w-3" />
          <span>Fallback</span>
        </div>
      </div>
    ) : null;
  }

  // Render loaded state
  return children ? (
    <div className={cn(className)}>
      {children}
    </div>
  ) : null;
);

function 1(
};

/**
 * Hook for managing script loading state
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
        script.async = options.async !== false;
        script.defer = options.defer || false;

        if (options.crossOrigin) {
          script.crossOrigin = options.crossOrigin;
        }

        if (options.integrity) {
          script.integrity = options.integrity;
        }

        const timeoutId = setTimeout(() => {
          script.remove();
          reject(new Error(`Script load timeout: ${scriptSrc}`));
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

        // Try fallback
        if (options.fallbackSrc && scriptSrc !== options.fallbackSrc && attempt === 0) {
          if (mounted) {
            setState('fallback');
          }
          try {
            await loadScript(options.fallbackSrc);
            if (mounted) {
              setState('loaded');
            }
            return;
          } catch (fallbackError) {
            // Continue to retry logic - log for debugging
            if (process.env.NODE_ENV === 'development') {
              console.warn('Script retry fallback failed:', fallbackError);
            }
          }
        }

        // Try retry
        if (attempt < (options.retryAttempts || 2)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setTimeout(() => {
            attemptLoad(scriptSrc, attempt + 1);
          }, delay);
          return;
        }

        // All failed
        if (mounted) {
          setState('error');
          setError(error);
        }
      }
    };

    attemptLoad(src, 0);

    return () => {
      mounted = false;
    };
  }, [src, options.fallbackSrc, options.retryAttempts, options.timeout, options.async, options.defer, options.crossOrigin, options.integrity]);

  return { state, error };
}

export default ScriptFallback;

