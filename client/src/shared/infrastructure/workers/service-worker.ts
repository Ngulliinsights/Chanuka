/**
 * Service Worker Utilities - Shared Infrastructure
 *
 * Provides service worker registration and communication utilities
 */

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
    console.warn('Service workers not supported');
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

    console.log('Service worker registered successfully');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    config.onError?.(error as Error);
    return null;
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: ServiceWorkerMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller available'));
      return;
    }

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

/**
 * Check if service worker is available and active
 */
export function isServiceWorkerAvailable(): boolean {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
}

/**
 * Get network status and subscribe to changes
 */
export function getNetworkStatus(): boolean {
  return networkStatus;
}

export function onNetworkStatusChange(callback: (online: boolean) => void): () => void {
  networkListeners.push(callback);

  return () => {
    const index = networkListeners.indexOf(callback);
    if (index > -1) {
      networkListeners.splice(index, 1);
    }
  };
}

// Initialize network status listeners
window.addEventListener('online', () => {
  networkStatus = true;
  networkListeners.forEach(listener => listener(true));
});

window.addEventListener('offline', () => {
  networkStatus = false;
  networkListeners.forEach(listener => listener(false));
});
