/// <reference types="vitest/globals" />
/// <reference types="@testing-library/vitest-dom" />
/**
 * RecommendationWidget Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecommendationWidget } from '../ui/RecommendationWidget';
import type { BillRecommendation } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockRecommendations: BillRecommendation[] = [
  {
    id: '1',
    type: 'bill',
    score: 0.85,
    reason: 'Based on your interest in healthcare',
    metadata: {
      billId: 123,
      billNumber: 'HB-2024-001',
      title: 'Healthcare Reform Act',
      status: 'In Committee',
    },
  },
  {
    id: '2',
    type: 'bill',
    score: 0.75,
    reason: 'Similar to bills you viewed',
    metadata: {
      billId: 124,
      billNumber: 'HB-2024-002',
      title: 'Education Funding Bill',
      status: 'Passed',
    },
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RecommendationWidget', () => {
  it('displays loading state', () => {
    renderWithProviders(
      <RecommendationWidget
        recommendations={[]}
        isLoading={true}
        isError={false}
        title="Test Recommendations"
      />
    );

    expect(screen.getByText('Test Recommendations')).toBeInTheDocument();
    // Loading spinner should be present
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays error state', () => {
    const error = new Error('Failed to load');
    renderWithProviders(
      <RecommendationWidget
        recommendations={[]}
        isLoading={false}
        isError={true}
        error={error}
        title="Test Recommendations"
      />
    );

    expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('displays recommendations when loaded', () => {
    renderWithProviders(
      <RecommendationWidget
        recommendations={mockRecommendations}
        isLoading={false}
        isError={false}
        title="Test Recommendations"
      />
    );

    expect(screen.getByText('Test Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Healthcare Reform Act')).toBeInTheDocument();
    expect(screen.getByText('Education Funding Bill')).toBeInTheDocument();
  });

  it('displays empty message when no recommendations', () => {
    renderWithProviders(
      <RecommendationWidget
        recommendations={[]}
        isLoading={false}
        isError={false}
        title="Test Recommendations"
        emptyMessage="No recommendations available"
      />
    );

    expect(screen.getByText('No recommendations available')).toBeInTheDocument();
  });

  it('renders with correct icon', () => {
    const { container } = renderWithProviders(
      <RecommendationWidget
        recommendations={mockRecommendations}
        isLoading={false}
        isError={false}
        title="Trending Bills"
        icon="trending"
      />
    );

    // Icon should be rendered (lucide-react icons have specific classes)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
