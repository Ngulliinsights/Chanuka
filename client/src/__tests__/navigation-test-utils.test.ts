/**
 * Navigation Test Utilities
 * Provides proper mock utilities for navigation testing
 */

import React from 'react';
import { vi } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { createNavigationProvider } from '@client/core/navigation/context';

// Mock hooks - defined before any imports that might use them
const mockUseAuth = vi.fn();
const mockUseMediaQuery = vi.fn();
const mockUseLocation = vi.fn();
const mockUseNavigate = vi.fn();

// Mock localStorage
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

// Setup global mocks - must be called before tests
export function setupNavigationMocks() {
  // Mock React hooks to prevent useReducer null issues
  vi.mock('react', async () => {
    const actualReact = await vi.importActual('react') as typeof import('react');
    return {
      ...actualReact,
      useReducer: vi.fn((reducer, initialState) => {
        const [state, setState] = actualReact.useState(initialState);
        const dispatch = vi.fn((action) => {
          const newState = reducer(state, action);
          setState(newState);
        });
        return [state, dispatch];
      }),
    };
  });

  // Mock hooks
  vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
      user: {
        id: '1',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'user',
      },
      isAuthenticated: true,
      logout: vi.fn(),
    }),
  }));

  vi.mock('@/hooks/use-mobile', () => ({
    useMediaQuery: () => false,
  }));

  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
      ...actual,
      useLocation: vi.fn(() => ({ pathname: '/' })),
      useNavigate: vi.fn(() => vi.fn()),
    };
  });

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Reset mocks to default values
  resetNavigationMocks();
}

// Test setup helper - to be used in test files
export function setupTestEnvironment() {
  setupNavigationMocks();
}

// Helper to clear mocks between tests
export function clearTestMocks() {
  vi.clearAllMocks();
  resetNavigationMocks();
  vi.clearAllTimers();
}

// Create NavigationProvider with proper mocks
const NavigationProvider = createNavigationProvider(
  mockUseLocation,
  mockUseNavigate,
  mockUseAuth,
  mockUseMediaQuery
);

// Test wrapper components
export function TestApp({
  children,
  initialPath = '/',
}: {
  children: React.ReactNode;
  initialPath?: string;
}) {
  return React.createElement(MemoryRouter, { initialEntries: [initialPath] },
    React.createElement(NavigationProvider, null,
      React.createElement('div', { 'data-testid': 'app-layout' }, children)
    )
  );
}

// Mock page components
export function BillsPage() {
  return React.createElement('div', { 'data-testid': 'bills-page' }, 'Bills Page');
}

export function DashboardPage() {
  return React.createElement('div', { 'data-testid': 'dashboard-page' }, 'Dashboard Page');
}

export function CommunityPage() {
  return React.createElement('div', { 'data-testid': 'community-page' }, 'Community Page');
}

export function AnalysisPage() {
  return React.createElement('div', { 'data-testid': 'analysis-page' }, 'Analysis Page');
}

export function ProfilePage() {
  return React.createElement('div', { 'data-testid': 'profile-page' }, 'Profile Page');
}

export function SettingsPage() {
  return React.createElement('div', { 'data-testid': 'settings-page' }, 'Settings Page');
}

// Test utilities
export function resetNavigationMocks() {
  vi.clearAllMocks();
  localStorageMock.clear();
  localStorageMock.store = {};

  // Reset to default values
  mockUseAuth.mockReturnValue({
    user: {
      id: '1',
      email: 'test@example.com',
      display_name: 'Test User',
      role: 'user',
    },
    isAuthenticated: true,
    logout: vi.fn(),
  });
  mockUseMediaQuery.mockReturnValue(false);
  mockUseLocation.mockReturnValue({ pathname: '/' });
  mockUseNavigate.mockReturnValue(vi.fn());

  // Reset URL to home
  window.history.pushState({}, '', '/');
}

export function createMockUser(role: string = 'user') {
  return {
    user: {
      id: '1',
      email: `${role}@example.com`,
      display_name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      role,
    },
    isAuthenticated: true,
    logout: vi.fn(),
  };
}

// Export mocks for direct access if needed
export { mockUseAuth, mockUseMediaQuery, mockUseLocation, mockUseNavigate, localStorageMock };