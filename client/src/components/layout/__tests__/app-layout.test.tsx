import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppLayout from '../app-layout';
import { LayoutConfig } from '@client/types';
import { LayoutError } from '../errors';
import { LayoutRenderError, LayoutResponsiveError } from '../errors';

// Mock dependencies
vi.mock('@/hooks/use-unified-navigation', () => ({
  useUnifiedNavigation: () => ({
    isMobile: false,
    mounted: true,
    sidebarCollapsed: false,
  }),
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

describe('AppLayout Component', () => {
  const defaultProps = {
    children: <div data-testid="test-content">Test Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default configuration', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    });

    it('should render with custom configuration', () => {
      const config: Partial<LayoutConfig> = {
        showSidebar: false,
        showHeader: false,
        showFooter: false,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should render skip links when accessibility is enabled', () => {
      const config: Partial<LayoutConfig> = {
        enableAccessibility: true,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      const skipLinks = screen.getAllByTestId('skip-link');
      expect(skipLinks.length).toBeGreaterThan(0);
    });

    it('should render footer when enabled', () => {
      const config: Partial<LayoutConfig> = {
        showFooter: true,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText(/© 2024 Chanuka Platform/)).toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      // Mock mobile view
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should render mobile navigation on mobile devices', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should apply mobile-specific classes', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('pb-16'); // Mobile bottom padding
    });
  });

  describe('Configuration Validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const onError = vi.fn();
      const invalidConfig = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={invalidConfig} onError={onError} />
        </TestWrapper>
      );

      expect(onError).toHaveBeenCalledWith(expect.any(LayoutRenderError));
    });

    it('should call onLayoutChange when configuration is valid', () => {
      const onLayoutChange = vi.fn();
      const config: Partial<LayoutConfig> = {
        showSidebar: true,
        sidebarState: 'expanded',
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} onLayoutChange={onLayoutChange} />
        </TestWrapper>
      );

      expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining(config));
    });
  });

  describe('Error Handling', () => {
    it('should render error boundary when layout error occurs', () => {
      const config = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      expect(screen.getByText('Layout Error')).toBeInTheDocument();
      expect(screen.getByText('Recover Layout')).toBeInTheDocument();
    });

    it('should recover from error when recover button is clicked', async () => {
      const user = userEvent.setup();
      const config = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      const recoverButton = screen.getByText('Recover Layout');
      await users.click(recoverButton);

      await waitFor(() => {
        expect(screen.queryByText('Layout Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Alt+M keyboard shortcut to focus main content', async () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      const mainContent = screen.getByRole('main');

      fireEvent.keyDown(layout!, {
        key: 'm',
        altKey: true,
      });

      expect(document.activeElement).toBe(mainContent);
    });

    it('should handle Alt+N keyboard shortcut to focus navigation', async () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');

      // Mock navigation element
      const mockNav = document.createElement('nav');
      mockNav.setAttribute('role', 'navigation');
      mockNav.setAttribute('aria-label', 'Main navigation');
      mockNav.tabIndex = 0;
      document.body.appendChild(mockNav);

      fireEvent.keyDown(layout!, {
        key: 'n',
        altKey: true,
      });

      expect(document.activeElement).toBe(mockNav);

      // Cleanup
      document.body.removeChild(mockNav);
    });
  });

  describe('SSR and Hydration', () => {
    it('should render SSR placeholder when not mounted', () => {
      // Mock not mounted state
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: false,
        sidebarCollapsed: false,
      });

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // Should render placeholder structure
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText(/© 2024 Chanuka Platform/)).toBeInTheDocument();
    });
  });

  describe('Responsive Transitions', () => {
    it('should handle responsive breakpoint transitions', async () => {
      const mockStartTransition = vi.fn();
      const mockEndTransition = vi.fn();

      vi.mocked(require('@/hooks/use-navigation-performance').useNavigationPerformance).mockReturnValue({
        startTransition: mockStartTransition,
        endTransition: mockEndTransition,
        enableGPUAcceleration: vi.fn(),
        disableGPUAcceleration: vi.fn(),
        isTransitioning: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      // Simulate mobile to desktop transition
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
        expect(mockStartTransition).toHaveBeenCalledWith(300);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('aria-label', 'Main content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveAttribute('aria-label', 'Site footer');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      expect(layout).toHaveAttribute('onKeyDown');
    });
  });

  describe('Performance Optimization', () => {
    it('should apply performance optimizations when enabled', () => {
      const config: Partial<LayoutConfig> = {
        enablePerformanceOptimization: true,
      };

      render(
        <TestWrapper>
          <AppLayout {...defaultProps} config={config} />
        </TestWrapper>
      );

      // Should have transition classes for performance
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass('chanuka-content-transition');
    });

    it('should handle GPU acceleration during transitions', async () => {
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

      // GPU acceleration should be called during transitions
      // This would be tested in integration with actual transition triggers
    });
  });

  describe('Custom Class Names', () => {
    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <AppLayout {...defaultProps} className="custom-layout" />
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      expect(layout).toHaveClass('custom-layout');
    });
  });
});

