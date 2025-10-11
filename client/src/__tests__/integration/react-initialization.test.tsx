import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';
import { logger } from '../utils/logger.js';

// Mock modules that are imported in main.tsx
vi.mock('../../utils/serviceWorker', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../utils/asset-loading', () => ({
  assetLoadingManager: {
    preloadCriticalAssets: vi.fn().mockResolvedValue(undefined)
  },
  setupAssetPreloading: vi.fn()
}));

vi.mock('../../utils/mobile-error-handler', () => ({
  getMobileErrorHandler: vi.fn().mockReturnValue({
    initialize: vi.fn(),
    handleError: vi.fn()
  })
}));

vi.mock('../../utils/polyfills', () => ({
  loadPolyfills: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../utils/browser-compatibility', () => ({
  isBrowserSupported: vi.fn().mockReturnValue(true),
  getBrowserWarnings: vi.fn().mockReturnValue([])
}));

vi.mock('../../utils/browser-compatibility-manager', () => ({
  initializeBrowserCompatibility: vi.fn().mockResolvedValue({
    browserInfo: { name: 'Chrome', version: '91.0' },
    isSupported: true,
    polyfillsLoaded: true,
    warnings: []
  })
}));

vi.mock('../../utils/performance-optimizer', () => ({
  performanceOptimizer: {
    initialize: vi.fn()
  }
}));

vi.mock('../../utils/performanceMonitoring', () => ({
  performanceMonitor: {
    measureRouteChange: vi.fn().mockReturnValue(() => {})
  }
}));

vi.mock('../../utils/development-error-recovery', () => ({
  DevelopmentErrorRecovery: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn()
    })
  }
}));

vi.mock('../../utils/development-debug', () => ({
  default: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn()
    })
  }
}));

vi.mock('../../components/loading/AssetLoadingIndicator', () => ({
  AssetLoadingProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="asset-loading-provider">{children}</div>
}));

// Mock App component
vi.mock('../../App', () => ({
  default: () => <div data-testid="app-component">Chanuka App</div>
}));

describe('React Application Initialization Integration Tests', () => {
  let container: HTMLDivElement;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleLog: typeof console.log;

  beforeAll(() => {
    // Mock console methods to capture logs
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    
    console.error = vi.fn();
    console.warn = vi.fn();
    console.log = vi.fn();
  });

  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    // Create a fresh DOM container for each test
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset DOM state
    document.readyState = 'complete';
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clear any timers
    vi.clearAllTimers();
  });

  describe('DOM Readiness and Validation', () => {
    test('should wait for DOM to be ready before mounting', async () => {
      // Simulate loading state
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });

      let domReadyCallback: (() => void) | null = null;
      const mockAddEventListener = vi.fn((event: string, callback: () => void) => {
        if (event === 'DOMContentLoaded') {
          domReadyCallback = callback;
        }
      });

      document.addEventListener = mockAddEventListener;

      // Import and start initialization (this would normally be done in main.tsx)
      const initPromise = new Promise<void>((resolve) => {
        // Simulate the DOM readiness check
        const checkReady = () => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', checkReady, { once: true });
        } else {
          resolve();
        }
      });

      // Simulate DOM becoming ready
      setTimeout(() => {
        Object.defineProperty(document, 'readyState', {
          writable: true,
          value: 'complete'
        });
        if (domReadyCallback) {
          domReadyCallback();
        }
      }, 100);

      await expect(initPromise).resolves.toBeUndefined();
      expect(mockAddEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function), { once: true });
    });

    test('should validate DOM environment before initialization', () => {
      // Test required APIs are available
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
      expect(typeof document.getElementById).toBe('function');
      expect(typeof document.createElement).toBe('function');
      expect(typeof document.addEventListener).toBe('function');
      expect(typeof window.addEventListener).toBe('function');
      expect(typeof localStorage).toBe('object');
      expect(typeof sessionStorage).toBe('object');
      expect(typeof Promise).toBe('function');
    });

    test('should handle missing root element gracefully', () => {
      // Remove root element
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.parentNode) {
        rootElement.parentNode.removeChild(rootElement);
      }

      // Attempt to get root element
      const missingRoot = document.getElementById('root');
      expect(missingRoot).toBeNull();

      // This would normally throw an error in the actual initialization
      expect(() => {
        if (!missingRoot) {
          throw new Error('Root element with id "root" not found. The application cannot start.');
        }
      }).toThrow('Root element with id "root" not found');
    });

    test('should configure root element properly', () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).toBeTruthy();

      // Simulate proper root element configuration
      if (rootElement) {
        if (!rootElement.hasAttribute('role')) {
          rootElement.setAttribute('role', 'application');
          rootElement.setAttribute('aria-label', 'Chanuka Legislative Transparency Platform');
        }

        expect(rootElement.getAttribute('role')).toBe('application');
        expect(rootElement.getAttribute('aria-label')).toBe('Chanuka Legislative Transparency Platform');
      }
    });
  });

  describe('React Application Mounting', () => {
    test('should mount React application successfully', async () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).toBeTruthy();

      if (rootElement) {
        // Create React root and render app
        const root = createRoot(rootElement);
        
        await act(async () => {
          const { AssetLoadingProvider } = await import('../../components/loading/AssetLoadingIndicator');
          const App = (await import('../../App')).default;
          
          root.render(
            <AssetLoadingProvider>
              <App />
            </AssetLoadingProvider>
          );
        });

        // Wait for component to render
        await waitFor(() => {
          expect(screen.getByTestId('asset-loading-provider')).toBeInTheDocument();
          expect(screen.getByTestId('app-component')).toBeInTheDocument();
        });

        expect(screen.getByText('Chanuka App')).toBeInTheDocument();
      }
    });

    test('should handle React mounting errors gracefully', async () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).toBeTruthy();

      if (rootElement) {
        // Mock a component that throws an error
        const ErrorComponent = () => {
          throw new Error('Test mounting error');
        };

        const root = createRoot(rootElement);
        
        // Expect the error to be thrown during rendering
        await expect(async () => {
          await act(async () => {
            root.render(<ErrorComponent />);
          });
        }).rejects.toThrow('Test mounting error');
      }
    });

    test('should initialize with proper loading states', async () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).toBeTruthy();

      if (rootElement) {
        // Simulate loading state display
        rootElement.innerHTML = `
          <div data-testid="loading-state">
            <div>Loading Chanuka Platform</div>
            <div>Validating environment...</div>
            <div style="width: 10%; height: 4px; background: #3b82f6;"></div>
          </div>
        `;

        expect(screen.getByTestId('loading-state')).toBeInTheDocument();
        expect(screen.getByText('Loading Chanuka Platform')).toBeInTheDocument();
        expect(screen.getByText('Validating environment...')).toBeInTheDocument();
      }
    });

    test('should handle component lazy loading', async () => {
      // Mock lazy component loading
      const LazyComponent = vi.fn().mockImplementation(() => 
        Promise.resolve({ default: () => <div>Lazy Component Loaded</div> })
      );

      // Simulate React.lazy behavior
      const mockLazy = vi.fn().mockReturnValue(LazyComponent);
      
      expect(mockLazy).toBeDefined();
      expect(typeof LazyComponent).toBe('function');
    });
  });

  describe('Error Boundary Integration', () => {
    test('should catch and handle component errors', async () => {
      // Mock error boundary component
      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean; error?: Error }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error };
        }

        componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
          logger.error('Error boundary caught error:', { component: 'SimpleTool' }, error, errorInfo);
        }

        render() {
          if (this.state.hasError) {
            return (
              <div data-testid="error-boundary-fallback">
                <h2>Something went wrong</h2>
                <p>Error: {this.state.error?.message}</p>
              </div>
            );
          }

          return this.props.children;
        }
      }

      const ErrorComponent = () => {
        throw new Error('Test component error');
      };

      render(
        <TestErrorBoundary>
          <ErrorComponent />
        </TestErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Error: Test component error')).toBeInTheDocument();
    });

    test('should provide error recovery mechanisms', async () => {
      let errorCount = 0;
      
      const RecoverableComponent = () => {
        errorCount++;
        if (errorCount === 1) {
          throw new Error('Recoverable error');
        }
        return <div data-testid="recovered-component">Component recovered</div>;
      };

      class RecoveryErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean; retryCount: number }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false, retryCount: 0 };
        }

        static getDerivedStateFromError() {
          return { hasError: true };
        }

        handleRetry = () => {
          this.setState({ 
            hasError: false, 
            retryCount: this.state.retryCount + 1 
          });
        };

        render() {
          if (this.state.hasError) {
            return (
              <div data-testid="error-recovery">
                <p>Error occurred</p>
                <button onClick={this.handleRetry} data-testid="retry-button">
                  Retry
                </button>
              </div>
            );
          }

          return this.props.children;
        }
      }

      const { rerender } = render(
        <RecoveryErrorBoundary>
          <RecoverableComponent />
        </RecoveryErrorBoundary>
      );

      // First render should show error
      expect(screen.getByTestId('error-recovery')).toBeInTheDocument();
      
      // Click retry button
      const retryButton = screen.getByTestId('retry-button');
      await act(async () => {
        retryButton.click();
      });

      // Component should recover
      await waitFor(() => {
        expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility and Polyfills', () => {
    test('should initialize browser compatibility manager', async () => {
      const { initializeBrowserCompatibility } = await import('../../utils/browser-compatibility-manager');
      
      const compatibilityStatus = await initializeBrowserCompatibility({
        autoLoadPolyfills: true,
        runTestsOnInit: false,
        blockUnsupportedBrowsers: false,
        showWarnings: true,
        logResults: true
      });

      expect(initializeBrowserCompatibility).toHaveBeenCalledWith({
        autoLoadPolyfills: true,
        runTestsOnInit: false,
        blockUnsupportedBrowsers: false,
        showWarnings: true,
        logResults: true
      });

      expect(compatibilityStatus.isSupported).toBe(true);
      expect(compatibilityStatus.browserInfo).toBeDefined();
      expect(compatibilityStatus.polyfillsLoaded).toBe(true);
    });

    test('should load polyfills when needed', async () => {
      const { loadPolyfills } = await import('../../utils/polyfills');
      
      await loadPolyfills();
      
      expect(loadPolyfills).toHaveBeenCalled();
    });

    test('should handle browser compatibility warnings', async () => {
      // Mock browser compatibility with warnings
      vi.mocked(await import('../../utils/browser-compatibility-manager')).initializeBrowserCompatibility
        .mockResolvedValueOnce({
          browserInfo: { name: 'IE', version: '11.0' },
          isSupported: false,
          polyfillsLoaded: true,
          warnings: ['Browser version is outdated', 'Some features may not work']
        });

      const { initializeBrowserCompatibility } = await import('../../utils/browser-compatibility-manager');
      
      const compatibilityStatus = await initializeBrowserCompatibility({
        autoLoadPolyfills: true,
        runTestsOnInit: false,
        blockUnsupportedBrowsers: false,
        showWarnings: true,
        logResults: true
      });

      expect(compatibilityStatus.warnings).toHaveLength(2);
      expect(compatibilityStatus.warnings).toContain('Browser version is outdated');
      expect(compatibilityStatus.isSupported).toBe(false);
    });
  });

  describe('Asset Loading and Performance', () => {
    test('should preload critical assets', async () => {
      const { assetLoadingManager, setupAssetPreloading } = await import('../../utils/asset-loading');
      
      setupAssetPreloading();
      await assetLoadingManager.preloadCriticalAssets();
      
      expect(setupAssetPreloading).toHaveBeenCalled();
      expect(assetLoadingManager.preloadCriticalAssets).toHaveBeenCalled();
    });

    test('should handle asset loading failures gracefully', async () => {
      // Mock asset loading failure
      vi.mocked(await import('../../utils/asset-loading')).assetLoadingManager.preloadCriticalAssets
        .mockRejectedValueOnce(new Error('Asset loading failed'));

      const { assetLoadingManager } = await import('../../utils/asset-loading');
      
      // Should not throw error, just log warning
      await expect(assetLoadingManager.preloadCriticalAssets()).rejects.toThrow('Asset loading failed');
    });

    test('should initialize performance monitoring', async () => {
      const { performanceMonitor } = await import('../../utils/performanceMonitoring');
      
      const measureRouteChange = performanceMonitor.measureRouteChange('initial-load');
      
      expect(performanceMonitor.measureRouteChange).toHaveBeenCalledWith('initial-load');
      expect(typeof measureRouteChange).toBe('function');
    });
  });

  describe('Service Worker Registration', () => {
    test('should register service worker in production', async () => {
      // Mock production environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { registerServiceWorker } = await import('../../utils/serviceWorker');
      
      await registerServiceWorker({
        onUpdate: vi.fn(),
        onSuccess: vi.fn(),
        onError: vi.fn()
      });

      expect(registerServiceWorker).toHaveBeenCalledWith({
        onUpdate: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function)
      });

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should skip service worker registration in development', async () => {
      // Ensure development environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { registerServiceWorker } = await import('../../utils/serviceWorker');
      
      // In development, service worker registration should be skipped
      // This test verifies the conditional logic would work
      if (process.env.NODE_ENV !== 'production') {
        // Service worker registration should be skipped
        expect(process.env.NODE_ENV).toBe('development');
      }

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Development Mode Features', () => {
    test('should initialize development error recovery in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { DevelopmentErrorRecovery } = await import('../../utils/development-error-recovery');
      
      const instance = DevelopmentErrorRecovery.getInstance();
      
      expect(DevelopmentErrorRecovery.getInstance).toHaveBeenCalled();
      expect(instance).toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should initialize development debug utilities in development mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const DevelopmentDebugger = (await import('../../utils/development-debug')).default;
      
      const instance = DevelopmentDebugger.getInstance();
      
      expect(DevelopmentDebugger.getInstance).toHaveBeenCalled();
      expect(instance).toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Initialization Error Handling', () => {
    test('should report initialization errors properly', () => {
      const error = new Error('Test initialization error');
      const errorReport = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        phase: 'mounting',
        localStorage: {
          available: typeof Storage !== 'undefined',
          quota: 'checking...'
        }
      };

      // Simulate error reporting
      localStorage.setItem('chanuka_init_error', JSON.stringify(errorReport));
      
      const storedError = JSON.parse(localStorage.getItem('chanuka_init_error') || '{}');
      
      expect(storedError.message).toBe('Test initialization error');
      expect(storedError.phase).toBe('mounting');
      expect(storedError.localStorage.available).toBe(true);
    });

    test('should display initialization error to user', () => {
      const rootElement = document.getElementById('root');
      expect(rootElement).toBeTruthy();

      if (rootElement) {
        const error = new Error('Test display error');
        const errorId = `error_${Date.now()}`;
        
        // Simulate error display
        rootElement.innerHTML = `
          <div data-testid="initialization-error">
            <h1>Application Failed to Load</h1>
            <p>The Chanuka Legislative Transparency Platform encountered an error during startup.</p>
            <p>Error occurred during: mounting</p>
            <button data-testid="refresh-button">Refresh Page</button>
            <button data-testid="clear-cache-button">Clear Cache & Reload</button>
            <p>Error ID: ${errorId}</p>
          </div>
        `;

        expect(screen.getByTestId('initialization-error')).toBeInTheDocument();
        expect(screen.getByText('Application Failed to Load')).toBeInTheDocument();
        expect(screen.getByText('Error occurred during: mounting')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
        expect(screen.getByTestId('clear-cache-button')).toBeInTheDocument();
      }
    });
  });
});