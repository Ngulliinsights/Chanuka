/**
 * Navigation Test Utilities
 * 
 * Utilities for testing navigation and routing functionality
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock navigation service
export const mockNavigationService = {
  navigate: vi.fn(),
  getLocation: vi.fn(() => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null
  })),
  goBack: vi.fn(),
  goForward: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
};

// Mock router context
interface MockRouterContextProps {
  children: React.ReactNode;
  initialRoute?: string;
}

export const MockRouterContext: React.FC<MockRouterContextProps> = ({ 
  children, 
  initialRoute = '/' 
}) => {
  const [currentRoute, setCurrentRoute] = React.useState(initialRoute);

  React.useEffect(() => {
    mockNavigationService.getLocation.mockReturnValue({
      pathname: currentRoute,
      search: '',
      hash: '',
      state: null
    });
  }, [currentRoute]);

  return (
    <div data-testid="mock-router" data-current-route={currentRoute}>
      {children}
    </div>
  );
};

// Enhanced render function with navigation context
export const renderWithNavigation = (
  ui: React.ReactElement,
  options: RenderOptions & { initialRoute?: string } = {}
) => {
  const { initialRoute = '/', ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MockRouterContext initialRoute={initialRoute}>
      {children}
    </MockRouterContext>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Navigation test helpers
export const navigationTestHelpers = {
  // Simulate navigation
  navigateTo: (path: string) => {
    mockNavigationService.navigate(path);
    mockNavigationService.getLocation.mockReturnValue({
      pathname: path,
      search: '',
      hash: '',
      state: null
    });
  },

  // Simulate back navigation
  goBack: () => {
    mockNavigationService.goBack();
  },

  // Get current location
  getCurrentLocation: () => mockNavigationService.getLocation(),

  // Reset navigation mocks
  resetMocks: () => {
    Object.values(mockNavigationService).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockClear();
      }
    });
    
    mockNavigationService.getLocation.mockReturnValue({
      pathname: '/',
      search: '',
      hash: '',
      state: null
    });
  },
};

// Export everything
export * from '@testing-library/react';
export { mockNavigationService, navigationTestHelpers };

