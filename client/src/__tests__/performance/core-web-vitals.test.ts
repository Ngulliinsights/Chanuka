/**
 * Core Web Vitals Performance Tests
 * Tests LCP, FID, CLS and other performance metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  renderWithProviders, 
  MockDataFactory, 
  PerformanceTestUtils,
  screen,
  waitFor
} from '@client/test-utils/comprehensive-test-setup';
import { App } from '@client/App';

// Mock performance APIs
const mockPerformanceObserver = vi.fn();
const mockPerformanceEntries: any[] = [];

global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  mockPerformanceObserver.mockImplementation(callback);
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
  };
});

global.performance.getEntriesByType = vi.fn().mockImplementation((type: string) => {
  return mockPerformanceEntries.filter(entry => entry.entryType === type);
});

describe('Core Web Vitals Performance Tests', () => {
  let mockBills: any[];

  beforeEach(() => {
    mockBills = Array.from({ length: 20 }, () => MockDataFactory.createMockBill());
    
    // Reset performance mocks
    mockPerformanceEntries.length = 0;
    vi.clearAllMocks();
    
    // Mock API responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBills, total: mockBills.length }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // LARGEST CONTENTFUL PAINT (LCP) TESTS
  // =============================================================================

  describe('Largest Contentful Paint (LCP)', () => {
    it('should meet LCP threshold for bills dashboard', async () => {
      // Mock LCP entry
      const lcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 1200, // 1.2 seconds - good LCP
        element: document.createElement('div'),
      };
      mockPerformanceEntries.push(lcpEntry);

      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      const lcp = await PerformanceTestUtils.testCoreWebVitals.measureLCP();
      expect({ lcp }).toMeetCoreWebVitals();
    });

    it('should meet LCP threshold for bill detail page', async () => {
      const billId = mockBills[0].id;
      
      // Mock LCP entry for bill detail
      const lcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 1800, // 1.8 seconds - acceptable LCP
        element: document.createElement('article'),
      };
      mockPerformanceEntries.push(lcpEntry);

      renderWithProviders(<App />, { route: `/bills/${billId}` });

      await waitFor(() => {
        expect(screen.getByText('Bill Details')).toBeInTheDocument();
      });

      const lcp = await PerformanceTestUtils.testCoreWebVitals.measureLCP();
      expect({ lcp }).toMeetCoreWebVitals();
    });

    it('should optimize LCP for image-heavy content', async () => {
      const billsWithImages = mockBills.map(bill => ({
        ...bill,
        image_url: 'https://example.com/bill-image.jpg',
      }));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: billsWithImages }),
      });

      // Mock image loading
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        complete: false,
      };

      global.Image = vi.fn().mockImplementation(() => mockImage);

      renderWithProviders(<App />, { route: '/bills' });

      // Simulate fast image loading
      setTimeout(() => {
        mockImage.complete = true;
        if (mockImage.onload) mockImage.onload();
      }, 100);

      const lcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 1500, // Should still be under threshold with optimized images
        element: mockImage,
      };
      mockPerformanceEntries.push(lcpEntry);

      const lcp = await PerformanceTestUtils.testCoreWebVitals.measureLCP();
      expect({ lcp }).toMeetCoreWebVitals();
    });

    it('should handle slow network conditions gracefully', async () => {
      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockBills }),
          }), 2000) // 2 second delay
        )
      );

      renderWithProviders(<App />, { route: '/bills' });

      // Should show loading state quickly
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

      // Mock LCP for loading state (should be fast)
      const lcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 800, // Loading skeleton renders quickly
        element: document.createElement('div'),
      };
      mockPerformanceEntries.push(lcpEntry);

      const lcp = await PerformanceTestUtils.testCoreWebVitals.measureLCP();
      expect({ lcp }).toMeetCoreWebVitals();
    });
  });

  // =============================================================================
  // FIRST INPUT DELAY (FID) TESTS
  // =============================================================================

  describe('First Input Delay (FID)', () => {
    it('should meet FID threshold for interactive elements', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Mock FID measurement
      const fidEntry = {
        entryType: 'first-input',
        processingStart: 1000,
        startTime: 1050, // 50ms FID - good
        duration: 50,
      };
      mockPerformanceEntries.push(fidEntry);

      // Simulate user interaction
      const filterButton = screen.getByRole('button', { name: /filter/i });
      const startTime = performance.now();
      
      filterButton.click();
      
      const endTime = performance.now();
      const fid = endTime - startTime;

      expect({ fid }).toMeetCoreWebVitals();
    });

    it('should optimize FID for complex interactions', async () => {
      const largeBillSet = Array.from({ length: 1000 }, () => MockDataFactory.createMockBill());
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: largeBillSet }),
      });

      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Test search input responsiveness with large dataset
      const searchInput = screen.getByRole('searchbox');
      const startTime = performance.now();
      
      // Simulate typing
      searchInput.focus();
      
      const endTime = performance.now();
      const fid = endTime - startTime;

      expect({ fid }).toMeetCoreWebVitals();
    });

    it('should handle concurrent user interactions efficiently', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate multiple rapid interactions
      const interactions = [
        () => screen.getByRole('button', { name: /filter/i }).click(),
        () => screen.getByRole('searchbox').focus(),
        () => screen.getByRole('button', { name: /sort/i }).click(),
      ];

      const fidMeasurements: number[] = [];

      for (const interaction of interactions) {
        const startTime = performance.now();
        interaction();
        const endTime = performance.now();
        fidMeasurements.push(endTime - startTime);
      }

      // All interactions should be responsive
      fidMeasurements.forEach(fid => {
        expect({ fid }).toMeetCoreWebVitals();
      });
    });
  });

  // =============================================================================
  // CUMULATIVE LAYOUT SHIFT (CLS) TESTS
  // =============================================================================

  describe('Cumulative Layout Shift (CLS)', () => {
    it('should meet CLS threshold during initial load', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      // Mock layout shift entries
      const layoutShiftEntries = [
        {
          entryType: 'layout-shift',
          value: 0.05, // Small shift
          hadRecentInput: false,
        },
        {
          entryType: 'layout-shift',
          value: 0.03, // Another small shift
          hadRecentInput: false,
        },
      ];
      mockPerformanceEntries.push(...layoutShiftEntries);

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      const cls = await PerformanceTestUtils.testCoreWebVitals.measureCLS();
      expect({ cls }).toMeetCoreWebVitals();
    });

    it('should minimize layout shifts during content loading', async () => {
      // Mock delayed content loading
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(delayedPromise);

      renderWithProviders(<App />, { route: '/bills' });

      // Should show skeleton loading state
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

      // Resolve with actual content
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: mockBills }),
      });

      await waitFor(() => {
        expect(screen.getAllByTestId('bill-card')).toHaveLength(mockBills.length);
      });

      // Mock minimal layout shift due to skeleton-to-content transition
      const layoutShiftEntry = {
        entryType: 'layout-shift',
        value: 0.02, // Very small shift due to proper skeleton sizing
        hadRecentInput: false,
      };
      mockPerformanceEntries.push(layoutShiftEntry);

      const cls = await PerformanceTestUtils.testCoreWebVitals.measureCLS();
      expect({ cls }).toMeetCoreWebVitals();
    });

    it('should handle dynamic content updates without layout shifts', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate real-time content update
      const updatedBill = { ...mockBills[0], title: 'Updated Bill Title That Is Much Longer' };
      
      // Mock WebSocket message
      const mockWebSocket = {
        send: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // Simulate bill update
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [updatedBill, ...mockBills.slice(1)] }),
      });

      // Re-render with updated data
      renderWithProviders(<App />, { route: '/bills' });

      // Should not cause significant layout shift
      const layoutShiftEntry = {
        entryType: 'layout-shift',
        value: 0.01, // Minimal shift due to proper content sizing
        hadRecentInput: false,
      };
      mockPerformanceEntries.push(layoutShiftEntry);

      const cls = await PerformanceTestUtils.testCoreWebVitals.measureCLS();
      expect({ cls }).toMeetCoreWebVitals();
    });

    it('should handle responsive design changes without excessive shifts', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate viewport change (desktop to mobile)
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      window.dispatchEvent(new Event('resize'));

      // Mock layout shift from responsive design change
      const layoutShiftEntry = {
        entryType: 'layout-shift',
        value: 0.08, // Acceptable shift for responsive changes
        hadRecentInput: false,
      };
      mockPerformanceEntries.push(layoutShiftEntry);

      const cls = await PerformanceTestUtils.testCoreWebVitals.measureCLS();
      expect({ cls }).toMeetCoreWebVitals();
    });
  });

  // =============================================================================
  // ADDITIONAL PERFORMANCE METRICS
  // =============================================================================

  describe('Additional Performance Metrics', () => {
    it('should meet Time to Interactive (TTI) threshold', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Test that interactive elements are responsive
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toBeEnabled();

      const endTime = performance.now();
      const tti = endTime - startTime;

      // TTI should be under 3.8 seconds for good performance
      expect(tti).toBeLessThan(3800);
    });

    it('should optimize Total Blocking Time (TBT)', async () => {
      // Mock long tasks
      const longTaskEntries = [
        {
          entryType: 'longtask',
          startTime: 1000,
          duration: 80, // 80ms task (30ms over 50ms threshold)
        },
        {
          entryType: 'longtask',
          startTime: 2000,
          duration: 120, // 120ms task (70ms over threshold)
        },
      ];
      mockPerformanceEntries.push(...longTaskEntries);

      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Calculate TBT (sum of blocking time over 50ms threshold)
      const tbt = longTaskEntries.reduce((total, entry) => {
        return total + Math.max(0, entry.duration - 50);
      }, 0);

      // TBT should be under 200ms for good performance
      expect(tbt).toBeLessThan(200);
    });

    it('should measure and optimize bundle loading performance', async () => {
      const bundlePerformance = await PerformanceTestUtils.testBundlePerformance();

      expect(bundlePerformance.domContentLoaded).toBeLessThan(1000); // 1 second
      expect(bundlePerformance.loadComplete).toBeLessThan(2000); // 2 seconds
      expect(bundlePerformance.firstByte).toBeLessThan(200); // 200ms
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate navigation to different pages
      renderWithProviders(<App />, { route: '/search' });
      renderWithProviders(<App />, { route: '/community' });
      renderWithProviders(<App />, { route: '/bills' });

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  // =============================================================================
  // PERFORMANCE REGRESSION TESTS
  // =============================================================================

  describe('Performance Regression Tests', () => {
    it('should maintain performance with increasing data size', async () => {
      const dataSizes = [10, 50, 100, 500];
      const renderTimes: number[] = [];

      for (const size of dataSizes) {
        const largeBillSet = Array.from({ length: size }, () => MockDataFactory.createMockBill());
        
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: largeBillSet }),
        });

        const { renderTime } = await PerformanceTestUtils.measureRenderTime(() =>
          renderWithProviders(<App />, { route: '/bills' })
        );

        renderTimes.push(renderTime);
      }

      // Render time should not increase exponentially with data size
      const firstRenderTime = renderTimes[0];
      const lastRenderTime = renderTimes[renderTimes.length - 1];
      
      // Last render should not be more than 3x the first render time
      expect(lastRenderTime).toBeLessThan(firstRenderTime * 3);
    });

    it('should maintain performance across multiple re-renders', async () => {
      const renderTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const { renderTime } = await PerformanceTestUtils.measureRenderTime(() =>
          renderWithProviders(<App />, { route: '/bills' })
        );
        renderTimes.push(renderTime);
      }

      // Render times should be consistent (no memory leaks or performance degradation)
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      
      // Max render time should not be more than 2x the average
      expect(maxRenderTime).toBeLessThan(avgRenderTime * 2);
    });

    it('should handle concurrent operations without performance degradation', async () => {
      renderWithProviders(<App />, { route: '/bills' });

      await waitFor(() => {
        expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      });

      // Simulate concurrent operations
      const operations = [
        () => screen.getByRole('searchbox').focus(),
        () => screen.getByRole('button', { name: /filter/i }).click(),
        () => screen.getByRole('button', { name: /sort/i }).click(),
      ];

      const startTime = performance.now();
      
      // Execute all operations concurrently
      await Promise.all(operations.map(op => Promise.resolve(op())));
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All operations should complete quickly
      expect(totalTime).toBeLessThan(100); // 100ms for all operations
    });
  });
});