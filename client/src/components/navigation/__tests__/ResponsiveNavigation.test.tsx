import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ResponsiveNavigationProvider, useResponsiveNavigation } from '@/contexts/ResponsiveNavigationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { logger } from '../utils/logger.js';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock the media query hook
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

// Test component to access context
function TestComponent() {
  const {
    isMobile,
    sidebarCollapsed,
    mounted,
    toggleSidebar,
    isActive,
    setSidebarCollapsed,
  } = useResponsiveNavigation();

  return (
    <div>
      <div data-testid="is-mobile">{isMobile.toString()}</div>
      <div data-testid="sidebar-collapsed">{sidebarCollapsed.toString()}</div>
      <div data-testid="mounted">{mounted.toString()}</div>
      <div data-testid="is-active-home">{isActive('/').toString()}</div>
      <button data-testid="toggle-sidebar" onClick={toggleSidebar}>
        Toggle Sidebar
      </button>
      <button 
        data-testid="set-sidebar-collapsed" 
        onClick={() => setSidebarCollapsed(true)}
      >
        Collapse Sidebar
      </button>
    </div>
  );
}

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

describe('ResponsiveNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Context Provider', () => {
    it('should provide initial state correctly', async () => {
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
      expect(screen.getByTestId('is-active-home')).toHaveTextContent('true');
    });

    it('should toggle sidebar state', async () => {
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      const toggleButton = screen.getByTestId('toggle-sidebar');
      
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
      
      fireEvent.click(toggleButton);
      
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
      
      fireEvent.click(toggleButton);
      
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    });

    it('should set sidebar collapsed state directly', async () => {
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      const setCollapsedButton = screen.getByTestId('set-sidebar-collapsed');
      
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
      
      fireEvent.click(setCollapsedButton);
      
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    });

    it('should load sidebar state from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('true');

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed');
    });

    it('should save sidebar state to localStorage', async () => {
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      const toggleButton = screen.getByTestId('toggle-sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('chanuka-sidebar-collapsed', 'true');
      });
    });
  });

  describe('Mobile Detection', () => {
    it('should update mobile state when media query changes', async () => {
      const { useMediaQuery } = await import('@/hooks/use-mobile');
      const mockUseMediaQuery = vi.mocked(useMediaQuery);
      
      // Start with desktop
      mockUseMediaQuery.mockReturnValue(false);
      
      const { rerender } = renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');

      // Switch to mobile
      mockUseMediaQuery.mockReturnValue(true);
      
      rerender(
        <BrowserRouter>
          <NavigationProvider>
            <ResponsiveNavigationProvider>
              <TestComponent />
            </ResponsiveNavigationProvider>
          </NavigationProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      });
    });
  });

  describe('Active State Detection', () => {
    it('should correctly identify active paths', async () => {
      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      // Home path should be active by default
      expect(screen.getByTestId('is-active-home')).toHaveTextContent('true');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useResponsiveNavigation must be used within a ResponsiveNavigationProvider');

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('mounted')).toHaveTextContent('true');
      });

      // Should still work with default state
      expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    });
  });
});