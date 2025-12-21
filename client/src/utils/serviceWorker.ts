/**
 * Service Worker Utilities
 * Provides service worker registration and communication utilities
 */

import { logger } from './logger';

export interface ServiceWorkerConfig {
  onUpdate?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface ServiceWorkerMessage {
  type: string;
  [key: string]: unknown;
}

// Network status tracking
let networkStatus = navigator.onLine;
const networkListeners: Array<(online: boolean) => void> = [];

/**
 * Register service worker with configuration options
 */
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    logger.warn('Service workers not supported', { component: 'ServiceWorker' });
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            config.onUpdate?.();
          }
        });
      }
    });

    if (config.onSuccess) {
      config.onSuccess();
    }

    logger.info('Service worker registered successfully', { component: 'ServiceWorker' });
    return registration;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    if (config.onError) {
      config.onError(normalizedError);
    }
    logger.error('Service worker registration failed', { component: 'ServiceWorker' }, normalizedError);
    return null;
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToServiceWorker(message: ServiceWorkerMessage): Promise<unknown> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
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

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    }
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Service worker message timeout'));
    }, 10000);
  });
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return networkStatus;
}

/**
 * Add network status change listener
 */
export function addNetworkStatusListener(listener: (online: boolean) => void): () => void {
  networkListeners.push(listener);
  
  return () => {
    const index = networkListeners.indexOf(listener);
    if (index > -1) {
      networkListeners.splice(index, 1);
    }
  };
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      logger.info('Service worker unregistered', { component: 'ServiceWorker' });
      return result;
    }
    return false;
  } catch (error) {
    logger.error('Failed to unregister service worker', { component: 'ServiceWorker' }, error);
    return false;
  }
}

/**
 * Initialize network status listeners
 * @returns cleanup function to remove event listeners
 */
export function initializeNetworkListeners(): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }

  const updateNetworkStatus = () => {
    const wasOnline = networkStatus;
    networkStatus = navigator.onLine;
    
    if (wasOnline !== networkStatus) {
      networkListeners.forEach(listener => {
        try {
          listener(networkStatus);
        } catch (error) {
          logger.error('Network status listener error', { component: 'ServiceWorker' }, error);
        }
      });
    }
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  };
}

// Auto-initialize network listeners
if (typeof window !== 'undefined') {
  initializeNetworkListeners();
}