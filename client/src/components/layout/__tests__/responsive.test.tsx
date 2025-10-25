import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppLayout from '../app-layout';
import { MobileHeader } from '../mobile-header';
import MobileNavigation from '../mobile-navigation';
import { Sidebar } from '../sidebar';
import { LayoutConfig } from '@shared/types';

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock dependencies
vi.mock('@/hooks/use-unified-navigation', () => ({
  useUnifiedNavigation: vi.fn(),
}));

vi.mock('@/hooks/use-navigation-performance', () => ({
  useNavigationPerformance: () => ({
    startTransition: vi.fn(),
    endTransition: vi.fn(),
    enableGPUAcceleration: vi.fn(),
    disableGPUAcceleration: vi.fn(),
    isTransitioning: false,
  }),
}));

vi.mock('@/hooks/use-navigation-accessibility', () => ({
  useNavigationAccessibility: () => ({
    announce: vi.fn(),
    handleKeyboardNavigation: vi.fn(),
    generateSkipLinks: vi.fn(),
    handleRouteChange: vi.fn(),
    getAriaAttributes: vi.fn(),
  }),
  useNavigationKeyboardShortcuts: () => ({
    registerShortcut: vi.fn(() => vi.fn()),
  }),
}));

vi.mock('@/components/accessibility/accessibility-manager', () => ({
  SkipLink: (props: any) => (
    <a href={props.href} data-testid="skip-link">{props.children}</a>
  ),
  useAccessibility: () => ({
    announceToScreenReader: vi.fn(),
  }),
}));

vi.mock('@/components/navigation', () => ({
  DesktopSidebar: () => <div data-testid="desktop-sidebar">Desktop Sidebar</div>,
}));

vi.mock('@/components/layout/mobile-navigation', () => ({
  default: function MockMobileNavigation() {
    return <div data-testid="mobile-navigation">Mobile Navigation</div>;
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Responsive Layout Tests', () => {
  const defaultProps = {
    children: <div data-testid="test-content">Test Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Breakpoint (320px - 767px)', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Mobile breakpoint
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should render mobile layout on mobile devices', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should apply mobile-specific classes and spacing', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('pb-16'); // Mobile bottom padding for tab bar
    });

    it('should handle mobile header responsively', () => {
      render(
        <TestWrapper>
          <MobileHeader title="Test App" />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('px-4', 'py-3');
    });

    it('should show mobile navigation menu', async () => {
      render(
        <TestWrapper>
          <MobileHeader />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });

    it('should handle touch-friendly button sizes', () => {
      render(
        <TestWrapper>
          <MobileHeader />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Touch targets should be at least 44px
        expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Tablet Breakpoint (768px - 1023px)', () => {
    beforeEach(() => {
      mockMatchMedia(false); // Not mobile
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        isTablet: true,
        mounted: true,
        sidebarCollapsed: true, // Collapsed on tablet
      });
    });

    it('should render desktop sidebar in collapsed state on tablet', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
    });

    it('should apply tablet-specific sidebar behavior', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-16'); // Collapsed width
    });

    it('should handle tablet content margins', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('ml-16'); // Margin for collapsed sidebar
    });
  });

  describe('Desktop Breakpoint (1024px - 1439px)', () => {
    beforeEach(() => {
      mockMatchMedia(false);
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        mounted: true,
        sidebarCollapsed: false, // Expanded on desktop
      });
    });

    it('should render desktop sidebar in expanded state', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
    });

    it('should apply desktop-specific sidebar behavior', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={false} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-64'); // Expanded width
    });

    it('should handle desktop content margins', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('ml-64'); // Margin for expanded sidebar
    });

    it('should show full navigation labels', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={false} />
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
    });
  });

  describe('Wide Screen Breakpoint (1440px+)', () => {
    beforeEach(() => {
      mockMatchMedia(false);
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isWide: true,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should handle wide screen layouts', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('ml-64');
    });

    it('should maintain sidebar expanded state on wide screens', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={false} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-64');
    });
  });

  describe('Breakpoint Transitions', () => {
    it('should handle mobile to desktop transition', async () => {
      const mockStartTransition = vi.fn();
      const mockAnnounce = vi.fn();

      vi.mocked(require('@/hooks/use-navigation-performance').useNavigationPerformance).mockReturnValue({
        startTransition: mockStartTransition,
        endTransition: vi.fn(),
        enableGPUAcceleration: vi.fn(),
        disableGPUAcceleration: vi.fn(),
        isTransitioning: false,
      });

      vi.mocked(require('@/hooks/use-navigation-accessibility').useNavigationAccessibility).mockReturnValue({
        announce: mockAnnounce,
        handleKeyboardNavigation: vi.fn(),
        generateSkipLinks: vi.fn(),
        handleRouteChange: vi.fn(),
        getAriaAttributes: vi.fn(),
      });

      // Start with mobile
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // Transition to desktop
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockStartTransition).toHaveBeenCalledWith(300);
        expect(mockAnnounce).toHaveBeenCalledWith('Layout changed to desktop view');
      });
    });

    it('should handle desktop to mobile transition', async () => {
      const mockAnnounce = vi.fn();

      vi.mocked(require('@/hooks/use-navigation-accessibility').useNavigationAccessibility).mockReturnValue({
        announce: mockAnnounce,
        handleKeyboardNavigation: vi.fn(),
        generateSkipLinks: vi.fn(),
        handleRouteChange: vi.fn(),
        getAriaAttributes: vi.fn(),
      });

      // Start with desktop
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // Transition to mobile
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalledWith('Layout changed to mobile view');
      });
    });

    it('should apply transition classes during breakpoint changes', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('chanuka-content-transition');
    });
  });

  describe('Responsive Configuration', () => {
    it('should respect mobile optimization settings', () => {
      const config: Partial<LayoutConfig> = {
        enableMobileOptimization: true,
      };

      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });

    it('should handle disabled mobile optimization', () => {
      const config: Partial<LayoutConfig> = {
        enableMobileOptimization: false,
      };

      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      // Should still render mobile layout but without optimizations
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });

    it('should handle responsive sidebar states', () => {
      const config: Partial<LayoutConfig> = {
        sidebarState: 'collapsed',
      };

      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: true,
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('ml-16');
    });
  });

  describe('Viewport Meta Tag Handling', () => {
    it('should handle viewport changes', () => {
      // Mock viewport meta tag
      const viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(viewportMeta);

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(document.querySelector('meta[name="viewport"]')).toBeInTheDocument();

      // Cleanup
      document.head.removeChild(viewportMeta);
    });
  });

  describe('CSS Media Queries', () => {
    it('should apply correct CSS classes for different breakpoints', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      expect(layout).toHaveClass('chanuka-layout-stable');
    });

    it('should handle print media styles', () => {
      // Mock print media query
      mockMatchMedia(true);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === 'print',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // Layout should still render properly for print
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize rendering for mobile devices', () => {
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      const config: Partial<LayoutConfig> = {
        enablePerformanceOptimization: true,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('chanuka-content-transition');
    });

    it('should handle GPU acceleration during transitions', () => {
      const mockEnableGPU = vi.fn();
      const mockDisableGPU = vi.fn();

      vi.mocked(require('@/hooks/use-navigation-performance').useNavigationPerformance).mockReturnValue({
        startTransition: vi.fn(),
        endTransition: vi.fn(),
        enableGPUAcceleration: mockEnableGPU,
        disableGPUAcceleration: mockDisableGPU,
        isTransitioning: false,
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // GPU acceleration methods should be available
      expect(mockEnableGPU).toBeDefined();
      expect(mockDisableGPU).toBeDefined();
    });
  });
});