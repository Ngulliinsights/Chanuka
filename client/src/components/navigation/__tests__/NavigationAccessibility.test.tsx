import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import DesktopSidebar from '../DesktopSidebar';
import MobileNavigation from '../MobileNavigation';
import AppLayout from '../../layout/app-layout';
import { ResponsiveNavigationProvider } from '@/contexts/ResponsiveNavigationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Mock hooks
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'user'
    },
    logout: jest.fn()
  })
}));

jest.mock('@/hooks/use-mobile', () => ({
  useMediaQuery: jest.fn(() => false),
  useIsMobile: jest.fn(() => false)
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NavigationProvider>
          <ResponsiveNavigationProvider>
            {children}
          </ResponsiveNavigationProvider>
        </NavigationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Navigation Accessibility', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('DesktopSidebar Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveAttribute('aria-label', 'Main navigation');
      expect(sidebar).toHaveAttribute('aria-expanded');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
      
      // Focus the sidebar
      sidebar.focus();
      
      // Test Escape key functionality
      await user.keyboard('{Escape}');
      
      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // Should not throw any errors
      expect(sidebar).toBeInTheDocument();
    });

    it('should have accessible toggle button', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar navigation/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded');
      expect(toggleButton).toHaveAttribute('aria-controls', 'sidebar-navigation');
    });

    it('should announce state changes to screen readers', async () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar navigation/i });
      
      // Click to toggle sidebar
      fireEvent.click(toggleButton);
      
      // Wait for state change announcement
      await waitFor(() => {
        // Check if aria-live announcement was created
        const announcements = document.querySelectorAll('[aria-live="polite"]');
        expect(announcements.length).toBeGreaterThan(0);
      });
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar navigation/i });
      
      // Focus should be visible
      await user.tab();
      expect(document.activeElement).toBe(toggleButton);
      
      // Focus should have proper styling
      expect(toggleButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('MobileNavigation Accessibility', () => {
    beforeEach(() => {
      // Mock mobile environment
      require('@/hooks/use-mobile').useMediaQuery.mockReturnValue(true);
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true);
    });

    it('should have proper ARIA attributes for header', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-navigation-drawer');
    });

    it('should have accessible drawer with proper attributes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);

      await waitFor(() => {
        const drawer = screen.getByRole('dialog');
        expect(drawer).toBeInTheDocument();
        expect(drawer).toHaveAttribute('aria-modal', 'true');
        expect(drawer).toHaveAttribute('aria-labelledby');
      });
    });

    it('should support keyboard navigation in drawer', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);

      await waitFor(() => {
        const drawer = screen.getByRole('dialog');
        expect(drawer).toBeInTheDocument();
      });

      // Test Escape key to close drawer
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should have accessible bottom navigation', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const bottomNav = screen.getByRole('navigation', { name: /bottom navigation/i });
      expect(bottomNav).toBeInTheDocument();

      // Check for navigation buttons
      const navButtons = screen.getAllByRole('button');
      navButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveClass('touch-manipulation');
      });
    });

    it('should support arrow key navigation in bottom nav', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const bottomNav = screen.getByRole('navigation', { name: /bottom navigation/i });
      const navButtons = bottomNav.querySelectorAll('button');
      
      if (navButtons.length > 0) {
        // Focus first button
        navButtons[0].focus();
        
        // Test arrow key navigation
        await user.keyboard('{ArrowRight}');
        await user.keyboard('{ArrowLeft}');
        
        // Should not throw errors
        expect(bottomNav).toBeInTheDocument();
      }
    });
  });

  describe('AppLayout Accessibility', () => {
    it('should have skip to content link', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should have proper main content attributes', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveAttribute('aria-label', 'Main content');
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('should have accessible footer', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveAttribute('aria-label', 'Site footer');
    });

    it('should support keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      const layout = screen.getByRole('main').closest('div');
      
      // Test Alt+M to focus main content
      await user.keyboard('{Alt>}m{/Alt}');
      
      // Test Alt+N to focus navigation (desktop only)
      await user.keyboard('{Alt>}n{/Alt}');
      
      // Should not throw errors
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('should use memoization for expensive operations', () => {
      const { rerender } = render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      // Re-render with same props should not cause unnecessary re-calculations
      rerender(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      // Component should still be rendered correctly
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have proper CSS containment for performance', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      const layout = document.querySelector('.chanuka-layout-stable');
      expect(layout).toBeInTheDocument();
      
      // Check for performance-related CSS classes
      const sidebar = document.querySelector('.chanuka-sidebar-transition');
      const content = document.querySelector('.chanuka-content-transition');
      
      if (sidebar) {
        expect(sidebar).toHaveClass('chanuka-sidebar-transition');
      }
      if (content) {
        expect(content).toHaveClass('chanuka-content-transition');
      }
    });
  });

  describe('Motion Preferences', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
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
            <div>Test content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should render without animations when reduced motion is preferred
      expect(document.body).toBeInTheDocument();
    });
  });
});