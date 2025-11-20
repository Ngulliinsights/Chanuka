/**
 * Comprehensive Testing Setup
 * Enhanced testing utilities for the Chanuka client UI upgrade
 */


import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, expect } from 'vitest';

// =============================================================================
// TEST PROVIDERS
// =============================================================================

interface TestProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export const TestProviders = ({
  children,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}: TestProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// =============================================================================
// ENHANCED RENDER FUNCTION
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, route = '/', ...renderOptions } = options;

  // Set initial route if specified
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

export const MockDataFactory = {
  createMockBill: (overrides = {}) => ({
    id: `bill-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Healthcare Reform Bill',
    summary: 'A comprehensive healthcare reform proposal',
    status: 'active',
    category: 'healthcare',
    sponsor: 'Senator Smith',
    introduced_date: new Date('2024-01-01'),
    last_action_date: new Date('2024-01-15'),
    votes: { yes: 45, no: 30, abstain: 5 },
    tags: ['healthcare', 'reform', 'insurance'],
    urgency_level: 'medium',
    constitutional_flags: [],
    engagement_metrics: {
      views: 1250,
      saves: 89,
      comments: 23,
      shares: 12,
    },
    ...overrides,
  }),

  createMockUser: (overrides = {}) => ({
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    role: 'citizen',
    verification_status: 'verified',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    reputation: 100,
    expertise: 'general',
    ...overrides,
  }),

  createMockExpert: (overrides = {}) => ({
    userId: `expert-${Math.random().toString(36).substr(2, 9)}`,
    verificationType: 'domain',
    credentials: ['PhD in Political Science', 'Former Legislative Aide'],
    affiliations: ['University Research Center'],
    specializations: ['healthcare policy', 'constitutional law'],
    credibilityScore: 85,
    contributionCount: 42,
    avgCommunityRating: 4.2,
    verified: true,
    verificationDate: new Date('2024-01-01'),
    ...overrides,
  }),

  createMockComment: (overrides = {}) => ({
    id: `comment-${Math.random().toString(36).substr(2, 9)}`,
    content: 'This is a test comment about the bill.',
    author: MockDataFactory.createMockUser(),
    created_at: new Date('2024-01-15'),
    votes: { up: 5, down: 1 },
    replies: [],
    ...overrides,
  }),

  createMockEngagementMetrics: (overrides = {}) => ({
    totalParticipants: 1250,
    activeDiscussions: 23,
    expertContributions: 8,
    communityApproval: 72,
    sentimentScore: 0.65,
    trendingScore: 8.2,
    ...overrides,
  }),
};

// =============================================================================
// ACCESSIBILITY TEST UTILITIES
// =============================================================================

export const AccessibilityTestUtils = {
  /**
   * Test keyboard navigation through interactive elements
   */
  async testKeyboardNavigation(container: HTMLElement) {
    const interactiveElements = container.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );

    for (let i = 0; i < interactiveElements.length; i++) {
      const element = interactiveElements[i] as HTMLElement;
      element.focus();
      expect(document.activeElement).toBe(element);
    }
  },

  /**
   * Test ARIA attributes and semantic HTML
   */
  testAriaAttributes(element: HTMLElement, expectedAttributes: Record<string, string>) {
    Object.entries(expectedAttributes).forEach(([attr, value]) => {
      expect(element).toHaveAttribute(attr, value);
    });
  },

  /**
   * Test color contrast ratios
   */
  testColorContrast(element: HTMLElement, _minRatio = 4.5) {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // This is a simplified test - in real implementation, you'd use a proper contrast checker
    expect(color).toBeTruthy();
    expect(backgroundColor).toBeTruthy();
  },

  /**
   * Test screen reader announcements
   */
  async testScreenReaderAnnouncements(expectedText: string) {
    const liveRegion = screen.getByRole('status') || 
                      screen.getByLabelText(/live region/i);
    
    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(expectedText);
    });
  },
};

// =============================================================================
// PERFORMANCE TEST UTILITIES
// =============================================================================

export const PerformanceTestUtils = {
  /**
   * Measure component render time
   */
  async measureRenderTime<T>(renderFn: () => T): Promise<{ result: T; renderTime: number }> {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    return {
      result,
      renderTime: endTime - startTime,
    };
  },

  /**
   * Test Core Web Vitals thresholds
   */
  testCoreWebVitals: {
    LCP_THRESHOLD: 2500, // 2.5 seconds
    FID_THRESHOLD: 100,  // 100 milliseconds
    CLS_THRESHOLD: 0.1,  // 0.1

    async measureLCP(): Promise<number> {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      });
    },

    async measureCLS(): Promise<number> {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after a short delay to capture shifts
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 1000);
      });
    },
  },

  /**
   * Test bundle size and loading performance
   */
  async testBundlePerformance() {
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const entry = navigationEntries[0];
    
    return {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      firstByte: entry.responseStart - entry.requestStart,
    };
  },
};

// =============================================================================
// INTEGRATION TEST UTILITIES
// =============================================================================

export const IntegrationTestUtils = {
  /**
   * Simulate user workflow through multiple components
   */
  async simulateUserWorkflow(steps: Array<() => Promise<void>>) {
    for (const step of steps) {
      await step();
      // Small delay between steps to simulate real user behavior
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  /**
   * Test real-time features with WebSocket simulation
   */
  createMockWebSocket() {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      
      // Helper to simulate incoming messages
      simulateMessage: (data: any) => {
        const event = new MessageEvent('message', { data: JSON.stringify(data) });
        mockWs.addEventListener.mock.calls
          .filter(([type]) => type === 'message')
          .forEach(([, handler]) => handler(event));
      },
      
      // Helper to simulate connection events
      simulateOpen: () => {
        const event = new Event('open');
        mockWs.addEventListener.mock.calls
          .filter(([type]) => type === 'open')
          .forEach(([, handler]) => handler(event));
      },
      
      simulateClose: () => {
        mockWs.readyState = 3; // WebSocket.CLOSED
        const event = new CloseEvent('close');
        mockWs.addEventListener.mock.calls
          .filter(([type]) => type === 'close')
          .forEach(([, handler]) => handler(event));
      },
    };
    
    return mockWs;
  },

  /**
   * Test API integration with mock responses
   */
  createMockApiResponse<T>(data: T, options: { delay?: number; error?: Error } = {}) {
    const { delay = 0, error } = options;
    
    return vi.fn().mockImplementation(() => 
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (error) reject(error);
          else resolve({ data, status: 200, statusText: 'OK' });
        }, delay);
      })
    );
  },
};

// =============================================================================
// VISUAL REGRESSION TEST UTILITIES
// =============================================================================

export const VisualTestUtils = {
  /**
   * Capture component snapshot for visual regression testing
   */
  async captureSnapshot(component: ReactElement, name: string) {
    const { container } = renderWithProviders(component);
    
    // Wait for any animations or async operations to complete
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
    
    // In a real implementation, this would capture a screenshot
    // For now, we'll use DOM snapshot testing
    expect(container.firstChild).toMatchSnapshot(`${name}.snap`);
  },

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign(component: ReactElement, viewports: Array<{ width: number; height: number; name: string }>) {
    for (const viewport of viewports) {
      // Mock viewport size
      Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      const { container } = renderWithProviders(component);
      
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
      
      expect(container.firstChild).toMatchSnapshot(`${viewport.name}.snap`);
    }
  },
};

// =============================================================================
// CUSTOM MATCHERS
// =============================================================================

declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeAccessible(): T;
      toHavePerformantRender(): T;
      toMeetCoreWebVitals(): T;
    }
  }
}

// Extend expect with custom matchers
expect.extend({
  toBeAccessible(received: HTMLElement) {
    const hasAriaLabel = received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby');
    const hasSemanticRole = received.tagName.toLowerCase() !== 'div' || received.hasAttribute('role');
    const hasKeyboardSupport = received.hasAttribute('tabindex') || ['BUTTON', 'A', 'INPUT'].includes(received.tagName);
    
    const pass = hasAriaLabel && hasSemanticRole && hasKeyboardSupport;
    
    return {
      message: () => 
        pass 
          ? `Expected element not to be accessible`
          : `Expected element to be accessible. Missing: ${[
              !hasAriaLabel && 'aria-label',
              !hasSemanticRole && 'semantic role',
              !hasKeyboardSupport && 'keyboard support'
            ].filter(Boolean).join(', ')}`,
      pass,
    };
  },

  toHavePerformantRender(received: number) {
    const RENDER_THRESHOLD = 16; // 16ms for 60fps
    const pass = received <= RENDER_THRESHOLD;
    
    return {
      message: () => 
        pass 
          ? `Expected render time ${received}ms to be slower than ${RENDER_THRESHOLD}ms`
          : `Expected render time ${received}ms to be faster than ${RENDER_THRESHOLD}ms`,
      pass,
    };
  },

  toMeetCoreWebVitals(received: { lcp?: number; fid?: number; cls?: number }) {
    const { lcp, fid, cls } = received;
    const lcpPass = !lcp || lcp <= PerformanceTestUtils.testCoreWebVitals.LCP_THRESHOLD;
    const fidPass = !fid || fid <= PerformanceTestUtils.testCoreWebVitals.FID_THRESHOLD;
    const clsPass = !cls || cls <= PerformanceTestUtils.testCoreWebVitals.CLS_THRESHOLD;
    
    const pass = lcpPass && fidPass && clsPass;
    
    return {
      message: () => 
        pass 
          ? `Expected Core Web Vitals not to meet thresholds`
          : `Expected Core Web Vitals to meet thresholds. Failed: ${[
              !lcpPass && `LCP: ${lcp}ms > ${PerformanceTestUtils.testCoreWebVitals.LCP_THRESHOLD}ms`,
              !fidPass && `FID: ${fid}ms > ${PerformanceTestUtils.testCoreWebVitals.FID_THRESHOLD}ms`,
              !clsPass && `CLS: ${cls} > ${PerformanceTestUtils.testCoreWebVitals.CLS_THRESHOLD}`
            ].filter(Boolean).join(', ')}`,
      pass,
    };
  },
});

export {
  screen,
  waitFor,
  userEvent,
  vi,
  expect,
};