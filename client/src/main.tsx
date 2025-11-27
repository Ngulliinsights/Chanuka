import ExtensionErrorSuppressor from '@client/utils/extension-error-suppressor';
import DevErrorSuppressor from '@client/utils/dev-error-suppressor';
import { DevServerCheck } from '@client/utils/dev-server-check';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from '@client/utils/serviceWorker';
import { logger } from '@client/utils/logger';
import { initPerformanceMonitoring, performanceMonitor } from '@client/utils/performance-monitor';
import { ErrorBoundaryProvider } from './components/error-boundaries/ErrorBoundaryProvider';

// Initialize error suppression in development
DevErrorSuppressor.init();

// Initialize extension error suppressor
ExtensionErrorSuppressor.getInstance();

/**
 * Ensures process.env exists in browser runtime for compatibility with Node.js-style code.
 * This prevents ReferenceErrors when shared modules check process.env.NODE_ENV.
 * We prioritize Vite's import.meta.env.MODE when available for consistency.
 */
(function ensureProcessEnv() {
  try {
    const mode =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) ||
      (typeof (import.meta as any).env?.VITE_NODE_ENV !== 'undefined' &&
        (import.meta as any).env.VITE_NODE_ENV) ||
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
    // Silent failure prevents initialization crash if environment setup fails
  }
})();

/**
 * Type Definitions
 * These interfaces define the structure of our initialization system,
 * making the code more maintainable and catching errors at compile time.
 */
interface LoadingState {
  phase: 'validating' | 'dom-ready' | 'mounting' | 'service-worker' | 'complete';
  message: string;
  progress: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: Error, attempt: number) => boolean;
}

interface AssetLoadingManager {
  preloadCriticalAssets(): Promise<void>;
  setupPreloading?(): void;
}

/**
 * Initialization State Management
 * These module-level variables coordinate the initialization process
 * and prevent duplicate initialization attempts across multiple calls.
 */
let currentLoadingState: LoadingState = {
  phase: 'validating',
  message: 'Validating environment...',
  progress: 0,
};

let initRetries = 0;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;
let assetLoadingManager: AssetLoadingManager | null = null;

/**
 * Development Utilities Initialization
 * Loads debugging and error recovery tools only in development mode.
 * These load asynchronously and won't block the main initialization path.
 * Failures here are logged but don't prevent application startup.
 */
if (process.env.NODE_ENV === 'development') {
  // Load all development utilities together and handle failures gracefully
  Promise.all([
    import('@client/utils/super-aggressive-suppressor').catch(() => null),
    import('@client/utils/comprehensive-error-suppressor').catch(() => null),
    import('@client/utils/development-overrides').catch(() => null),
    import('@client/utils/error-suppression').catch(() => null),
    import('@client/utils/development-error-recovery')
      .then(({ DevelopmentErrorRecovery }) => {
        DevelopmentErrorRecovery.getInstance();
        logger.info('🛡️ Development error recovery initialized', { component: 'Chanuka' });
      })
      .catch(error => console.warn('Failed to initialize development error recovery:', error)),
    import('@client/utils/development-debug')
      .then(({ default: DevelopmentDebugger }) => {
        DevelopmentDebugger.getInstance();
        logger.info('🔧 Development debug utilities initialized', { component: 'Chanuka' });
      })
      .catch(error => console.warn('Failed to initialize development debug utilities:', error)),
  ]).catch(() => {
    // Silent failure for development utilities - they're not critical for app functionality
  });
}

/**
 * Localization Error Suppression
 * Handle RegisterClientLocalizationsError that can occur during development
 */
window.addEventListener('unhandledrejection', event => {
  if (event.reason?.name === 'RegisterClientLocalizationsError' || 
      event.reason?.message?.includes('Cannot read properties of undefined (reading \'translations\')')) {
    console.warn(
      'Localization registration failed, continuing with fallback:',
      event.reason?.message || 'Unknown localization error'
    );
    event.preventDefault();
    return false;
  }
});

// Check server connections in development
if (import.meta.env.DEV) {
  DevServerCheck.checkServerConnection().then(isConnected => {
    if (!isConnected) {
      DevServerCheck.showConnectionWarning();
    }
  });
}

/**
 * API Connection Error Suppression
 * Handle connection refused errors gracefully during development
 */
window.addEventListener('unhandledrejection', event => {
  if (
    event.reason?.message?.includes('ERR_CONNECTION_REFUSED') ||
    event.reason?.message?.includes('Failed to fetch') ||
    event.reason?.message?.includes('ERR_FAILED') ||
    event.reason?.message?.includes('WebSocket connection') ||
    event.reason?.message?.includes('net::ERR_')
  ) {
    if (import.meta.env.DEV) {
      console.warn('🔧 Development: Connection failed, using fallback data');
    }
    event.preventDefault();
    return false;
  }
});

/**
 * Browser Extension Error Suppression
 * Many browser extensions inject scripts that can cause harmless but noisy errors.
 * We suppress these to keep the console clean and focus on real application errors.
 */
window.addEventListener('error', event => {
  if (event.message?.includes('message channel closed before a response was received')) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', event => {
  if (event.reason?.message?.includes('message channel closed before a response was received')) {
    event.preventDefault();
    return false;
  }
});

/**
 * DOM Readiness Check
 * Waits for the DOM to be fully parsed and ready for manipulation.
 * Uses a 10-second timeout to prevent indefinite hanging in edge cases.
 * Listens to multiple events for maximum browser compatibility.
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
 * Performs comprehensive checks to ensure all required browser APIs are available.
 * This catches environment issues early with clear error messages rather than
 * cryptic failures later in the initialization sequence.
 */
function validateDOMEnvironment(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Application must run in a browser environment');
  }

  // Check critical DOM APIs by safely traversing the object hierarchy
  const requiredAPIs = [
    'document.getElementById',
    'document.createElement',
    'document.addEventListener',
    'window.addEventListener',
    'localStorage',
    'sessionStorage',
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

  // Validate modern browser features that are critical for functionality
  if (!window.Promise) {
    throw new Error('Promise support is required');
  }

  if (!window.fetch) {
    console.warn('Fetch API not available, polyfill may be needed');
  }
}

/**
 * Loading State Display
 * Renders a user-friendly loading screen with animated progress indicator.
 * Uses inline styles to avoid CSS dependencies during initialization,
 * ensuring the loading screen appears even if external stylesheets fail.
 */
function showLoadingState(state: LoadingState): void {
  const rootElement = document.getElementById('root');
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
 * Centralized function for updating the initialization progress display.
 * This ensures consistent state updates and keeps users informed during startup.
 */
function updateLoadingState(phase: LoadingState['phase'], message: string, progress: number): void {
  currentLoadingState = { phase, message, progress };
  showLoadingState(currentLoadingState);
}

/**
 * Browser Compatibility Initialization
 * Attempts to load advanced compatibility manager with fallback to basic polyfills.
 * This is non-blocking, allowing the app to continue even if compatibility checks fail.
 * Logs detailed compatibility information to help diagnose browser-specific issues.
 */
async function initializeBrowserCompatibility(): Promise<void> {
  updateLoadingState('validating', 'Initializing browser compatibility...', 12);

  try {
    const { initializeBrowserCompatibility } = await import(
      './utils/browser-compatibility-manager'
    );
    const compatibilityStatus = await initializeBrowserCompatibility({
      autoLoadPolyfills: true,
      runTestsOnInit: false,
      blockUnsupportedBrowsers: false,
      showWarnings: true,
      logResults: true,
    });

    logger.info(
      'Browser compatibility initialized:',
      { component: 'Chanuka' },
      {
        browser: `${compatibilityStatus.browserInfo.name} ${compatibilityStatus.browserInfo.version}`,
        supported: compatibilityStatus.isSupported,
        polyfillsLoaded: compatibilityStatus.polyfillsLoaded,
        warnings: compatibilityStatus.warnings.length,
      }
    );

    if (compatibilityStatus.warnings.length > 0) {
      console.warn('Browser compatibility warnings:', compatibilityStatus.warnings);
    }
  } catch (error) {
    console.warn('Browser compatibility initialization failed, using fallback:', error);

    try {
      const { loadPolyfills } = await import('@client/utils/polyfills');
      await loadPolyfills();
      logger.info('Fallback polyfills loaded successfully', { component: 'Chanuka' });
    } catch (polyfillError) {
      console.warn('Fallback polyfills also failed:', polyfillError);
    }
  }
}

/**
 * Asset Loading Manager Initialization
 * Dynamically imports the asset loading manager to avoid circular dependencies.
 * Provides a no-op fallback if the module is unavailable, preventing initialization failure.
 */
async function initializeAssetLoadingManager(): Promise<void> {
  try {
    const module = await import('@client/utils/asset-loading');
    assetLoadingManager = module.assetLoadingManager;

    // Initialize preloading setup if the method exists
    if (assetLoadingManager && typeof (assetLoadingManager as any).setupPreloading === 'function') {
      (assetLoadingManager as any).setupPreloading();
    }
  } catch (error) {
    console.warn('Asset loading manager not available, skipping asset preloading:', error);
    // Provide no-op implementation to prevent null reference errors
    assetLoadingManager = {
      preloadCriticalAssets: async () => {
        console.warn('Asset preloading skipped - manager not available');
      },
    };
  }
}

/**
 * Asset Preloading
 * Initializes asset optimization and preloads critical resources for faster initial render.
 * This improves perceived performance by fetching important assets early,
 * but failures are non-blocking to prevent asset issues from breaking the application.
 */
async function preloadAssets(): Promise<void> {
  console.log('🔍 DEBUG: Starting preloadAssets');
  updateLoadingState('validating', 'Setting up asset optimization...', 18);

  console.log('🔍 DEBUG: About to initialize asset loading manager');
  await initializeAssetLoadingManager();
  console.log('🔍 DEBUG: Asset loading manager initialized');

  updateLoadingState('validating', 'Preloading critical assets...', 22);
  try {
    if (assetLoadingManager) {
      console.log('🔍 DEBUG: Calling preloadCriticalAssets');
      await assetLoadingManager.preloadCriticalAssets();
      console.log('🔍 DEBUG: Critical assets preloaded');
      logger.info('Critical assets preloaded successfully', { component: 'Chanuka' });
    } else {
      console.log('🔍 DEBUG: No asset loading manager available');
    }
  } catch (error) {
    console.log('🔍 DEBUG: Failed to preload critical assets:', error);
    console.warn('Failed to preload critical assets:', error);
  }
}

/**
 * Root Element Validation and Configuration
 * Ensures the React mount point exists and is properly configured.
 * Sets accessibility attributes and ensures visibility for screen readers.
 * Throws an error if the root element is missing, as the app cannot function without it.
 */
function validateAndConfigureRoot(): HTMLElement {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element with id "root" not found. The application cannot start.');
  }

  // Configure accessibility attributes for better screen reader support
  if (!rootElement.hasAttribute('role')) {
    rootElement.setAttribute('role', 'application');
    rootElement.setAttribute('aria-label', 'Chanuka Legislative Transparency Platform');
  }

  // Ensure the root element is visible - some CSS resets might hide it
  const computedStyle = window.getComputedStyle(rootElement);
  if (computedStyle.display === 'none') {
    console.warn('Root element is hidden, making it visible');
    rootElement.style.display = 'block';
  }

  return rootElement;
}

/**
 * React Application Mounting
 * Creates the React root and renders the application with necessary state initialization.
 * Includes a brief delay to ensure the loading state is visible to users,
 * improving perceived performance by showing progress rather than a blank screen.
 */
async function mountReactApp(rootElement: HTMLElement): Promise<void> {
  console.log('🔍 DEBUG: Starting mountReactApp');
  updateLoadingState('mounting', 'Initializing application state...', 50);
  logger.info('DOM ready, initializing application state...', { component: 'Chanuka' });

  // Initialize Redux store before mounting the React application
  console.log('🔍 DEBUG: About to import store');
  try {
    const { initializeStore } = await import('@client/store');
    console.log('🔍 DEBUG: Store imported, calling initializeStore');
    await initializeStore();
    console.log('🔍 DEBUG: Store initialization completed');
    logger.info('Store initialized successfully', { component: 'Chanuka' });
  } catch (error) {
    console.log('🔍 DEBUG: Store initialization failed:', error);
    logger.warn('Store initialization failed, using fallback', {
      component: 'Chanuka',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  updateLoadingState('mounting', 'Mounting React application...', 60);

  // Brief delay ensures the loading state is visible rather than flashing too quickly
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const root = createRoot(rootElement);

    // Render immediately for better Largest Contentful Paint (LCP) score
    // Wrap App with ErrorBoundaryProvider for comprehensive error handling
    root.render(
      <ErrorBoundaryProvider>
        <App />
      </ErrorBoundaryProvider>
    );

    // Initialize performance monitoring after the initial render
    await initPerformanceMonitoring();

    logger.info('React application mounted successfully', { component: 'Chanuka' });
    updateLoadingState('mounting', 'React application mounted...', 80);
  } catch (mountError) {
    logger.error('Failed to mount React application:', { component: 'Chanuka' }, mountError);
    throw new Error(
      `React mounting failed: ${mountError instanceof Error ? mountError.message : 'Unknown error'}`
    );
  }
}

/**
 * Service Worker Registration
 * Registers the service worker in production for offline support and asset caching.
 * Shows update notifications when new content becomes available,
 * allowing users to refresh and get the latest version of the application.
 */
async function registerServiceWorkerIfProduction(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  updateLoadingState('service-worker', 'Registering service worker...', 90);

  try {
    await registerServiceWorker({
      onUpdate: _registration => {
        logger.info('New content is available; please refresh.', { component: 'Chanuka' });
        showUpdateNotification();
      },
      onSuccess: _registration => {
        logger.info('Content is cached for offline use.', { component: 'Chanuka' });
      },
      onError: error => {
        logger.error('Service worker registration failed:', { component: 'Chanuka' }, error);
      },
    });
  } catch (swError) {
    console.warn('Service worker registration failed:', swError);
  }
}

/**
 * Performance Monitoring Initialization
 * Starts collecting performance metrics after the application loads.
 * Runs with a delay to avoid impacting initial render performance,
 * ensuring we measure real user experience without the measurement causing slowdowns.
 */
function initializePerformanceMonitoring(): void {
  updateLoadingState('complete', 'Initializing performance monitoring...', 95);

  try {
    logger.info('🚀 Performance monitoring active', { component: 'Chanuka' });

    // Delay monitoring to avoid impacting the initial load we're trying to measure
    setTimeout(() => {
      performanceMonitor.startMonitoring();

      // Log initial page load metrics if available
      if (window.performance?.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        logger.info('Initial page load time:', { component: 'Chanuka' }, { loadTime });
      }
    }, 1000);
  } catch (perfError) {
    console.warn('Performance monitoring initialization failed:', perfError);
  }
}

/**
 * Main Application Initialization
 * Orchestrates all initialization phases in the correct sequence.
 * Each phase updates the loading state to keep users informed of progress.
 * Failures are handled gracefully to allow retry or display helpful error messages.
 */
async function initializeApp(): Promise<void> {
  console.log('🔍 DEBUG: Starting initializeApp');
  logger.info('Initializing Chanuka Legislative Transparency Platform...', {
    component: 'Chanuka',
  });

  try {
    // Phase 1: Validate that we're in a proper browser environment
    console.log('🔍 DEBUG: Phase 1 - Validating browser environment');
    updateLoadingState('validating', 'Validating browser environment...', 10);
    validateDOMEnvironment();
    console.log('🔍 DEBUG: Phase 1 completed');

    // Phase 2: Set up browser compatibility and load polyfills if needed
    console.log('🔍 DEBUG: Phase 2 - Initializing browser compatibility');
    await initializeBrowserCompatibility();
    console.log('🔍 DEBUG: Phase 2 completed');

    // Phase 3: Begin preloading critical assets for faster initial render
    console.log('🔍 DEBUG: Phase 3 - Preloading assets');
    await preloadAssets();
    console.log('🔍 DEBUG: Phase 3 completed');

    // Phase 4: Wait for the DOM to be fully parsed and ready
    console.log('🔍 DEBUG: Phase 4 - Waiting for DOM');
    updateLoadingState('dom-ready', 'Waiting for DOM to be ready...', 30);
    await waitForDOM();
    console.log('🔍 DEBUG: Phase 4 completed');

    // Phase 5: Validate and configure the React mount point
    console.log('🔍 DEBUG: Phase 5 - Validating root element');
    const rootElement = validateAndConfigureRoot();
    console.log('🔍 DEBUG: Phase 5 completed');

    // Phase 6: Initialize state and mount the React application
    console.log('🔍 DEBUG: Phase 6 - Mounting React app');
    await mountReactApp(rootElement);
    console.log('🔍 DEBUG: Phase 6 completed');

    // Phase 7: Register service worker for offline support (production only)
    console.log('🔍 DEBUG: Phase 7 - Registering service worker');
    await registerServiceWorkerIfProduction();
    console.log('🔍 DEBUG: Phase 7 completed');

    // Phase 8: Check server connectivity
    console.log('🔍 DEBUG: Phase 8 - Checking server connectivity');
    updateLoadingState('complete', 'Checking server connectivity...', 85);
    try {
      const { initializeServerStatusCheck } = await import('@client/utils/server-status');
      initializeServerStatusCheck();
      console.log('🔍 DEBUG: Server status check initialized');
    } catch (error) {
      console.log('🔍 DEBUG: Server status check failed:', error);
      console.warn('Server status check initialization failed:', error);
    }

    // Phase 9: Start performance monitoring to track user experience
    console.log('🔍 DEBUG: Phase 9 - Initializing performance monitoring');
    initializePerformanceMonitoring();
    console.log('🔍 DEBUG: Phase 9 completed');

    // Phase 10: Mark initialization as complete
    console.log('🔍 DEBUG: Phase 10 - Initialization complete');
    updateLoadingState('complete', 'Application ready!', 100);
    setTimeout(() => {
      // Loading state will be replaced by actual app content
    }, 200);

    logger.info('Application initialization completed successfully', { component: 'Chanuka' });
  } catch (error) {
    console.log('🔍 DEBUG: initializeApp failed:', error);
    logger.error('Application initialization failed:', { component: 'Chanuka' }, error);
    throw error;
  }
}

/**
 * Update Notification Display
 * Shows a clickable notification when a new app version is available.
 * Auto-dismisses after 10 seconds to avoid permanently blocking the interface,
 * but users can click anytime to refresh and get the new version.
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

  // Auto-dismiss with fade-out animation
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 10000);
}

/**
 * Error Reporting
 * Logs detailed error information to localStorage for debugging purposes.
 * Attempts to send to external error reporting service if configured.
 * This helps diagnose initialization issues users report without requiring console access.
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
      retryCount: initRetries,
      localStorage: {
        available: typeof Storage !== 'undefined',
        quota: 'checking...',
      },
    };

    localStorage.setItem('chanuka_init_error', JSON.stringify(errorReport));

    // Send to external error reporting if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.report(error, errorReport);
    }

    // Check storage quota asynchronously without blocking
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        logger.info(
          'Storage quota:',
          { component: 'Chanuka' },
          estimate as Record<string, unknown>
        );
      });
    }
  } catch (reportingError) {
    logger.error(
      'Failed to report initialization error:',
      { component: 'Chanuka' },
      reportingError
    );
  }
}

/**
 * Initialization Error Display
 * Shows a user-friendly error screen with recovery options.
 * Includes detailed technical information in development mode for debugging,
 * while keeping production errors user-friendly without overwhelming details.
 */
function showInitializationError(error: Error): void {
  const rootElement = document.getElementById('root');
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
        
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap;">
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
        
        ${
          isDevelopment
            ? `
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
Retry Count: ${initRetries}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}</pre>
            </div>
          </details>
        `
            : ''
        }
        
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
          console.error('Failed to clear storage:', e);
          window.location.reload();
        }
      }
    </script>
  `;
}

/**
 * Retry Configuration
 * Defines the exponential backoff strategy for initialization retries.
 * Avoids retrying non-recoverable errors like missing DOM elements,
 * while allowing recovery from transient network or timing issues.
 */
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error, attempt: number) => {
    // Identify errors that indicate permanent problems not worth retrying
    const nonRetryableErrors = [
      'Root element not found',
      'browser environment',
      'Required API',
      'Promise support',
    ];

    const isNonRetryable = nonRetryableErrors.some(msg => error.message.includes(msg));
    return !isNonRetryable && attempt < 3;
  },
};

/**
 * Initialization with Retry
 * Implements exponential backoff retry logic for transient initialization failures.
 * Prevents duplicate initialization attempts and tracks retry count,
 * ensuring we don't overwhelm the system while still recovering from temporary issues.
 */
async function initWithRetry(config: RetryConfig = defaultRetryConfig): Promise<void> {
  // Prevent duplicate initialization if one is already in progress
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
      reportInitializationError(currentError);

      const shouldRetry =
        config.retryCondition(currentError, initRetries) && initRetries <= config.maxRetries;

      if (shouldRetry) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, initRetries - 1),
          config.maxDelay
        );

        console.log(
          `Retrying initialization in ${delay}ms... (attempt ${initRetries + 1}/${config.maxRetries + 1})`
        );
        updateLoadingState(
          'validating',
          `Retrying initialization... (${initRetries}/${config.maxRetries})`,
          5
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        isInitializing = false;
        initializationPromise = null;
        return initWithRetry(config);
      } else {
        logger.error('Maximum initialization retries exceeded or non-retryable error encountered', {
          component: 'Chanuka',
        });
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
 * Entry point that handles initial loading state display and kicks off
 * the initialization with retry mechanism. This is the main function
 * called when the script loads.
 */
async function startApplication(): Promise<void> {
  try {
    // Show loading state immediately if DOM is ready, otherwise wait for DOMContentLoaded
    if (document.readyState !== 'loading') {
      updateLoadingState('validating', 'Starting application...', 0);
    } else {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          updateLoadingState('validating', 'Starting application...', 0);
        },
        { once: true }
      );
    }

    await initWithRetry();
  } catch (error) {
    logger.error('Fatal error during application startup:', { component: 'Chanuka' }, error);
    reportInitializationError(error as Error);

    try {
      showInitializationError(error as Error);
    } catch (fallbackError) {
      logger.error('Failed to show error message:', { component: 'Chanuka' }, fallbackError);

      // Last resort fallback error display with inline styles
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
 * Capture unhandled errors during initialization to prevent silent failures.
 * Prevents errors from bubbling up and allows the retry mechanism to handle them gracefully.
 * Only intercepts errors during the initialization phase to avoid interfering with normal app operation.
 */
window.addEventListener('error', event => {
  logger.error('Global error during initialization:', { component: 'Chanuka' }, event.error);
  if (isInitializing) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', event => {
  logger.error(
    'Unhandled promise rejection during initialization:',
    { component: 'Chanuka' },
    event.reason
  );
  if (isInitializing) {
    event.preventDefault();
  }
});

/**
 * Initialize Mobile Error Handling
 * Load mobile-specific error handling for better error reporting on mobile devices.
 * This is done asynchronously and non-blocking to avoid delaying startup.
 */
if (typeof window !== 'undefined') {
  import('@client/utils/mobile-error-handler')
    .then(({ getMobileErrorHandler }) => {
      getMobileErrorHandler();
      logger.info('📱 Mobile error handling initialized', { component: 'Chanuka' });
    })
    .catch(error => console.warn('Failed to initialize mobile error handler:', error));
}

/**
 * Start the Application
 * This is the actual entry point - we call startApplication() immediately
 * when the module loads to begin the initialization process.
 */
startApplication();
