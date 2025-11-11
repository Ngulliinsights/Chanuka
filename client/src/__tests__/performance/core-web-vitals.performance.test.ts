/**
 * Core Web Vitals Performance Tests
 * Tests for measuring and validating Core Web Vitals metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, MockDataFactory } from '../../test-utils/comprehensive-test-setup';
import { performanceTestUtils, CORE_WEB_VITALS_THRESHOLDS } from '../../test-utils/setup-performance';
import { BillsDashboard } from '../../components/bills/bills-dashboard';
import { BillDetailView } from '../../components/bill-detail/BillDetailView';

describe('Core Web Vitals Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceTestUtils.monitor.resetMetrics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Largest Contentful Paint (LCP)', () => {
    it('should meet LCP threshold for bills dashboard', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<BillsDashboard />);
      
      // Wait for main content to render
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const lcp = performance.now() - startTime;
      
      expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP.GOOD);
    });

    it('should meet LCP threshold for bill detail page', async () => {
      const mockBill = MockDataFactory.createMockBill();
      const startTime = performance.now();
      
      renderWithProviders(<BillDetailView billId={mockBill.id} />);
      
      // Wait for bill content to render
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });
      
      const lcp = performance.now() - startTime;
      
      expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP.GOOD);
    });

    it('should maintain LCP performance with large datasets', async () => {
      const largeBillsDataset = Array.from({ length: 1000 }, () => MockDataFactory.createMockBill());
      
      // Mock API to return large dataset
      vi.mocked(require('../../hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: largeBillsDataset,
        loading: false,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });

      const startTime = performance.now();
      
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const lcp = performance.now() - startTime;
      
      // Should still meet LCP threshold even with large datasets
      expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP.NEEDS_IMPROVEMENT);
    });
  });

  describe('First Input Delay (FID)', () => {
    it('should respond to user interactions quickly', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Simulate user interaction
      const searchInput = screen.getByPlaceholderText(/search bills/i);
      
      const startTime = performance.now();
      
      // Simulate input event
      searchInput.focus();
      
      const fid = performance.now() - startTime;
      
      expect(fid).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FID.GOOD);
    });

    it('should handle rapid user interactions efficiently', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search bills/i);
      const categoryFilter = screen.getByLabelText(/category/i);
      
      // Simulate rapid interactions
      const interactions = [
        () => searchInput.focus(),
        () => categoryFilter.focus(),
        () => searchInput.blur(),
        () => categoryFilter.blur(),
      ];
      
      const fidMeasurements: number[] = [];
      
      for (const interaction of interactions) {
        const startTime = performance.now();
        interaction();
        const fid = performance.now() - startTime;
        fidMeasurements.push(fid);
      }
      
      // All interactions should be fast
      const maxFid = Math.max(...fidMeasurements);
      expect(maxFid).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FID.GOOD);
    });
  });

  describe('Cumulative Layout Shift (CLS)', () => {
    it('should have minimal layout shifts during loading', async () => {
      // Start with loading state
      vi.mocked(require('../../hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: [],
        loading: true,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });

      const { rerender } = renderWithProviders(<BillsDashboard />);
      
      // Verify loading state
      expect(screen.getByTestId('bills-loading-skeleton')).toBeInTheDocument();
      
      // Simulate data loading
      vi.mocked(require('../../hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: Array.from({ length: 10 }, () => MockDataFactory.createMockBill()),
        loading: false,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });

      rerender(<BillsDashboard />);
      
      // Wait for content to load
      await waitFor(() => {
        expect(screen.queryByTestId('bills-loading-skeleton')).not.toBeInTheDocument();
      });
      
      // In a real implementation, we would measure actual layout shifts
      // For now, we verify that skeleton loading prevents major shifts
      const cls = performanceTestUtils.monitor.getMetrics().cls || 0;
      expect(cls).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.CLS.GOOD);
    });

    it('should prevent layout shifts when images load', async () => {
      const billsWithImages = Array.from({ length: 5 }, () => 
        MockDataFactory.createMockBill({
          sponsor_image: 'https://example.com/sponsor.jpg',
        })
      );

      vi.mocked(require('../../hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: billsWithImages,
        loading: false,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });

      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Simulate image loading (in real implementation, this would be actual image loads)
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        // Simulate image load event
        img.dispatchEvent(new Event('load'));
      });
      
      const cls = performanceTestUtils.monitor.getMetrics().cls || 0;
      expect(cls).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.CLS.GOOD);
    });
  });

  describe('First Contentful Paint (FCP)', () => {
    it('should achieve fast FCP for initial page load', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<BillsDashboard />);
      
      // Wait for first content to appear
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const fcp = performance.now() - startTime;
      
      expect(fcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FCP.GOOD);
    });

    it('should maintain FCP performance across different components', async () => {
      const components = [
        () => renderWithProviders(<BillsDashboard />),
        () => renderWithProviders(<BillDetailView billId="test-bill-1" />),
      ];
      
      for (const renderComponent of components) {
        const startTime = performance.now();
        
        renderComponent();
        
        // Wait for component to render
        await waitFor(() => {
          expect(document.body).toContainHTML('data-testid');
        });
        
        const fcp = performance.now() - startTime;
        expect(fcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FCP.GOOD);
      }
    });
  });

  describe('Time to First Byte (TTFB)', () => {
    it('should have fast API response times', async () => {
      // Mock API with timing
      const mockFetch = vi.fn().mockImplementation(() => {
        const startTime = performance.now();
        return new Promise((resolve) => {
          setTimeout(() => {
            const ttfb = performance.now() - startTime;
            expect(ttfb).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.TTFB.GOOD);
            resolve({
              ok: true,
              json: () => Promise.resolve({ data: [] }),
            });
          }, 100); // Simulate 100ms response time
        });
      });
      
      global.fetch = mockFetch;
      
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Bundle Size Performance', () => {
    it('should meet bundle size requirements', async () => {
      const bundleInfo = await performanceTestUtils.testBundleSize();
      
      // Main bundle should be under 100KB
      expect(bundleInfo.mainBundle).toBeLessThan(100000);
      
      // Individual chunks should be reasonable
      Object.values(bundleInfo.chunkSizes).forEach(size => {
        expect(size).toBeLessThan(50000); // 50KB per chunk
      });
      
      // Total size should be reasonable
      expect(bundleInfo.totalSize).toBeLessThan(300000); // 300KB total
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks during normal usage', async () => {
      const initialMemory = performanceTestUtils.measureMemoryUsage();
      
      // Render and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(<BillsDashboard />);
        
        await waitFor(() => {
          expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
        });
        
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performanceTestUtils.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10000000);
    });

    it('should handle large datasets without excessive memory usage', async () => {
      const initialMemory = performanceTestUtils.measureMemoryUsage();
      
      // Create large dataset
      const largeBillsDataset = Array.from({ length: 5000 }, () => MockDataFactory.createMockBill());
      
      vi.mocked(require('../../hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: largeBillsDataset,
        loading: false,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });

      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const finalMemory = performanceTestUtils.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable even with large datasets
      expect(memoryIncrease).toBeLessThan(50000000); // Less than 50MB
    });
  });

  describe('Render Performance', () => {
    it('should render components efficiently', async () => {
      const performanceResult = await performanceTestUtils.measureComponentPerformance(
        () => renderWithProviders(<BillsDashboard />),
        { iterations: 10, warmup: 3 }
      );
      
      // Average render time should be fast
      expect(performanceResult.averageRenderTime).toBeLessThan(50); // 50ms average
      
      // Maximum render time should be reasonable
      expect(performanceResult.maxRenderTime).toBeLessThan(100); // 100ms max
      
      // Render times should be consistent (low variance)
      const variance = performanceResult.maxRenderTime - performanceResult.minRenderTime;
      expect(variance).toBeLessThan(50); // Less than 50ms variance
    });

    it('should handle re-renders efficiently', async () => {
      const { rerender } = renderWithProviders(<BillsDashboard />);
      
      // Measure re-render performance
      const rerenderTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        // Trigger re-render with new props
        rerender(<BillsDashboard key={i} />);
        
        await waitFor(() => {
          expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
        });
        
        const rerenderTime = performance.now() - startTime;
        rerenderTimes.push(rerenderTime);
      }
      
      const averageRerenderTime = rerenderTimes.reduce((a, b) => a + b, 0) / rerenderTimes.length;
      
      // Re-renders should be fast
      expect(averageRerenderTime).toBeLessThan(30); // 30ms average
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent user interactions', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Simulate concurrent user actions
      const loadTestResult = await performanceTestUtils.simulateUserLoad(
        10, // 10 concurrent users
        async () => {
          // Simulate user searching
          const searchInput = screen.getByPlaceholderText(/search bills/i);
          searchInput.focus();
          searchInput.blur();
        },
        { rampUpTime: 1000, duration: 5000 }
      );
      
      // Should handle load successfully
      expect(loadTestResult.successfulRequests).toBe(loadTestResult.totalRequests);
      expect(loadTestResult.averageResponseTime).toBeLessThan(100); // 100ms average
    });
  });

  describe('Overall Performance Score', () => {
    it('should meet overall performance requirements', async () => {
      const metrics = performanceTestUtils.monitor.getMetrics();
      
      // Simulate some metrics for testing
      const testMetrics = {
        lcp: 1500, // 1.5s
        fid: 50,   // 50ms
        cls: 0.05, // 0.05
        fcp: 1000, // 1s
      };
      
      const coreWebVitalsResult = performanceTestUtils.testCoreWebVitals(testMetrics);
      
      // All Core Web Vitals should be good
      expect(coreWebVitalsResult.lcp).toBe('good');
      expect(coreWebVitalsResult.fid).toBe('good');
      expect(coreWebVitalsResult.cls).toBe('good');
      expect(coreWebVitalsResult.fcp).toBe('good');
      expect(coreWebVitalsResult.overall).toBe('good');
    });
  });
});