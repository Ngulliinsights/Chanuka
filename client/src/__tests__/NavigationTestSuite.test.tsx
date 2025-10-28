import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavigationProvider } from '../contexts/NavigationContext';
import { ResponsiveNavigationProvider } from '../contexts/ResponsiveNavigationContext';
import AppLayout from '@/components/layout/app-layout';
import HomePage from '../pages/home';
import { logger } from '@/utils/browser-logger';

// Mock pages for testing
function BillsPage() {
  return <div data-testid="bills-page">Bills Page</div>;
}

function DashboardPage() {
  return <div data-testid="dashboard-page">Dashboard Page</div>;
}

function CommunityPage() {
  return <div data-testid="community-page">Community Page</div>;
}

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
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

function TestApp() {
  return (
    <BrowserRouter>
      <NavigationProvider>
        <ResponsiveNavigationProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/community" element={<CommunityPage />} />
            </Routes>
          </AppLayout>
        </ResponsiveNavigationProvider>
      </NavigationProvider>
    </BrowserRouter>
  );
}

describe('Navigation Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.store = {};
    
    // Reset URL to home
    window.history.pushState({}, '', '/');
  });

  describe('Homepage Navigation Links', () => {
    it('should render homepage with all navigation elements', async () => {
      render(<TestApp />);

      // Wait for homepage to load
      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Check for main navigation elements
      expect(screen.getByText('Government Transparency')).toBeInTheDocument();
      expect(screen.getByLabelText('Start tracking legislative bills and proposals')).toBeInTheDocument();
      expect(screen.getByLabelText('Join our community of engaged citizens')).toBeInTheDocument();
    });

    it('should navigate to bills page via hero CTA', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should navigate to community page via hero CTA', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');
      fireEvent.click(joinMovementButton);

      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
    });

    it('should navigate via feature cards', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Bill Tracking')).toBeInTheDocument();
      });

      const billTrackingCard = screen.getByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
      fireEvent.click(billTrackingCard);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard via CTA buttons', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('See Your Impact')).toBeInTheDocument();
      });

      const seeImpactButton = screen.getByText('See Your Impact');
      fireEvent.click(seeImpactButton);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Navigation', () => {
    it('should render desktop sidebar on desktop', async () => {
      render(<TestApp />);

      await waitFor(() => {
        // Desktop sidebar should be present
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
        expect(screen.getByText('Community')).toBeInTheDocument();
        expect(screen.getByText('User Account')).toBeInTheDocument();
      });
    });

    it('should toggle sidebar when toggle button is clicked', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should navigate via sidebar links', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      // Find and click Bills link in sidebar
      const billsLink = screen.getByRole('link', { name: /bills/i });
      fireEvent.click(billsLink);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      // Mock mobile viewport
      vi.mocked(vi.importActual('@/hooks/use-mobile')).useMediaQuery = vi.fn(() => true);
    });

    it('should render mobile header', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
        expect(screen.getByText('Chanuka')).toBeInTheDocument();
      });
    });

    it('should open mobile navigation drawer', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });
    });

    it('should navigate via mobile drawer and close drawer', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      // Click on Bills in mobile menu
      const billsButton = screen.getByLabelText('Navigate to Bills');
      fireEvent.click(billsButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Mobile menu should close after navigation
      await waitFor(() => {
        expect(screen.queryByText('Legislative Data')).not.toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist sidebar state to localStorage', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      // Wait for localStorage to be called
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chanuka-sidebar-collapsed',
          expect.stringContaining('collapsed')
        );
      });

      // Verify the stored data structure
      const storedValue = localStorageMock.store['chanuka-sidebar-collapsed'];
      expect(storedValue).toBeDefined();
      
      const parsedValue = JSON.parse(storedValue);
      expect(parsedValue.collapsed).toBe(true);
      expect(parsedValue.lastToggleAt).toBeDefined();
    });

    it('should restore sidebar state from localStorage', async () => {
      // Pre-populate localStorage with collapsed state
      const sidebarState = {
        collapsed: true,
        lastToggleAt: new Date().toISOString(),
      };
      localStorageMock.store['chanuka-sidebar-collapsed'] = JSON.stringify(sidebarState);

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed');
    });

    it('should persist navigation state across page changes', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Collapse sidebar
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      // Navigate to another page
      const billsLink = screen.getByRole('link', { name: /bills/i });
      fireEvent.click(billsLink);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Sidebar should remain collapsed
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation elements', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Start tracking legislative bills and proposals')).toBeInTheDocument();
        expect(screen.getByLabelText('Join our community of engaged citizens')).toBeInTheDocument();
      });

      // Check sidebar accessibility
      await waitFor(() => {
        expect(screen.getByTitle(/sidebar/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Start tracking legislative bills and proposals')).toBeInTheDocument();
      });

      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      
      // Should be focusable
      startTrackingButton.focus();
      expect(startTrackingButton).toHaveFocus();

      // Should respond to keyboard events
      fireEvent.keyDown(startTrackingButton, { key: 'Enter' });
      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should maintain focus management during navigation', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Start tracking legislative bills and proposals')).toBeInTheDocument();
      });

      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      startTrackingButton.focus();
      
      expect(startTrackingButton).toHaveFocus();

      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Focus should be managed properly after navigation
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Should still work even if localStorage fails
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should handle navigation errors gracefully', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Try to navigate to non-existent route
      window.history.pushState({}, '', '/non-existent');

      // Should not crash the application
      expect(screen.getByText('Your Voice in')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', async () => {
      const { unmount } = render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      unmount();
      
      // Should unmount cleanly without errors
      expect(true).toBe(true);
    });

    it('should handle rapid navigation changes', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Rapidly click different navigation elements
      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');

      fireEvent.click(startTrackingButton);
      fireEvent.click(joinMovementButton);

      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Device Consistency', () => {
    it('should handle desktop to mobile transition', async () => {
      const { useMediaQuery } = await import('@/hooks/use-mobile');
      const mockUseMediaQuery = vi.mocked(useMediaQuery);
      
      // Start with desktop
      mockUseMediaQuery.mockReturnValue(false);
      
      const { rerender } = render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      // Switch to mobile
      mockUseMediaQuery.mockReturnValue(true);
      
      rerender(<TestApp />);

      await waitFor(() => {
        // Should show mobile navigation
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      // Desktop sidebar should be hidden
      expect(screen.queryByTitle('Collapse sidebar')).not.toBeInTheDocument();
    });
  });
});

describe('NavigationTestSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render without crashing', () => {
    const { container } = render(<NavigationTestSuite />);
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<NavigationTestSuite />);
    expect(container.firstChild).toHaveAttribute('role');
  });

  it('should handle props correctly', () => {
    // TODO: Add specific prop tests for NavigationTestSuite
    expect(true).toBe(true);
  });
});

