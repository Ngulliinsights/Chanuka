import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { NavigationProvider, useNavigation } from '../NavigationContext';
import { UserRole } from '@/components/navigation';
import { logger } from '@/$2/browser-logger';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Test component to access navigation context
const TestComponent: React.FC<{
  onNavigationChange?: (navigation: any) => void;
}> = ({ onNavigationChange }) => {
  const navigation = useNavigation();

  React.useEffect(() => {
    if (onNavigationChange) {
      onNavigationChange(navigation);
    }
  }, [navigation, onNavigationChange]);

  return (
    <div>
      <div data-testid="current-path">{navigation.currentPath}</div>
      <div data-testid="user-role">{navigation.userRole}</div>
      <div data-testid="sidebar-open">{navigation.sidebarOpen.toString()}</div>
      <div data-testid="mobile-menu-open">{navigation.mobileMenuOpen.toString()}</div>
      <div data-testid="breadcrumbs-count">{navigation.breadcrumbs.length}</div>
      <div data-testid="related-pages-count">{navigation.relatedPages.length}</div>
      
      <button 
        data-testid="toggle-sidebar" 
        onClick={navigation.toggleSidebar}
      >
        Toggle Sidebar
      </button>
      
      <button 
        data-testid="toggle-mobile-menu" 
        onClick={navigation.toggleMobileMenu}
      >
        Toggle Mobile Menu
      </button>
      
      <button 
        data-testid="navigate-to-bills" 
        onClick={() => navigation.navigateTo('/bills')}
      >
        Navigate to Bills
      </button>
      
      <button 
        data-testid="set-user-role" 
        onClick={() => navigation.setUserRole('admin')}
      >
        Set Admin Role
      </button>
    </div>
  );
};

// Wrapper component for tests
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

describe('NavigationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  
  });

  describe('Initial State', () => {
    it('should provide default navigation state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/');
      expect(screen.getByTestId('user-role')).toHaveTextContent('public');
      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
      expect(screen.getByTestId('mobile-menu-open')).toHaveTextContent('false');
      expect(screen.getByTestId('breadcrumbs-count')).toHaveTextContent('0');
      expect(screen.getByTestId('related-pages-count')).toHaveTextContent('0');
    });

    it('should initialize with custom path', () => {
      render(
        <TestWrapper initialPath="/bills">
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/bills');
    });

    it('should load preferences from localStorage', () => {
      const mockPreferences = {
        sidebarOpen: true,
        defaultLandingPage: '/dashboard',
        favoritePages: ['/bills', '/community'],
        compactMode: true,
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPreferences));

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true');
    });
  });

  describe('Navigation Actions', () => {
    it('should toggle sidebar state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('toggle-sidebar'));

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('toggle-sidebar'));

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
    });

    it('should toggle mobile menu state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-menu-open')).toHaveTextContent('false');

      fireEvent.click(screen.getByTestId('toggle-mobile-menu'));

      expect(screen.getByTestId('mobile-menu-open')).toHaveTextContent('true');

      fireEvent.click(screen.getByTestId('toggle-mobile-menu'));

      expect(screen.getByTestId('mobile-menu-open')).toHaveTextContent('false');
    });

    it('should handle navigation', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/');

      fireEvent.click(screen.getByTestId('navigate-to-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('current-path')).toHaveTextContent('/bills');
      });
    });

    it('should update user role', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('public');

      fireEvent.click(screen.getByTestId('set-user-role'));

      expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    });
  });

  describe('Breadcrumb Management', () => {
    it('should generate breadcrumbs for nested paths', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper initialPath="/bills/123/analysis">
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          expect(navigation.breadcrumbs.length).toBeGreaterThan(0);
          expect(navigation.breadcrumbs).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: '/', label: 'Home' }),
              expect.objectContaining({ path: '/bills', label: 'Bills' }),
              expect.objectContaining({ path: '/bills/123', label: 'Bill Details' }),
            ])
          );
        }
      });
    });

    it('should handle breadcrumbs for different page types', async () => {
      const testPaths = [
        { path: '/community', expectedBreadcrumbs: ['Home', 'Community'] },
        { path: '/admin/users', expectedBreadcrumbs: ['Home', 'Admin', 'Users'] },
        { path: '/profile/settings', expectedBreadcrumbs: ['Home', 'Profile', 'Settings'] },
      ];

      for (const testCase of testPaths) {
        const onNavigationChange = vi.fn();

        const { unmount } = render(
          <TestWrapper initialPath={testCase.path}>
            <TestComponent onNavigationChange={onNavigationChange} />
          </TestWrapper>
        );

        await waitFor(() => {
          const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
          if (lastCall) {
            const navigation = lastCall[0];
            const breadcrumbLabels = navigation.breadcrumbs.map((b: any) => b.label);
            expect(breadcrumbLabels).toEqual(testCase.expectedBreadcrumbs);
          }
        });

        unmount();
      }
    });
  });

  describe('Related Pages Calculation', () => {
    it('should calculate related pages for bill details', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper initialPath="/bills/123">
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          expect(navigation.relatedPages.length).toBeGreaterThan(0);
          
          const relatedPaths = navigation.relatedPages.map((p: any) => p.path);
          expect(relatedPaths).toEqual(
            expect.arrayContaining([
              '/bills/123/analysis',
              '/bill-sponsorship-analysis',
              '/community',
            ])
          );
        }
      });
    });

    it('should calculate related pages for community section', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper initialPath="/community">
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          expect(navigation.relatedPages.length).toBeGreaterThan(0);
          
          const relatedPaths = navigation.relatedPages.map((p: any) => p.path);
          expect(relatedPaths).toEqual(
            expect.arrayContaining([
              '/expert-verification',
              '/bills',
            ])
          );
        }
      });
    });

    it('should filter related pages based on user role', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper initialPath="/admin">
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      // Set admin role
      fireEvent.click(screen.getByTestId('set-user-role'));

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          const relatedPaths = navigation.relatedPages.map((p: any) => p.path);
          expect(relatedPaths).toEqual(
            expect.arrayContaining([
              '/admin/users',
              '/admin/system',
            ])
          );
        }
      });
    });
  });

  describe('Preferences Persistence', () => {
    it('should save preferences to localStorage', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('toggle-sidebar'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'navigationPreferences',
        expect.stringContaining('"sidebarOpen":true')
      );
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage is full');
      });

      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );

        fireEvent.click(screen.getByTestId('toggle-sidebar'));
      }).not.toThrow();

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('true');
    });

    it('should handle malformed localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
    });
  });

  describe('Navigation History', () => {
    it('should track navigation history', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper>
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      // Navigate to different pages
      fireEvent.click(screen.getByTestId('navigate-to-bills'));

      await waitFor(() => {
        expect(screen.getByTestId('current-path')).toHaveTextContent('/bills');
      });

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          expect(navigation.previousPath).toBe('/');
        }
      });
    });

    it('should handle rapid navigation changes', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper>
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      // Rapid navigation
      await act(() => {
        fireEvent.click(screen.getByTestId('navigate-to-bills'));
      });

      await act(() => {
        fireEvent.click(screen.getByTestId('navigate-to-bills'));
      });

      await act(() => {
        fireEvent.click(screen.getByTestId('navigate-to-bills'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-path')).toHaveTextContent('/bills');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Try to navigate to invalid path
      await act(() => {
        const navigation = useNavigation();
        navigation.navigateTo('invalid-path');
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle context provider errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to use navigation context outside provider
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNavigation must be used within a NavigationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();

      const SpyComponent = () => {
        renderSpy();
        const navigation = useNavigation();
        return <div>{navigation.currentPath}</div>;
      };

      render(
        <TestWrapper>
          <SpyComponent />
        </TestWrapper>
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      // Toggle sidebar (should not cause re-render of path-dependent components)
      fireEvent.click(screen.getByTestId('toggle-sidebar'));

      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
    });

    it('should handle large numbers of related pages efficiently', async () => {
      const onNavigationChange = vi.fn();

      render(
        <TestWrapper initialPath="/bills">
          <TestComponent onNavigationChange={onNavigationChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const lastCall = onNavigationChange.mock.calls[onNavigationChange.mock.calls.length - 1];
        if (lastCall) {
          const navigation = lastCall[0];
          // Should handle calculation efficiently even with many related pages
          expect(navigation.relatedPages.length).toBeLessThanOrEqual(10); // Reasonable limit
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible navigation state', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('toggle-sidebar');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('type', 'button');
    });

    it('should handle keyboard navigation', () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('toggle-sidebar');
      
      // Simulate keyboard interaction
      fireEvent.keyDown(toggleButton, { key: 'Enter' });
      fireEvent.keyUp(toggleButton, { key: 'Enter' });

      expect(screen.getByTestId('sidebar-open')).toHaveTextContent('false');
    });
  });
});

