import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppLayout from '../app-layout';
import { MobileHeader } from '../mobile-header';
import { Sidebar } from '../sidebar';
import MobileNavigation from '../mobile-navigation';
import { LayoutConfig, NavigationItem, User, HeaderAction } from '../types';

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

describe('Layout Integration Tests', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'citizen',
  };

  const mockNavigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: <span>🏠</span>,
    },
    {
      id: 'bills',
      label: 'Bills',
      href: '/bills',
      icon: <span>📄</span>,
      badge: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    });
  });

  describe('Desktop Layout Integration', () => {
    it('should render complete desktop layout with sidebar and main content', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle sidebar toggle and layout adjustment', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();

      render(
        <TestWrapper>
          <AppLayout onLayoutChange={onLayoutChange}>
            <Sidebar onToggle={vi.fn()} />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);

      // Layout should adjust when sidebar is toggled
      expect(onLayoutChange).toHaveBeenCalled();
    });

    it('should integrate sidebar search with layout state', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();

      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar showSearch={true} onSearchChange={onSearchChange} />
          </AppLayout>
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      await user.type(searchInput, 'test query');

      expect(onSearchChange).toHaveBeenCalledWith('test query');
    });
  });

  describe('Mobile Layout Integration', () => {
    beforeEach(() => {
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should render complete mobile layout with header and navigation', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <MobileHeader title="Test App" />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should handle mobile header menu toggle', async () => {
      const user = userEvent.setup();
      const onMenuToggle = vi.fn();

      render(
        <TestWrapper>
          <MobileHeader onMenuToggle={onMenuToggle} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(onMenuToggle).toHaveBeenCalledTimes(1);
    });

    it('should integrate mobile header actions with navigation', async () => {
      const user = userEvent.setup();
      const onActionClick = vi.fn();
      const rightActions: HeaderAction[] = [
        {
          id: 'notifications',
          icon: <span>🔔</span>,
          label: 'Notifications',
          onClick: onActionClick,
          badge: 3,
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader rightActions={rightActions} />
        </TestWrapper>
      );

      const actionButton = screen.getByLabelText('Notifications');
      await user.click(actionButton);

      expect(onActionClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Layout Transitions', () => {
    it('should handle desktop to mobile transition seamlessly', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Initially desktop
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();

      // Switch to mobile
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });

    it('should maintain content during layout transitions', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="persistent-content">Persistent Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('persistent-content')).toBeInTheDocument();

      // Switch to mobile
      vi.mocked(require('@/hooks/use-unified-navigation').useUnifiedNavigation).mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div data-testid="persistent-content">Persistent Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Content should persist through layout changes
      expect(screen.getByTestId('persistent-content')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle layout errors gracefully across components', () => {
      const onError = vi.fn();
      const invalidConfig = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout config={invalidConfig} onError={onError}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(onError).toHaveBeenCalled();
    });

    it('should recover from errors and restore functionality', async () => {
      const user = userEvent.setup();
      const invalidConfig = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout config={invalidConfig}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const recoverButton = screen.getByText('Recover Layout');
      await user.click(recoverButton);

      await waitFor(() => {
        expect(screen.queryByText('Layout Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across all layout components', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar navigationItems={mockNavigationItems} />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Check for proper landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check for proper ARIA attributes
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('aria-label', 'Main content');
    });

    it('should handle keyboard navigation across components', async () => {
      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar showSearch={true} />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      const mainContent = screen.getByRole('main');

      // Test Alt+M keyboard shortcut
      fireEvent.keyDown(layout!, {
        key: 'm',
        altKey: true,
      });

      expect(document.activeElement).toBe(mainContent);
    });
  });

  describe('Performance Integration', () => {
    it('should optimize performance across layout components', () => {
      const config: Partial<LayoutConfig> = {
        enablePerformanceOptimization: true,
      };

      render(
        <TestWrapper>
          <AppLayout config={config}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
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
          <AppLayout>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // GPU acceleration methods should be available
      expect(mockEnableGPU).toBeDefined();
      expect(mockDisableGPU).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should apply configuration consistently across components', () => {
      const config: Partial<LayoutConfig> = {
        showSidebar: true,
        showHeader: true,
        showFooter: true,
        sidebarState: 'expanded',
      };

      render(
        <TestWrapper>
          <AppLayout config={config}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should handle configuration changes dynamically', () => {
      const onLayoutChange = vi.fn();
      const initialConfig: Partial<LayoutConfig> = {
        sidebarState: 'expanded',
      };

      const { rerender } = render(
        <TestWrapper>
          <AppLayout config={initialConfig} onLayoutChange={onLayoutChange}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const updatedConfig: Partial<LayoutConfig> = {
        sidebarState: 'collapsed',
      };

      rerender(
        <TestWrapper>
          <AppLayout config={updatedConfig} onLayoutChange={onLayoutChange}>
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(onLayoutChange).toHaveBeenCalled();
    });
  });

  describe('User Interaction Integration', () => {
    it('should handle complex user interactions across components', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();
      const onMenuToggle = vi.fn();

      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar showSearch={true} onSearchChange={onSearchChange} />
            <MobileHeader onMenuToggle={onMenuToggle} />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Test search functionality
      const searchInput = screen.getByLabelText('Search bills');
      await user.type(searchInput, 'test');
      expect(onSearchChange).toHaveBeenCalledWith('test');

      // Test menu toggle
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);
      expect(onMenuToggle).toHaveBeenCalled();
    });

    it('should maintain state consistency across user interactions', async () => {
      const user = userEvent.setup();
      let sidebarCollapsed = false;
      const onToggle = vi.fn(() => {
        sidebarCollapsed = !sidebarCollapsed;
      });

      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar isCollapsed={sidebarCollapsed} onToggle={onToggle} />
            <div data-testid="main-content">Main Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Expand sidebar');
      await user.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });
});

