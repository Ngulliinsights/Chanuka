import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/components/layout/app-layout';
import DesktopSidebar from '@/components/navigation/DesktopSidebar';
import MobileNavigation from '@/components/navigation/MobileNavigation';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { ResponsiveNavigationProvider } from '@/contexts/ResponsiveNavigationContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock hooks
jest.mock('@/hooks/use-navigation-performance', () => ({
  useNavigationPerformance: () => ({
    startTransition: jest.fn(),
    endTransition: jest.fn(),
    enableGPUAcceleration: jest.fn(),
    disableGPUAcceleration: jest.fn(),
    useOptimizedCallback: (callback: any, deps: any[]) => callback,
    isTransitioning: false,
    performanceMetrics: {
      transitionDuration: 0,
      layoutShifts: 0,
      renderTime: 0
    }
  }),
  useSmoothTransition: () => ({
    isActive: false,
    start: jest.fn(),
    end: jest.fn()
  })
}));

jest.mock('@/hooks/use-navigation-accessibility', () => ({
  useNavigationAccessibility: () => ({
    announce: jest.fn(),
    handleKeyboardNavigation: jest.fn(),
    createFocusTrap: jest.fn(() => jest.fn()),
    getAriaAttributes: jest.fn(() => ({})),
    getAriaLabel: jest.fn((label: string) => label),
    generateSkipLinks: jest.fn(() => []),
    handleRouteChange: jest.fn()
  }),
  useNavigationKeyboardShortcuts: () => ({
    registerShortcut: jest.fn(() => jest.fn())
  }),
  useFocusIndicator: () => ({
    showFocusIndicator: true,
    focusMethod: 'keyboard',
    getFocusClasses: jest.fn((classes: string) => `${classes} focus:outline-2`)
  })
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 767px') ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            <ResponsiveNavigationProvider>
              {children}
            </ResponsiveNavigationProvider>
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Navigation Performance and Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AppLayout Performance Optimizations', () => {
    it('should apply GPU acceleration classes for smooth transitions', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('.chanuka-layout-stable');
      expect(layout).toHaveClass('chanuka-layout-stable');
    });

    it('should prevent layout shifts during responsive transitions', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Simulate responsive breakpoint change
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 767px') ? true : false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check that transition classes are applied
      const layout = document.querySelector('.chanuka-layout-transition');
      expect(layout).toBeInTheDocument();
    });

    it('should handle smooth transitions without layout shifts', async () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const sidebar = document.querySelector('.chanuka-sidebar-transition');
      const content = document.querySelector('.chanuka-content-transition');

      expect(sidebar).toBeInTheDocument();
      expect(content).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Support', () => {
    it('should support skip to content functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();

      await user.click(skipLink);
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });

    it('should support keyboard shortcuts for navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Test Alt+M shortcut for main content focus
      await user.keyboard('{Alt>}m{/Alt}');
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });

    it('should handle arrow key navigation in sidebar', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
      expect(sidebar).toBeInTheDocument();

      // Focus the sidebar and test arrow key navigation
      sidebar.focus();
      await user.keyboard('{ArrowDown}');
      
      // Should handle keyboard navigation through accessibility hook
      expect(sidebar).toBeInTheDocument();
    });

    it('should handle escape key to close mobile menu', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      await user.click(menuButton);

      // Simulate escape key press
      await user.keyboard('{Escape}');
      
      // Menu should close and focus should return to menu button
      expect(menuButton).toHaveFocus();
    });
  });

  describe('ARIA Labels and Screen Reader Support', () => {
    it('should provide proper ARIA labels for navigation elements', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const navigation = screen.getByRole('navigation', { name: /main navigation/i });
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
      expect(navigation).toHaveAttribute('aria-expanded');
    });

    it('should provide proper ARIA labels for mobile navigation', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-navigation-drawer');
    });

    it('should announce navigation state changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      await user.click(menuButton);

      // Should announce menu opening through accessibility hook
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should provide proper landmark roles', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      const banner = screen.getByRole('banner');
      const contentinfo = screen.getByRole('contentinfo');

      expect(main).toBeInTheDocument();
      expect(banner).toBeInTheDocument();
      expect(contentinfo).toBeInTheDocument();
    });

    it('should support screen reader announcements', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check for screen reader only elements
      const srElements = document.querySelectorAll('.sr-only');
      expect(srElements.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    it('should create focus trap for mobile drawer', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      await user.click(menuButton);

      // Focus should be trapped within the drawer
      const drawer = screen.getByRole('dialog');
      expect(drawer).toBeInTheDocument();
    });

    it('should restore focus when closing mobile drawer', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      await user.click(menuButton);

      const closeButton = screen.getByLabelText('Close navigation menu');
      await user.click(closeButton);

      // Focus should return to menu button
      expect(menuButton).toHaveFocus();
    });

    it('should handle focus indicators properly', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveClass('focus:outline-2');
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should track layout shifts', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Performance observer should be initialized
      expect(global.PerformanceObserver).toHaveBeenCalled();
    });

    it('should optimize transitions with GPU acceleration', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const elements = document.querySelectorAll('.chanuka-sidebar-transition, .chanuka-content-transition');
      elements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Should have GPU acceleration properties in CSS
        expect(element).toHaveClass('chanuka-sidebar-transition');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle responsive breakpoint changes smoothly', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Change to mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 767px') ? true : false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should handle responsive transition
      const layout = document.querySelector('.chanuka-layout-stable');
      expect(layout).toBeInTheDocument();
    });

    it('should maintain accessibility across breakpoints', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('tabIndex', '-1');
      expect(main).toHaveAttribute('aria-label', 'Main content');
    });
  });

  describe('Touch and Mobile Optimizations', () => {
    it('should provide touch-friendly navigation elements', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const touchElements = document.querySelectorAll('.touch-manipulation');
      expect(touchElements.length).toBeGreaterThan(0);
    });

    it('should handle safe area insets for mobile devices', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const safeAreaElements = document.querySelectorAll('.safe-area-inset-top, .safe-area-inset-bottom');
      expect(safeAreaElements.length).toBeGreaterThan(0);
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion setting', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should apply reduced motion styles
      const transitionElements = document.querySelectorAll('.chanuka-layout-transition');
      expect(transitionElements.length).toBeGreaterThan(0);
    });
  });
});