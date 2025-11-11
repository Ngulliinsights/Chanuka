/**
 * Feature Fallbacks Components
 * 
 * This module provides fallback components and utilities for browsers
 * that don't support certain modern features.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { featureDetector } from '../../utils/browser-compatibility';
import { logger } from '../../utils/logger';

// Intersection Observer fallback hook
export function useIntersectionObserverFallback(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [supportsIntersectionObserver] = useState(() => 
    featureDetector.detectIntersectionObserverSupport()
  );

  useEffect(() => {
    if (!targetRef.current) return;

    if (supportsIntersectionObserver) {
      // Use native Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            setIsIntersecting(entry.isIntersecting);
          }
        },
        options
      );
      
      observer.observe(targetRef.current);
      
      return () => observer.disconnect();
    } else {
      // Fallback: use scroll event listener
      const element = targetRef.current;
      
      const checkIntersection = () => {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const isVisible = (
          rect.top < windowHeight &&
          rect.bottom > 0 &&
          rect.left < windowWidth &&
          rect.right > 0
        );
        
        setIsIntersecting(isVisible);
      };
      
      // Initial check
      checkIntersection();
      
      // Listen for scroll and resize events
      const handleScroll = () => checkIntersection();
      const handleResize = () => checkIntersection();
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [targetRef, supportsIntersectionObserver, options]);

  return isIntersecting;
}

// Resize Observer fallback hook
export function useResizeObserverFallback(
  targetRef: React.RefObject<Element>,
  callback: (entry: { target: Element; contentRect: DOMRect }) => void
): void {
  const [supportsResizeObserver] = useState(() => 
    featureDetector.detectResizeObserverSupport()
  );
  const callbackRef = useRef(callback);
  
  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!targetRef.current) return;

    if (supportsResizeObserver) {
      // Use native Resize Observer
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          callbackRef.current({
            target: entry.target,
            contentRect: entry.contentRect
          });
        });
      });
      
      observer.observe(targetRef.current);
      
      return () => observer.disconnect();
    } else {
      // Fallback: use window resize event
      const element = targetRef.current;
      
      const handleResize = () => {
        if (element) {
          callbackRef.current({
            target: element,
            contentRect: element.getBoundingClientRect()
          });
        }
      };
      
      // Initial call
      handleResize();
      
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [targetRef, supportsResizeObserver]);
}

// Lazy loading component with fallback
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Use intersection observer fallback to determine when to load
  const isIntersecting = useIntersectionObserverFallback(imgRef, {
    rootMargin: '50px'
  });
  
  useEffect(() => {
    if (isIntersecting && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isIntersecting, shouldLoad]);
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    onError?.();
  };
  
  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isLoaded && !hasError && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
      
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Clipboard fallback component
interface ClipboardButtonProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ClipboardButton: React.FC<ClipboardButtonProps> = ({
  text,
  children,
  className = '',
  onSuccess,
  onError
}) => {
  const [supportsClipboard] = useState(() => 
    featureDetector.detectClipboardSupport()
  );
  
  const handleClick = async () => {
    try {
      if (supportsClipboard) {
        // Use modern Clipboard API
        await navigator.clipboard.writeText(text);
        onSuccess?.();
      } else {
        // Fallback: use document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            onSuccess?.();
          } else {
            throw new Error('Copy command failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };
  
  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

// Fullscreen fallback component
interface FullscreenButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
  onError?: (error: Error) => void;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  targetRef,
  children,
  className = '',
  onEnterFullscreen,
  onExitFullscreen,
  onError
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsFullscreen] = useState(() => 
    featureDetector.detectFullscreenSupport()
  );
  
  useEffect(() => {
    if (!supportsFullscreen) return;
    
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        onEnterFullscreen?.();
      } else {
        onExitFullscreen?.();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [supportsFullscreen, onEnterFullscreen, onExitFullscreen]);
  
  const handleClick = async () => {
    if (!targetRef.current) return;
    
    try {
      if (!supportsFullscreen) {
        onError?.(new Error('Fullscreen is not supported in this browser'));
        return;
      }
      
      if (isFullscreen) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } else {
        // Enter fullscreen
        const element = targetRef.current;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };
  
  if (!supportsFullscreen) {
    return null; // Don't render if not supported
  }
  
  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

// Storage fallback hook
export function useStorageFallback(
  key: string,
  defaultValue: string,
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): [string, (value: string) => void] {
  const [supportsStorage] = useState(() => {
    return storageType === 'localStorage' 
      ? featureDetector.detectLocalStorageSupport()
      : featureDetector.detectSessionStorageSupport();
  });
  
  const [value, setValue] = useState(() => {
    if (!supportsStorage) return defaultValue;
    
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const item = storage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  const setStoredValue = useCallback((newValue: string) => {
    setValue(newValue);
    
    if (supportsStorage) {
      try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(key, newValue);
      } catch (error) {
        console.warn(`Failed to save to ${storageType}:`, error);
      }
    }
  }, [key, storageType, supportsStorage]);
  
  return [value, setStoredValue];
}

// Web Workers fallback hook
export function useWebWorkerFallback<T, R>(
  workerScript: string,
  fallbackFunction: (data: T) => R | Promise<R>
): (data: T) => Promise<R> {
  const [supportsWebWorkers] = useState(() => 
    featureDetector.detectWebWorkersSupport()
  );
  
  const processData = useCallback(async (data: T): Promise<R> => {
    if (supportsWebWorkers) {
      try {
        return new Promise<R>((resolve, reject) => {
          const worker = new Worker(workerScript);
          
          worker.postMessage(data);
          
          worker.onmessage = (event) => {
            resolve(event.data);
            worker.terminate();
          };
          
          worker.onerror = (error) => {
            reject(error);
            worker.terminate();
          };
          
          // Timeout after 30 seconds
          setTimeout(() => {
            reject(new Error('Worker timeout'));
            worker.terminate();
          }, 30000);
        });
      } catch (error) {
        console.warn('Web Worker failed, falling back to main thread:', error);
        return fallbackFunction(data);
      }
    } else {
      // Fallback to main thread processing
      return fallbackFunction(data);
    }
  }, [workerScript, fallbackFunction, supportsWebWorkers]);
  
  return processData;
}

// Notification fallback component
interface NotificationProps {
  title: string;
  body: string;
  icon?: string;
  onClick?: () => void;
  onClose?: () => void;
}

export const NotificationFallback: React.FC<NotificationProps> = ({
  title,
  body,
  icon,
  onClick,
  onClose
}) => {
  const [supportsNotifications] = useState(() => 
    featureDetector.detectNotificationsSupport()
  );
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    if (supportsNotifications && 'Notification' in window) {
      // Request permission if needed
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            showNativeNotification();
          } else {
            setShowFallback(true);
          }
        });
      } else if (Notification.permission === 'granted') {
        showNativeNotification();
      } else {
        setShowFallback(true);
      }
    } else {
      setShowFallback(true);
    }
  }, []);
  
  const showNativeNotification = () => {
    const notification = new Notification(title, {
      body,
      icon
    });
    
    notification.onclick = () => {
      onClick?.();
      notification.close();
    };
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
      onClose?.();
    }, 5000);
  };
  
  const handleFallbackClick = () => {
    onClick?.();
    setShowFallback(false);
    onClose?.();
  };
  
  const handleFallbackClose = () => {
    setShowFallback(false);
    onClose?.();
  };
  
  if (!showFallback) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start">
        {icon && (
          <img src={icon} alt="" className="w-8 h-8 mr-3 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{body}</p>
        </div>
        <button
          type="button"
          onClick={handleFallbackClose}
          className="ml-2 text-gray-400 hover:text-gray-600"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
      {onClick && (
        <button
          type="button"
          onClick={handleFallbackClick}
          className="mt-3 w-full bg-blue-600 text-white text-sm py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          View
        </button>
      )}
    </div>
  );
};

