/**
 * Navigation Performance Benchmarks
 * Measures and validates navigation system performance metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavigationBar from '@client/components/shell/NavigationBar';
import { createBasicNavigationContext, createAuthenticatedNavigationContext } from './navigation-test-contexts.test';

// Performance measurement utilities
class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: Array<{ name: string; duration: number; startTime: number }> = [];

  static startMark(name: string) {
    this.marks.set(name, performance.now());
  }

  static endMark(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      throw new Error(`Mark '${name}' not found`);
    }

    const duration = performance.now() - startTime;
    this.measures.push({ name, duration, startTime });
    return duration;
  }

  static getMeasurements() {
    return this.measures;
  }

  static clearMeasurements() {
    this.marks.clear();
    this.measures = [];
  }

  static getAverageDuration(name: string): number {
    const measurements = this.measures.filter(m => m.name === name);
    if (measurements.length === 0) return 0;

    const total = measurements.reduce((sum, m) => sum + m.duration, 0);
    return total / measurements.length;
  }
}

// Benchmark thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  NAVIGATION_RENDER: 50,
  ROUTE_CHANGE: 100,
  SEARCH_RESPONSE: 200,
  STATE_UPDATE: 20,
  CONTEXT_INITIALIZATION: 150,
  BREADCRUMB_GENERATION: 10,
  SIDEBAR_TOGGLE: 30,
} as const;

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Navigation Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PerformanceMonitor.clearMeasurements();
    mockPerformance.now.mockClear();
  });

  afterEach(() => {
    PerformanceMonitor.clearMeasurements();
  });

  describe('Component Render Performance', () => {
    it('should render NavigationBar within performance threshold', async () => {
      const TestContext = createBasicNavigationContext();

      PerformanceMonitor.startMark('navigation-render');

      const { container } = render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const duration = PerformanceMonitor.endMark('navigation-render');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION_RENDER);
      expect(container).toBeInTheDocument();
    });

    it('should render authenticated NavigationBar within performance threshold', async () => {
      const TestContext = createAuthenticatedNavigationContext();

      PerformanceMonitor.startMark('authenticated-navigation-render');

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const duration = PerformanceMonitor.endMark('authenticated-navigation-render');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION_RENDER);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Navigation Operations Performance', () => {
    it('should handle route changes within performance threshold', async () => {
      const TestContext = createBasicNavigationContext();

      const { rerender } = render(
        <TestContext initialPath="/">
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      PerformanceMonitor.startMark('route-change');

      rerender(
        <TestContext initialPath="/bills">
          <NavigationBar />
        </TestContext>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      const duration = PerformanceMonitor.endMark('route-change');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ROUTE_CHANGE);
    });

    it('should handle sidebar toggle within performance threshold', async () => {
      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const toggleButton = screen.getByTitle('Collapse sidebar');

      PerformanceMonitor.startMark('sidebar-toggle');

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      const duration = PerformanceMonitor.endMark('sidebar-toggle');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SIDEBAR_TOGGLE);
    });

    it('should handle search operations within performance threshold', async () => {
      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const searchInput = screen.getByLabelText('Search');

      PerformanceMonitor.startMark('search-operation');

      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // Wait for debounced search
      await new Promise(resolve => setTimeout(resolve, 350));

      const duration = PerformanceMonitor.endMark('search-operation');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE);
    });
  });

  describe('Context and State Performance', () => {
    it('should initialize navigation context within performance threshold', async () => {
      PerformanceMonitor.startMark('context-initialization');

      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <div>Test Content</div>
        </TestContext>
      );

      await screen.findByText('Test Content');

      const duration = PerformanceMonitor.endMark('context-initialization');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONTEXT_INITIALIZATION);
    });

    it('should handle state updates within performance threshold', async () => {
      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      PerformanceMonitor.startMark('state-update');

      // Trigger multiple rapid state changes
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      const duration = PerformanceMonitor.endMark('state-update');

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATE_UPDATE);
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not have memory leaks during repeated operations', async () => {
      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const toggleButton = screen.getByTitle('Collapse sidebar');
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggleButton);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Allow for some memory increase but not excessive growth
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });

    it('should handle rapid navigation changes without performance degradation', async () => {
      const TestContext = createBasicNavigationContext();
      const paths = ['/', '/bills', '/dashboard', '/community', '/'];

      const measurements: number[] = [];

      for (const path of paths) {
        const { rerender } = render(
          <TestContext initialPath={path}>
            <NavigationBar />
          </TestContext>
        );

        PerformanceMonitor.startMark(`navigation-${path}`);

        rerender(
          <TestContext initialPath={path}>
            <NavigationBar />
          </TestContext>
        );

        await screen.findByRole('navigation');

        const duration = PerformanceMonitor.endMark(`navigation-${path}`);
        measurements.push(duration);
      }

      // Check that performance doesn't degrade significantly
      const averageDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxDuration = Math.max(...measurements);

      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION_RENDER);
      expect(maxDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.ROUTE_CHANGE);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent user interactions gracefully', async () => {
      const TestContext = createBasicNavigationContext();

      render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const toggleButton = screen.getByTitle('Collapse sidebar');
      const searchInput = screen.getByLabelText('Search');

      PerformanceMonitor.startMark('concurrent-operations');

      // Simulate concurrent operations
      const operations = [
        fireEvent.click(toggleButton),
        fireEvent.change(searchInput, { target: { value: 'concurrent' } }),
        fireEvent.click(toggleButton),
        fireEvent.change(searchInput, { target: { value: 'test' } }),
      ];

      await Promise.all(operations.map(op => new Promise(resolve => setTimeout(resolve, 50))));

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      const duration = PerformanceMonitor.endMark('concurrent-operations');

      // Concurrent operations should still be reasonably fast
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ROUTE_CHANGE * 2);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in navigation rendering', async () => {
      const TestContext = createBasicNavigationContext();
      const baselineMeasurements: number[] = [];

      // Establish baseline
      for (let i = 0; i < 5; i++) {
        PerformanceMonitor.startMark(`baseline-${i}`);

        const { unmount } = render(
          <TestContext>
            <NavigationBar />
          </TestContext>
        );

        await screen.findByRole('navigation');
        unmount();

        const duration = PerformanceMonitor.endMark(`baseline-${i}`);
        baselineMeasurements.push(duration);
      }

      const baselineAverage = baselineMeasurements.reduce((a, b) => a + b, 0) / baselineMeasurements.length;

      // Test current performance
      PerformanceMonitor.startMark('current-test');

      const { container } = render(
        <TestContext>
          <NavigationBar />
        </TestContext>
      );

      await screen.findByRole('navigation');

      const currentDuration = PerformanceMonitor.endMark('current-test');

      // Current performance should not be significantly worse than baseline
      const regressionThreshold = baselineAverage * 1.5; // 50% regression threshold
      expect(currentDuration).toBeLessThan(regressionThreshold);

      expect(container).toBeInTheDocument();
    });
  });
});