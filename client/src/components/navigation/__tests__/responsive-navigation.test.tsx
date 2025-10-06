import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import MobileNavigation from '../MobileNavigation';
import DesktopSidebar from '../DesktopSidebar';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Test wrapper
const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  initialPath?: string;
}> = ({ children, initialPath = '/' }) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </MemoryRouter>
);

describe('Responsive Navigation Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop view
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MobileNavigation', () => {
    beforeEach(() => {
      // Set mobile viewport
      mockMatchMedia(true);
    });

    it('should render mobile header correctly', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      expect(screen.getByText('Chanuka')).toBeInTheDocument();
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });

    it('should toggle mobile menu on button click', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      
      // Menu should be closed initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      // Open menu
      fireEvent.click(menuButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Close menu
      const closeButton = screen.getByLabelText('Close navigation menu');
      fireEvent.click(closeButton);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render bottom navigation', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Check for bottom navigation items
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('should highlight active navigation item', () => {
      render(
        <TestWrapper initialPath="/bills">
          <MobileNavigation />
        </TestWrapper>
      );

      const billsNavItem = screen.getByText('Bills').closest('a');
      expect(billsNavItem).toHaveClass('text-primary');
    });

    it('should handle navigation correctly', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const billsLink = screen.getByText('Bills').closest('a');
      expect(billsLink).toHaveAttribute('href', '/bills');
    });

    it('should show user menu when authenticated', () => {
      const mockUseAuth = vi.mocked(require('@/hooks/use-auth').useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Open mobile menu
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should show sign in button when not authenticated', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should handle touch interactions', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      
      // Simulate touch events
      fireEvent.touchStart(menuButton);
      fireEvent.touchEnd(menuButton);
      fireEvent.click(menuButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close menu on outside click', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Open menu
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click outside (on backdrop)
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      
      // Open with Enter key
      fireEvent.keyDown(menuButton, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close with Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('DesktopSidebar', () => {
    beforeEach(() => {
      // Set desktop viewport
      mockMatchMedia(false);
    });

    it('should render desktop sidebar correctly', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      expect(screen.getByText('Chanuka')).toBeInTheDocument();
      expect(screen.getByText('Legislative Transparency')).toBeInTheDocument();
    });

    it('should render navigation sections', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('should handle sidebar toggle', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Toggle sidebar');
      
      // Sidebar should be expanded initially
      expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      
      // Collapse sidebar
      fireEvent.click(toggleButton);
      
      // Text should be hidden when collapsed
      expect(screen.queryByText('Legislative Data')).not.toBeInTheDocument();
    });

    it('should show admin section for admin users', () => {
      const mockUseAuth = vi.mocked(require('@/hooks/use-auth').useAuth);
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Admin User', role: 'admin' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    });

    it('should highlight active navigation item', () => {
      render(
        <TestWrapper initialPath="/bills">
          <DesktopSidebar />
        </TestWrapper>
      );

      const billsNavItem = screen.getByText('Bills Dashboard').closest('a');
      expect(billsNavItem).toHaveClass('bg-primary/10');
    });

    it('should handle nested navigation items', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      // Click on expandable section
      const legislativeSection = screen.getByText('Legislative Data');
      fireEvent.click(legislativeSection);

      // Should show nested items
      expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sponsorship Analysis')).toBeInTheDocument();
    });

    it('should persist sidebar state', () => {
      const { rerender } = render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const toggleButton = screen.getByLabelText('Toggle sidebar');
      
      // Collapse sidebar
      fireEvent.click(toggleButton);
      
      // Rerender component
      rerender(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      // Should remain collapsed
      expect(screen.queryByText('Legislative Data')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should switch between mobile and desktop navigation based on viewport', () => {
      // Start with desktop
      mockMatchMedia(false);
      
      const { rerender } = render(
        <TestWrapper>
          <div>
            <MobileNavigation />
            <DesktopSidebar />
          </div>
        </TestWrapper>
      );

      // Desktop sidebar should be visible
      expect(screen.getByText('Legislative Transparency')).toBeInTheDocument();

      // Switch to mobile
      mockMatchMedia(true);
      
      rerender(
        <TestWrapper>
          <div>
            <MobileNavigation />
            <DesktopSidebar />
          </div>
        </TestWrapper>
      );

      // Mobile navigation should be visible
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });

    it('should handle viewport changes gracefully', () => {
      // Start with mobile
      mockMatchMedia(true);
      
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Open mobile menu
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Switch to desktop (menu should close)
      mockMatchMedia(false);
      
      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should maintain navigation state across viewport changes', () => {
      render(
        <TestWrapper initialPath="/bills">
          <div>
            <MobileNavigation />
            <DesktopSidebar />
          </div>
        </TestWrapper>
      );

      // Both should show active state for bills
      const mobileActiveItem = screen.getByText('Bills').closest('a');
      const desktopActiveItem = screen.getByText('Bills Dashboard').closest('a');

      expect(mobileActiveItem).toHaveClass('text-primary');
      expect(desktopActiveItem).toHaveClass('bg-primary/10');
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA labels', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');
      
      // Should be focusable
      menuButton.focus();
      expect(document.activeElement).toBe(menuButton);

      // Should respond to Enter key
      fireEvent.keyDown(menuButton, { key: 'Enter' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should trap focus in mobile menu', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Open menu
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      
      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should provide proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <DesktopSidebar />
        </TestWrapper>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check that headings follow proper hierarchy
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
      });
    });

    it('should support screen readers', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Check for screen reader friendly elements
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();

      const SpyComponent = () => {
        renderSpy();
        return <MobileNavigation />;
      };

      render(
        <TestWrapper>
          <SpyComponent />
        </TestWrapper>
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      // Interact with navigation
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      fireEvent.click(screen.getByLabelText('Close navigation menu'));

      // Should not cause excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 2);
    });

    it('should handle rapid interactions gracefully', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open navigation menu');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(menuButton);
      }

      // Should still work correctly
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      const addedListeners = addEventListenerSpy.mock.calls.length;

      unmount();

      const removedListeners = removeEventListenerSpy.mock.calls.length;

      // Should remove at least as many listeners as were added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Should not throw errors during normal operation
      fireEvent.click(screen.getByLabelText('Open navigation menu'));
      fireEvent.click(screen.getByText('Home'));

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle missing navigation context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<MobileNavigation />);
      }).toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle invalid navigation paths', () => {
      render(
        <TestWrapper>
          <MobileNavigation />
        </TestWrapper>
      );

      // Should handle clicks on invalid navigation items gracefully
      const invalidLink = screen.getByText('Home').closest('a');
      if (invalidLink) {
        // Modify href to invalid path
        invalidLink.setAttribute('href', 'invalid-path');
        fireEvent.click(invalidLink);
      }

      // Should not crash the application
      expect(screen.getByText('Chanuka')).toBeInTheDocument();
    });
  });
});