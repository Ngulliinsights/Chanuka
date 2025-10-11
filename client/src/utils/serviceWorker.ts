// Service Worker registration and management utilities

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

// Register service worker
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    logger.info('Service workers are not supported in this browser', { component: 'SimpleTool' });
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.info('Service Worker registered successfully:', { component: 'SimpleTool' }, registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available
            logger.info('New content is available; please refresh.', { component: 'SimpleTool' });
            config.onUpdate?.(registration);
          } else {
            // Content is cached for offline use
            logger.info('Content is cached for offline use.', { component: 'SimpleTool' });
            config.onSuccess?.(registration);
          }
        }
      });
    });

    return registration;
  } catch (error) {
    logger.error('Service Worker registration failed:', { component: 'SimpleTool' }, error);
    config.onError?.(error as Error);
    return null;
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      logger.info('Service Worker unregistered:', { component: 'SimpleTool' }, result);
      return result;
    }
    return false;
  } catch (error) {
    logger.error('Service Worker unregistration failed:', { component: 'SimpleTool' }, error);
    return false;
  }
}

// Check if app is running in standalone mode (PWA)
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Get service worker registration
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.getRegistration();
  } catch (error) {
    logger.error('Failed to get service worker registration:', { component: 'SimpleTool' }, error);
    return null;
  }
}

// Send message to service worker
export async function sendMessageToServiceWorker(message: any): Promise<any> {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    throw new Error('Service worker not available');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  try {
    await sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
    logger.info('All caches cleared', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('Failed to clear caches:', { component: 'SimpleTool' }, error);
    throw error;
  }
}

// Force service worker to skip waiting and activate
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    return;
  }

  try {
    await sendMessageToServiceWorker({ type: 'SKIP_WAITING' });
    logger.info('Service worker skip waiting triggered', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('Failed to skip waiting:', { component: 'SimpleTool' }, error);
  }
}

// Get service worker version
export async function getServiceWorkerVersion(): Promise<string | null> {
  try {
    const response = await sendMessageToServiceWorker({ type: 'GET_VERSION' });
    return response.version || null;
  } catch (error) {
    logger.error('Failed to get service worker version:', { component: 'SimpleTool' }, error);
    return null;
  }
}

// Check if content is cached
export async function isContentCached(url: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      if (response) {
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error('Failed to check cache:', { component: 'SimpleTool' }, error);
    return false;
  }
}

// Enhanced preload critical resources with retry logic
export async function preloadCriticalResources(urls: string[]): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const activeRequests = new Set<string>();

  try {
    const cache = await caches.open('chanuka-preload-v1');
    
    // Preload with retry logic
    const preloadWithRetry = async (url: string, maxRetries = 2): Promise<void> => {
      // Prevent duplicate requests for the same URL
      if (activeRequests.has(url)) {
        return;
      }
      
      activeRequests.add(url);
      
      try {
        let retries = 0;
        
        while (retries <= maxRetries) {
          try {
            const request = new Request(url);
            
            // Check if already cached
            if (await cache.match(request)) {
              return;
            }
            
            // Try to fetch and cache
            const response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
              return;
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            retries++;
            
            if (retries <= maxRetries) {
              // Exponential backoff
              const delay = Math.pow(2, retries) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              console.warn(`Retrying preload (${retries}/${maxRetries}): ${url}`, error);
            } else {
              console.warn('Failed to preload resource after retries:', url, error);
            }
          }
        }
      } finally {
        activeRequests.delete(url);
      }
    };
    
    // Process URLs with concurrency control
    const concurrency = 3;
    const chunks = [];
    for (let i = 0; i < urls.length; i += concurrency) {
      chunks.push(urls.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      await Promise.allSettled(chunk.map(url => preloadWithRetry(url)));
    }
    
    logger.info('Critical resources preloaded with retry logic', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('Failed to preload critical resources:', { component: 'SimpleTool' }, error);
  }
}

// Service worker update notification
export class ServiceWorkerUpdateNotifier {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private callbacks: {
    onUpdateAvailable?: () => void;
    onUpdateInstalled?: () => void;
  } = {};

  constructor(callbacks: {
    onUpdateAvailable?: () => void;
    onUpdateInstalled?: () => void;
  } = {}) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    this.registration = await registerServiceWorker({
      onUpdate: (registration) => {
        this.updateAvailable = true;
        this.callbacks.onUpdateAvailable?.();
      },
      onSuccess: (registration) => {
        this.callbacks.onUpdateInstalled?.();
      },
    });
  }

  async applyUpdate(): Promise<void> {
    if (!this.updateAvailable || !this.registration) {
      return;
    }

    const newWorker = this.registration.waiting;
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        }, { once: true });
      });

      // Reload the page to get the new content
      window.location.reload();
    }
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

// Network status utilities
export function isOnline(): boolean {
  return navigator.onLine;
}

export function addNetworkStatusListener(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Background sync utilities (for future use)
export async function registerBackgroundSync(tag: string): Promise<void> {
  const registration = await getServiceWorkerRegistration();
  if (registration && 'sync' in registration) {
    try {
      await (registration as any).sync.register(tag);
      logger.info('Background sync registered:', { component: 'SimpleTool' }, tag);
    } catch (error) {
      logger.error('Background sync registration failed:', { component: 'SimpleTool' }, error);
    }
  }
}






