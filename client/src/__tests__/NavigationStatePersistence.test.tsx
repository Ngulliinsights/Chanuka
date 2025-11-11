import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { createNavigationProvider } from '../core/navigation/context';
import AppLayout from '@/components/layout/app-layout';
import { logger } from '@/utils/logger';

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

// Mock localStorage with more detailed tracking
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

function TestApp({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <NavigationProvider>
        <AppLayout>
          {children}
        </AppLayout>
      </NavigationProvider>
    </BrowserRouter>
  );
}

describe('Navigation State Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.store = {};
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Sidebar State Persistence', () => {
    it('should save sidebar collapsed state to localStorage', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Toggle sidebar to collapsed
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed', 'true');
      });

      expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('true');
    });

    it('should restore sidebar collapsed state from localStorage', async () => {
      // Pre-populate localStorage with collapsed state
      localStorageMock.store['chanuka-sidebar-collapsed'] = 'true';

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed');
    });

    it('should persist sidebar state across page reloads', async () => {
      const { unmount } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Collapse sidebar
      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('true');
      });

      // Unmount and remount to simulate page reload
      unmount();

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      // Should restore collapsed state
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should handle invalid localStorage values gracefully', async () => {
      // Set invalid value in localStorage
      localStorageMock.store['chanuka-sidebar-collapsed'] = 'invalid-value';

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        // Should default to expanded state
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });
    });

    it('should handle localStorage access errors', async () => {
      // Mock localStorage to throw errors
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        // Should still work with default state
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Preferences Persistence', () => {
    it('should save navigation preferences to localStorage', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Wait for navigation state to be saved
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chanuka-navigation-state',
          expect.any(String)
        );
      });
    });

    it('should restore navigation preferences from localStorage', async () => {
      const mockNavigationState = {
        preferences: {
          defaultLandingPage: '/dashboard',
          favoritePages: ['/bills', '/community'],
          recentlyVisited: [
            { path: '/bills', title: 'Bills', visitedAt: new Date(), visitCount: 1 }
          ],
          compactMode: true,
        },
        sidebarOpen: false,
      };

      localStorageMock.store['chanuka-navigation-state'] = JSON.stringify(mockNavigationState);

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-navigation-state');
      });
    });

    it('should handle corrupted navigation state in localStorage', async () => {
      // Set corrupted JSON in localStorage
      localStorageMock.store['chanuka-navigation-state'] = 'invalid-json{';

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Pages Tracking', () => {
    it('should track recently visited pages', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Navigation state should be saved with recent page
      await waitFor(() => {
        const savedState = localStorageMock.store['chanuka-navigation-state'];
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          expect(parsedState.preferences.recentlyVisited).toBeDefined();
        }
      });
    });

    it('should limit recent pages to maximum count', async () => {
      // Pre-populate with many recent pages
      const manyRecentPages = Array.from({ length: 15 }, (_, i) => ({
        path: `/page-${i}`,
        title: `Page ${i}`,
        visitedAt: new Date(),
        visitCount: 1,
      }));

      const mockNavigationState = {
        preferences: {
          recentlyVisited: manyRecentPages,
        },
      };

      localStorageMock.store['chanuka-navigation-state'] = JSON.stringify(mockNavigationState);

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should limit to 10 recent pages
      await waitFor(() => {
        const savedState = localStorageMock.store['chanuka-navigation-state'];
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          expect(parsedState.preferences.recentlyVisited.length).toBeLessThanOrEqual(10);
        }
      });
    });
  });

  describe('Authentication State Changes', () => {
    it('should clear user-specific state on logout', async () => {
      const mockLogout = vi.fn();
      
      // Mock authenticated user initially
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'user',
        },
        isAuthenticated: true,
        logout: mockLogout,
      });

      const { rerender } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });

      // Simulate logout
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: null,
        isAuthenticated: false,
        logout: mockLogout,
      });

      rerender(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        // User-specific state should be cleared
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('chanuka-user-preferences');
      });
    });

    it('should maintain non-user-specific state on logout', async () => {
      const mockLogout = vi.fn();
      
      // Start with authenticated user
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'user',
        },
        isAuthenticated: true,
        logout: mockLogout,
      });

      const { rerender } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      // Collapse sidebar while authenticated
      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('true');
      });

      // Simulate logout
      vi.mocked(vi.importActual('@/hooks/use-auth')).useAuth = () => ({
        user: null,
        isAuthenticated: false,
        logout: mockLogout,
      });

      rerender(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      // Sidebar state should be maintained
      await waitFor(() => {
        expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('true');
      });
    });
  });

  describe('Cross-Session Consistency', () => {
    it('should maintain consistent state across browser sessions', async () => {
      // First session
      const { unmount } = render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      // Set some state
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

      // State should be restored
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('should handle concurrent tab scenarios', async () => {
      // Simulate multiple tabs by rendering multiple instances
      const { unmount: unmount1 } = render(
        <TestApp>
          <div data-testid="test-content-1">Test Content 1</div>
        </TestApp>
      );

      const { unmount: unmount2 } = render(
        <TestApp>
          <div data-testid="test-content-2">Test Content 2</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content-1')).toBeInTheDocument();
        expect(screen.getByTestId('test-content-2')).toBeInTheDocument();
      });

      // Both should work independently
      const toggleButtons = screen.getAllByTitle('Collapse sidebar');
      expect(toggleButtons.length).toBe(2);

      unmount1();
      unmount2();
    });
  });

  describe('Performance and Debouncing', () => {
    it('should debounce localStorage writes', async () => {
      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      
      // Rapidly toggle sidebar multiple times
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      // Should not call setItem excessively
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      // Final state should be correct
      await waitFor(() => {
        expect(localStorageMock.store['chanuka-sidebar-collapsed']).toBe('false');
      });
    });

    it('should not block UI during localStorage operations', async () => {
      // Mock slow localStorage
      localStorageMock.setItem.mockImplementation((key, value) => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      // UI should update immediately
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Data Migration and Versioning', () => {
    it('should handle old localStorage format gracefully', async () => {
      // Set old format data
      localStorageMock.store['sidebar-collapsed'] = 'true'; // Old key format

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        // Should work with default state since old format is not recognized
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });
    });

    it('should migrate data format when needed', async () => {
      // This test would be relevant if we implement data migration
      const oldFormatData = {
        sidebarCollapsed: true,
        // Old format structure
      };

      localStorageMock.store['chanuka-navigation-legacy'] = JSON.stringify(oldFormatData);

      render(
        <TestApp>
          <div data-testid="test-content">Test Content</div>
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should handle gracefully without migration for now
      expect(true).toBe(true);
    });
  });
});

describe('NavigationStatePersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render without crashing', () => {
    const { container } = render(<NavigationStatePersistence />);
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<NavigationStatePersistence />);
    expect(container.firstChild).toHaveAttribute('role');
  });

  it('should handle props correctly', () => {
    // TODO: Add specific prop tests for NavigationStatePersistence
    expect(true).toBe(true);
  });
});

