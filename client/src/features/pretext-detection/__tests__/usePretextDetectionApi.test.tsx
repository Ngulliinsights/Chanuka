/**
 * Pretext Detection API Hooks Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnalyzeBill, usePretextAlerts, useReviewAlert, usePretextAnalytics } from '../hooks/usePretextDetectionApi';
import { pretextDetectionApi } from '../api/pretext-detection-api';

// Mock the API
vi.mock('../api/pretext-detection-api');

// Mock notification service
vi.mock('@client/features/notifications/model/notification-service', () => ({
  notificationService: {
    addNotification: vi.fn(),
  },
}));

// Mock logger
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePretextDetectionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAnalyzeBill', () => {
    it('successfully analyzes a bill', async () => {
      const mockResponse = {
        billId: 'HB-123',
        detections: [],
        score: 45,
        confidence: 0.8,
        analyzedAt: new Date().toISOString(),
      };

      vi.mocked(pretextDetectionApi.analyze).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnalyzeBill(), { wrapper: createWrapper() });

      result.current.mutate({ billId: 'HB-123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('handles analysis errors', async () => {
      vi.mocked(pretextDetectionApi.analyze).mockRejectedValue(new Error('Analysis failed'));

      const { result } = renderHook(() => useAnalyzeBill(), { wrapper: createWrapper() });

      result.current.mutate({ billId: 'HB-123' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('usePretextAlerts', () => {
    it('fetches alerts successfully', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          billId: 'HB-123',
          score: 85,
          status: 'pending' as const,
          detections: [],
          createdAt: new Date().toISOString(),
        },
      ];

      vi.mocked(pretextDetectionApi.getAlerts).mockResolvedValue(mockAlerts);

      const { result } = renderHook(() => usePretextAlerts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAlerts);
    });

    it('handles fetch errors', async () => {
      vi.mocked(pretextDetectionApi.getAlerts).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => usePretextAlerts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useReviewAlert', () => {
    it('successfully reviews an alert', async () => {
      vi.mocked(pretextDetectionApi.reviewAlert).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useReviewAlert(), { wrapper: createWrapper() });

      result.current.mutate({
        alertId: 'alert-1',
        status: 'approved',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('handles review errors', async () => {
      vi.mocked(pretextDetectionApi.reviewAlert).mockRejectedValue(new Error('Review failed'));

      const { result } = renderHook(() => useReviewAlert(), { wrapper: createWrapper() });

      result.current.mutate({
        alertId: 'alert-1',
        status: 'approved',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('usePretextAnalytics', () => {
    it('fetches analytics successfully', async () => {
      const mockAnalytics = {
        totalAnalyses: 100,
        totalAlerts: 25,
        averageScore: 65,
        detectionsByType: { timing: 10 },
        alertsByStatus: { pending: 15 },
      };

      vi.mocked(pretextDetectionApi.getAnalytics).mockResolvedValue(mockAnalytics);

      const { result } = renderHook(() => usePretextAnalytics(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAnalytics);
    });

    it('handles analytics fetch errors', async () => {
      vi.mocked(pretextDetectionApi.getAnalytics).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => usePretextAnalytics(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
