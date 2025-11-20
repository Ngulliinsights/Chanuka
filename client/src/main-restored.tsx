import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";

// Import essential utilities but skip complex initialization
import { logger } from '@client/utils/logger';

// Simple polyfill setup
(function ensureProcessEnv() {
  try {
    const mode = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.MODE) ||
      (typeof (import.meta as any).env?.VITE_NODE_ENV !== 'undefined' && (import.meta as any).env.VITE_NODE_ENV) ||
      'development';

    if (typeof (globalThis as any).process === 'undefined') {
      (globalThis as any).process = { env: { NODE_ENV: mode } };
    } else if (typeof (globalThis as any).process.env === 'undefined') {
      (globalThis as any).process.env = { NODE_ENV: mode };
    } else {
      (globalThis as any).process.env = {
        ...(globalThis as any).process.env,
        NODE_ENV: (globalThis as any).process.env.NODE_ENV || mode,
      };
    }
  } catch (e) {
    // Silent fallback
  }
})();

// Suppress browser extension errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('chrome-extension://')) {
    event.preventDefault();
    return false;
  }
  if (event.message && event.message.includes('message channel closed before a response was received')) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && 
      event.reason.message && event.reason.message.includes('message channel closed before a response was received')) {
    event.preventDefault();
    return false;
  }
});

// Simple loading state
function showLoadingState(message: string) {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background-color: #f9fafb; color: #374151;">
      <div style="max-width: 400px; text-align: center; background: white; padding: 40px; 
                  border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <div style="width: 32px; height: 32px; margin: 0 auto 16px; border: 3px solid #e5e7eb; 
                    border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">Loading Chanuka Platform</h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${message}</p>
      </div>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;
}

// Simple initialization
async function initializeApp() {
  try {
    showLoadingState('Initializing application...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }

    showLoadingState('Setting up React application...');
    
    // Get root element
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root and render
    const root = createRoot(rootElement);
    root.render(<App />);
    
    logger.info('✅ Chanuka Platform initialized successfully', { component: 'Main' });

    // Initialize background services after render (non-blocking)
    setTimeout(() => {
      initializeBackgroundServices();
    }, 1000);

  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    showErrorState(error as Error);
  }
}

// Background services initialization (non-blocking)
async function initializeBackgroundServices() {
  try {
    // Service worker registration disabled for development stability
    // if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    //   try {
    //     const { registerServiceWorker } = await import('@client/utils/serviceWorker');
    //     await registerServiceWorker({
    //       onUpdate: () => logger.info('New content available', { component: 'ServiceWorker' }),
    //       onSuccess: () => logger.info('Content cached for offline use', { component: 'ServiceWorker' }),
    //       onError: (error) => logger.error('Service worker registration failed', { component: 'ServiceWorker' }, error),
    //     });
    //   } catch (swError) {
    //     console.warn('Service worker registration failed:', swError);
    //   }
    // }

    // Performance monitoring (development)
    if (process.env.NODE_ENV === 'development') {
      try {
        const { performanceMonitor } = await import('@client/utils/performance-monitor');
        performanceMonitor.startMonitoring();
        logger.info('Performance monitoring started', { component: 'Performance' });
      } catch (perfError) {
        console.warn('Performance monitoring failed to start:', perfError);
      }
    }

    logger.info('Background services initialized', { component: 'Main' });
  } catch (error) {
    console.warn('Some background services failed to initialize:', error);
  }
}

// Error state display
function showErrorState(error: Error) {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background-color: #f9fafb; color: #374151;">
      <div style="max-width: 500px; text-align: center; background: white; padding: 40px; 
                  border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: #ef4444; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    font-size: 24px; color: white;">⚠️</div>
        <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600;">Application Failed to Load</h1>
        <p style="margin: 0 0 24px; color: #6b7280; line-height: 1.5;">
          ${error.message}
        </p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button onclick="window.location.reload()" 
                  style="background: #3b82f6; color: white; border: none; padding: 12px 24px; 
                         border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 500;">
            Refresh Page
          </button>
          <button onclick="clearStorageAndReload()" 
                  style="background: #6b7280; color: white; border: none; padding: 12px 24px; 
                         border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 500;">
            Clear Cache & Reload
          </button>
        </div>
      </div>
    </div>
    
    <script>
      function clearStorageAndReload() {
        try {
          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            }).finally(() => window.location.reload());
          } else {
            window.location.reload();
          }
        } catch (e) {
          window.location.reload();
        }
      }
    </script>
  `;
}

// Start the application
initializeApp();