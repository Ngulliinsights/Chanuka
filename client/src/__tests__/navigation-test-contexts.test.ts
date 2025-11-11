/**
 * Navigation Test Contexts and Mock Factories
 * Provides comprehensive test infrastructure for navigation system testing
 */

import React from 'react';
import { vi } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { NavigationState, NavigationPreferences, UserRole } from '../core/navigation/types';

// Enhanced mock factories for different navigation scenarios
export class NavigationMockFactory {
  static createMockNavigationState(overrides: Partial<NavigationState> = {}): NavigationState {
    return {
      currentPath: '/',
      previousPath: '/',
      breadcrumbs: [],
      relatedPages: [],
      currentSection: 'legislative',
      sidebarOpen: false,
      mobileMenuOpen: false,
      isMobile: false,
      sidebarCollapsed: false,
      mounted: true,
      user_role: 'public',
      preferences: this.createDefaultPreferences(),
      ...overrides,
    };
  }

  static createDefaultPreferences(): NavigationPreferences {
    return {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
      showBreadcrumbs: true,
      autoExpand: false,
    };
  }

  static createMockUser(role: UserRole = 'citizen') {
    return {
      id: `user-${role}`,
      email: `${role}@example.com`,
      display_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      role,
      avatar: null,
    };
  }

  static createMockAuthState(userRole: UserRole = 'citizen') {
    return {
      user: this.createMockUser(userRole),
      isAuthenticated: true,
      logout: vi.fn(),
    };
  }

  static createMockLocation(pathname: string = '/') {
    return { pathname };
  }

  static createMockNavigate() {
    return vi.fn();
  }

  static createMockMediaQuery(isMobile: boolean = false) {
    return vi.fn(() => isMobile);
  }
}

// Test context providers for different scenarios
export class NavigationTestContexts {
  static createBasicNavigationContext() {
    const NavigationProvider = NavigationTestContexts.createMockNavigationProvider();
    return ({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) => {
      return React.createElement(MemoryRouter, { initialEntries: [initialPath] },
        React.createElement(NavigationProvider, null, children)
      );
    };
  }

  static createMobileNavigationContext() {
    const NavigationProvider = NavigationTestContexts.createMockNavigationProvider(true);
    return ({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) => {
      return React.createElement(MemoryRouter, { initialEntries: [initialPath] },
        React.createElement(NavigationProvider, null, children)
      );
    };
  }

  static createAuthenticatedNavigationContext(userRole: UserRole = 'citizen') {
    const NavigationProvider = NavigationTestContexts.createMockNavigationProvider(false, userRole);
    return ({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) => {
      return React.createElement(MemoryRouter, { initialEntries: [initialPath] },
        React.createElement(NavigationProvider, null, children)
      );
    };
  }

  static createAdminNavigationContext() {
    return this.createAuthenticatedNavigationContext('admin');
  }

  static createExpertNavigationContext() {
    return this.createAuthenticatedNavigationContext('expert');
  }

  static createMockNavigationProvider(isMobile: boolean = false, userRole: UserRole = 'public') {
    const mockUseLocation = vi.fn(() => NavigationMockFactory.createMockLocation());
    const mockUseNavigate = vi.fn(() => NavigationMockFactory.createMockNavigate());
    const mockUseAuth = vi.fn(() => NavigationMockFactory.createMockAuthState(userRole));
    const mockUseMediaQuery = vi.fn(() => NavigationMockFactory.createMockMediaQuery(isMobile));

    // Import the actual provider factory
    const { createNavigationProvider } = require('../core/navigation/context');
    return createNavigationProvider(mockUseLocation, mockUseNavigate, mockUseAuth, mockUseMediaQuery);
  }
}

// Test data factories for consistent test scenarios
export class NavigationTestDataFactory {
  static createBreadcrumbScenario(path: string) {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      path: '/' + segments.slice(0, index + 1).join('/'),
      is_active: index === segments.length - 1,
    }));

    return {
      path,
      breadcrumbs,
      expectedSection: this.determineSection(path),
    };
  }

  static createRelatedPagesScenario(path: string, userRole: UserRole = 'citizen') {
    const relatedPages = [
      {
        pageId: 'related-1',
        title: 'Related Page 1',
        path: '/related-1',
        description: 'A related page',
        category: 'legislative' as const,
        type: 'related' as const,
        weight: 1,
        relevanceScore: 0.8,
      },
      {
        pageId: 'related-2',
        title: 'Related Page 2',
        path: '/related-2',
        description: 'Another related page',
        category: 'community' as const,
        type: 'sibling' as const,
        weight: 2,
        relevanceScore: 0.6,
      },
    ];

    return {
      path,
      userRole,
      relatedPages,
    };
  }

  static createPerformanceScenario(operation: string) {
    return {
      operation,
      expectedDuration: 100, // ms
      tolerance: 50, // ms
      iterations: 100,
    };
  }

  private static determineSection(path: string): 'legislative' | 'community' | 'tools' | 'user' | 'admin' {
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/profile') || path.startsWith('/settings')) return 'user';
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/tools')) return 'tools';
    return 'legislative';
  }
}

// Test utilities for common navigation testing patterns
export class NavigationTestUtils {
  static async waitForNavigationUpdate(timeout: number = 1000) {
    await new Promise(resolve => setTimeout(resolve, 150)); // Wait for debounced updates
  }

  static createMockLocalStorage() {
    const store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      store,
    };
  }

  static mockWindowLocation(path: string) {
    Object.defineProperty(window, 'location', {
      value: { pathname: path },
      writable: true,
    });
  }

  static createMockHistory() {
    const history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      length: 1,
      state: null,
    };

    Object.defineProperty(window, 'history', {
      value: history,
      writable: true,
    });

    return history;
  }

  static simulateRouteChange(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }
}

// Export convenience functions for common test setups
export const {
  createBasicNavigationContext,
  createMobileNavigationContext,
  createAuthenticatedNavigationContext,
  createAdminNavigationContext,
  createExpertNavigationContext,
} = NavigationTestContexts;

export const {
  createMockNavigationState,
  createDefaultPreferences,
  createMockUser,
  createMockAuthState,
  createMockLocation,
  createMockNavigate,
  createMockMediaQuery,
} = NavigationMockFactory;

export const {
  createBreadcrumbScenario,
  createRelatedPagesScenario,
  createPerformanceScenario,
} = NavigationTestDataFactory;

export const {
  waitForNavigationUpdate,
  createMockLocalStorage,
  mockWindowLocation,
  createMockHistory,
  simulateRouteChange,
} = NavigationTestUtils;