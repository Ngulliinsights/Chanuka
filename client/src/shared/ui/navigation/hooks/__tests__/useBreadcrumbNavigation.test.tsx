/**
 * Breadcrumb Navigation Hook Tests
 *
 * Tests for the useBreadcrumbNavigation hook and related utilities.
 */

import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import navigationReducer from '@client/shared/infrastructure/store/slices/navigationSlice';
import type { BreadcrumbItem } from '@client/shared/types/navigation';

import {
  useBreadcrumbNavigation,
  generateEnhancedBreadcrumbs,
  routeBreadcrumbConfig,
} from '../useBreadcrumbNavigation';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      navigation: navigationReducer,
    },
    preloadedState: {
      navigation: {
        currentPath: '/',
        previousPath: '/',
        breadcrumbs: [],
        relatedPages: [],
        currentSection: 'legislative' as const,
        sidebarOpen: false,
        mobileMenuOpen: false,
        isMobile: false,
        sidebarCollapsed: false,
        mounted: false,
        user_role: 'public' as const,
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          recentlyVisited: [],
          compactMode: false,
          showBreadcrumbs: true,
          autoExpand: false,
        },
        ...initialState,
      },
    },
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; store?: any; initialPath?: string }> = ({
  children,
  store = createMockStore(),
  initialPath = '/',
}) => (
  <Provider store={store}>
    <BrowserRouter>
      <div data-testid="location" data-pathname={initialPath}>
        {children}
      </div>
    </BrowserRouter>
  </Provider>
);

// Mock useLocation to return controlled pathname
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/bills/123',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }),
}));

describe('generateEnhancedBreadcrumbs', () => {
  it('should use route-specific configuration for exact matches', () => {
    const breadcrumbs = generateEnhancedBreadcrumbs('/bills');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: true },
    ]);
  });

  it('should use route-specific configuration for parameterized routes', () => {
    const breadcrumbs = generateEnhancedBreadcrumbs('/bills/123');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: false },
      { label: 'Bill 123', path: '/bills/123', is_active: true },
    ]);
  });

  it('should use route-specific configuration for nested parameterized routes', () => {
    const breadcrumbs = generateEnhancedBreadcrumbs('/bills/456/analysis');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: false },
      { label: 'Bill 456', path: '/bills/456', is_active: false },
      { label: 'Analysis', path: '/bills/456/analysis', is_active: true },
    ]);
  });

  it('should fall back to automatic generation for unknown routes', () => {
    const breadcrumbs = generateEnhancedBreadcrumbs('/unknown/path');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Unknown', path: '/unknown', is_active: false },
      { label: 'Path', path: '/unknown/path', is_active: true },
    ]);
  });

  it('should handle search routes correctly', () => {
    const searchBreadcrumbs = generateEnhancedBreadcrumbs('/search');
    expect(searchBreadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Search', path: '/search', is_active: true },
    ]);

    const resultsBreadcrumbs = generateEnhancedBreadcrumbs('/results');
    expect(resultsBreadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Search', path: '/search', is_active: false },
      { label: 'Results', path: '/results', is_active: true },
    ]);
  });

  it('should handle user routes correctly', () => {
    const dashboardBreadcrumbs = generateEnhancedBreadcrumbs('/dashboard');
    expect(dashboardBreadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Dashboard', path: '/dashboard', is_active: true },
    ]);

    const accountBreadcrumbs = generateEnhancedBreadcrumbs('/account');
    expect(accountBreadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Account', path: '/account', is_active: true },
    ]);

    const settingsBreadcrumbs = generateEnhancedBreadcrumbs('/account/settings');
    expect(settingsBreadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Account', path: '/account', is_active: false },
      { label: 'Settings', path: '/account/settings', is_active: true },
    ]);
  });
});

describe('routeBreadcrumbConfig', () => {
  it('should have configuration for all major routes', () => {
    const expectedRoutes = [
      '/bills',
      '/bills/:id',
      '/bills/:id/analysis',
      '/search',
      '/results',
      '/dashboard',
      '/account',
      '/account/settings',
      '/community',
      '/admin',
    ];

    expectedRoutes.forEach(route => {
      expect(routeBreadcrumbConfig[route]).toBeDefined();
      expect(typeof routeBreadcrumbConfig[route]).toBe('function');
    });
  });

  it('should generate correct breadcrumbs for each configured route', () => {
    // Test bills route
    const billsBreadcrumbs = routeBreadcrumbConfig['/bills']('/bills');
    expect(billsBreadcrumbs).toHaveLength(2);
    expect(billsBreadcrumbs[1].label).toBe('Bills');
    expect(billsBreadcrumbs[1].is_active).toBe(true);

    // Test bill detail route
    const billDetailBreadcrumbs = routeBreadcrumbConfig['/bills/:id']('/bills/123');
    expect(billDetailBreadcrumbs).toHaveLength(3);
    expect(billDetailBreadcrumbs[2].label).toBe('Bill 123');
    expect(billDetailBreadcrumbs[2].is_active).toBe(true);

    // Test bill analysis route
    const billAnalysisBreadcrumbs =
      routeBreadcrumbConfig['/bills/:id/analysis']('/bills/123/analysis');
    expect(billAnalysisBreadcrumbs).toHaveLength(4);
    expect(billAnalysisBreadcrumbs[3].label).toBe('Analysis');
    expect(billAnalysisBreadcrumbs[3].is_active).toBe(true);
  });
});

describe('useBreadcrumbNavigation', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
  });

  it('should return breadcrumbs from store', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', is_active: false },
      { label: 'Test', path: '/test', is_active: true },
    ];

    store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current.breadcrumbs).toEqual(mockBreadcrumbs);
  });

  it('should provide setBreadcrumbs function', () => {
    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(typeof result.current.setBreadcrumbs).toBe('function');

    const newBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', is_active: false },
      { label: 'New Page', path: '/new', is_active: true },
    ];

    act(() => {
      result.current.setBreadcrumbs(newBreadcrumbs);
    });

    // The breadcrumbs should be updated in the store
    expect(result.current.breadcrumbs).toEqual(newBreadcrumbs);
  });

  it('should provide addBreadcrumb function', () => {
    const initialBreadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/', is_active: true }];

    store = createMockStore({
      breadcrumbs: initialBreadcrumbs,
    });

    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    const newBreadcrumb: BreadcrumbItem = {
      label: 'New Page',
      path: '/new',
      is_active: true,
    };

    act(() => {
      result.current.addBreadcrumb(newBreadcrumb);
    });

    expect(result.current.breadcrumbs).toHaveLength(2);
    expect(result.current.breadcrumbs[0].is_active).toBe(false); // Previous should be inactive
    expect(result.current.breadcrumbs[1]).toEqual(newBreadcrumb);
  });

  it('should provide popBreadcrumb function', () => {
    const initialBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', is_active: false },
      { label: 'Page 1', path: '/page1', is_active: false },
      { label: 'Page 2', path: '/page2', is_active: true },
    ];

    store = createMockStore({
      breadcrumbs: initialBreadcrumbs,
    });

    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.popBreadcrumb();
    });

    expect(result.current.breadcrumbs).toHaveLength(2);
    expect(result.current.breadcrumbs[1].label).toBe('Page 1');
    expect(result.current.breadcrumbs[1].is_active).toBe(true); // Should become active
  });

  it('should not pop breadcrumb if only one remains', () => {
    const initialBreadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/', is_active: true }];

    store = createMockStore({
      breadcrumbs: initialBreadcrumbs,
    });

    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.popBreadcrumb();
    });

    expect(result.current.breadcrumbs).toHaveLength(1);
    expect(result.current.breadcrumbs[0].label).toBe('Home');
  });

  it('should respect breadcrumbsEnabled preference', () => {
    store = createMockStore({
      preferences: {
        defaultLandingPage: '/',
        favoritePages: [],
        recentlyVisited: [],
        compactMode: false,
        showBreadcrumbs: false, // Disabled
        autoExpand: false,
      },
    });

    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    expect(result.current.breadcrumbsEnabled).toBe(false);
  });

  it('should provide generateBreadcrumbsForPath function', () => {
    const { result } = renderHook(() => useBreadcrumbNavigation(), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });

    const breadcrumbs = result.current.generateBreadcrumbsForPath('/bills/123');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: false },
      { label: 'Bill 123', path: '/bills/123', is_active: true },
    ]);
  });

  it('should use custom generator when provided', () => {
    const customGenerator = jest.fn((pathname: string) => [
      { label: 'Custom Home', path: '/', is_active: false },
      { label: 'Custom Page', path: pathname, is_active: true },
    ]);

    const { result } = renderHook(
      () =>
        useBreadcrumbNavigation({
          customGenerator,
        }),
      {
        wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
      }
    );

    const breadcrumbs = result.current.generateBreadcrumbsForPath('/test');

    expect(customGenerator).toHaveBeenCalledWith('/test');
    expect(breadcrumbs).toEqual([
      { label: 'Custom Home', path: '/', is_active: false },
      { label: 'Custom Page', path: '/test', is_active: true },
    ]);
  });

  it('should disable auto-generation when autoGenerate is false', () => {
    const { result } = renderHook(
      () =>
        useBreadcrumbNavigation({
          autoGenerate: false,
        }),
      {
        wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
      }
    );

    // Should still have empty breadcrumbs since auto-generation is disabled
    expect(result.current.breadcrumbs).toEqual([]);
  });
});
