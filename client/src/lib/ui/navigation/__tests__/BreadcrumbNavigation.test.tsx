/**
 * Breadcrumb Navigation Tests
 *
 * Tests for the breadcrumb navigation component and related utilities.
 */

import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import navigationReducer from '@client/lib/infrastructure/store/slices/navigationSlice';
import type { BreadcrumbItem } from '@client/lib/types/navigation';

import { BreadcrumbNavigation, generateBreadcrumbs } from '../BreadcrumbNavigation';

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
const TestWrapper: React.FC<{ children: React.ReactNode; store?: any }> = ({
  children,
  store = createMockStore(),
}) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe('generateBreadcrumbs', () => {
  it('should generate breadcrumbs for home page', () => {
    const breadcrumbs = generateBreadcrumbs('/');

    expect(breadcrumbs).toEqual([{ label: 'Home', path: '/', isActive: true }]);
  });

  it('should generate breadcrumbs for bills page', () => {
    const breadcrumbs = generateBreadcrumbs('/bills');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: true },
    ]);
  });

  it('should generate breadcrumbs for bill detail page', () => {
    const breadcrumbs = generateBreadcrumbs('/bills/123');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: false },
      { label: 'Bill 123', path: '/bills/123', isActive: true },
    ]);
  });

  it('should generate breadcrumbs for bill analysis page', () => {
    const breadcrumbs = generateBreadcrumbs('/bills/123/analysis');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: false },
      { label: 'Bill 123', path: '/bills/123', isActive: false },
      { label: 'Analysis', path: '/bills/123/analysis', isActive: true },
    ]);
  });

  it('should generate breadcrumbs for search page', () => {
    const breadcrumbs = generateBreadcrumbs('/search');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Search', path: '/search', isActive: true },
    ]);
  });

  it('should generate breadcrumbs for search results page', () => {
    const breadcrumbs = generateBreadcrumbs('/results');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Search Results', path: '/results', isActive: true },
    ]);
  });

  it('should handle kebab-case segments', () => {
    const breadcrumbs = generateBreadcrumbs('/user-settings');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'User Settings', path: '/user-settings', isActive: true },
    ]);
  });

  it('should handle snake_case segments', () => {
    const breadcrumbs = generateBreadcrumbs('/user_profile');

    expect(breadcrumbs).toEqual([
      { label: 'Home', path: '/', isActive: false },
      { label: 'User Profile', path: '/user_profile', isActive: true },
    ]);
  });
});

describe('BreadcrumbNavigation', () => {
  it('should render breadcrumbs from store', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: false },
      { label: 'Bill 123', path: '/bills/123', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation />
      </TestWrapper>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Bill 123')).toBeInTheDocument();
  });

  it('should not render when breadcrumbs are disabled in preferences', () => {
    const store = createMockStore({
      preferences: {
        defaultLandingPage: '/',
        favoritePages: [],
        recentlyVisited: [],
        compactMode: false,
        showBreadcrumbs: false, // Disabled
        autoExpand: false,
      },
    });

    const { container } = render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render home icon when showHome is true', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation showHome={true} />
      </TestWrapper>
    );

    // Check for home icon (we can't easily test the icon itself, but we can check the structure)
    const homeLink = screen.getByLabelText('Go to Home');
    expect(homeLink).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation compact={true} showHome={true} />
      </TestWrapper>
    );

    // In compact mode, only the home icon should be visible, not the text
    const homeLink = screen.getByLabelText('Go to Home');
    expect(homeLink).toBeInTheDocument();
  });

  it('should handle custom separator', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation separator=">" />
      </TestWrapper>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
  });

  it('should truncate breadcrumbs when maxItems is exceeded', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Level 1', path: '/level1', isActive: false },
      { label: 'Level 2', path: '/level1/level2', isActive: false },
      { label: 'Level 3', path: '/level1/level2/level3', isActive: false },
      { label: 'Level 4', path: '/level1/level2/level3/level4', isActive: false },
      { label: 'Current', path: '/level1/level2/level3/level4/current', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation maxItems={3} />
      </TestWrapper>
    );

    // Should show Home, Level 4, and Current (truncated)
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();

    // Should not show the middle levels
    expect(screen.queryByText('Level 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Level 3')).not.toBeInTheDocument();
  });

  it('should make current page non-clickable', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Current Page', path: '/current', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation />
      </TestWrapper>
    );

    // Home should be clickable
    expect(screen.getByLabelText('Go to Home')).toBeInTheDocument();

    // Current page should not be clickable (no link)
    const currentPage = screen.getByText('Current Page');
    expect(currentPage.tagName).not.toBe('A');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('should apply custom className', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/', isActive: true }];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation className="custom-class" />
      </TestWrapper>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    const mockBreadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isActive: false },
      { label: 'Current', path: '/current', isActive: true },
    ];

    const store = createMockStore({
      breadcrumbs: mockBreadcrumbs,
    });

    render(
      <TestWrapper store={store}>
        <BreadcrumbNavigation />
      </TestWrapper>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    expect(nav).toHaveAttribute('role', 'navigation');

    const currentPage = screen.getByText('Current');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });
});
