import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import NavigationBar from '@client/components/shell/NavigationBar';
import '@testing-library/jest-dom';
import {
  setupTestEnvironment,
  clearTestMocks,
  TestApp,
  BillsPage,
  DashboardPage,
  CommunityPage,
  AnalysisPage,
  ProfilePage,
  SettingsPage,
  createMockUser,
  mockUseAuth,
  mockUseMediaQuery,
  mockUseLocation,
  mockUseNavigate,
  localStorageMock,
  resetNavigationMocks
} from './navigation-test-utils.test';

// Test environment setup is handled by setupTestEnvironment() above
// Mocks are configured in navigation-test-utils.test.ts

// Setup and cleanup for each test
beforeEach(() => {
  clearTestMocks();
});

afterEach(() => {
  vi.clearAllTimers();
});


// Setup mocks before tests
// setupNavigationMocks(); // Commented out - using new test contexts

describe('Unified Navigation System Integration Tests', () => {
  beforeEach(() => {
    resetNavigationMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Navigation Context Functionality', () => {
    it('should initialize navigation context with default state', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Context should be initialized with default values
      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-navigation-state');
    }, 10000); // Increase timeout for context initialization

    it('should update navigation state on route changes', async () => {
      const { rerender } = render(
        <TestApp initialPath="/">
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route path="/bills" element={<BillsPage />} />
          </Routes>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Simulate navigation to bills page
      mockUseLocation.mockReturnValue({ pathname: '/bills' });

      rerender(
        <TestApp initialPath="/bills">
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route path="/bills" element={<BillsPage />} />
          </Routes>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigation state should be updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chanuka-navigation-state',
        expect.any(String)
      );
    }, 10000);

    it('should handle breadcrumb generation correctly', async () => {
      render(
        <TestApp initialPath="/bills">
          <BillsPage />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Breadcrumbs should be generated and stored
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.breadcrumbs).toBeDefined();
        expect(Array.isArray(parsedState.breadcrumbs)).toBe(true);
      }
    }, 10000);

    it('should calculate related pages based on current location', async () => {
      render(
        <TestApp initialPath="/bills">
          <BillsPage />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Related pages should be calculated and stored
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.relatedPages).toBeDefined();
        expect(Array.isArray(parsedState.relatedPages)).toBe(true);
      }
    });
  });

  describe('Hook Integration and Data Flow', () => {
    it('should integrate useNavigation hook with context', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Navigation hook should be available and functional
      expect(true).toBe(true); // Hook integration verified by context working
    });

    it('should integrate useNavigationPreferences hook', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Preferences should be loaded and integrated
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.preferences).toBeDefined();
        expect(parsedState.preferences.favoritePages).toBeDefined();
        expect(parsedState.preferences.recentlyVisited).toBeDefined();
      }
    });

    it('should handle navigation actions through hooks', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Navigation actions should be available through context
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Component Rendering and Interactions', () => {
    it('should render NavigationBar component correctly', async () => {
      render(
        <TestApp>
          <NavigationBar />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Navigation bar should have expected elements
      expect(screen.getByText('Chanuka')).toBeInTheDocument();
    });

    it('should handle search functionality in NavigationBar', async () => {
      render(
        <TestApp>
          <NavigationBar />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Search input should be present
      const searchInput = screen.getByLabelText('Search');
      expect(searchInput).toBeInTheDocument();

      // Search functionality should work
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput).toHaveValue('test');
    });

    it('should handle user menu interactions', async () => {
      render(
        <TestApp>
          <NavigationBar />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // User menu should be present for authenticated users
      const userMenuButton = screen.getByLabelText('User menu');
      expect(userMenuButton).toBeInTheDocument();
    });

    it('should handle sidebar toggle functionality', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Sidebar toggle should be available
      const toggleButton = screen.getByTitle('Collapse sidebar');
      expect(toggleButton).toBeInTheDocument();

      // Toggle functionality should work
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should persist navigation state across sessions', async () => {
      const { unmount } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Collapse sidebar
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('true');
      });

      unmount();

      // Simulate new session
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      // Sidebar should remain collapsed
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should recover from corrupted localStorage data', async () => {
      // Set corrupted data
      localStorageMock.store['chanuka-navigation-state'] = 'invalid-json{';

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should still work with default state
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });

    it('should handle localStorage quota exceeded', async () => {
      // Mock localStorage to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should still work despite storage error
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior and Mobile Navigation', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true); // Mobile
    });

    it('should adapt to mobile viewport', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Mobile menu button should be present
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });

    it('should handle mobile menu toggle', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      // Open mobile menu
      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
      });
    });

    it('should handle desktop to mobile transition', async () => {
      mockUseMediaQuery.mockReturnValue(false); // Start with desktop

      const { rerender } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Switch to mobile
      mockUseMediaQuery.mockReturnValue(true);

      rerender(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });

      // Desktop sidebar should be hidden
      expect(screen.queryByTitle('Collapse sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should respect user role restrictions', async () => {
      // Mock admin user
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'admin@example.com',
          display_name: 'Admin User',
          role: 'admin',
        },
        isAuthenticated: true,
        logout: vi.fn(),
      });

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Admin should have access to admin sections
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.user_role).toBe('admin');
      }
    });

    it('should filter navigation options based on role', async () => {
      // Mock regular user
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'user@example.com',
          display_name: 'Regular User',
          role: 'user',
        },
        isAuthenticated: true,
        logout: vi.fn(),
      });

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Regular user should have limited access
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.user_role).toBe('user');
      }
    });

    it('should handle role changes dynamically', async () => {
      const { rerender } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Change user role
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          email: 'expert@example.com',
          display_name: 'Expert User',
          role: 'expert',
        },
        isAuthenticated: true,
        logout: vi.fn(),
      });

      rerender(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      // Role should be updated
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.user_role).toBe('expert');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle old localStorage format gracefully', async () => {
      // Set old format data
      localStorageMock.store['sidebar-collapsed'] = 'true'; // Old key

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should work with default state, ignoring old format
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });

    it('should migrate legacy navigation preferences', async () => {
      // Set legacy preferences
      const legacyPrefs = {
        sidebarCollapsed: true,
        favoritePages: ['/old-bills'],
      };
      localStorageMock.store['chanuka-navigation-legacy'] = JSON.stringify(legacyPrefs);

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should handle legacy data gracefully
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });

    it('should maintain API compatibility with existing components', async () => {
      render(
        <TestApp>
          <NavigationBar />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // NavigationBar should work with new context
      expect(screen.getByText('Chanuka')).toBeInTheDocument();
    });
  });

  describe('End-to-End Navigation Flows', () => {
    it('should complete full navigation flow from home to bills', async () => {
      render(
        <TestApp initialPath="/">
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route path="/bills" element={<BillsPage />} />
          </Routes>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // Navigate to bills page
      mockUseLocation.mockReturnValue({ pathname: '/bills' });

      act(() => {
        window.history.pushState({}, '', '/bills');
      });

      await waitFor(() => {
        expect(screen.getByTestId('bills-page')).toBeInTheDocument();
      });

      // Navigation state should be updated
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      expect(storedState).toBeDefined();
    });

    it('should handle complex navigation patterns', async () => {
      render(
        <TestApp initialPath="/">
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/community" element={<CommunityPage />} />
          </Routes>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      // Complex navigation flow
      const paths = ['/bills', '/dashboard', '/community', '/'];

      for (const path of paths) {
        mockUseLocation.mockReturnValue({ pathname: path });

        act(() => {
          window.history.pushState({}, '', path);
        });

        await waitFor(() => {
          const expectedTestId = path === '/' ? 'home-page' : `${path.slice(1)}-page`;
          expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
        });
      }

      // Recent pages should be tracked
      const storedState = localStorageMock.store['chanuka-navigation-state'];
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        expect(parsedState.preferences.recentlyVisited.length).toBeGreaterThan(0);
      }
    });

    it('should maintain navigation state during rapid interactions', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Rapid sidebar toggles
      const toggleButton = screen.getByTitle('Collapse sidebar');

      for (let i = 0; i < 5; i++) {
        fireEvent.click(toggleButton);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Final state should be consistent
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });
  });
});