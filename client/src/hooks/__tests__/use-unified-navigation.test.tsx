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

import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUnifiedNavigation } from '../use-unified-navigation';
import { createNavigationProvider } from '@client/core/navigation/context';
import React from 'react';
import { logger } from '@client/utils/logger';

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
    expect(result.current).toHaveProperty('is_active');
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
    expect(typeof result.current.is_active).toBe('function');
    expect(typeof result.current.navigateTo).toBe('function');
    expect(typeof result.current.setSidebarCollapsed).toBe('function');
  });

  it('should correctly identify active paths', () => {
    const { result } = renderHook(() => useUnifiedNavigation(), {
      wrapper: TestWrapper,
    });

    // Test is_active function
    expect(result.current.is_active('/')).toBe(true);
    expect(result.current.is_active('/dashboard')).toBe(false);
  });
});

