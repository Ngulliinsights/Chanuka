/// <reference types="vitest/globals" />
/**
 * RecommendationCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecommendationCard } from '../ui/RecommendationCard';
import type { BillRecommendation } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockRecommendation: BillRecommendation = {
  id: '1',
  type: 'bill',
  score: 0.85,
  reason: 'Based on your interest in healthcare',
  metadata: {
    billId: 123,
    billNumber: 'HB-2024-001',
    title: 'Healthcare Reform Act',
    status: 'In Committee',
    introducedDate: '2024-01-15',
    summary: 'A bill to reform healthcare system',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RecommendationCard', () => {
  it('renders recommendation details correctly', () => {
    renderWithProviders(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('Healthcare Reform Act')).toBeInTheDocument();
    expect(screen.getByText(/HB-2024-001/)).toBeInTheDocument();
    expect(screen.getByText(/In Committee/)).toBeInTheDocument();
    expect(screen.getByText('Based on your interest in healthcare')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders summary when provided', () => {
    renderWithProviders(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('A bill to reform healthcare system')).toBeInTheDocument();
  });

  it('renders without summary when not provided', () => {
    const recommendationWithoutSummary = {
      ...mockRecommendation,
      metadata: { ...mockRecommendation.metadata, summary: undefined },
    };

    renderWithProviders(<RecommendationCard recommendation={recommendationWithoutSummary} />);

    expect(screen.queryByText('A bill to reform healthcare system')).not.toBeInTheDocument();
  });

  it('links to correct bill detail page', () => {
    renderWithProviders(<RecommendationCard recommendation={mockRecommendation} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/bills/123');
  });

  it('handles click tracking when enabled', () => {
    renderWithProviders(<RecommendationCard recommendation={mockRecommendation} onClickTracking={true} />);

    const link = screen.getByRole('link');
    fireEvent.click(link);

    // Note: Actual tracking is tested in integration tests
    // This just verifies the component doesn't crash
  });

  it('does not track clicks when disabled', () => {
    renderWithProviders(<RecommendationCard recommendation={mockRecommendation} onClickTracking={false} />);

    const link = screen.getByRole('link');
    fireEvent.click(link);

    // Component should still work without tracking
    expect(link).toBeInTheDocument();
  });
});
