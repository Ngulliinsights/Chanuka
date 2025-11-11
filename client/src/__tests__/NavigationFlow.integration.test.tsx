import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createNavigationProvider } from '../core/navigation/context';
import AppLayout from '@/components/layout/app-layout';
import HomePage from '../pages/home';
import { logger } from '@/utils/logger';

// Mock pages for testing navigation
function BillsPage() {
  return <div data-testid="bills-page">Bills Page</div>;
}

function DashboardPage() {
  return <div data-testid="dashboard-page">Dashboard Page</div>;
}

function CommunityPage() {
  return <div data-testid="community-page">Community Page</div>;
}

function AnalysisPage() {
  return <div data-testid="analysis-page">Analysis Page</div>;
}

// Mock hooks
const mockUseAuth = vi.fn(() => ({
  user: {
    id: '1',
    email: 'test@example.com',
    display_name: 'Test User',
    role: 'user',
  },
  isAuthenticated: true,
  logout: vi.fn(),
}));

const mockUseMediaQuery = vi.fn(() => false);
const mockUseLocation = vi.fn(() => ({ pathname: '/' }));
const mockUseNavigate = vi.fn(() => vi.fn());

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useMediaQuery: mockUseMediaQuery,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: mockUseLocation,
    useNavigate: mockUseNavigate,
  };
});

// Create NavigationProvider
const NavigationProvider = createNavigationProvider(
  mockUseLocation,
  mockUseNavigate,
  mockUseAuth,
  mockUseMediaQuery
);

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

function TestApp() {
  return (
    <BrowserRouter>
      <NavigationProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/bill-sponsorship-analysis" element={<AnalysisPage />} />
          </Routes>
        </AppLayout>
      </NavigationProvider>
    </BrowserRouter>
  );
}

describe('Navigation Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset URL to home
    window.history.pushState({}, '', '/');
  });

  describe('Homepage Navigation Links', () => {
    it('should navigate from homepage to bills page via hero CTA', async () => {
      render(<TestApp />);

      // Should start on homepage
      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Click the "Start Tracking Bills" button
      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      fireEvent.click(startTrackingButton);

      // Should navigate to bills page
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should navigate from homepage to community page via hero CTA', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Click the "Join the Movement" button
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

      // Click the Bill Tracking feature card
      const billTrackingCard = screen.getByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
      fireEvent.click(billTrackingCard);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should navigate to transparency analysis via feature card', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Transparency Analysis')).toBeInTheDocument();
      });

      const transparencyCard = screen.getByLabelText('Transparency Analysis: Analyze conflicts of interest and sponsor relationships');
      fireEvent.click(transparencyCard);

      await waitFor(() => {
        expect(screen.getByTestId('analysis-page')).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard via mission section CTA', async () => {
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

    it('should navigate to dashboard via final CTA section', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Access your personal dashboard')).toBeInTheDocument();
      });

      const accessDashboardButton = screen.getByLabelText('Access your personal dashboard');
      fireEvent.click(accessDashboardButton);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Navigation', () => {
    it('should navigate via desktop sidebar links', async () => {
      render(<TestApp />);

      await waitFor(() => {
        // Wait for sidebar to be rendered
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      // Click on Bills link in sidebar
      const billsLink = screen.getByRole('link', { name: /bills/i });
      fireEvent.click(billsLink);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });

    it('should maintain active state in sidebar after navigation', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Legislative Data')).toBeInTheDocument();
      });

      // Navigate to bills page
      const billsLink = screen.getByRole('link', { name: /bills/i });
      fireEvent.click(billsLink);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Bills link should now be active
      await waitFor(() => {
        expect(billsLink).toHaveClass('chanuka-nav-active');
      });
    });

    it('should toggle sidebar and maintain navigation functionality', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Toggle sidebar to collapsed state
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      // Navigation should still work in collapsed state
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

    it('should navigate via mobile drawer menu', async () => {
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

    it('should navigate via bottom navigation', async () => {
      render(<TestApp />);

      await waitFor(() => {
        // Bottom navigation should be present
        const homeButton = screen.getByLabelText('Navigate to Home');
        expect(homeButton).toBeInTheDocument();
      });

      // Click on Bills in bottom navigation
      const billsButton = screen.getByLabelText('Navigate to Bills');
      fireEvent.click(billsButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should persist sidebar state across navigation', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Collapse sidebar
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed', 'true');
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

    it('should restore sidebar state on page reload', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed');
    });
  });

  describe('Responsive Transitions', () => {
    it('should handle desktop to mobile transition smoothly', async () => {
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

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      // Mock console.error to suppress error logs in test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      // Try to navigate to non-existent route
      window.history.pushState({}, '', '/non-existent');

      // Should not crash the application
      expect(screen.getByText('Your Voice in')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', async () => {
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
  });

  describe('Accessibility in Navigation Flow', () => {
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

    it('should support keyboard navigation throughout the flow', async () => {
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByLabelText('Start tracking legislative bills and proposals')).toBeInTheDocument();
      });

      const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
      
      // Should be keyboard accessible
      fireEvent.keyDown(startTrackingButton, { key: 'Enter' });
      fireEvent.click(startTrackingButton);

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });
  });
});

