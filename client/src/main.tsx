import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/serviceWorker";
import { assetLoadingManager, setupAssetPreloading } from "./utils/asset-loading";
import { getMobileErrorHandler } from "./utils/mobile-error-handler";
import { loadPolyfills } from "./utils/polyfills";
import { logger } from './utils/browser-logger';
import { performanceMonitor } from "./utils/performanceMonitoring";

/**
 * Application Loading States
 * Tracks the progression of application initialization through distinct phases
 */
interface LoadingState {
  phase: 'validating' | 'dom-ready' | 'mounting' | 'service-worker' | 'complete';
  message: string;
  progress: number;
}

/**
 * Retry Configuration
 * Controls the behavior of the exponential backoff retry mechanism
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: Error, attempt: number) => boolean;
}

/**
 * Initialization State Management
 * Prevents duplicate initialization attempts and tracks retry count
 */
let currentLoadingState: LoadingState = {
  phase: 'validating',
  message: 'Validating environment...',
  progress: 0
};

let initRetries = 0;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Initialize mobile error handler at module level
const mobileErrorHandler = getMobileErrorHandler();

/**
 * Development Utilities Initialization
 * Loads debugging and error recovery tools only in development mode
 * These are loaded asynchronously to avoid blocking the main initialization
 */
if (process.env.NODE_ENV === 'development') {
  Promise.all([
    import('./utils/development-error-recovery')
      .then(({ DevelopmentErrorRecovery }) => {
        DevelopmentErrorRecovery.getInstance();
        logger.info('🛡️ Development error recovery initialized', { component: 'Chanuka' });
      })
      .catch(error => console.warn('Failed to initialize development error recovery:', error)),
    
    import('./utils/development-debug')
      .then(({ default: DevelopmentDebugger }) => {
        DevelopmentDebugger.getInstance();
        logger.info('🔧 Development debug utilities initialized', { component: 'Chanuka' });
      })
      .catch(error => console.warn('Failed to initialize development debug utilities:', error))
  ]).catch(() => {});
}

/**
 * DOM Readiness Check
 * Waits for the DOM to be ready with a 10-second timeout to prevent indefinite hanging
 * Uses both DOMContentLoaded and readystatechange events for maximum compatibility
 */
function waitForDOM(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('DOM readiness timeout after 10 seconds'));
    }, 10000);

    const checkReady = () => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        clearTimeout(timeout);
        resolve();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkReady, { once: true });
      document.addEventListener('readystatechange', checkReady);
    } else {
      clearTimeout(timeout);
      resolve();
    }
  });
}

/**
 * Environment Validation
 * Ensures all required browser APIs and features are available
 * Throws descriptive errors if critical features are missing
 */
function validateDOMEnvironment(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Application must run in a browser environment');
  }

  // Check for required DOM APIs by traversing the object path
  const requiredAPIs = [
    'document.getElementById',
    'document.createElement',
    'document.addEventListener',
    'window.addEventListener',
    'localStorage',
    'sessionStorage'
  ];

  for (const api of requiredAPIs) {
    const parts = api.split('.');
    let obj: any = window;
    
    for (const part of parts) {
      if (!obj || typeof obj[part] === 'undefined') {
        throw new Error(`Required API ${api} is not available`);
      }
      obj = obj[part];
    }
  }

  // Validate modern browser features
  if (!window.Promise) {
    throw new Error('Promise support is required');
  }

  if (!window.fetch) {
    console.warn('Fetch API not available, polyfill may be needed');
  }
}

/**
 * Loading State Display
 * Shows a user-friendly loading screen with progress indicator
 * Uses inline styles to avoid CSS dependencies during initialization
 */
function showLoadingState(state: LoadingState): void {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                min-height: 100vh; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background-color: #f9fafb; color: #374151;">
      <div style="max-width: 400px; text-align: center; background: white; padding: 40px; 
                  border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <div style="width: 48px; height: 48px; margin: 0 auto 20px; 
                    background: url('/Chanuka_logo.svg') center/contain no-repeat;"></div>
        <div style="width: 32px; height: 32px; margin: 0 auto 16px; border: 3px solid #e5e7eb; 
                    border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">Loading Chanuka Platform</h2>
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">${state.message}</p>
        <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
          <div style="width: ${state.progress}%; height: 100%; background: #3b82f6; transition: width 0.3s ease;"></div>
        </div>
      </div>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;
}

/**
 * Update Loading State
 * Updates and displays the current initialization phase and progress
 */
function updateLoadingState(phase: LoadingState['phase'], message: string, progress: number): void {
  currentLoadingState = { phase, message, progress };
  showLoadingState(currentLoadingState);
}

/**
 * Browser Compatibility Initialization
 * Attempts to load the advanced compatibility manager, falls back to basic polyfills
 * Non-blocking - continues initialization even if compatibility checks fail
 */
async function initializeBrowserCompatibility(): Promise<void> {
  updateLoadingState('validating', 'Initializing browser compatibility...', 12);
  
  try {
    const { initializeBrowserCompatibility } = await import('./utils/browser-compatibility-manager');
    const compatibilityStatus = await initializeBrowserCompatibility({
      autoLoadPolyfills: true,
      runTestsOnInit: false,
      blockUnsupportedBrowsers: false,
      showWarnings: true,
      logResults: true
    });
    
    logger.info('Browser compatibility initialized:', { component: 'Chanuka' }, {
      browser: `${compatibilityStatus.browserInfo.name} ${compatibilityStatus.browserInfo.version}`,
      supported: compatibilityStatus.isSupported,
      polyfillsLoaded: compatibilityStatus.polyfillsLoaded,
      warnings: compatibilityStatus.warnings.length
    });
    
    if (compatibilityStatus.warnings.length > 0) {
      console.warn('Browser compatibility warnings:', compatibilityStatus.warnings);
    }
  } catch (error) {
    console.warn('Browser compatibility initialization failed, using fallback:', error);
    
    try {
      await loadPolyfills();
      logger.info('Fallback polyfills loaded successfully', { component: 'Chanuka' });
    } catch (polyfillError) {
      console.warn('Fallback polyfills also failed:', polyfillError);
    }
  }
}

/**
 * Asset Preloading
 * Sets up asset optimization and preloads critical resources
 * Non-blocking - continues initialization even if asset preloading fails
 */
async function preloadAssets(): Promise<void> {
  updateLoadingState('validating', 'Setting up asset optimization...', 18);
  setupAssetPreloading();
  
  updateLoadingState('validating', 'Preloading critical assets...', 22);
  try {
    await assetLoadingManager.preloadCriticalAssets();
  } catch (error) {
    console.warn('Failed to preload critical assets:', error);
  }
}

/**
 * Root Element Validation and Configuration
 * Ensures the root element exists and is properly configured for React mounting
 * Sets appropriate accessibility attributes and ensures visibility
 */
function validateAndConfigureRoot(): HTMLElement {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element with id "root" not found. The application cannot start.');
  }

  // Configure accessibility attributes
  if (!rootElement.hasAttribute('role')) {
    rootElement.setAttribute('role', 'application');
    rootElement.setAttribute('aria-label', 'Chanuka Legislative Transparency Platform');
  }

  // Ensure visibility
  const computedStyle = window.getComputedStyle(rootElement);
  if (computedStyle.display === 'none') {
    console.warn('Root element is hidden, making it visible');
    rootElement.style.display = 'block';
  }

  return rootElement;
}

/**
 * React Application Mounting
 * Creates the React root and renders the application with necessary providers
 * Includes a small delay to ensure loading state is visible to users
 */
async function mountReactApp(rootElement: HTMLElement): Promise<void> {
  updateLoadingState('mounting', 'Mounting React application...', 60);
  logger.info('DOM ready, mounting React application...', { component: 'Chanuka' });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const root = createRoot(rootElement);
  const { AssetLoadingProvider } = await import('./components/loading/AssetLoadingIndicator');
  
  root.render(
    <AssetLoadingProvider>
      <App />
    </AssetLoadingProvider>
  );
  
  logger.info('React application mounted successfully', { component: 'Chanuka' });
  updateLoadingState('mounting', 'React application mounted...', 80);
}

/**
 * Service Worker Registration
 * Registers the service worker in production for offline support and caching
 * Shows update notifications when new content is available
 */
async function registerServiceWorkerIfProduction(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  
  updateLoadingState('service-worker', 'Registering service worker...', 90);
  
  try {
    await registerServiceWorker({
      onUpdate: (registration) => {
        logger.info('New content is available; please refresh.', { component: 'Chanuka' });
        showUpdateNotification();
      },
      onSuccess: (registration) => {
        logger.info('Content is cached for offline use.', { component: 'Chanuka' });
      },
      onError: (error) => {
        logger.error('Service worker registration failed:', { component: 'Chanuka' }, error);
      },
    });
  } catch (swError) {
    console.warn('Service worker registration failed:', swError);
  }
}

/**
 * Performance Monitoring Initialization
 * Starts collecting performance metrics after the app is loaded
 * Runs asynchronously to avoid blocking the UI
 */
function initializePerformanceMonitoring(): void {
  updateLoadingState('complete', 'Initializing performance monitoring...', 95);
  
  try {
    logger.info('🚀 Performance monitoring active', { component: 'Chanuka' });
    
    setTimeout(() => {
      performanceMonitor.measureRouteChange('initial-load')();
    }, 1000);
  } catch (perfError) {
    console.warn('Performance monitoring initialization failed:', perfError);
  }
}

/**
 * Main Application Initialization
 * Orchestrates all initialization phases in sequence
 * Each phase updates the loading state to keep users informed
 */
async function initializeApp(): Promise<void> {
  logger.info('Initializing Chanuka Legislative Transparency Platform...', { component: 'Chanuka' });
  
  // Phase 1: Environment validation
  updateLoadingState('validating', 'Validating browser environment...', 10);
  validateDOMEnvironment();
  
  // Phase 2: Browser compatibility
  await initializeBrowserCompatibility();
  
  // Phase 3: Asset preloading
  await preloadAssets();
  
  // Phase 4: DOM readiness
  updateLoadingState('dom-ready', 'Waiting for DOM to be ready...', 30);
  await waitForDOM();
  
  // Phase 5: Root element validation
  const rootElement = validateAndConfigureRoot();
  
  // Phase 6: React mounting
  await mountReactApp(rootElement);
  
  // Phase 7: Service worker (production only)
  await registerServiceWorkerIfProduction();
  
  // Phase 8: Performance monitoring
  initializePerformanceMonitoring();
  
  // Phase 9: Complete
  updateLoadingState('complete', 'Application ready!', 100);
  setTimeout(() => {
    // Loading state will be replaced by actual app content
  }, 200);
  
  logger.info('Application initialization completed successfully', { component: 'Chanuka' });
}

/**
 * Update Notification Display
 * Shows a clickable notification when a new version of the app is available
 * Auto-dismisses after 10 seconds
 */
function showUpdateNotification(): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; 
    padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
    z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    font-size: 14px; cursor: pointer; transition: opacity 0.3s ease;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>🔄</span>
      <span>New version available! Click to refresh.</span>
    </div>
  `;
  
  notification.addEventListener('click', () => window.location.reload());
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 10000);
}

/**
 * Error Reporting
 * Logs error details to localStorage for debugging
 * Attempts to send to external error reporting service if available
 */
function reportInitializationError(error: Error): void {
  try {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      phase: currentLoadingState.phase,
      localStorage: {
        available: typeof Storage !== 'undefined',
        quota: 'checking...'
      }
    };
    
    localStorage.setItem('chanuka_init_error', JSON.stringify(errorReport));
    
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.report(error, errorReport);
    }
    
    // Check storage quota asynchronously
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        logger.info('Storage quota:', { component: 'Chanuka' }, estimate);
      });
    }
  } catch (reportingError) {
    logger.error('Failed to report initialization error:', { component: 'Chanuka' }, reportingError);
  }
}

/**
 * Initialization Error Display
 * Shows a user-friendly error screen with recovery options
 * Includes technical details in development mode for debugging
 */
function showInitializationError(error: Error): void {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    document.body.appendChild(newRoot);
    showInitializationError(error);
    return;
  }

  const errorId = `error_${Date.now()}`;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
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
        <p style="margin: 0 0 8px; color: #6b7280; line-height: 1.5;">
          The Chanuka Legislative Transparency Platform encountered an error during startup.
        </p>
        <p style="margin: 0 0 24px; color: #9ca3af; font-size: 14px;">
          Error occurred during: ${currentLoadingState.phase}
        </p>
        
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 24px;">
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
        
        ${isDevelopment ? `
          <details style="margin-top: 20px; text-align: left;">
            <summary style="cursor: pointer; color: #6b7280; font-weight: 500;">Technical Details</summary>
            <div style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 4px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #374151; font-weight: 500;">Error Message:</p>
              <pre style="margin: 0 0 12px; font-size: 11px; overflow-x: auto; color: #ef4444; white-space: pre-wrap;">${error.message}</pre>
              
              <p style="margin: 0 0 8px; font-size: 12px; color: #374151; font-weight: 500;">Stack Trace:</p>
              <pre style="margin: 0 0 12px; font-size: 10px; overflow-x: auto; color: #6b7280; 
                          white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${error.stack || 'No stack trace available'}</pre>
              
              <p style="margin: 0 0 8px; font-size: 12px; color: #374151; font-weight: 500;">Environment:</p>
              <pre style="margin: 0; font-size: 10px; color: #6b7280;">Phase: ${currentLoadingState.phase}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}</pre>
            </div>
          </details>
        ` : ''}
        
        <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">Error ID: ${errorId}</p>
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
          logger.error('Failed to clear storage:', { component: 'Chanuka' }, e);
          window.location.reload();
        }
      }
    </script>
  `;
}

/**
 * Retry Configuration
 * Defines the exponential backoff strategy for initialization retries
 * Avoids retrying non-recoverable errors like missing DOM elements
 */
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error, attempt: number) => {
    const nonRetryableErrors = [
      'Root element not found',
      'browser environment',
      'Required API',
      'Promise support'
    ];
    
    const isNonRetryable = nonRetryableErrors.some(msg => error.message.includes(msg));
    return !isNonRetryable && attempt < 3;
  }
};

/**
 * Initialization with Retry
 * Implements exponential backoff retry logic for initialization failures
 * Prevents duplicate initialization attempts and tracks retry count
 */
async function initWithRetry(config: RetryConfig = defaultRetryConfig): Promise<void> {
  if (isInitializing && initializationPromise) {
    console.warn('Initialization already in progress, returning existing promise');
    return initializationPromise;
  }

  if (isInitializing) {
    console.warn('Initialization already in progress, skipping retry attempt');
    return;
  }

  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      await initializeApp();
      logger.info('Application initialized successfully', { component: 'Chanuka' });
    } catch (error) {
      const currentError = error as Error;
      initRetries++;
      
      console.error(`Initialization attempt ${initRetries} failed:`, currentError);
      
      const shouldRetry = config.retryCondition(currentError, initRetries) && 
                         initRetries <= config.maxRetries;
      
      if (shouldRetry) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, initRetries - 1),
          config.maxDelay
        );
        
        console.log(`Retrying initialization in ${delay}ms... (attempt ${initRetries + 1}/${config.maxRetries + 1})`);
        updateLoadingState('validating', `Retrying initialization... (${initRetries}/${config.maxRetries})`, 5);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        isInitializing = false;
        initializationPromise = null;
        return initWithRetry(config);
      } else {
        logger.error('Maximum initialization retries exceeded or non-retryable error encountered', { component: 'Chanuka' });
        showInitializationError(currentError);
        throw currentError;
      }
    }
  })();

  try {
    await initializationPromise;
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
}

/**
 * Application Startup
 * Entry point for the application that handles initial loading state
 * and kicks off the initialization with retry mechanism
 */
async function startApplication(): Promise<void> {
  try {
    if (document.readyState !== 'loading') {
      updateLoadingState('validating', 'Starting application...', 0);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        updateLoadingState('validating', 'Starting application...', 0);
      }, { once: true });
    }

    await initWithRetry();
    
  } catch (error) {
    logger.error('Fatal error during application startup:', { component: 'Chanuka' }, error);
    reportInitializationError(error as Error);
    
    try {
      showInitializationError(error as Error);
    } catch (fallbackError) {
      logger.error('Failed to show error message:', { component: 'Chanuka' }, fallbackError);
      
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; 
                    font-family: monospace; background: #fee; color: #c00; padding: 20px; text-align: center;">
          <div>
            <h1>Critical Error</h1>
            <p>The application failed to start and error handling also failed.</p>
            <p>Please refresh the page or contact support.</p>
            <button onclick="window.location.reload()" 
                    style="margin-top: 16px; padding: 8px 16px; background: #c00; color: white; 
                           border: none; border-radius: 4px; cursor: pointer;">Refresh Page</button>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Global Error Handlers
 * Capture unhandled errors during initialization to prevent silent failures
 * Allows the retry mechanism to handle errors gracefully
 */
window.addEventListener('error', (event) => {
  logger.error('Global error during initialization:', { component: 'Chanuka' }, event.error);
  if (isInitializing) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection during initialization:', { component: 'Chanuka' }, event.reason);
  if (isInitializing) {
    event.preventDefault();
  }
});

// Start the application
startApplication();