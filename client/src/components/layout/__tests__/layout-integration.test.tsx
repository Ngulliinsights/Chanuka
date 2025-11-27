import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from '@client/app-layout';
import { MobileHeader } from '@client/mobile-header';
import MobileNavigation from '@client/mobile-navigation';
import { Sidebar } from '@client/sidebar';
import { LayoutConfig, User, NavigationItem } from '@client/types';

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
  SkipLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="skip-link">{children}</a>
  ),
  useAccessibility: () => ({
    announceToScreenReader: vi.fn(),
  }),
}));

vi.mock('@/components/navigation', () => ({
  DesktopSidebar: ({ onToggle }: { onToggle?: () => void }) => (
    <div data-testid="desktop-sidebar">
      <button onClick={onToggle} data-testid="sidebar-toggle">
        Toggle Sidebar
      </button>
      Desktop Sidebar
    </div>
  ),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

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
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: <span>📊</span>,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });
  });

  describe('Full Layout Integration', () => {
    it('should render complete layout with all components', () => {
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="page-content">Page Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should handle layout configuration changes', async () => {
      const onLayoutChange = vi.fn();
      const TestWrapper = createTestWrapper();

      const { rerender } = render(
        <TestWrapper>
          <AppLayout onLayoutChange={onLayoutChange}>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const newConfig: Partial<LayoutConfig> = {
        showSidebar: false,
        showFooter: false,
      };

      rerender(
        <TestWrapper>
          <AppLayout config={newConfig} onLayoutChange={onLayoutChange}>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining(newConfig));
    });
  });

  describe('Mobile Layout Integration', () => {
    beforeEach(() => {
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should render mobile layout with header and navigation', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="mobile-content">Mobile Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
    });

    it('should handle mobile header and navigation interaction', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <MobileHeader />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await users.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Close menu by clicking navigation item
      const dashboardLink = screen.getByText('Dashboard');
      await users.click(dashboardLink);

      await waitFor(() => {
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      });
    });

    it('should handle mobile navigation with user authentication', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <MobileNavigation
            isOpen={true}
            onClose={vi.fn()}
            user={mockUser}
            navigationItems={mockNavigationItems}
          />
        </TestWrapper>
      );

      // Should show user information and navigation items
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Desktop Layout Integration', () => {
    beforeEach(() => {
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });
    });

    it('should render desktop layout with sidebar', () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="desktop-content">Desktop Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-content')).toBeInTheDocument();
    });

    it('should handle sidebar toggle functionality', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Sidebar onToggle={onToggle} />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Expand sidebar');
      await users.click(toggleButton);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should handle sidebar search functionality', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Sidebar showSearch={true} onSearchChange={onSearchChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByLabelText('Search bills');
      await users.type(searchInput, 'test query');

      expect(onSearchChange).toHaveBeenCalledWith('test query');
    });

    it('should handle sidebar navigation with user roles', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const navigationWithAdmin = [
        ...mockNavigationItems,
        {
          id: 'admin',
          label: 'Admin Panel',
          href: '/admin',
          icon: <span>⚙️</span>,
          adminOnly: true,
        },
      ];

      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Sidebar user={adminUser} navigationItems={navigationWithAdmin} />
        </TestWrapper>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Transitions', () => {
    it('should handle mobile to desktop transition', async () => {
      const TestWrapper = createTestWrapper();

      // Start with mobile
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="content">Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();

      // Transition to desktop
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div data-testid="content">Content</div>
          </AppLayout>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      });
    });

    it('should handle desktop to mobile transition', async () => {
      const TestWrapper = createTestWrapper();

      // Start with desktop
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="content">Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();

      // Transition to mobile
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div data-testid='content'>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
      });
    });

    it('should handle sidebar collapse/expand transitions', async () => {
      const TestWrapper = createTestWrapper();

      // Start with expanded sidebar
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <Sidebar isCollapsed={false} />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('w-64');

      // Collapse sidebar
      rerender(
        <TestWrapper>
          <Sidebar isCollapsed={true} />
        </TestWrapper>
      );

      expect(sidebar).toHaveClass('w-16');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle layout errors gracefully across components', () => {
      const onError = vi.fn();
      const TestWrapper = createTestWrapper();

      const invalidConfig = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout config={invalidConfig} onError={onError}>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(onError).toHaveBeenCalled();
      expect(screen.getByText('Layout Error')).toBeInTheDocument();
    });

    it('should recover from errors and restore functionality', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      const invalidConfig = {
        type: 'invalid-type' as any,
      };

      render(
        <TestWrapper>
          <AppLayout config={invalidConfig}>
            <div data-testid="content">Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const recoverButton = screen.getByText('Recover Layout');
      await users.click(recoverButton);

      await waitFor(() => {
        expect(screen.queryByText('Layout Error')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });

    it('should handle component-specific errors without affecting other components', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();

      const invalidNavigationItems = [
        {
          id: '', // Invalid
          label: 'Invalid Item',
          href: '/invalid',
          icon: <span>❌</span>,
        },
      ] as NavigationItem[];

      render(
        <TestWrapper>
          <div>
            <Sidebar navigationItems={invalidNavigationItems} />
            <MobileHeader />
          </div>
        </TestWrapper>
      );

      // Sidebar should show error
      expect(screen.getByText(/Sidebar Error/)).toBeInTheDocument();

      // Mobile header should still work
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should handle multiple rapid layout changes efficiently', async () => {
      const TestWrapper = createTestWrapper();

      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Simulate rapid layout changes
      for (let i = 0; i < 10; i++) {
        const isMobile = i % 2 === 0;
        require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
          isMobile,
          mounted: true,
          sidebarCollapsed: !isMobile,
        });

        rerender(
          <TestWrapper>
            <AppLayout>
              <div>Content {i}</div>
            </AppLayout>
          </TestWrapper>
        );
      }

      // Layout should still be functional
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should optimize rendering with large navigation lists', () => {
      const largeNavigationList = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        label: `Item ${i}`,
        href: `/item-${i}`,
        icon: <span>📄</span>,
      }));

      const TestWrapper = createTestWrapper();

      const startTime = performance.now();

      render(
        <TestWrapper>
          <Sidebar navigationItems={largeNavigationList} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 99')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across layout changes', async () => {
      const TestWrapper = createTestWrapper();

      // Start with desktop
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: false,
        mounted: true,
        sidebarCollapsed: false,
      });

      const { rerender } = render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Main content');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');

      // Change to mobile
      require('@/hooks/use-unified-navigation').useUnifiedNavigation.mockReturnValue({
        isMobile: true,
        mounted: true,
        sidebarCollapsed: false,
      });

      rerender(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Accessibility attributes should be maintained
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Main content');
    });

    it('should handle keyboard navigation across all components', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <AppLayout>
            <Sidebar showSearch={true} />
          </AppLayout>
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');

      // Test Alt+M for main content
      fireEvent.keyDown(layout!, { key: 'm', altKey: true });
      expect(document.activeElement).toBe(screen.getByRole('main'));

      // Test Alt+S for search
      const searchInput = screen.getByLabelText('Search bills');
      fireEvent.keyDown(document.body, { key: 's', altKey: true });
      // Search should be focusable
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('User Authentication Integration', () => {
    it('should handle user login/logout across all components', async () => {
      const TestWrapper = createTestWrapper();

      // Start without user
      render(
        <TestWrapper>
          <Sidebar user={null} navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      // Auth-required items should not be visible
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();

      // Simulate user login
      const { rerender } = render(
        <TestWrapper>
          <Sidebar user={mockUser} navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <Sidebar user={mockUser} navigationItems={mockNavigationItems} />
        </TestWrapper>
      );

      // User info should be displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle role-based navigation visibility', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const navigationWithRoles = [
        ...mockNavigationItems,
        {
          id: 'admin',
          label: 'Admin Panel',
          href: '/admin',
          icon: <span>⚙️</span>,
          adminOnly: true,
        },
        {
          id: 'profile',
          label: 'Profile',
          href: '/profile',
          icon: <span>👤</span>,
          requiresAuth: true,
        },
      ];

      const TestWrapper = createTestWrapper();

      // Regular user
      const { rerender } = render(
        <TestWrapper>
          <Sidebar user={mockUser} navigationItems={navigationWithRoles} />
        </TestWrapper>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();

      // Admin user
      rerender(
        <TestWrapper>
          <Sidebar user={adminUser} navigationItems={navigationWithRoles} />
        </TestWrapper>
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });
});

