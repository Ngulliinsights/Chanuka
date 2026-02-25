/**
 * useRecommendations Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePersonalizedRecommendations, useSimilarBills, useTrendingBills } from '../hooks/useRecommendations';
import { recommendationApi } from '../api/recommendation-api';

// Mock the API
vitest.mock('../api/recommendation-api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return Wrapper;
};

describe('useRecommendations hooks', () => {
  beforeEach(() => {
    vitest.clearAllMocks();
  });

  describe('usePersonalizedRecommendations', () => {
    it('fetches personalized recommendations', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.85,
            reason: 'Test reason',
            metadata: { billId: 123, billNumber: 'HB-001', title: 'Test Bill', status: 'Active' },
          },
        ],
        count: 1,
        responseTime: 100,
      };

      (recommendationApi.getPersonalized as vitest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => usePersonalizedRecommendations(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(recommendationApi.getPersonalized).toHaveBeenCalledWith(10);
    });

    it('handles errors', async () => {
      (recommendationApi.getPersonalized as vitest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(() => usePersonalizedRecommendations(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useSimilarBills', () => {
    it('fetches similar bills when billId is provided', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.75,
            reason: 'Similar content',
            metadata: { billId: 124, billNumber: 'HB-002', title: 'Similar Bill', status: 'Active' },
          },
        ],
        count: 1,
        responseTime: 100,
      };

      (recommendationApi.getSimilarBills as vitest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useSimilarBills(123, 5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(recommendationApi.getSimilarBills).toHaveBeenCalledWith(123, 5);
    });

    it('does not fetch when billId is undefined', () => {
      const { result } = renderHook(() => useSimilarBills(undefined, 5), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(recommendationApi.getSimilarBills).not.toHaveBeenCalled();
    });
  });

  describe('useTrendingBills', () => {
    it('fetches trending bills', async () => {
      const mockData = {
        success: true,
        data: [
          {
            id: '1',
            type: 'bill',
            score: 0.9,
            reason: 'Trending now',
            metadata: { billId: 125, billNumber: 'HB-003', title: 'Trending Bill', status: 'Active' },
          },
        ],
        count: 1,
        responseTime: 100,
      };

      (recommendationApi.getTrending as vitest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(() => useTrendingBills(7, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(recommendationApi.getTrending).toHaveBeenCalledWith(7, 10);
    });
  });
});
