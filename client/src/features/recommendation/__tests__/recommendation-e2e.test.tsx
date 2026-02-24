/**
 * Recommendation Engine E2E Tests
 * 
 * End-to-end tests for the recommendation engine feature
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonalizedRecommendationsWidget } from '../ui/PersonalizedRecommendationsWidget';
import { TrendingBillsWidget } from '../ui/TrendingBillsWidget';
import { SimilarBillsWidget } from '../ui/SimilarBillsWidget';
import { recommendationApi } from '../api/recommendation-api';

// Mock the API
vitest.mock('../api/recommendation-api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Recommendation Engine E2E', () => {
  beforeEach(() => {
    vitest.clearAllMocks();
    queryClient.clear();
  });

  describe('PersonalizedRecommendationsWidget', () => {
    it('displays personalized recommendations successfully', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.85,
            reason: 'Based on your interests',
            metadata: {
              billId: 123,
              billNumber: 'HB-2024-001',
              title: 'Healthcare Reform Act',
              status: 'In Committee',
            },
          },
        ],
        count: 1,
        responseTime: 150,
      };

      (recommendationApi.getPersonalized as vitest.Mock).mockResolvedValue(mockData);

      renderWithProviders(<PersonalizedRecommendationsWidget limit={5} />);

      // Should show loading state initially
      expect(screen.getByText('Recommended for You')).toBeInTheDocument();

      // Wait for recommendations to load
      await waitFor(() => {
        expect(screen.getByText('Healthcare Reform Act')).toBeInTheDocument();
      });

      expect(screen.getByText('Based on your interests')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('displays error state when API fails', async () => {
      (recommendationApi.getPersonalized as vitest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<PersonalizedRecommendationsWidget limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
      });
    });

    it('displays empty state when no recommendations', async () => {
      const mockData = {
        success: true,
        data: [],
        count: 0,
        responseTime: 100,
      };

      (recommendationApi.getPersonalized as vitest.Mock).mockResolvedValue(mockData);

      renderWithProviders(<PersonalizedRecommendationsWidget limit={5} />);

      await waitFor(() => {
        expect(screen.getByText(/No personalized recommendations yet/)).toBeInTheDocument();
      });
    });
  });

  describe('TrendingBillsWidget', () => {
    it('displays trending bills successfully', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.9,
            reason: 'Trending this week',
            metadata: {
              billId: 124,
              billNumber: 'HB-2024-002',
              title: 'Education Funding Bill',
              status: 'Passed',
            },
          },
        ],
        count: 1,
        responseTime: 120,
      };

      (recommendationApi.getTrending as vitest.Mock).mockResolvedValue(mockData);

      renderWithProviders(<TrendingBillsWidget days={7} limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('Education Funding Bill')).toBeInTheDocument();
      });

      expect(screen.getByText('Trending this week')).toBeInTheDocument();
    });
  });

  describe('SimilarBillsWidget', () => {
    it('displays similar bills successfully', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.75,
            reason: 'Similar content and topics',
            metadata: {
              billId: 125,
              billNumber: 'HB-2024-003',
              title: 'Related Healthcare Bill',
              status: 'In Committee',
            },
          },
        ],
        count: 1,
        responseTime: 130,
      };

      (recommendationApi.getSimilarBills as vitest.Mock).mockResolvedValue(mockData);

      renderWithProviders(<SimilarBillsWidget billId={123} limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('Related Healthcare Bill')).toBeInTheDocument();
      });

      expect(screen.getByText('Similar content and topics')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('loads recommendations within 500ms requirement', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.85,
            reason: 'Test',
            metadata: {
              billId: 123,
              billNumber: 'HB-001',
              title: 'Test Bill',
              status: 'Active',
            },
          },
        ],
        count: 1,
        responseTime: 150, // Within 500ms requirement
      };

      (recommendationApi.getPersonalized as vitest.Mock).mockResolvedValue(mockData);

      const startTime = performance.now();
      renderWithProviders(<PersonalizedRecommendationsWidget limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('Test Bill')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(500);
    });
  });
});
