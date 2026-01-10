/**
 * NavigationConsistency Tests
 *
 * Tests for navigation consistency across routes
 */

import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import navigationSlice from '../../shared/infrastructure/store/slices/navigationSlice';

import { createNavigationProvider } from './context';
import { NavigationConsistency } from './NavigationConsistency';

// Mock logger
vi.mock('@client/shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock navigation hooks
const mockNavigate = vi.fn();
const mockAuth = { user: null, isAuthenticated: false };
const mockDeviceInfo = { isMobile: false, isTablet: false, isDesktop: true };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      navigation: navigationSlice,
    },
    preloadedState: {
      navigation: {
        currentPath: '/',
        currentSection: 'home',
        breadcrumbs: [],
        relatedPages: [],
        isSidebarOpen: false,
        isMobileMenuOpen: false,
        isMobile: false,
        sidebarCollapsed: false,
        mounted: true,
        user_role: 'public',
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          compactMode: false,
          showBreadcrumbs: true,
          autoExpand: false,
        },
        recentPages: [],
      },
    },
  });
};

// Create test navigation provider
const TestNavigationProvider = createNavigationProvider(
  () => ({ pathname: window.location.pathname || '/' }),
  () => mockNavigate,
  () => mockAuth,
  () => mockDeviceInfo
);

const TestWrapper: React.FC<{ children: React.ReactNode; route?: string }> = ({
  children,
  route = '/',
}) => {
  const store = createTestStore();

  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <TestNavigationProvider>
          <NavigationConsistency>{children}</NavigationConsistency>
        </TestNavigationProvider>
      </MemoryRouter>
    </Provider>
  );
};

describe('NavigationConsistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document title
    document.title = '';
    // Clear meta tags
    const metaTags = document.querySelectorAll('meta[name="description"], meta[property^="og:"]');
    metaTags.forEach(tag => tag.remove());
  });

  describe('Document Meta Updates', () => {
    it('should update document title for home page', () => {
      render(
        <TestWrapper route="/">
          <div>Home Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Chanuka - Kenyan Legislative Intelligence');
    });

    it('should update document title for bills page', () => {
      render(
        <TestWrapper route="/bills">
          <div>Bills Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Bills Dashboard - Chanuka');
    });

    it('should update document title for search page', () => {
      render(
        <TestWrapper route="/search">
          <div>Search Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Search - Chanuka');
    });

    it('should update meta description', () => {
      render(
        <TestWrapper route="/bills">
          <div>Bills Content</div>
        </TestWrapper>
      );

      const metaDescription = document.querySelector('meta[name="description"]');
      expect(metaDescription?.getAttribute('content')).toBe(
        'Browse and track Kenyan legislative bills'
      );
    });

    it('should update Open Graph tags', () => {
      render(
        <TestWrapper route="/community">
          <div>Community Content</div>
        </TestWrapper>
      );

      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');

      expect(ogTitle?.getAttribute('content')).toBe('Community Hub - Chanuka');
      expect(ogDescription?.getAttribute('content')).toBe('Engage with the civic community');
    });
  });

  describe('Dynamic Route Handling', () => {
    it('should handle bill detail routes', () => {
      render(
        <TestWrapper route="/bills/123">
          <div>Bill Detail Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Bill Details - Chanuka');
    });

    it('should handle bill analysis routes', () => {
      render(
        <TestWrapper route="/bills/123/analysis">
          <div>Bill Analysis Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Bill Analysis - Chanuka');
    });

    it('should provide fallback for unknown routes', () => {
      render(
        <TestWrapper route="/unknown-route">
          <div>Unknown Content</div>
        </TestWrapper>
      );

      expect(document.title).toBe('Chanuka - Kenyan Legislative Intelligence');
    });
  });

  describe('Accessibility Features', () => {
    it('should focus main content on route change', () => {
      // Create main content element
      const mainContent = document.createElement('main');
      mainContent.id = 'main-content';
      mainContent.tabIndex = -1;
      document.body.appendChild(mainContent);

      render(
        <TestWrapper route="/bills">
          <div>Bills Content</div>
        </TestWrapper>
      );

      expect(document.activeElement).toBe(mainContent);
      expect(mainContent.style.outline).toBe('none');

      // Cleanup
      document.body.removeChild(mainContent);
    });
  });

  describe('Performance Optimizations', () => {
    it('should create prefetch links for critical routes', done => {
      render(
        <TestWrapper route="/">
          <div>Home Content</div>
        </TestWrapper>
      );

      // Check that prefetch links are created after delay
      setTimeout(() => {
        const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
        const hrefs = Array.from(prefetchLinks).map(link => link.getAttribute('href'));

        expect(hrefs).toContain('/bills');
        expect(hrefs).toContain('/search');
        expect(hrefs).toContain('/dashboard');

        done();
      }, 2100); // Wait for preload timeout + buffer
    });
  });

  describe('Route Metadata Configuration', () => {
    const testRoutes = [
      { path: '/', expectedTitle: 'Chanuka - Kenyan Legislative Intelligence', section: 'home' },
      { path: '/bills', expectedTitle: 'Bills Dashboard - Chanuka', section: 'bills' },
      { path: '/search', expectedTitle: 'Search - Chanuka', section: 'search' },
      { path: '/dashboard', expectedTitle: 'Dashboard - Chanuka', section: 'dashboard' },
      { path: '/account', expectedTitle: 'Account - Chanuka', section: 'account' },
      { path: '/auth', expectedTitle: 'Sign In - Chanuka', section: 'auth' },
    ];

    testRoutes.forEach(({ path, expectedTitle, section }) => {
      it(`should configure metadata correctly for ${path}`, () => {
        render(
          <TestWrapper route={path}>
            <div>Content for {path}</div>
          </TestWrapper>
        );

        expect(document.title).toBe(expectedTitle);
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track page views when gtag is available', () => {
      const mockGtag = vi.fn();
      (window as any).gtag = mockGtag;

      render(
        <TestWrapper route="/bills">
          <div>Bills Content</div>
        </TestWrapper>
      );

      expect(mockGtag).toHaveBeenCalledWith('config', 'GA_MEASUREMENT_ID', {
        page_title: 'Bills Dashboard - Chanuka',
        page_location: expect.any(String),
      });

      // Cleanup
      delete (window as any).gtag;
    });

    it('should not error when gtag is not available', () => {
      expect(() => {
        render(
          <TestWrapper route="/search">
            <div>Search Content</div>
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});
