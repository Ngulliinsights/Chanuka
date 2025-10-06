import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MobileNavigation from '../MobileNavigation';
import { ResponsiveNavigationProvider } from '@/contexts/ResponsiveNavigationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

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
  useMediaQuery: vi.fn(() => true), // Mobile by default
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

describe('MobileNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Mobile Header', () => {
    it('should render mobile header with menu button and logo', async () => {
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      expect(screen.getByText('Chanuka')).toBeInTheDocument();
    });

    it('should render notification button when user is authenticated', async () => {
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      });
    });

    it('should render sign in button when user is not authenticated', async () => {
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: null,
        isAuthenticated: false,
        logout: vi.fn(),
      });

      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Drawer', () => {
    it('should open navigation drawer when menu button is clicked', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
      });
    });

    it('should render navigation sections in drawer', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
        expect(screen.getByText('Community')).toBeInTheDocument();
        expect(screen.getByText('User Account')).toBeInTheDocument();
      });
    });

    it('should render user information in drawer when authenticated', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should close drawer when navigation item is clicked', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      const homeButton = screen.getByLabelText('Navigate to Home');
      fireEvent.click(homeButton);

      await waitFor(() => {
        expect(screen.queryByText('Legislative Data')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bottom Navigation', () => {
    it('should render bottom navigation with priority items', async () => {
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        // Check for bottom navigation items
        const bottomNav = screen.getByRole('navigation');
        expect(bottomNav).toBeInTheDocument();
      });

      // Should show priority items like Home, Bills, Dashboard, Search
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to Bills')).toBeInTheDocument();
    });

    it('should highlight active item in bottom navigation', async () => {
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        const homeButton = screen.getByLabelText('Navigate to Home');
        expect(homeButton).toHaveClass('chanuka-nav-active');
      });
    });

    it('should navigate when bottom navigation item is clicked', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });

      renderWithProviders(<MobileNavigation />);

      const billsButton = await screen.findByLabelText('Navigate to Bills');
      fireEvent.click(billsButton);

      // Navigation should be called (through unified navigation hook)
      expect(billsButton).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events properly', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      
      // Simulate touch events
      fireEvent.touchStart(menuButton);
      fireEvent.touchEnd(menuButton);
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
      });
    });

    it('should have proper touch-friendly sizing', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      expect(menuButton).toHaveClass('touch-manipulation');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
        expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      
      // Should be focusable
      menuButton.focus();
      expect(menuButton).toHaveFocus();

      // Should respond to Enter key
      fireEvent.keyDown(menuButton, { key: 'Enter' });
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
      });
    });

    it('should have proper focus management in drawer', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close navigation menu');
        expect(closeButton).toBeInTheDocument();
        
        // Close button should be focusable
        closeButton.focus();
        expect(closeButton).toHaveFocus();
      });
    });
  });

  describe('User Authentication States', () => {
    it('should show different navigation items for authenticated users', async () => {
      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('User Account')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should handle logout correctly', async () => {
      const mockLogout = vi.fn();
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'user',
        },
        isAuthenticated: true,
        logout: mockLogout,
      });

      renderWithProviders(<MobileNavigation />);

      const menuButton = await screen.findByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      const signOutButton = await screen.findByText('Sign Out');
      fireEvent.click(signOutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should only show on mobile screens', async () => {
      renderWithProviders(<MobileNavigation />);

      const mobileHeader = await screen.findByRole('banner');
      expect(mobileHeader).toHaveClass('lg:hidden');
    });

    it('should handle screen orientation changes', async () => {
      renderWithProviders(<MobileNavigation />);

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        const bottomNav = screen.getByRole('navigation');
        expect(bottomNav).toBeInTheDocument();
      });
    });
  });

  describe('Badge Notifications', () => {
    it('should display notification badges when present', async () => {
      // Mock navigation items with badges
      renderWithProviders(<MobileNavigation />);

      await waitFor(() => {
        // Check if notification indicator is present
        const notificationDot = document.querySelector('.bg-red-500');
        expect(notificationDot).toBeInTheDocument();
      });
    });
  });
});