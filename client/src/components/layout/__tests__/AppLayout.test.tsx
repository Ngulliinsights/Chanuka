import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from '../app-layout';
import { ResponsiveNavigationProvider } from '@/contexts/ResponsiveNavigationContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { logger } from '../utils/logger.js';

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

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

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('SSR and Hydration', () => {
    it('should render SSR placeholder before mounting', () => {
      // Mock mounted state as false
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: false,
          mounted: false,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      // Should render placeholder content
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Should have proper layout structure
      const layout = screen.getByTestId('test-content').closest('.min-h-screen');
      expect(layout).toBeInTheDocument();
    });

    it('should render full layout after mounting', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: false,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should have proper layout classes
      const layout = document.querySelector('.chanuka-layout-stable');
      expect(layout).toBeInTheDocument();
    });

    it('should prevent layout shift during hydration', () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      // Layout should be stable
      const layout = document.querySelector('.chanuka-layout-stable');
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Desktop Layout', () => {
    it('should render desktop sidebar when not mobile', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: false,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        // Desktop sidebar should be present
        const sidebar = document.querySelector('.chanuka-desktop-sidebar-expanded');
        expect(sidebar).toBeInTheDocument();
      });
    });

    it('should adjust main content margin for sidebar', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: false,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const mainContent = document.querySelector('.ml-64');
        expect(mainContent).toBeInTheDocument();
      });
    });

    it('should adjust main content margin for collapsed sidebar', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: false,
          mounted: true,
          sidebarCollapsed: true,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const mainContent = document.querySelector('.ml-16');
        expect(mainContent).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Layout', () => {
    it('should render mobile navigation when on mobile', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: true,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        // Mobile navigation should be present
        const mobileNav = document.querySelector('.lg\\:hidden');
        expect(mobileNav).toBeInTheDocument();
      });
    });

    it('should add bottom padding for mobile navigation', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: true,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const mainContent = document.querySelector('.pb-16');
        expect(mainContent).toBeInTheDocument();
      });
    });

    it('should not render desktop sidebar on mobile', async () => {
      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile: true,
          mounted: true,
          sidebarCollapsed: false,
        }),
      }));

      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const desktopSidebar = document.querySelector('.chanuka-desktop-sidebar-expanded');
        expect(desktopSidebar).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Transitions', () => {
    it('should handle responsive breakpoint transitions', async () => {
      let isMobile = false;
      let mounted = true;

      vi.mock('@/hooks/use-unified-navigation', () => ({
        useUnifiedNavigation: () => ({
          isMobile,
          mounted,
          sidebarCollapsed: false,
        }),
      }));

      const { rerender } = renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Switch to mobile
      isMobile = true;
      
      rerender(
        <BrowserRouter>
          <NavigationProvider>
            <ResponsiveNavigationProvider>
              <AppLayout>
                <div data-testid="test-content">Test Content</div>
              </AppLayout>
            </ResponsiveNavigationProvider>
          </NavigationProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should handle transition smoothly
        const layout = document.querySelector('.chanuka-layout-transition');
        expect(layout).toBeInTheDocument();
      });
    });

    it('should apply transition classes during responsive changes', async () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const transitionElements = document.querySelectorAll('.chanuka-content-transition');
        expect(transitionElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Rendering', () => {
    it('should render children content correctly', async () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
          <div data-testid="additional-content">Additional Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByTestId('additional-content')).toBeInTheDocument();
      });
    });

    it('should render footer correctly', async () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByText('© 2024 Chanuka Platform. Promoting transparent governance.')).toBeInTheDocument();
      });
    });

    it('should handle empty children', async () => {
      renderWithProviders(<AppLayout>{null}</AppLayout>);

      await waitFor(() => {
        const layout = document.querySelector('.chanuka-layout-stable');
        expect(layout).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', async () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toBeInTheDocument();
        
        const footer = screen.getByRole('contentinfo');
        expect(footer).toBeInTheDocument();
      });
    });

    it('should maintain focus management during transitions', async () => {
      renderWithProviders(
        <AppLayout>
          <button data-testid="test-button">Test Button</button>
        </AppLayout>
      );

      const button = await screen.findByTestId('test-button');
      button.focus();
      
      expect(button).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const renderSpy = vi.fn();
      
      function TestChild() {
        renderSpy();
        return <div data-testid="test-content">Test Content</div>;
      }

      renderWithProviders(
        <AppLayout>
          <TestChild />
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
      });

      // Should only render once initially
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle smooth animations', async () => {
      renderWithProviders(
        <AppLayout>
          <div data-testid="test-content">Test Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        // Check for transition classes
        const transitionElements = document.querySelectorAll('[class*="transition"]');
        expect(transitionElements.length).toBeGreaterThan(0);
      });
    });
  });
});