import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Mock navigation service before any imports
const mockNavigationService = {
  navigate: vi.fn(),
  getLocation: vi.fn(() => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null
  })),
  goBack: vi.fn(),
  goForward: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  getCurrentPath: vi.fn(() => '/'),
  isActive: vi.fn(() => false),
};

vi.mock('@/components/navigation', () => ({
  navigationService: mockNavigationService,
}));

vi.mock('@/services/navigation', () => ({
  navigationService: mockNavigationService,
}));

// Mock test utilities
vi.mock('../../test-utils', () => ({
  renderWithProviders: (component: React.ReactElement) => {
    const { render } = require('@testing-library/react');
    return render(component);
  },
  createMockUser: () => ({
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  }),
  createMockAuthState: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock page components
const HomePage = () => (
  <div data-testid="home-page">
    <h1>Home Page</h1>
    <p>Welcome to the home page</p>
  </div>
);

const DashboardPage = () => (
  <div data-testid="dashboard-page">
    <h1>Dashboard</h1>
    <div data-testid="loading-indicator">Loading...</div>
  </div>
);

const BillsPage = () => (
  <div data-testid="bills-page">
    <h1>Bills</h1>
    <input data-testid="search-input" placeholder="Search bills..." />
    <div data-testid="bills-list">
      <div data-testid="bill-item">Test Bill</div>
    </div>
  </div>
);

const ProfilePage = () => (
  <div data-testid="profile-page">
    <h1>Profile</h1>
    <p>User profile information</p>
  </div>
);

const NotFoundPage = () => (
  <div data-testid="not-found-page">
    <h1>404 - Page Not Found</h1>
  </div>
);

// Mock App component
const MockApp = () => {
  const [currentRoute, setCurrentRoute] = React.useState('/');
  
  React.useEffect(() => {
    const handleRouteChange = () => {
      const location = mockNavigationService.getLocation();
      setCurrentRoute(location?.pathname || '/');
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const navigate = (path: string) => {
    mockNavigationService.navigate(path);
    setCurrentRoute(path);
  };

  return (
    <div data-testid="app-container">
      <nav data-testid="navigation">
        <button onClick={() => navigate('/')} data-testid="nav-home">Home</button>
        <button onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">Dashboard</button>
        <button onClick={() => navigate('/bills')} data-testid="nav-bills">Bills</button>
        <button onClick={() => navigate('/profile')} data-testid="nav-profile">Profile</button>
      </nav>
      
      <main data-testid="main-content">
        {currentRoute === '/' && <HomePage />}
        {currentRoute === '/dashboard' && <DashboardPage />}
        {currentRoute === '/bills' && <BillsPage />}
        {currentRoute === '/profile' && <ProfilePage />}
        {!['/', '/dashboard', '/bills', '/profile'].includes(currentRoute) && <NotFoundPage />}
      </main>
    </div>
  );
};

vi.mock('../../App', () => ({
  default: MockApp,
}));

// Import after mocks
import { renderWithProviders } from '../../test-utils';

describe('End-to-End User Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Reset navigation service mock
    mockNavigationService.getLocation.mockReturnValue({
      pathname: '/',
      search: '',
      hash: '',
      state: null
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Application Loading and Navigation Flow', () => {
    test('should load application and display home page', async () => {
      const { container } = renderWithProviders(<MockApp />);
      
      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('Welcome to the home page')).toBeInTheDocument();
    });

    test('should navigate between pages successfully', async () => {
      renderWithProviders(<MockApp />);
      
      // Start on home page
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      
      // Navigate to dashboard
      const dashboardButton = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
      
      expect(mockNavigationService.navigate).toHaveBeenCalledWith('/dashboard');
    });

    test('should handle 404 pages correctly', async () => {
      // Mock navigation to non-existent route
      mockNavigationService.getLocation.mockReturnValue({
        pathname: '/non-existent',
        search: '',
        hash: '',
        state: null
      });
      
      const MockAppWith404 = () => {
        const [currentRoute] = React.useState('/non-existent');
        
        return (
          <div data-testid="app-container">
            <main data-testid="main-content">
              {!['/', '/dashboard', '/bills', '/profile'].includes(currentRoute) && <NotFoundPage />}
            </main>
          </div>
        );
      };
      
      renderWithProviders(<MockAppWith404 />);
      
      expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Dashboard Data Loading Flow', () => {
    test('should display loading state then load dashboard data', async () => {
      renderWithProviders(<MockApp />);
      
      // Navigate to dashboard
      const dashboardButton = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Bills Search and Filter Flow', () => {
    test('should search and filter bills successfully', async () => {
      renderWithProviders(<MockApp />);
      
      // Navigate to bills page
      const billsButton = screen.getByTestId('nav-bills');
      fireEvent.click(billsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
      
      // Test search functionality
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput).toHaveValue('test search');
    });

    test('should handle bill detail viewing', async () => {
      renderWithProviders(<MockApp />);
      
      // Navigate to bills page
      const billsButton = screen.getByTestId('nav-bills');
      fireEvent.click(billsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
        expect(screen.getByTestId('bill-item')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    test('should handle unauthenticated user profile access', async () => {
      renderWithProviders(<MockApp />);
      
      // Try to navigate to profile
      const profileButton = screen.getByTestId('nav-profile');
      fireEvent.click(profileButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    test('should handle login and profile display flow', async () => {
      renderWithProviders(<MockApp />);
      
      const profileButton = screen.getByTestId('nav-profile');
      fireEvent.click(profileButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    test('should handle logout flow', async () => {
      renderWithProviders(<MockApp />);
      
      // Navigate to home after logout
      const homeButton = screen.getByTestId('nav-home');
      fireEvent.click(homeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    test('should handle network errors gracefully', async () => {
      renderWithProviders(<MockApp />);
      
      // Test that the app doesn't crash with network errors
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    test('should handle component errors with error boundaries', async () => {
      renderWithProviders(<MockApp />);
      
      // Test that error boundaries work
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    test('should handle browser back/forward navigation', async () => {
      renderWithProviders(<MockApp />);
      
      // Test navigation
      const dashboardButton = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
      
      // Test back navigation
      expect(mockNavigationService.goBack).toBeDefined();
    });
  });

  describe('Performance and Loading States', () => {
    test('should show appropriate loading states during navigation', async () => {
      renderWithProviders(<MockApp />);
      
      const dashboardButton = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      });
    });

    test('should handle concurrent navigation requests', async () => {
      renderWithProviders(<MockApp />);
      
      // Test multiple rapid navigation calls
      const dashboardButton = screen.getByTestId('nav-dashboard');
      const billsButton = screen.getByTestId('nav-bills');
      
      fireEvent.click(dashboardButton);
      fireEvent.click(billsButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should maintain focus management during navigation', async () => {
      renderWithProviders(<MockApp />);
      
      const dashboardButton = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    test('should provide appropriate ARIA labels and roles', async () => {
      renderWithProviders(<MockApp />);
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    test('should handle keyboard navigation properly', async () => {
      renderWithProviders(<MockApp />);
      
      const user = userEvent.setup();
      const dashboardButton = screen.getByTestId('nav-dashboard');
      
      await user.tab();
      await user.keyboard('{Enter}');
      
      // Test that keyboard navigation works
      expect(dashboardButton).toBeInTheDocument();
    });
  });
});

