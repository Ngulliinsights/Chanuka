import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DesktopSidebar from '../DesktopSidebar';
import { ResponsiveNavigationProvider } from '@/contexts/ResponsiveNavigationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { logger } from '../utils/logger.js';

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'user',
    },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useMediaQuery: vi.fn(() => false),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <NavigationProvider>
        <ResponsiveNavigationProvider>
          {component}
        </ResponsiveNavigationProvider>
      </NavigationProvider>
    </BrowserRouter>
  );
}

describe('DesktopSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('should render sidebar with logo and navigation items', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByText('Chanuka')).toBeInTheDocument();
      });

      // Check for navigation sections
      expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('User Account')).toBeInTheDocument();
    });

    it('should render user information when authenticated', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    it('should render sign out button when authenticated', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Toggle', () => {
    it('should toggle sidebar when toggle button is clicked', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should show collapsed state correctly', async () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      // In collapsed state, text should be hidden
      expect(screen.queryByText('Legislative Data')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    it('should render navigation items with proper accessibility', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        // Check for navigation links with proper roles
        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toBeInTheDocument();
        expect(homeLink).toHaveAttribute('href', '/');
      });
    });

    it('should highlight active navigation item', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        // Home should be active by default (current path is '/')
        const homeLink = screen.getByRole('link', { name: /home/i });
        expect(homeLink).toHaveClass('chanuka-nav-active');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply correct CSS classes for responsive behavior', async () => {
      renderWithProviders(<DesktopSidebar />);

      const sidebar = await screen.findByRole('complementary');
      expect(sidebar).toHaveClass('hidden', 'lg:flex');
    });

    it('should handle smooth transitions', async () => {
      renderWithProviders(<DesktopSidebar />);

      const sidebar = await screen.findByRole('complementary');
      expect(sidebar).toHaveClass('chanuka-sidebar-transition');
    });
  });

  describe('User Interactions', () => {
    it('should call logout when sign out button is clicked', async () => {
      const { useAuth } = await import('@/hooks/use-auth');
      const mockLogout = vi.fn();
      
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'user',
        },
        isAuthenticated: true,
        logout: mockLogout,
      });

      renderWithProviders(<DesktopSidebar />);

      const signOutButton = await screen.findByText('Sign Out');
      fireEvent.click(signOutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        const sidebar = screen.getByRole('complementary');
        expect(sidebar).toBeInTheDocument();
      });

      // Check for proper button labels
      const toggleButton = screen.getByTitle(/sidebar/i);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        const toggleButton = screen.getByTitle(/sidebar/i);
        expect(toggleButton).toBeInTheDocument();
        
        // Button should be focusable
        toggleButton.focus();
        expect(toggleButton).toHaveFocus();
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist sidebar state to localStorage', async () => {
      renderWithProviders(<DesktopSidebar />);

      const toggleButton = await screen.findByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed', 'true');
      });
    });

    it('should load sidebar state from localStorage on mount', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      renderWithProviders(<DesktopSidebar />);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed');
    });
  });
});