import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NavigationProvider, useNavigation } from '../NavigationContext';
import { useResponsiveNavigation } from '../ResponsiveNavigationContext';
import { NavigationStatePersistence } from '@/utils/navigation/state-persistence';
import { AuthProvider } from '@/hooks/use-auth';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    loading: false,
  })),
}));

// Mock navigation utilities
vi.mock('@/utils/navigation/breadcrumb-generator', () => ({
  generateBreadcrumbs: vi.fn(() => []),
}));

vi.mock('@/utils/navigation/related-pages-calculator', () => ({
  calculateRelatedPages: vi.fn(() => []),
}));

vi.mock('@/utils/navigation/section-detector', () => ({
  determineNavigationSection: vi.fn(() => 'legislative'),
}));

vi.mock('@/utils/navigation/active-state', () => ({
  isNavigationPathActive: vi.fn(() => false),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useMediaQuery: vi.fn(() => false),
}));

// Test component that uses both navigation contexts
function TestComponent() {
  const navigation = useNavigation();
  const responsiveNavigation = useResponsiveNavigation();

  return (
    <div>
      <div data-testid="current-path">{navigation.currentPath}</div>
      <div data-testid="sidebar-open">{navigation.sidebarOpen.toString()}</div>
      <div data-testid="sidebar-collapsed">{responsiveNavigation.sidebarCollapsed.toString()}</div>
      <div data-testid="user-role">{navigation.userRole}</div>
      <div data-testid="recent-pages-count">{navigation.preferences.recentlyVisited.length}</div>
      <button 
        data-testid="toggle-sidebar" 
        onClick={navigation.toggleSidebar}
      >
        Toggle Sidebar
      </button>
      <button 
        data-testid="add-favorite" 
        onClick={() => navigation.updatePreferences({ 
          favoritePages: [...navigation.preferences.favoritePages, '/test'] 
        })}
      >
        Add Favorite
      </button>
    </div>
  );
}

// Wrapper component for tests
function TestWrapper({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Navigation State Persistence and Consistency', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('State Persistence', () => {
    it('should persist sidebar state across sessions', async () => {
      // Mock persisted state
      const mockPersistedState = {
        preferences: {
          defaultLandingPage: '/',
          favoritePages: ['/bills'],
          recentlyVisited: [],
          compactMode: false,
        },
        sidebarOpen: true,
      };

      vi.spyOn(NavigationStatePersistence, 'loadNavigationState').mockReturnValue(mockPersistedState);
      vi.spyOn(NavigationStatePersistence, 'saveNavigationState').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should load persisted sidebar state
      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true');
      expect(NavigationStatePersistence.loadNavigationState).toHaveBeenCalled();
    });

    it('should persist user preferences', async () => {
      const mockPersistedState = {
        preferences: {
          defaultLandingPage: '/dashboard',
          favoritePages: ['/bills', '/representatives'],
          recentlyVisited: [
            {
              path: '/bills/123',
              title: 'Test Bill',
              visitedAt: new Date(),
              visitCount: 1,
            }
          ],
          compactMode: true,
        },
        sidebarOpen: false,
      };

      vi.spyOn(NavigationStatePersistence, 'loadNavigationState').mockReturnValue(mockPersistedState);
      vi.spyOn(NavigationStatePersistence, 'saveNavigationState').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should load persisted preferences
      expect(screen.getByTestId('recent-pages-count')).toHaveTextContent('1');
    });

    it('should save state changes to persistence', async () => {
      vi.spyOn(NavigationStatePersistence, 'loadNavigationState').mockReturnValue(null);
      const saveSpy = vi.spyOn(NavigationStatePersistence, 'saveNavigationState').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Toggle sidebar
      act(() => {
        screen.getByTestId('toggle-sidebar').click();
      });

      // Should save state after change
      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalled();
      });
    });

    it('should handle corrupted persisted state gracefully', () => {
      vi.spyOn(NavigationStatePersistence, 'loadNavigationState').mockReturnValue(null);
      vi.spyOn(NavigationStatePersistence, 'saveNavigationState').mockImplementation(() => {});

      // Should not throw error with corrupted state
      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();

      // Should use default state
      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
      expect(screen.getByTestId('user-role')).toHaveTextContent('public');
    });
  });

  describe('Authentication State Synchronization', () => {
    it('should sync user role with authentication state', async () => {
      const { useAuth } = await import('@/hooks/use-auth');
      
      // Mock authenticated user
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'citizen' },
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('citizen');
    });

    it('should clear user-specific state on logout', async () => {
      const clearUserStateSpy = vi.spyOn(NavigationStatePersistence, 'clearUserSpecificState').mockImplementation(() => {});
      
      const { useAuth } = await import('@/hooks/use-auth');
      const mockUseAuth = vi.mocked(useAuth);

      // Start with authenticated user
      mockUseAuth.mockReturnValue({
        user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'citizen' },
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('citizen');

      // Simulate logout
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent('public');
        expect(clearUserStateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Context Synchronization', () => {
    it('should maintain consistent sidebar state between contexts', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Initial state should be consistent
      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');

      // Toggle sidebar
      act(() => {
        screen.getByTestId('toggle-sidebar').click();
      });

      // Both contexts should reflect the change
      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true');
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    });

    it('should update navigation state on route changes', async () => {
      render(
        <TestWrapper initialPath="/bills">
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/bills');
    });

    it('should track recent pages correctly', async () => {
      render(
        <TestWrapper initialPath="/bills/123">
          <TestComponent />
        </TestWrapper>
      );

      // Should add current page to recent pages
      await waitFor(() => {
        expect(screen.getByTestId('recent-pages-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      vi.spyOn(NavigationStatePersistence, 'saveNavigationState').mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not crash the app
      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();

      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });

    it('should handle missing navigation utilities gracefully', () => {
      // Mock utilities to throw errors
      const { generateBreadcrumbs } = require('@/utils/navigation/breadcrumb-generator');
      vi.mocked(generateBreadcrumbs).mockImplementation(() => {
        throw new Error('Breadcrumb error');
      });

      // Should still render without crashing
      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});