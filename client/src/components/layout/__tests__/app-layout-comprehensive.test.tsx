import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLayout } from '@client/app-layout';
import { LayoutConfig } from '@client/index';

// Mock all dependencies
jest.mock('../../../hooks/use-unified-navigation', () => ({
  useUnifiedNavigation: jest.fn(),
}));

jest.mock('../../../hooks/use-navigation-performance', () => ({
  useNavigationPerformance: jest.fn(),
}));

jest.mock('../../../hooks/use-navigation-accessibility', () => ({
  useNavigationAccessibility: jest.fn(),
  useNavigationKeyboardShortcuts: jest.fn(),
}));

jest.mock('../../../hooks/use-accessibility', () => ({
  useAccessibility: jest.fn(),
}));

jest.mock('../navigation', () => ({
  DesktopSidebar: () => <div data-testid="desktop-sidebar">Desktop Sidebar</div>,
}));

jest.mock('./mobile-navigation', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-navigation">Mobile Navigation</div>,
}));

jest.mock('../accessibility/accessibility-manager', () => ({
  SkipLink: ({ children, href }: any) => (
    <a href={href} data-testid={`skip-link-${href.slice(1)}`}>{children}</a>
  ),
  useAccessibility: jest.fn(),
}));

const mockUseUnifiedNavigation = require('@client/hooks/use-unified-navigation').useUnifiedNavigation;
const mockUseNavigationPerformance = require('@client/hooks/use-navigation-performance').useNavigationPerformance;
const mockUseNavigationAccessibility = require('@client/hooks/use-navigation-accessibility').useNavigationAccessibility;
const mockUseNavigationKeyboardShortcuts = require('@client/hooks/use-navigation-accessibility').useNavigationKeyboardShortcuts;
const mockUseAccessibility = require('@client/hooks/use-accessibility').useAccessibility;

describe('AppLayout', () => {
  const TestChild = () => <div data-testid="test-child">Test Content</div>;

  const defaultMocks = {
    useUnifiedNavigation: {
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    },
    useNavigationPerformance: {
      startTransition: jest.fn(),
      endTransition: jest.fn(),
      enableGPUAcceleration: jest.fn(),
      disableGPUAcceleration: jest.fn(),
    },
    useNavigationAccessibility: {
      announce: jest.fn(),
    },
    useNavigationKeyboardShortcuts: {
      registerShortcut: jest.fn(() => jest.fn()),
    },
    useAccessibility: {
      announceToScreenReader: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUnifiedNavigation.mockReturnValue(defaultMocks.useUnifiedNavigation);
    mockUseNavigationPerformance.mockReturnValue(defaultMocks.useNavigationPerformance);
    mockUseNavigationAccessibility.mockReturnValue(defaultMocks.useNavigationAccessibility);
    mockUseNavigationKeyboardShortcuts.mockReturnValue(defaultMocks.useNavigationKeyboardShortcuts);
    mockUseAccessibility.mockReturnValue(defaultMocks.useAccessibility);
  });

  it('renders children with default configuration', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
  });

  it('renders in mobile mode', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      isMobile: true,
    });

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <AppLayout className="custom-class">
        <TestChild />
      </AppLayout>
    );

    const layout = screen.getByTestId('test-child').closest('.chanuka-layout-stable');
    expect(layout).toHaveClass('custom-class');
  });

  it('handles custom layout configuration', () => {
    const customConfig: LayoutConfig = {
      type: 'app',
      showSidebar: false,
      showHeader: true,
      showFooter: false,
      sidebarState: 'expanded',
      headerStyle: 'default',
      footerStyle: 'default',
      enableMobileOptimization: true,
      enableAccessibility: true,
      enablePerformanceOptimization: true,
    };

    render(
      <AppLayout config={customConfig}>
        <TestChild />
      </AppLayout>
    );

    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('renders skip links when accessibility is enabled', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    expect(screen.getByTestId('skip-link-main-content')).toBeInTheDocument();
    expect(screen.getByTestId('skip-link-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('skip-link-search')).toBeInTheDocument();
  });

  it('does not render skip links when accessibility is disabled', () => {
    const config: LayoutConfig = {
      type: 'app',
      showSidebar: true,
      showHeader: true,
      showFooter: true,
      sidebarState: 'expanded',
      headerStyle: 'default',
      footerStyle: 'default',
      enableMobileOptimization: true,
      enableAccessibility: false,
      enablePerformanceOptimization: true,
    };

    render(
      <AppLayout config={config}>
        <TestChild />
      </AppLayout>
    );

    expect(screen.queryByTestId('skip-link-main-content')).not.toBeInTheDocument();
  });

  it('renders footer when enabled', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/© 2024 Chanuka Platform/)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', () => {
    const mockFocus = jest.fn();
    const mainContent = document.createElement('main');
    mainContent.focus = mockFocus;
    mainContent.setAttribute('id', 'main-content');
    document.body.appendChild(mainContent);

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const layout = screen.getByTestId('test-child').closest('.chanuka-layout-stable');
    fireEvent.keyDown(layout!, { key: 'm', altKey: true });

    expect(mockFocus).toHaveBeenCalled();

    document.body.removeChild(mainContent);
  });

  it('handles layout configuration validation errors', () => {
    const invalidConfig = {
      type: 'invalid' as any,
    };

    const mockOnError = jest.fn();

    render(
      <AppLayout config={invalidConfig} onError={mockOnError}>
        <TestChild />
      </AppLayout>
    );

    expect(mockOnError).toHaveBeenCalled();
    expect(screen.getByText('Layout Error')).toBeInTheDocument();
  });

  it('calls onLayoutChange when config changes', () => {
    const mockOnLayoutChange = jest.fn();
    const config: LayoutConfig = {
      type: 'app',
      showSidebar: false,
      showHeader: true,
      showFooter: true,
      sidebarState: 'expanded',
      headerStyle: 'default',
      footerStyle: 'default',
      enableMobileOptimization: true,
      enableAccessibility: true,
      enablePerformanceOptimization: true,
    };

    render(
      <AppLayout config={config} onLayoutChange={mockOnLayoutChange}>
        <TestChild />
      </AppLayout>
    );

    expect(mockOnLayoutChange).toHaveBeenCalledWith(config);
  });

  it('handles error recovery', () => {
    const invalidConfig = {
      type: 'invalid' as any,
    };

    render(
      <AppLayout config={invalidConfig}>
        <TestChild />
      </AppLayout>
    );

    const recoverButton = screen.getByRole('button', { name: /recover layout/i });
    fireEvent.click(recoverButton);

    expect(screen.queryByText('Layout Error')).not.toBeInTheDocument();
  });

  it('renders SSR placeholder when not mounted', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      mounted: false,
    });

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('handles mobile to desktop transition', async () => {
    const { rerender } = render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    // Initially desktop
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();

    // Change to mobile
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      isMobile: true,
    });

    rerender(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes for mobile layout', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      isMobile: true,
    });

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('pb-16');
  });

  it('applies correct CSS classes for desktop layout', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('min-h-screen');
  });

  it('handles sidebar collapsed state', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      sidebarCollapsed: true,
    });

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const mainContent = screen.getByTestId('test-child').parentElement;
    expect(mainContent).toHaveClass('ml-16');
  });

  it('handles sidebar expanded state', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      ...defaultMocks.useUnifiedNavigation,
      sidebarCollapsed: false,
    });

    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const mainContent = screen.getByTestId('test-child').parentElement;
    expect(mainContent).toHaveClass('ml-64');
  });

  it('renders with proper ARIA attributes', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label', 'Main content');
    expect(main).toHaveAttribute('tabIndex', '-1');
  });

  it('handles focus management for accessibility', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('handles runtime errors gracefully', () => {
    // Mock a hook to throw an error
    mockUseUnifiedNavigation.mockImplementation(() => {
      throw new Error('Hook error');
    });

    const mockOnError = jest.fn();

    render(
      <AppLayout onError={mockOnError}>
        <TestChild />
      </AppLayout>
    );

    expect(mockOnError).toHaveBeenCalled();
  });

  it('handles invalid config types', () => {
    const invalidConfig = {
      showSidebar: 'invalid' as any,
    };

    const mockOnError = jest.fn();

    render(
      <AppLayout config={invalidConfig} onError={mockOnError}>
        <TestChild />
      </AppLayout>
    );

    expect(mockOnError).toHaveBeenCalled();
  });

  it('maintains layout stability during transitions', () => {
    render(
      <AppLayout>
        <TestChild />
      </AppLayout>
    );

    const layout = screen.getByTestId('test-child').closest('.chanuka-layout-stable');
    expect(layout).toBeInTheDocument();
  });
});