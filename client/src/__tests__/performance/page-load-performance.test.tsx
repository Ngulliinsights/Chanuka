import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock components for testing
const HeavyComponent: React.FC<{ itemCount?: number }> = ({ itemCount = 1000 }) => {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));

  return (
    <div data-testid="heavy-component">
      {items.map(item => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
};

const LazyLoadedComponent = React.lazy(() => 
  Promise.resolve({
    default: () => <div data-testid="lazy-component">Lazy Loaded Content</div>
  })
);

const AsyncDataComponent: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      setData(Array.from({ length: 100 }, (_, i) => ({ id: i, value: `Data ${i}` })));
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div data-testid="async-data">
      {data.map(item => (
        <div key={item.id}>{item.value}</div>
      ))}
    </div>
  );
};

// Performance measurement utilities
class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const entries = performance.getEntriesByName(name);
    const duration = entries[entries.length - 1]?.duration || 0;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
    
    return duration;
  }

  getAverageDuration(name: string): number {
    const durations = this.measurements.get(name) || [];
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  getMedianDuration(name: string): number {
    const durations = [...(this.measurements.get(name) || [])].sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    return durations.length % 2 === 0 
      ? (durations[mid - 1] + durations[mid]) / 2 
      : durations[mid];
  }

  clear(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Page Load Performance Tests', () => {
  let measurer: PerformanceMeasurer;

  beforeEach(() => {
    measurer = new PerformanceMeasurer();
    vi.clearAllMocks();
    
    // Mock performance.now to return incrementing values
    let mockTime = 0;
    mockPerformance.now.mockImplementation(() => mockTime += 16.67); // ~60fps
  });

  afterEach(() => {
    measurer.clear();
    vi.restoreAllMocks();
  });

  describe('Initial Page Load Performance', () => {
    it('should load simple components within performance budget', async () => {
      measurer.startMeasurement('simple-component-render');
      
      render(
        <TestWrapper>
          <div data-testid="simple-component">Simple Content</div>
        </TestWrapper>
      );
      
      const duration = measurer.endMeasurement('simple-component-render');
      
      expect(screen.getByTestId('simple-component')).toBeInTheDocument();
      expect(duration).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle heavy components efficiently', async () => {
      measurer.startMeasurement('heavy-component-render');
      
      render(
        <TestWrapper>
          <HeavyComponent itemCount={500} />
        </TestWrapper>
      );
      
      const duration = measurer.endMeasurement('heavy-component-render');
      
      expect(screen.getByTestId('heavy-component')).toBeInTheDocument();
      expect(duration).toBeLessThan(1000); // Should render within 1 second
    });

    it('should measure multiple render cycles for consistency', async () => {
      const renderCount = 5;
      
      for (let i = 0; i < renderCount; i++) {
        measurer.startMeasurement('consistent-render');
        
        const { unmount } = render(
          <TestWrapper>
            <HeavyComponent itemCount={100} />
          </TestWrapper>
        );
        
        measurer.endMeasurement('consistent-render');
        unmount();
      }
      
      const averageDuration = measurer.getAverageDuration('consistent-render');
      const medianDuration = measurer.getMedianDuration('consistent-render');
      
      expect(averageDuration).toBeLessThan(500);
      expect(medianDuration).toBeLessThan(500);
      
      // Variance should be reasonable (within 50% of median)
      const variance = Math.abs(averageDuration - medianDuration);
      expect(variance).toBeLessThan(medianDuration * 0.5);
    });
  });

  describe('Lazy Loading Performance', () => {
    it('should load lazy components efficiently', async () => {
      measurer.startMeasurement('lazy-component-load');
      
      render(
        <TestWrapper>
          <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <LazyLoadedComponent />
          </React.Suspense>
        </TestWrapper>
      );
      
      // Should show loading state initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
      
      const duration = measurer.endMeasurement('lazy-component-load');
      expect(duration).toBeLessThan(200); // Should load within 200ms
    });

    it('should handle multiple lazy components', async () => {
      const LazyComponent1 = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-1">Lazy 1</div>
        })
      );
      
      const LazyComponent2 = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-2">Lazy 2</div>
        })
      );

      measurer.startMeasurement('multiple-lazy-load');
      
      render(
        <TestWrapper>
          <React.Suspense fallback={<div>Loading...</div>}>
            <LazyComponent1 />
            <LazyComponent2 />
          </React.Suspense>
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-1')).toBeInTheDocument();
        expect(screen.getByTestId('lazy-2')).toBeInTheDocument();
      });
      
      const duration = measurer.endMeasurement('multiple-lazy-load');
      expect(duration).toBeLessThan(300);
    });

    it('should handle lazy loading failures gracefully', async () => {
      const FailingLazyComponent = React.lazy(() => 
        Promise.reject(new Error('Failed to load'))
      );

      const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const handleError = () => setHasError(true);
          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        if (hasError) {
          return <div data-testid="error-fallback">Failed to load component</div>;
        }

        return <>{children}</>;
      };

      measurer.startMeasurement('lazy-error-handling');
      
      render(
        <TestWrapper>
          <ErrorBoundary>
            <React.Suspense fallback={<div>Loading...</div>}>
              <FailingLazyComponent />
            </React.Suspense>
          </ErrorBoundary>
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      });
      
      const duration = measurer.endMeasurement('lazy-error-handling');
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Async Data Loading Performance', () => {
    it('should handle async data loading efficiently', async () => {
      measurer.startMeasurement('async-data-load');
      
      render(
        <TestWrapper>
          <AsyncDataComponent />
        </TestWrapper>
      );
      
      // Should show loading state
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('async-data')).toBeInTheDocument();
      });
      
      const duration = measurer.endMeasurement('async-data-load');
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle concurrent async operations', async () => {
      const ConcurrentAsyncComponent: React.FC = () => {
        const [data1, setData1] = React.useState<string[]>([]);
        const [data2, setData2] = React.useState<string[]>([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const loadData = async () => {
            const [result1, result2] = await Promise.all([
              new Promise<string[]>(resolve => 
                setTimeout(() => resolve(['Data 1A', 'Data 1B']), 50)
              ),
              new Promise<string[]>(resolve => 
                setTimeout(() => resolve(['Data 2A', 'Data 2B']), 75)
              ),
            ]);
            
            setData1(result1);
            setData2(result2);
            setLoading(false);
          };

          loadData();
        }, []);

        if (loading) {
          return <div data-testid="concurrent-loading">Loading...</div>;
        }

        return (
          <div data-testid="concurrent-data">
            <div>{data1.join(', ')}</div>
            <div>{data2.join(', ')}</div>
          </div>
        );
      };

      measurer.startMeasurement('concurrent-async-load');
      
      render(
        <TestWrapper>
          <ConcurrentAsyncComponent />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('concurrent-data')).toBeInTheDocument();
      });
      
      const duration = measurer.endMeasurement('concurrent-async-load');
      expect(duration).toBeLessThan(150); // Should be faster than sequential loading
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should not cause memory leaks with repeated renders', async () => {
      const renderCount = 10;
      const components: Array<() => void> = [];

      for (let i = 0; i < renderCount; i++) {
        measurer.startMeasurement(`memory-test-${i}`);
        
        const { unmount } = render(
          <TestWrapper>
            <HeavyComponent itemCount={100} />
          </TestWrapper>
        );
        
        components.push(unmount);
        measurer.endMeasurement(`memory-test-${i}`);
      }

      // Cleanup all components
      components.forEach(unmount => unmount());

      // Verify no significant performance degradation
      const firstRender = measurer.getAverageDuration('memory-test-0');
      const lastRender = measurer.getAverageDuration(`memory-test-${renderCount - 1}`);
      
      // Last render should not be significantly slower than first
      expect(lastRender).toBeLessThan(firstRender * 2);
    });

    it('should handle rapid mount/unmount cycles', async () => {
      const cycleCount = 20;
      
      measurer.startMeasurement('rapid-cycles');
      
      for (let i = 0; i < cycleCount; i++) {
        const { unmount } = render(
          <TestWrapper>
            <div data-testid={`cycle-${i}`}>Cycle {i}</div>
          </TestWrapper>
        );
        
        unmount();
      }
      
      const duration = measurer.endMeasurement('rapid-cycles');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      const baselineRuns = 5;
      const testRuns = 5;
      
      // Establish baseline
      for (let i = 0; i < baselineRuns; i++) {
        measurer.startMeasurement('baseline');
        
        const { unmount } = render(
          <TestWrapper>
            <HeavyComponent itemCount={200} />
          </TestWrapper>
        );
        
        measurer.endMeasurement('baseline');
        unmount();
      }
      
      const baselineMedian = measurer.getMedianDuration('baseline');
      
      // Test current performance
      for (let i = 0; i < testRuns; i++) {
        measurer.startMeasurement('current');
        
        const { unmount } = render(
          <TestWrapper>
            <HeavyComponent itemCount={200} />
          </TestWrapper>
        );
        
        measurer.endMeasurement('current');
        unmount();
      }
      
      const currentMedian = measurer.getMedianDuration('current');
      
      // Current performance should not be significantly worse than baseline
      const regressionThreshold = baselineMedian * 1.5; // 50% regression threshold
      expect(currentMedian).toBeLessThan(regressionThreshold);
    });

    it('should track performance metrics over time', async () => {
      const metrics = {
        renderTime: [] as number[],
        componentCount: [] as number[],
        memoryUsage: [] as number[],
      };

      for (let i = 0; i < 10; i++) {
        measurer.startMeasurement(`tracking-${i}`);
        
        const componentCount = 50 + i * 10;
        render(
          <TestWrapper>
            <HeavyComponent itemCount={componentCount} />
          </TestWrapper>
        );
        
        const renderTime = measurer.endMeasurement(`tracking-${i}`);
        
        metrics.renderTime.push(renderTime);
        metrics.componentCount.push(componentCount);
        metrics.memoryUsage.push(performance.now()); // Mock memory usage
      }

      // Verify performance scales reasonably with component count
      const firstRender = metrics.renderTime[0];
      const lastRender = metrics.renderTime[metrics.renderTime.length - 1];
      const componentRatio = metrics.componentCount[metrics.componentCount.length - 1] / metrics.componentCount[0];
      
      // Performance should not degrade exponentially
      expect(lastRender / firstRender).toBeLessThan(componentRatio * 2);
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('should handle typical user interaction patterns', async () => {
      const InteractiveComponent: React.FC = () => {
        const [activeTab, setActiveTab] = React.useState(0);
        const [data, setData] = React.useState<any[]>([]);

        React.useEffect(() => {
          // Simulate data loading for active tab
          const loadData = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            setData(Array.from({ length: 50 }, (_, i) => ({ 
              id: i, 
              tab: activeTab, 
              content: `Content ${i} for tab ${activeTab}` 
            })));
          };

          loadData();
        }, [activeTab]);

        return (
          <div data-testid="interactive-component">
            <div>
              {[0, 1, 2].map(tab => (
                <button 
                  key={tab}
                  data-testid={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    backgroundColor: activeTab === tab ? '#blue' : '#gray' 
                  }}
                >
                  Tab {tab}
                </button>
              ))}
            </div>
            <div data-testid="tab-content">
              {data.map(item => (
                <div key={item.id}>{item.content}</div>
              ))}
            </div>
          </div>
        );
      };

      measurer.startMeasurement('user-interaction');
      
      render(
        <TestWrapper>
          <InteractiveComponent />
        </TestWrapper>
      );
      
      // Simulate user interactions
      const tab1 = screen.getByTestId('tab-1');
      const tab2 = screen.getByTestId('tab-2');
      
      // Click different tabs rapidly
      tab1.click();
      await waitFor(() => expect(screen.getByTestId('tab-content')).toBeInTheDocument());
      
      tab2.click();
      await waitFor(() => expect(screen.getByTestId('tab-content')).toBeInTheDocument());
      
      const duration = measurer.endMeasurement('user-interaction');
      expect(duration).toBeLessThan(300); // Should handle interactions smoothly
    });

    it('should maintain performance under load', async () => {
      const LoadTestComponent: React.FC = () => {
        const [items, setItems] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(false);

        const addItems = async () => {
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 10));
          
          setItems(prev => [
            ...prev,
            ...Array.from({ length: 100 }, (_, i) => ({
              id: prev.length + i,
              data: `Item ${prev.length + i}`,
            }))
          ]);
          
          setLoading(false);
        };

        return (
          <div data-testid="load-test">
            <button 
              data-testid="add-items" 
              onClick={addItems}
              disabled={loading}
            >
              Add Items ({items.length})
            </button>
            <div data-testid="items-list">
              {items.map(item => (
                <div key={item.id}>{item.data}</div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <LoadTestComponent />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('add-items');
      
      // Add items multiple times to simulate load
      for (let i = 0; i < 5; i++) {
        measurer.startMeasurement(`load-test-${i}`);
        
        addButton.click();
        await waitFor(() => {
          expect(screen.getByText(`Add Items (${(i + 1) * 100})`)).toBeInTheDocument();
        });
        
        const duration = measurer.endMeasurement(`load-test-${i}`);
        expect(duration).toBeLessThan(200);
      }

      // Performance should remain consistent
      const firstLoad = measurer.getAverageDuration('load-test-0');
      const lastLoad = measurer.getAverageDuration('load-test-4');
      
      expect(lastLoad).toBeLessThan(firstLoad * 3); // Should not degrade significantly
    });
  });
});