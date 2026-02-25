/**
 * Navigation Slice Hook Tests
 *
 * Tests to verify the navigation slice integration is working correctly.
 */

import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import navigationReducer from '../../../shared/infrastructure/store/slices/navigationSlice';
import { useNavigationSlice, useSidebar, useMobileMenu } from '../use-navigation-slice';

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      navigation: navigationReducer,
    },
  });

// Test wrapper component
const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useNavigationSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should provide navigation state and actions', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNavigationSlice(), { wrapper });

    expect(result.current.currentPath).toBe('/');
    expect(result.current.breadcrumbs).toEqual([]);
    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.mobileMenuOpen).toBe(false);
    expect(result.current.userRole).toBe('public');
  });

  it('should update current path', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNavigationSlice(), { wrapper });

    act(() => {
      result.current.setCurrentPath('/bills');
    });

    expect(result.current.currentPath).toBe('/bills');
    expect(result.current.previousPath).toBe('/');
  });

  it('should toggle sidebar', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNavigationSlice(), { wrapper });

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should add to recent pages', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNavigationSlice(), { wrapper });

    act(() => {
      result.current.addToRecentPages({
        path: '/bills/123',
        title: 'Test Bill',
      });
    });

    expect(result.current.preferences.recentlyVisited).toHaveLength(1);
    expect(result.current.preferences.recentlyVisited[0].path).toBe('/bills/123');
    expect(result.current.preferences.recentlyVisited[0].title).toBe('Test Bill');
  });
});

describe('useSidebar', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should provide sidebar-specific state and actions', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.sidebarCollapsed).toBe(false);
    expect(typeof result.current.toggleSidebar).toBe('function');
    expect(typeof result.current.setSidebarOpen).toBe('function');
    expect(typeof result.current.setSidebarCollapsed).toBe('function');
  });

  it('should toggle sidebar state', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(true);
  });
});

describe('useMobileMenu', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should provide mobile menu state and actions', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useMobileMenu(), { wrapper });

    expect(result.current.mobileMenuOpen).toBe(false);
    expect(typeof result.current.toggleMobileMenu).toBe('function');
    expect(typeof result.current.setMobileMenuOpen).toBe('function');
  });

  it('should toggle mobile menu state', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useMobileMenu(), { wrapper });

    act(() => {
      result.current.toggleMobileMenu();
    });

    expect(result.current.mobileMenuOpen).toBe(true);
  });
});
