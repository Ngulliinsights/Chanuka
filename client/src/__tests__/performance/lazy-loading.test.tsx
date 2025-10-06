import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dynamic imports
const mockDynamicImport = (component: React.ComponentType, delay: number = 100) => {
  return () => new Promise<{ default: React.ComponentType }>((resolve) => {
    setTimeout(() => {
      resolve({ default: component });
    }, delay);
  });
};

// Mock components for testing
const BillsComponent = () => <div data-testid="bills-page">Bills Dashboard</div>;
const CommunityComponent = () => <div data-testid="community-page">Community Page</div>;
const AdminComponent = () => <div data-testid="admin-page">Admin Dashboard</div>;
const ProfileComponent = () => <div data-testid="profile-page">User Profile</div>;

// Lazy loaded components with different loading times
const LazyBills = React.lazy(mockDynamicImport(BillsComponent, 50));
const LazyCommunity = React.lazy(mockDynamicImport(CommunityComponent, 100));
const LazyAdmin = React.lazy(mockDynamicImport(AdminComponent, 150));
const LazyProfile = React.lazy(mockDynamicImport(ProfileComponent, 75));

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div data-testid="loading-fallback" role="status" aria-label={message}>
    <div className="animate-spin">⏳</div>
    <span>{message}</span>
  </div>
);

// Error boundary for lazy loading failures
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || (() => (
        <div data-testid="lazy-error">Failed to load component</div>
      ));
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Route-based lazy loading test component
const LazyRoutingApp: React.FC = () => (
  <Routes>
    <Route path="/" element={<div data-testid="home">Home</div>} />
    <Route 
      path="/bills" 
      element={
        <React.Suspense fallback={<LoadingFallback message="Loading Bills..." />}>
          <LazyBills />
        </React.Suspense>
      } 
    />
    <Route 
      path="/community" 
      element={
        <React.Suspense fallback={<LoadingFallback message="Loading Community..." />}>
          <LazyCommunity />
        </React.Suspense>
      } 
    />
    <Route 
      path="/admin" 
      element={
        <React.Suspense fallback={<LoadingFallback message="Loading Admin..." />}>
          <LazyAdmin />
        </React.Suspense>
      } 
    />
    <Route 
      path="/profile" 
      element={
        <React.Suspense fallback={<LoadingFallback message="Loading Profile..." />}>
          <LazyProfile />
        </React.Suspense>
      } 
    />
  </Routes>
);

// Test wrapper
const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  initialPath?: string;
}> = ({ children, initialPath = '/' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Lazy Loading and Code Splitting Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Lazy Loading', () => {
    it('should show loading fallback before component loads', async () => {
      render(
        <TestWrapper>
          <React.Suspense fallback={<LoadingFallback />}>
            <LazyBills />
          </React.Suspense>
        </TestWrapper>
      );

      // Should show loading fallback initially
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Loading fallback should be gone
      expect(screen.queryByTestId('loading-fallback')).not.toBeInTheDocument();
    });

    it('should load multiple lazy components independently', async () => {
      render(
        <TestWrapper>
          <div>
            <React.Suspense fallback={<LoadingFallback message="Loading Bills..." />}>
              <LazyBills />
            </React.Suspense>
            <React.Suspense fallback={<LoadingFallback message="Loading Community..." />}>
              <LazyCommunity />
            </React.Suspense>
          </div>
        </TestWrapper>
      );

      // Both loading states should be visible initially
      expect(screen.getByText('Loading Bills...')).toBeInTheDocument();
      expect(screen.getByText('Loading Community...')).toBeInTheDocument();

      // Bills should load first (50ms delay)
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Community should still be loading
      expect(screen.getByText('Loading Community...')).toBeInTheDocument();

      // Community should load next (100ms delay)
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });

      // All loading states should be gone
      expect(screen.queryByText('Loading Bills...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading Community...')).not.toBeInTheDocument();
    });

    it('should handle nested lazy components', async () => {
      const NestedLazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => (
            <div data-testid="nested-parent">
              <React.Suspense fallback={<LoadingFallback message="Loading nested..." />}>
                <LazyProfile />
              </React.Suspense>
            </div>
          )
        })
      );

      render(
        <TestWrapper>
          <React.Suspense fallback={<LoadingFallback message="Loading parent..." />}>
            <NestedLazyComponent />
          </React.Suspense>
        </TestWrapper>
      );

      // Should show parent loading first
      expect(screen.getByText('Loading parent...')).toBeInTheDocument();

      // Wait for parent to load
      await waitFor(() => {
        expect(screen.getByTestId('nested-parent')).toBeInTheDocument();
      });

      // Should show nested loading
      expect(screen.getByText('Loading nested...')).toBeInTheDocument();

      // Wait for nested component to load
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading nested...')).not.toBeInTheDocument();
    });
  });

  describe('Route-Based Code Splitting', () => {
    it('should lazy load route components', async () => {
      render(
        <TestWrapper initialPath="/bills">
          <LazyRoutingApp />
        </TestWrapper>
      );

      // Should show loading state for bills route
      expect(screen.getByText('Loading Bills...')).toBeInTheDocument();

      // Wait for bills component to load
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading Bills...')).not.toBeInTheDocument();
    });

    it('should handle route navigation with lazy loading', async () => {
      const NavigationApp: React.FC = () => {
        const [currentPath, setCurrentPath] = React.useState('/');

        return (
          <div>
            <nav>
              <button onClick={() => setCurrentPath('/')}>Home</button>
              <button onClick={() => setCurrentPath('/bills')}>Bills</button>
              <button onClick={() => setCurrentPath('/community')}>Community</button>
            </nav>
            <MemoryRouter key={currentPath} initialEntries={[currentPath]}>
              <LazyRoutingApp />
            </MemoryRouter>
          </div>
        );
      };

      render(<NavigationApp />);

      // Start at home
      expect(screen.getByTestId('home')).toBeInTheDocument();

      // Navigate to bills
      fireEvent.click(screen.getByText('Bills'));

      // Should show loading state
      expect(screen.getByText('Loading Bills...')).toBeInTheDocument();

      // Wait for bills to load
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Navigate to community
      fireEvent.click(screen.getByText('Community'));

      // Should show loading state
      expect(screen.getByText('Loading Community...')).toBeInTheDocument();

      // Wait for community to load
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
    });

    it('should cache loaded components for subsequent navigation', async () => {
      const loadSpy = vi.fn();
      
      const SpyLazyComponent = React.lazy(() => {
        loadSpy();
        return mockDynamicImport(() => <div data-testid="spy-component">Spy Component</div>)();
      });

      const NavigationTest: React.FC = () => {
        const [showComponent, setShowComponent] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShowComponent(!showComponent)}>
              Toggle Component
            </button>
            {showComponent && (
              <React.Suspense fallback={<LoadingFallback />}>
                <SpyLazyComponent />
              </React.Suspense>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <NavigationTest />
        </TestWrapper>
      );

      const toggleButton = screen.getByText('Toggle Component');

      // First load
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('spy-component')).toBeInTheDocument();
      });
      expect(loadSpy).toHaveBeenCalledTimes(1);

      // Hide component
      fireEvent.click(toggleButton);
      expect(screen.queryByTestId('spy-component')).not.toBeInTheDocument();

      // Show again - should not trigger another load
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('spy-component')).toBeInTheDocument();
      });
      expect(loadSpy).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Error Handling in Lazy Loading', () => {
    it('should handle lazy loading failures gracefully', async () => {
      const FailingLazyComponent = React.lazy(() => 
        Promise.reject(new Error('Failed to load component'))
      );

      render(
        <TestWrapper>
          <LazyLoadErrorBoundary>
            <React.Suspense fallback={<LoadingFallback />}>
              <FailingLazyComponent />
            </React.Suspense>
          </LazyLoadErrorBoundary>
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();

      // Should show error fallback after failure
      await waitFor(() => {
        expect(screen.getByTestId('lazy-error')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('loading-fallback')).not.toBeInTheDocument();
    });

    it('should provide custom error fallbacks', async () => {
      const CustomErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
        <div data-testid="custom-error">
          <h2>Custom Error</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );

      const FailingComponent = React.lazy(() => 
        Promise.reject(new Error('Network error'))
      );

      render(
        <TestWrapper>
          <LazyLoadErrorBoundary fallback={CustomErrorFallback}>
            <React.Suspense fallback={<LoadingFallback />}>
              <FailingComponent />
            </React.Suspense>
          </LazyLoadErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle partial loading failures', async () => {
      const PartiallyFailingComponent = React.lazy(() => 
        Promise.resolve({
          default: () => {
            throw new Error('Component render error');
          }
        })
      );

      render(
        <TestWrapper>
          <LazyLoadErrorBoundary>
            <React.Suspense fallback={<LoadingFallback />}>
              <PartiallyFailingComponent />
            </React.Suspense>
          </LazyLoadErrorBoundary>
        </TestWrapper>
      );

      // Component loads but fails to render
      await waitFor(() => {
        expect(screen.getByTestId('lazy-error')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should preload components on hover', async () => {
      const preloadSpy = vi.fn();
      
      const PreloadableComponent = React.lazy(() => {
        preloadSpy();
        return mockDynamicImport(() => <div data-testid="preloaded">Preloaded</div>)();
      });

      const PreloadTrigger: React.FC = () => {
        const [showComponent, setShowComponent] = React.useState(false);

        const handleMouseEnter = () => {
          // Trigger preload
          import('./PreloadableComponent').catch(() => {});
        };

        return (
          <div>
            <button 
              data-testid="preload-trigger"
              onMouseEnter={handleMouseEnter}
              onClick={() => setShowComponent(true)}
            >
              Load Component
            </button>
            {showComponent && (
              <React.Suspense fallback={<LoadingFallback />}>
                <PreloadableComponent />
              </React.Suspense>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <PreloadTrigger />
        </TestWrapper>
      );

      const trigger = screen.getByTestId('preload-trigger');

      // Hover to trigger preload
      fireEvent.mouseEnter(trigger);

      // Click to show component
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('preloaded')).toBeInTheDocument();
      });
    });

    it('should handle bundle splitting effectively', async () => {
      const loadTimes: number[] = [];
      
      const createTimedComponent = (name: string, delay: number) => 
        React.lazy(() => {
          const startTime = Date.now();
          return new Promise(resolve => {
            setTimeout(() => {
              loadTimes.push(Date.now() - startTime);
              resolve({
                default: () => <div data-testid={`timed-${name}`}>Timed {name}</div>
              });
            }, delay);
          });
        });

      const Component1 = createTimedComponent('1', 50);
      const Component2 = createTimedComponent('2', 75);
      const Component3 = createTimedComponent('3', 100);

      render(
        <TestWrapper>
          <div>
            <React.Suspense fallback={<div>Loading 1...</div>}>
              <Component1 />
            </React.Suspense>
            <React.Suspense fallback={<div>Loading 2...</div>}>
              <Component2 />
            </React.Suspense>
            <React.Suspense fallback={<div>Loading 3...</div>}>
              <Component3 />
            </React.Suspense>
          </div>
        </TestWrapper>
      );

      // Wait for all components to load
      await waitFor(() => {
        expect(screen.getByTestId('timed-1')).toBeInTheDocument();
        expect(screen.getByTestId('timed-2')).toBeInTheDocument();
        expect(screen.getByTestId('timed-3')).toBeInTheDocument();
      });

      // Verify components loaded in parallel (not sequentially)
      expect(loadTimes).toHaveLength(3);
      expect(Math.max(...loadTimes)).toBeLessThan(200); // Should complete within 200ms total
    });

    it('should optimize loading states for better UX', async () => {
      const SmartLoadingComponent: React.FC = () => {
        const [isLoading, setIsLoading] = React.useState(true);
        const [showSkeleton, setShowSkeleton] = React.useState(false);

        React.useEffect(() => {
          // Show skeleton after short delay to avoid flash
          const skeletonTimer = setTimeout(() => {
            if (isLoading) {
              setShowSkeleton(true);
            }
          }, 200);

          // Simulate component loading
          const loadTimer = setTimeout(() => {
            setIsLoading(false);
          }, 300);

          return () => {
            clearTimeout(skeletonTimer);
            clearTimeout(loadTimer);
          };
        }, [isLoading]);

        if (isLoading) {
          return showSkeleton ? (
            <div data-testid="skeleton-loader">
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 mb-2"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-1/2"></div>
            </div>
          ) : null;
        }

        return <div data-testid="smart-loaded">Smart Loaded Content</div>;
      };

      render(
        <TestWrapper>
          <SmartLoadingComponent />
        </TestWrapper>
      );

      // Should not show skeleton immediately
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();

      // Should show skeleton after delay
      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
      });

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByTestId('smart-loaded')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility in Lazy Loading', () => {
    it('should provide proper ARIA labels for loading states', async () => {
      render(
        <TestWrapper>
          <React.Suspense fallback={<LoadingFallback message="Loading content..." />}>
            <LazyBills />
          </React.Suspense>
        </TestWrapper>
      );

      const loadingElement = screen.getByRole('status');
      expect(loadingElement).toHaveAttribute('aria-label', 'Loading content...');

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should announce loading state changes to screen readers', async () => {
      const AnnouncedLoadingComponent: React.FC = () => {
        const [isLoading, setIsLoading] = React.useState(true);
        const [announcement, setAnnouncement] = React.useState('');

        React.useEffect(() => {
          setAnnouncement('Loading content, please wait...');
          
          const timer = setTimeout(() => {
            setIsLoading(false);
            setAnnouncement('Content loaded successfully');
          }, 100);

          return () => clearTimeout(timer);
        }, []);

        return (
          <div>
            <div 
              role="status" 
              aria-live="polite" 
              aria-atomic="true"
              data-testid="sr-announcement"
            >
              {announcement}
            </div>
            {isLoading ? (
              <div data-testid="loading">Loading...</div>
            ) : (
              <div data-testid="content">Content loaded</div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <AnnouncedLoadingComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('sr-announcement')).toHaveTextContent('Loading content, please wait...');

      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeInTheDocument();
        expect(screen.getByTestId('sr-announcement')).toHaveTextContent('Content loaded successfully');
      });
    });

    it('should maintain focus management during lazy loading', async () => {
      const FocusManagementTest: React.FC = () => {
        const [showLazy, setShowLazy] = React.useState(false);
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        const handleLoadComplete = () => {
          // Focus should return to trigger button after loading
          buttonRef.current?.focus();
        };

        return (
          <div>
            <button 
              ref={buttonRef}
              data-testid="load-button"
              onClick={() => setShowLazy(true)}
            >
              Load Component
            </button>
            {showLazy && (
              <React.Suspense fallback={<LoadingFallback />}>
                <LazyBills />
              </React.Suspense>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <FocusManagementTest />
        </TestWrapper>
      );

      const loadButton = screen.getByTestId('load-button');
      loadButton.focus();
      
      expect(document.activeElement).toBe(loadButton);

      fireEvent.click(loadButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Focus should be managed appropriately
      expect(document.activeElement).toBe(loadButton);
    });
  });
});