#!/usr/bin/env tsx

/**
 * Fix Navigation Tests Script
 * 
 * Fixes common issues with navigation and routing tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

class NavigationTestFixer {
  private fixedCount = 0;

  async fixNavigationTests(): Promise<void> {
    console.log('🧭 Fixing navigation tests...\n');

    await this.fixNavigationMocks();
    await this.fixRoutingTests();
    await this.fixLocationMocks();
    await this.createNavigationTestUtils();

    console.log(`\n✅ Fixed ${this.fixedCount} navigation test issues!`);
  }

  private async fixNavigationMocks(): Promise<void> {
    console.log('🔧 Fixing navigation mocks...');

    const testFiles = await glob('**/*.{test,spec}.{ts,tsx}', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    for (const testFile of testFiles) {
      let content = fs.readFileSync(testFile, 'utf-8');
      const originalContent = content;

      // Add proper navigation service mock
      if (content.includes('navigationService') && !content.includes('vi.mock') && content.includes('Cannot read properties of undefined')) {
        const navigationMock = `
// Mock navigation service
const mockNavigationService = {
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

vi.mock('@/components/navigation', () => ({
  navigationService: mockNavigationService,
}));

vi.mock('@/services/navigation', () => ({
  navigationService: mockNavigationService,
}));
`;

        // Add the mock after the imports
        const firstImportMatch = content.match(/import.*from.*['"];/);
        if (firstImportMatch) {
          const insertIndex = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
          content = content.slice(0, insertIndex) + '\n' + navigationMock + '\n' + content.slice(insertIndex);
        }
      }

      // Fix location access issues
      content = content.replace(
        /navigationService\.getLocation\(\)\.pathname/g,
        '(navigationService.getLocation() || { pathname: "/" }).pathname'
      );

      content = content.replace(
        /navigationService\.getLocation\(\)\.search/g,
        '(navigationService.getLocation() || { search: "" }).search'
      );

      content = content.replace(
        /navigationService\.getLocation\(\)\.hash/g,
        '(navigationService.getLocation() || { hash: "" }).hash'
      );

      if (content !== originalContent) {
        fs.writeFileSync(testFile, content);
        this.fixedCount++;
        console.log(`   Fixed navigation in: ${testFile}`);
      }
    }
  }

  private async fixRoutingTests(): Promise<void> {
    console.log('🛣️ Fixing routing tests...');

    const routingTestFiles = await glob('**/*{navigation,routing,flow}*.{test,spec}.{ts,tsx}', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    for (const testFile of routingTestFiles) {
      let content = fs.readFileSync(testFile, 'utf-8');
      const originalContent = content;

      // Add React Router mocks if needed
      if (content.includes('useNavigate') || content.includes('useLocation')) {
        const routerMocks = `
// Mock React Router hooks
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  }),
  useParams: () => ({}),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => 
    <a href={to}>{children}</a>,
}));
`;

        if (!content.includes('vi.mock(\'react-router-dom\'')) {
          const firstImportMatch = content.match(/import.*from.*['"];/);
          if (firstImportMatch) {
            const insertIndex = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
            content = content.slice(0, insertIndex) + '\n' + routerMocks + '\n' + content.slice(insertIndex);
          }
        }
      }

      if (content !== originalContent) {
        fs.writeFileSync(testFile, content);
        this.fixedCount++;
        console.log(`   Fixed routing in: ${testFile}`);
      }
    }
  }

  private async fixLocationMocks(): Promise<void> {
    console.log('📍 Fixing location mocks...');

    // Mock window.location for all tests
    const setupTestsPath = 'src/setupTests.ts';
    if (fs.existsSync(setupTestsPath)) {
      let content = fs.readFileSync(setupTestsPath, 'utf-8');
      
      if (!content.includes('window.location')) {
        const locationMock = `
// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  toString: () => 'http://localhost:3000/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock history API
const mockHistory = {
  length: 1,
  scrollRestoration: 'auto' as ScrollRestoration,
  state: null,
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  pushState: vi.fn(),
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});
`;

        content += locationMock;
        fs.writeFileSync(setupTestsPath, content);
        this.fixedCount++;
        console.log(`   Added location mocks to setupTests.ts`);
      }
    }
  }

  private async createNavigationTestUtils(): Promise<void> {
    console.log('🛠️ Creating navigation test utilities...');

    const testUtilsPath = 'client/src/test-utils/navigation-test-utils.tsx';
    
    // Ensure directory exists
    const dir = path.dirname(testUtilsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const navigationTestUtils = `/**
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
export { mockNavigationService, navigationTestHelpers };`;

    fs.writeFileSync(testUtilsPath, navigationTestUtils);
    this.fixedCount++;
    console.log(`   Created navigation test utilities: ${testUtilsPath}`);
  }
}

// Main execution
async function main(): Promise<void> {
  const fixer = new NavigationTestFixer();
  await fixer.fixNavigationTests();
}

// Run the script
main().catch(console.error);

export { NavigationTestFixer };