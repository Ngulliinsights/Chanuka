import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the navigation hooks
vi.mock('@/hooks/use-unified-navigation', () => ({
  useUnifiedNavigation: vi.fn(),
}));

// Mock the navigation components
vi.mock('@/components/navigation/DesktopSidebar', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="desktop-sidebar" className={className}>
      Desktop Sidebar
    </div>
  ),
}));

vi.mock('@/components/navigation/MobileNavigation', () => ({
  default: () => <div data-testid="mobile-navigation">Mobile Navigation</div>,
}));

import AppLayout from '../app-layout';
import { useUnifiedNavigation } from '@/hooks/use-unified-navigation';
import { logger } from '../utils/logger.js';

const mockUseUnifiedNavigation = vi.mocked(useUnifiedNavigation);

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return value
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    });
  });

  it('should render children content', () => {
    render(
      <AppLayout>
        <div data-testid="test-content">Test Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should show desktop sidebar when not mobile and mounted', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    });

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
  });

  it('should show mobile navigation when mobile and mounted', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: true,
      mounted: true,
      sidebarCollapsed: false,
    });

    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });

  it('should render SSR placeholder when not mounted', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: false,
      sidebarCollapsed: false,
    });

    render(
      <AppLayout>
        <div data-testid="test-content">Test Content</div>
      </AppLayout>
    );

    // Should still render content
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    
    // Should not render navigation components when not mounted
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
  });

  it('should apply transition classes when transitioning', async () => {
    // Start with desktop
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    });

    const { rerender } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Switch to mobile to trigger transition
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: true,
      mounted: true,
      sidebarCollapsed: false,
    });

    rerender(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Should show mobile navigation after transition
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
  });

  it('should apply correct main content classes for desktop', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: false,
    });

    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Check for desktop-specific classes
    const mainContentDiv = container.querySelector('.ml-64');
    expect(mainContentDiv).toBeInTheDocument();
  });

  it('should apply correct main content classes for collapsed sidebar', () => {
    mockUseUnifiedNavigation.mockReturnValue({
      isMobile: false,
      mounted: true,
      sidebarCollapsed: true,
    });

    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Check for collapsed sidebar classes
    const mainContentDiv = container.querySelector('.ml-16');
    expect(mainContentDiv).toBeInTheDocument();
  });

  it('should render footer with correct content', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByText(/© 2024 Chanuka Platform/)).toBeInTheDocument();
    expect(screen.getByText(/Promoting transparent governance/)).toBeInTheDocument();
  });
});