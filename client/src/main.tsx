import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { logger } from '@/utils/logger';

import App from './App';
import './index.css';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Environment variable types for Vite build system.
 * Provides type safety when accessing import.meta.env properties.
 */
interface ImportMetaEnv {
  readonly MODE?: string;
  readonly VITE_NODE_ENV?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly SSR?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Extended global interface to include Node.js-style process.env
 * for compatibility with libraries expecting Node environment variables.
 */
interface GlobalWithProcess {
  process?: {
    env: NodeJS.ProcessEnv;
  };
}

/**
 * Configuration options for background service initialization.
 */
interface BackgroundServiceConfig {
  enableServiceWorker: boolean;
  enablePerformanceMonitoring: boolean;
  serviceWorkerPath?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ROOT_ELEMENT_ID = 'root' as const;
const BACKGROUND_SERVICE_DELAY = 1000 as const;
const DOM_READY_TIMEOUT = 10000 as const;

// ============================================================================
// Environment Setup
// ============================================================================

/**
 * Establishes a Node.js-compatible process.env object in the browser environment.
 * This polyfill ensures compatibility with libraries that expect Node.js globals,
 * which is common in modern JavaScript tooling and dependencies.
 * 
 * The function safely handles various initialization states and falls back
 * gracefully if any step fails, ensuring the application can still start.
 */
function setupProcessEnvironment(): void {
  try {
    // Use double assertion through unknown to safely cast globalThis
    const globalWindow = (globalThis as unknown) as GlobalWithProcess;
    const importMeta = import.meta as ImportMeta;
    
    // Determine the environment mode from available sources with fallback chain
    const environmentMode = 
      importMeta.env?.MODE || 
      importMeta.env?.VITE_NODE_ENV || 
      (importMeta.env?.DEV ? 'development' : 'production');

    // Create or augment the global process object with environment variables
    if (typeof globalWindow.process === 'undefined') {
      globalWindow.process = { 
        env: { NODE_ENV: environmentMode } as NodeJS.ProcessEnv 
      };
    } else if (typeof globalWindow.process.env === 'undefined') {
      globalWindow.process.env = { NODE_ENV: environmentMode } as NodeJS.ProcessEnv;
    } else if (!globalWindow.process.env.NODE_ENV) {
      globalWindow.process.env.NODE_ENV = environmentMode;
    }

    logger.debug('Environment setup complete', { 
      component: 'Bootstrap',
      mode: environmentMode 
    });
  } catch (error) {
    // Silent failure is intentional here since environment setup is non-critical
    // The application can function without process.env in most cases
    console.warn('Environment setup encountered an issue:', error);
  }
}

// ============================================================================
// Error Suppression
// ============================================================================

/**
 * Filters out noise from browser extension errors that don't affect our application.
 * Chrome extensions often inject scripts that can cause console spam and trigger
 * error handlers unnecessarily. This function prevents these external errors from
 * disrupting the user experience or polluting our error logs.
 */
function suppressExtensionErrors(): void {
  const extensionErrorPatterns = [
    'chrome-extension://',
    'message channel closed before a response was received',
    'Extension context invalidated'
  ];

  window.addEventListener('error', (event: ErrorEvent) => {
    if (!event.message) return;
    
    const isExtensionError = extensionErrorPatterns.some(pattern => 
      event.message.includes(pattern)
    );

    if (isExtensionError) {
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (!event.reason) return;
    
    const errorMessage = typeof event.reason === 'object' && event.reason.message 
      ? event.reason.message 
      : String(event.reason);

    const isExtensionError = extensionErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );

    if (isExtensionError) {
      event.preventDefault();
      return false;
    }
  });

  logger.debug('Extension error suppression enabled', { component: 'Bootstrap' });
}

// ============================================================================
// UI State Management
// ============================================================================

/**
 * Displays a visually appealing loading indicator to provide immediate feedback
 * during application initialization. This improves perceived performance and
 * reduces user anxiety during longer load times.
 * 
 * The design uses modern CSS with smooth animations and a clean layout that
 * matches the application's overall aesthetic.
 */
function renderLoadingState(message: string, detail?: string): void {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  const detailHTML = detail 
    ? `<p style="margin: 8px 0 0; color: #9ca3af; font-size: 13px;">${detail}</p>` 
    : '';

  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="max-width: 420px; text-align: center; background: white; padding: 48px 40px; 
                  border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
        <div style="width: 40px; height: 40px; margin: 0 auto 24px; border: 4px solid #e5e7eb; 
                    border-top: 4px solid #667eea; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1f2937;">
          Chanuka Platform
        </h2>
        <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.5;">${message}</p>
        ${detailHTML}
      </div>
    </div>
    <style>
      @keyframes spin { 
        from { transform: rotate(0deg); } 
        to { transform: rotate(360deg); } 
      }
    </style>
  `;
}

/**
 * Presents a comprehensive error screen when application initialization fails.
 * The interface provides clear explanation of the issue and actionable recovery
 * options, helping users resolve problems without technical knowledge.
 * 
 * The design prioritizes clarity and reduces user frustration by offering
 * multiple resolution paths.
 */
function renderErrorState(error: Error, context?: string): void {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  const contextHTML = context 
    ? `<p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px;">Context: ${context}</p>` 
    : '';

  const technicalDetails = process.env.NODE_ENV === 'development'
    ? `<details style="margin-top: 16px; text-align: left; padding: 16px; background: #f9fafb; 
                       border-radius: 6px; border: 1px solid #e5e7eb;">
         <summary style="cursor: pointer; font-weight: 500; color: #374151; margin-bottom: 8px;">
           Technical Details
         </summary>
         <pre style="margin: 0; font-size: 12px; color: #6b7280; white-space: pre-wrap; word-break: break-word;">
           ${error.stack || error.message}
         </pre>
       </details>`
    : '';

  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="max-width: 540px; text-align: center; background: white; padding: 48px 40px; 
                  border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
        <div style="width: 72px; height: 72px; margin: 0 auto 24px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    font-size: 32px; color: white; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);">
          ⚠️
        </div>
        <h1 style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: #1f2937;">
          Unable to Load Application
        </h1>
        ${contextHTML}
        <p style="margin: 0 0 28px; color: #6b7280; line-height: 1.6; font-size: 15px;">
          ${error.message}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button onclick="window.location.reload()" 
                  style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; 
                         padding: 14px 28px; border-radius: 8px; font-size: 16px; cursor: pointer; 
                         font-weight: 600; transition: transform 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
                  onmouseover="this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.transform='translateY(0)'">
            Refresh Page
          </button>
          <button onclick="clearStorageAndReload()" 
                  style="background: #6b7280; color: white; border: none; padding: 14px 28px; 
                         border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600; 
                         transition: transform 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
                  onmouseover="this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.transform='translateY(0)'">
            Clear Cache & Reload
          </button>
        </div>
        ${technicalDetails}
      </div>
    </div>
    
    <script>
      function clearStorageAndReload() {
        try {
          localStorage.clear();
          sessionStorage.clear();
          
          if ('caches' in window) {
            caches.keys()
              .then(names => Promise.all(names.map(name => caches.delete(name))))
              .catch(() => {})
              .finally(() => window.location.reload());
          } else {
            window.location.reload();
          }
        } catch (error) {
          console.error('Storage clear failed:', error);
          window.location.reload();
        }
      }
    </script>
  `;
}

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Waits for the DOM to be fully loaded and interactive, with a safety timeout.
 * This ensures we don't attempt to manipulate the DOM before it's ready, while
 * also preventing the application from hanging indefinitely if there's an issue.
 * 
 * The timeout is generous to accommodate slower devices and network conditions.
 */
async function waitForDOMReady(): Promise<void> {
  if (document.readyState !== 'loading') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('DOM ready timeout exceeded'));
    }, DOM_READY_TIMEOUT);

    const handleDOMReady = () => {
      clearTimeout(timeout);
      document.removeEventListener('DOMContentLoaded', handleDOMReady);
      resolve();
    };

    document.addEventListener('DOMContentLoaded', handleDOMReady, { once: true });
  });
}

/**
 * Safely retrieves the root DOM element with clear error messaging.
 * This function provides specific guidance if the element is missing,
 * which helps during debugging and development.
 */
function getRootElement(): HTMLElement {
  const element = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!element) {
    throw new Error(
      `Root element with id "${ROOT_ELEMENT_ID}" not found in DOM. ` +
      'Ensure your index.html contains <div id="root"></div>'
    );
  }

  return element;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Converts an unknown error into a proper Error object for consistent handling.
 * This helper ensures we always have a properly typed Error to work with,
 * even when catching errors that might be strings, objects, or other types.
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  
  return new Error(String(error));
}

// ============================================================================
// React Initialization
// ============================================================================

/**
 * Creates and mounts the React application root to the DOM.
 * This is the critical step that transforms our HTML container into
 * a fully interactive React application. We use React 18's concurrent
 * rendering features through createRoot for better performance.
 */
function mountReactApp(rootElement: HTMLElement): Root {
  try {
    const reactRoot = createRoot(rootElement);
    reactRoot.render(<App />);
    
    logger.info('✅ React application mounted successfully', { 
      component: 'Bootstrap',
      mode: process.env.NODE_ENV 
    });

    return reactRoot;
  } catch (error) {
    const normalizedError = normalizeError(error);
    logger.error('Failed to mount React application', { component: 'Bootstrap' }, normalizedError);
    throw new Error(
      'React initialization failed. This might be due to a code error in the App component. ' +
      `Details: ${normalizedError.message}`
    );
  }
}

// ============================================================================
// Background Services
// ============================================================================

/**
 * Determines which background services should be enabled based on the
 * current environment and configuration. This allows us to have different
 * behavior in development versus production without cluttering the main code.
 */
function getBackgroundServiceConfig(): BackgroundServiceConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    enableServiceWorker: isProduction && 'serviceWorker' in navigator,
    enablePerformanceMonitoring: isDevelopment,
    serviceWorkerPath: '/sw.js'
  };
}

/**
 * Registers the service worker for offline capabilities and caching.
 * Service workers enable progressive web app features like offline access
 * and background sync, but we only enable them in production to avoid
 * caching issues during development.
 */
async function initializeServiceWorker(config: BackgroundServiceConfig): Promise<void> {
  if (!config.enableServiceWorker) {
    logger.debug('Service worker disabled for this environment', { component: 'ServiceWorker' });
    return;
  }

  try {
    const { registerServiceWorker } = await import('@/utils/serviceWorker');
    
    await registerServiceWorker({
      onUpdate: () => {
        logger.info('New application version available', { component: 'ServiceWorker' });
      },
      onSuccess: () => {
        logger.info('Application cached for offline use', { component: 'ServiceWorker' });
      },
      onError: (error: Error) => {
        logger.error('Service worker registration failed', { component: 'ServiceWorker' }, error);
      }
    });

    logger.info('Service worker initialized successfully', { component: 'ServiceWorker' });
  } catch (error) {
    const normalizedError = normalizeError(error);
    logger.warn('Service worker initialization failed', { component: 'ServiceWorker' }, { message: normalizedError.message, stack: normalizedError.stack });
  }
}

/**
 * Starts performance monitoring to track application metrics during development.
 * This helps identify performance bottlenecks and optimization opportunities.
 * We only enable this in development to avoid overhead in production.
 */
async function initializePerformanceMonitoring(config: BackgroundServiceConfig): Promise<void> {
  if (!config.enablePerformanceMonitoring) {
    logger.debug('Performance monitoring disabled for this environment', { component: 'Performance' });
    return;
  }

  try {
    await import('@/utils/performance-monitor');
    logger.info('Performance monitoring active', { component: 'Performance' });
  } catch (error) {
    const normalizedError = normalizeError(error);
    logger.warn('Performance monitoring failed to start', { component: 'Performance' }, { message: normalizedError.message, stack: normalizedError.stack });
  }
}

/**
 * Orchestrates the initialization of all non-critical background services.
 * These services enhance the application but aren't required for basic functionality,
 * so we start them after the UI is interactive to prioritize user experience.
 * 
 * The delayed initialization ensures users see content quickly while still
 * getting the benefits of these features.
 */
async function initializeBackgroundServices(): Promise<void> {
  const config = getBackgroundServiceConfig();

  try {
    await Promise.allSettled([
      initializeServiceWorker(config),
      initializePerformanceMonitoring(config)
    ]);

    logger.info('Background services initialization complete', { 
      component: 'Bootstrap',
      serviceWorker: config.enableServiceWorker,
      performanceMonitoring: config.enablePerformanceMonitoring
    });
  } catch (error) {
    // We don't throw here because background services are non-critical
    const normalizedError = normalizeError(error);
    logger.warn('Some background services failed to initialize', { component: 'Bootstrap' }, { message: normalizedError.message, stack: normalizedError.stack });
  }
}

// ============================================================================
// Main Application Bootstrap
// ============================================================================

/**
 * Main application initialization sequence. This function orchestrates all the
 * steps needed to bootstrap the application, from environment setup through
 * React mounting and background service initialization.
 * 
 * The sequence is carefully ordered to prioritize user experience:
 * 1. Show immediate visual feedback
 * 2. Ensure DOM is ready
 * 3. Mount React application
 * 4. Initialize background services (non-blocking)
 * 
 * Each step includes comprehensive error handling to provide clear feedback
 * if something goes wrong, helping both users and developers quickly identify
 * and resolve issues.
 */
async function initializeApplication(): Promise<void> {
  try {
    // Phase 1: Environment preparation
    renderLoadingState('Initializing application...', 'Setting up environment');
    setupProcessEnvironment();
    suppressExtensionErrors();

    // Phase 2: Wait for DOM readiness
    renderLoadingState('Preparing interface...', 'Waiting for DOM ready');
    await waitForDOMReady();

    // Phase 3: Mount React application
    renderLoadingState('Loading components...', 'Mounting React application');
    const rootElement = getRootElement();
    
    mountReactApp(rootElement);

    logger.info('✅ Chanuka Platform initialized successfully', { 
      component: 'Bootstrap',
      timestamp: new Date().toISOString()
    });

    // Phase 4: Initialize background services (non-blocking)
    // We use setTimeout to ensure this happens after the browser has had
    // a chance to render the UI, making the app feel more responsive
    setTimeout(() => {
      initializeBackgroundServices().catch(error => {
        const normalizedError = normalizeError(error);
        logger.warn('Background service initialization encountered errors', {
          component: 'Bootstrap'
        }, { message: normalizedError.message, stack: normalizedError.stack });
      });
    }, BACKGROUND_SERVICE_DELAY);

  } catch (error) {
    const normalizedError = normalizeError(error);

    logger.error('❌ Application initialization failed', { 
      component: 'Bootstrap' 
    }, normalizedError);

    renderErrorState(normalizedError, 'Application Bootstrap');
  }
}

// ============================================================================
// Application Entry Point
// ============================================================================

// Start the application initialization sequence
initializeApplication().catch(error => {
  const normalizedError = normalizeError(error);
  console.error('Unhandled error during application initialization:', normalizedError);
  
  // Final fallback if even our error handling fails
  document.body.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h1 style="color: #ef4444;">Critical Initialization Error</h1>
      <p>The application failed to start. Please refresh the page.</p>
      <button onclick="window.location.reload()" 
              style="margin-top: 20px; padding: 12px 24px; font-size: 16px; 
                     background: #3b82f6; color: white; border: none; 
                     border-radius: 6px; cursor: pointer;">
        Refresh Page
      </button>
    </div>
  `;
});