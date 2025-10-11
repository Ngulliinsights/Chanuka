import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RelatedPages from '../RelatedPages';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { logger } from '../utils/logger.js';

// Mock the navigation context utilities
vi.mock('@/utils/navigation/breadcrumb-generator', () => ({
  generateBreadcrumbs: vi.fn(() => []),
}));

vi.mock('@/utils/navigation/related-pages-calculator', () => ({
  calculateRelatedPages: vi.fn(() => [
    {
      title: 'Bill Analysis',
      path: '/bills/123/analysis',
      description: 'Detailed analysis of the bill',
      relevanceScore: 0.9,
      category: 'legislative' as const,
    },
    {
      title: 'Community Input',
      path: '/community',
      description: 'Community feedback and discussions',
      relevanceScore: 0.7,
      category: 'community' as const,
    },
    {
      title: 'Expert Verification',
      path: '/expert-verification',
      description: 'Expert analysis and verification',
      relevanceScore: 0.6,
      category: 'community' as const,
    },
  ]),
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

describe('RelatedPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render related pages in card format', () => {
    renderWithProviders(<RelatedPages />);
    
    expect(screen.getByText('Related Pages')).toBeInTheDocument();
    expect(screen.getByText('Bill Analysis')).toBeInTheDocument();
    expect(screen.getByText('Community Input')).toBeInTheDocument();
    expect(screen.getByText('Expert Verification')).toBeInTheDocument();
  });

  it('should render related pages in compact format', () => {
    renderWithProviders(<RelatedPages compact={true} />);
    
    expect(screen.getByText('Related Pages')).toBeInTheDocument();
    expect(screen.getByText('Bill Analysis')).toBeInTheDocument();
    expect(screen.getByText('Detailed analysis of the bill')).toBeInTheDocument();
  });

  it('should show category badges', () => {
    renderWithProviders(<RelatedPages />);
    
    expect(screen.getByText('Legislative')).toBeInTheDocument();
    expect(screen.getAllByText('Community')).toHaveLength(2); // Two community items
  });

  it('should show relevance scores when enabled', () => {
    renderWithProviders(<RelatedPages showRelevanceScore={true} />);
    
    expect(screen.getByText('90%')).toBeInTheDocument(); // 0.9 * 100
    expect(screen.getByText('70%')).toBeInTheDocument(); // 0.7 * 100
    expect(screen.getByText('60%')).toBeInTheDocument(); // 0.6 * 100
  });

  it('should limit items based on maxItems prop', () => {
    renderWithProviders(<RelatedPages maxItems={2} />);
    
    expect(screen.getByText('Bill Analysis')).toBeInTheDocument();
    expect(screen.getByText('Community Input')).toBeInTheDocument();
    expect(screen.queryByText('Expert Verification')).not.toBeInTheDocument();
  });

  it('should handle navigation when items are clicked', () => {
    renderWithProviders(<RelatedPages />);
    
    const billAnalysisItem = screen.getByText('Bill Analysis');
    fireEvent.click(billAnalysisItem);
    
    // Should be clickable (navigation is handled by context)
    expect(billAnalysisItem).toBeInTheDocument();
  });

  it('should show overflow message when there are more items', () => {
    renderWithProviders(<RelatedPages maxItems={2} />);
    
    expect(screen.getByText('1 more related pages available')).toBeInTheDocument();
  });

  it('should not render when no related pages are available', () => {
    vi.mocked(require('@/utils/navigation/related-pages-calculator').calculateRelatedPages).mockReturnValue([]);

    const { container } = renderWithProviders(<RelatedPages />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should use custom title when provided', () => {
    renderWithProviders(<RelatedPages title="Suggested Pages" />);
    
    expect(screen.getByText('Suggested Pages')).toBeInTheDocument();
    expect(screen.queryByText('Related Pages')).not.toBeInTheDocument();
  });
});