import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUnifiedNavigation } from '../use-unified-navigation';
import { NavigationProvider } from '@/contexts/NavigationContext';
import React from 'react';
import { logger } from '@/utils/browser-logger';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </BrowserRouter>
);

describe('useUnifiedNavigation', () => {
  it('should provide unified navigation state and actions', () => {
    const { result } = renderHook(() => useUnifiedNavigation(), {
      wrapper: TestWrapper,
    });

    // Check that all expected properties are available
    expect(result.current).toHaveProperty('currentPath');
    expect(result.current).toHaveProperty('isMobile');
    expect(result.current).toHaveProperty('sidebarCollapsed');
    expect(result.current).toHaveProperty('mounted');
    expect(result.current).toHaveProperty('toggleSidebar');
    expect(result.current).toHaveProperty('isActive');
    expect(result.current).toHaveProperty('navigateTo');
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useUnifiedNavigation(), {
      wrapper: TestWrapper,
    });

    // Check initial values
    expect(result.current.currentPath).toBe('/');
    expect(result.current.sidebarCollapsed).toBe(false);
    expect(typeof result.current.isMobile).toBe('boolean');
    expect(typeof result.current.mounted).toBe('boolean');
  });

  it('should provide working navigation functions', () => {
    const { result } = renderHook(() => useUnifiedNavigation(), {
      wrapper: TestWrapper,
    });

    // Check that functions are available and callable
    expect(typeof result.current.toggleSidebar).toBe('function');
    expect(typeof result.current.isActive).toBe('function');
    expect(typeof result.current.navigateTo).toBe('function');
    expect(typeof result.current.setSidebarCollapsed).toBe('function');
  });

  it('should correctly identify active paths', () => {
    const { result } = renderHook(() => useUnifiedNavigation(), {
      wrapper: TestWrapper,
    });

    // Test isActive function
    expect(result.current.isActive('/')).toBe(true);
    expect(result.current.isActive('/dashboard')).toBe(false);
  });
});