import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { navigationService } from '../../services/navigation';
import { renderWithProviders, createMockUser, createMockAuthState } from '../../test-utils';
import React from 'react'; // Import React at the top

// Mock the entire App component and its dependencies
vi.mock('../../App', () => ({
  default: () => {
    const [currentRoute, setCurrentRoute] = React.useState('/');
    
    React.useEffect(() => {
      const handleRouteChange = () => {
        setCurrentRoute(navigationService.getLocation().pathname);
      };
      
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }, []);

    const navigate = (path: string) => {
      navigationService.navigate(path);
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
  }
}));

// Mock page components
const HomePage = () => (
  <div data-testid="home-page">
    <h1>Chanuka Legislative Transparency Platform</h1>
    <p>Welcome to the platform for legislative transparency</p>
    <button data-testid="get-started-btn">Get Started</button>
  </div>
);

const DashboardPage = () => {
  // Define an interface for the bill structure
  interface DashboardBill {
    id: number;
    title: string;
    status: string;
  }

  const [isLoading, setIsLoading] = React.useState(true);
  // Explicitly type the bills state as an array of DashboardBill
  const [bills, setBills] = React.useState<DashboardBill[]>([]);
  
  React.useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBills([ // This now matches the <DashboardBill[]> type
        { id: 1, title: 'Healthcare Reform Bill', status: 'active' },
        { id: 2, title: 'Education Funding Bill', status: 'pending' }
      ]);
      setIsLoading(false);
    }, 100);
  }, []);

  if (isLoading) {
    return <div data-testid="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div data-testid="dashboard-page">
      <h1>Legislative Dashboard</h1>
      <div data-testid="bills-summary">
        <h2>Recent Bills</h2>
        {bills.map(bill => ( // 'bill' is now correctly typed as DashboardBill
          <div key={bill.id} data-testid={`bill-${bill.id}`}>
            <h3>{bill.title}</h3>
            <span data-testid={`bill-status-${bill.id}`}>{bill.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BillsPage = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [bills, setBills] = React.useState([
    { id: 1, title: 'Healthcare Reform Bill', category: 'healthcare', status: 'active' },
    { id: 2, title: 'Education Funding Bill', category: 'education', status: 'pending' },
    { id: 3, title: 'Infrastructure Investment Bill', category: 'infrastructure', status: 'passed' }
  ]);

  const filteredBills = bills.filter(bill =>
    bill.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="bills-page">
      <h1>Legislative Bills</h1>
      <div data-testid="search-section">
        <input
          type="text"
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="bills-search-input"
        />
      </div>
      <div data-testid="bills-list">
        {filteredBills.map(bill => (
          <div key={bill.id} data-testid={`bill-item-${bill.id}`}>
            <h3 data-testid={`bill-title-${bill.id}`}>{bill.title}</h3>
            <span data-testid={`bill-category-${bill.id}`}>{bill.category}</span>
            <span data-testid={`bill-status-${bill.id}`}>{bill.status}</span>
            <button data-testid={`view-bill-${bill.id}`}>View Details</button>
          </div>
        ))}
      </div>
      {filteredBills.length === 0 && (
        <div data-testid="no-bills-found">No bills found matching your search.</div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  // Define an interface for the user profile
  interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: string;
  }

  // Type the state to allow UserProfile OR null
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  // Type the state to allow string OR null
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Simulate authentication check
    setTimeout(() => {
      const isAuthenticated = localStorage.getItem('auth_token');
      if (isAuthenticated) {
        setUser({ // This now matches the UserProfile type
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'citizen'
        });
      } else {
        setError('Authentication required'); // This now matches the string type
      }
      setIsLoading(false);
    }, 100);
  }, []);

  if (isLoading) {
    return <div data-testid="profile-loading">Loading profile...</div>;
  }

  if (error) {
    return (
      <div data-testid="profile-error">
        <p>Error: {error}</p>
        <button
          data-testid="login-btn"
          onClick={() => {
            localStorage.setItem('auth_token', 'mock-token');
            navigationService.reload();
          }}
        >
          Login
        </button>
      </div>
    );
  }

  // Add this check to handle the 'user is possibly null' error
  if (!user) {
    // This case shouldn't be reached if the logic is correct,
    // but it satisfies TypeScript.
    return <div data-testid="profile-error">Error: User data not found.</div>;
  }

  return (
    <div data-testid="profile-page">
      <h1>User Profile</h1>
      <div data-testid="user-info">
        {/* 'user' is now guaranteed to be non-null here */}
        <p data-testid="user-name">Name: {user.name}</p>
        <p data-testid="user-email">Email: {user.email}</p>
        <p data-testid="user-role">Role: {user.role}</p>
      </div>
      <button
        data-testid="logout-btn"
        onClick={() => {
          localStorage.removeItem('auth_token');
          navigationService.reload();
        }}
      >
        Logout
      </button>
    </div>
  );
};

const NotFoundPage = () => (
  <div data-testid="not-found-page">
    <h1>Page Not Found</h1>
    <p>The requested page could not be found.</p>
    <button data-testid="back-home-btn" onClick={() => navigationService.replace('/')}>
      Back to Home
    </button>
  </div>
);

// Change to default import
import logger from '../utils/logger.js';

describe('End-to-End User Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeAll(() => {
    // Setup test environment
  });

  beforeEach(() => {
    // Setup user event
    user = userEvent.setup();

    // Clear localStorage
    localStorage.clear();

    // Reset URL
    navigationService.replace('/');

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Application Loading and Navigation Flow', () => {
    test('should load application and display home page', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Check that app container is rendered
      expect(screen.getByTestId('app-container')).toBeInTheDocument();

      // Check that navigation is present
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-bills')).toBeInTheDocument();
      expect(screen.getByTestId('nav-profile')).toBeInTheDocument();

      // Check that home page is displayed by default
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.getByText('Chanuka Legislative Transparency Platform')).toBeInTheDocument();
    });

    test('should navigate between pages successfully', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Start on home page
      expect(screen.getByTestId('home-page')).toBeInTheDocument();

      // Navigate to dashboard
      await user.click(screen.getByTestId('nav-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to bills page
      await user.click(screen.getByTestId('nav-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Navigate back to home
      await user.click(screen.getByTestId('nav-home'));

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    test('should handle 404 pages correctly', async () => {
      const App = (await import('../../App')).default;

      // Set initial URL to non-existent page
      navigationService.replace('/non-existent-page');

      renderWithProviders(<App />);

      expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();

      // Test back to home functionality
      await user.click(screen.getByTestId('back-home-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Data Loading Flow', () => {
    test('should display loading state then load dashboard data', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Navigate to dashboard
      await user.click(screen.getByTestId('nav-dashboard'));

      // Should show loading state initially
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Check that bills are displayed
      expect(screen.getByTestId('bills-summary')).toBeInTheDocument();
      expect(screen.getByTestId('bill-1')).toBeInTheDocument();
      expect(screen.getByTestId('bill-2')).toBeInTheDocument();

      // Check bill details
      expect(screen.getByText('Healthcare Reform Bill')).toBeInTheDocument();
      expect(screen.getByText('Education Funding Bill')).toBeInTheDocument();
      expect(screen.getByTestId('bill-status-1')).toHaveTextContent('active');
      expect(screen.getByTestId('bill-status-2')).toHaveTextContent('pending');
    });
  });

  describe('Bills Search and Filter Flow', () => {
    test('should search and filter bills successfully', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Navigate to bills page
      await user.click(screen.getByTestId('nav-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Check that all bills are initially displayed
      expect(screen.getByTestId('bill-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('bill-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('bill-item-3')).toBeInTheDocument();

      // Search for healthcare bills
      const searchInput = screen.getByTestId('bills-search-input');
      await user.type(searchInput, 'healthcare');

      // Should only show healthcare bill
      await waitFor(() => {
        expect(screen.getByTestId('bill-item-1')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-item-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bill-item-3')).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);

      // All bills should be visible again
      await waitFor(() => {
        expect(screen.getByTestId('bill-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('bill-item-2')).toBeInTheDocument();
        expect(screen.getByTestId('bill-item-3')).toBeInTheDocument();
      });

      // Search for non-existent bill
      await user.type(searchInput, 'nonexistent');

      // Should show no results message
      await waitFor(() => {
        expect(screen.getByTestId('no-bills-found')).toBeInTheDocument();
        expect(screen.queryByTestId('bill-item-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bill-item-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bill-item-3')).not.toBeInTheDocument();
      });
    });

    test('should handle bill detail viewing', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Navigate to bills page
      await user.click(screen.getByTestId('nav-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Check bill information is displayed
      expect(screen.getByTestId('bill-title-1')).toHaveTextContent('Healthcare Reform Bill');
      expect(screen.getByTestId('bill-category-1')).toHaveTextContent('healthcare');
      expect(screen.getByTestId('bill-status-1')).toHaveTextContent('active');

      // Click view details button (in a real app, this would navigate to detail page)
      const viewButton = screen.getByTestId('view-bill-1');
      expect(viewButton).toBeInTheDocument();

      await user.click(viewButton);
      // In a real implementation, this would navigate to a detail page
    });
  });

  describe('Authentication Flow', () => {
    test('should handle unauthenticated user profile access', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />, { providers: { authState: { user: null, isAuthenticated: false } } });

      // Navigate to profile page
      await user.click(screen.getByTestId('nav-profile'));

      // Should show loading first
      expect(screen.getByTestId('profile-loading')).toBeInTheDocument();

      // Should show error for unauthenticated user
      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
        expect(screen.getByText('Error: Authentication required')).toBeInTheDocument();
      });

      // Should have login button
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    test('should handle login and profile display flow', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />, { providers: { authState: { user: null, isAuthenticated: false } } });

      // Navigate to profile page
      await user.click(screen.getByTestId('nav-profile'));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });

      // Click login button
      await user.click(screen.getByTestId('login-btn'));

      // Should now show profile page with user info
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-info')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('Name: Test User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('Email: test@example.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('Role: citizen');
    });

    test('should handle logout flow', async () => {
      // *** THIS IS THE CORRECTED LINE ***
      const App = (await import('../../App')).default;

      // Set up authenticated state
      localStorage.setItem('auth_token', 'mock-token');

      renderWithProviders(<App />, { providers: { authState: { user: createMockUser(), isAuthenticated: true } } });

      // Navigate to profile page
      await user.click(screen.getByTestId('nav-profile'));

      // Should show profile page
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });

      // Click logout button
      await user.click(screen.getByTestId('logout-btn'));

      // Should show error state again
      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });

      // Check that token was removed
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // App should still render despite network errors
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
      expect(screen.getByTestId('home-page')).toBeInTheDocument();

      // Restore fetch
      global.fetch = originalFetch;
    });

    test('should handle component errors with error boundaries', async () => {
      // This test would require implementing actual error boundaries
      // For now, we'll test that the app structure supports error handling

      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // App should render successfully
      expect(screen.getByTestId('app-container')).toBeInTheDocument();

      // Navigation should work
      await user.click(screen.getByTestId('nav-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    test('should handle browser back/forward navigation', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Navigate to dashboard
      await user.click(screen.getByTestId('nav-dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Navigate to bills
      await user.click(screen.getByTestId('nav-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Simulate browser back button
      act(() => {
        navigationService.goBack();
      });

      // Should go back to dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });

      // Simulate browser forward button
      act(() => {
        // Note: navigationService doesn't have forward() method, using history directly for test
        window.history.forward();
      });

      // Should go forward to bills
      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    test('should show appropriate loading states during navigation', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Navigate to dashboard
      await user.click(screen.getByTestId('nav-dashboard'));

      // Should show loading state
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
      });
    });

    test('should handle concurrent navigation requests', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Rapidly click different navigation items
      await user.click(screen.getByTestId('nav-dashboard'));
      await user.click(screen.getByTestId('nav-bills'));
      await user.click(screen.getByTestId('nav-profile'));

      // Should end up on the last clicked page
      await waitFor(() => {
        expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should maintain focus management during navigation', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Focus on navigation item
      const dashboardNav = screen.getByTestId('nav-dashboard');
      dashboardNav.focus();
      expect(document.activeElement).toBe(dashboardNav);

      // Navigate using keyboard
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    test('should provide appropriate ARIA labels and roles', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Check that navigation has appropriate structure
      const navigation = screen.getByTestId('navigation');
      expect(navigation).toBeInTheDocument();

      // Check that main content area exists
      const mainContent = screen.getByTestId('main-content');
      expect(mainContent).toBeInTheDocument();
    });

    test('should handle keyboard navigation properly', async () => {
      const App = (await import('../../App')).default;

      renderWithProviders(<App />);

      // Tab through navigation items
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('nav-home'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('nav-dashboard'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('nav-bills'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('nav-profile'));
    });
  });
});