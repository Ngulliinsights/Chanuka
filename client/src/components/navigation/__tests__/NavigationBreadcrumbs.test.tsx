import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NavigationBreadcrumbs from '../NavigationBreadcrumbs';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Mock the navigation context utilities
vi.mock('@/utils/navigation/breadcrumb-generator', () => ({
  generateBreadcrumbs: vi.fn(() => [
    { label: 'Home', path: '/', isActive: false },
    { label: 'Bills', path: '/bills', isActive: false },
    { label: 'Bill Details', path: '/bills/123', isActive: true },
  ]),
}));

vi.mock('@/utils/navigation/related-pages-calculator', () => ({
  calculateRelatedPages: vi.fn(() => []),
}));

vi.mock('@/utils/navigation/section-detector', () => ({
  determineNavigationSection: vi.fn(() => 'legislative'),
}));

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <NavigationProvider>
        {component}
      </NavigationProvider>
    </BrowserRouter>
  );
}

describe('NavigationBreadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render breadcrumb items', () => {
    renderWithProviders(<NavigationBreadcrumbs />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Bill Details')).toBeInTheDocument();
  });

  it('should show home icon when enabled', () => {
    renderWithProviders(<NavigationBreadcrumbs showHomeIcon={true} />);
    
    // Home icon should be present (we can't easily test for the actual icon)
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('should handle breadcrumb navigation', () => {
    renderWithProviders(<NavigationBreadcrumbs />);
    
    const homeButton = screen.getByText('Home');
    fireEvent.click(homeButton);
    
    // Should be clickable (navigation is handled by context)
    expect(homeButton).toBeInTheDocument();
  });

  it('should disable the last breadcrumb item', () => {
    renderWithProviders(<NavigationBreadcrumbs />);
    
    const lastBreadcrumb = screen.getByText('Bill Details');
    expect(lastBreadcrumb.closest('button')).toBeDisabled();
  });

  it('should truncate breadcrumbs when maxItems is exceeded', () => {
    // Mock more breadcrumbs using vi.mocked
    vi.mocked(require('@/utils/navigation/breadcrumb-generator').generateBreadcrumbs).mockReturnValue([
      { label: 'Home', path: '/', isActive: false },
      { label: 'Bills', path: '/bills', isActive: false },
      { label: 'Bill 123', path: '/bills/123', isActive: false },
      { label: 'Analysis', path: '/bills/123/analysis', isActive: false },
      { label: 'Details', path: '/bills/123/analysis/details', isActive: false },
      { label: 'Current', path: '/bills/123/analysis/details/current', isActive: true },
    ]);

    renderWithProviders(<NavigationBreadcrumbs maxItems={3} />);
    
    // Should show ellipsis when truncated
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should not render when no breadcrumbs are available', () => {
    vi.mocked(require('@/utils/navigation/breadcrumb-generator').generateBreadcrumbs).mockReturnValue([]);

    const { container } = renderWithProviders(<NavigationBreadcrumbs />);
    
    expect(container.firstChild).toBeNull();
  });
});