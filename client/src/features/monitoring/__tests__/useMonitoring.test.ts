/**
 * Monitoring Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDashboardData,
  useFeatureMetrics,
  useFeatureAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
} from '../hooks/useMonitoring';
import * as monitoringApi from '../api/monitoring-api';

// Mock the API
vi.mock('../api/monitoring-api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMonitoring hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDashboardData', () => {
    it('fetches dashboard data', async () => {
      const mockData = {
        features: [],
        systemHealth: {
          totalFeatures: 0,
          healthyFeatures: 0,
          degradedFeatures: 0,
          downFeatures: 0,
          totalAlerts: 0,
          criticalAlerts: 0,
        },
      };

      vi.mocked(monitoringApi.getDashboardData).mockResolvedValue(mockData);

      const { result } = renderHook(() => useDashboardData(0), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('handles errors', async () => {
      vi.mocked(monitoringApi.getDashboardData).mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(() => useDashboardData(0), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useFeatureMetrics', () => {
    it('fetches feature metrics', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          featureId: 'test-feature',
          timestamp: new Date(),
          activeUsers: 100,
          totalRequests: 1000,
          successfulRequests: 950,
          failedRequests: 50,
          avgResponseTime: '150',
          p95ResponseTime: '250',
          p99ResponseTime: '350',
          errorRate: '0.05',
          errorCount: 50,
        },
      ];

      vi.mocked(monitoringApi.getFeatureMetrics).mockResolvedValue(mockMetrics);

      const { result } = renderHook(
        () => useFeatureMetrics('test-feature', new Date(), new Date()),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMetrics);
    });
  });

  describe('useFeatureAlerts', () => {
    it('fetches feature alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          featureId: 'test-feature',
          severity: 'high' as const,
          type: 'error_rate',
          title: 'High Error Rate',
          message: 'Error rate exceeded threshold',
          triggered: true,
          acknowledged: false,
          resolved: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue(mockAlerts);

      const { result } = renderHook(() => useFeatureAlerts('test-feature'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAlerts);
    });
  });

  describe('useAcknowledgeAlert', () => {
    it('acknowledges an alert', async () => {
      vi.mocked(monitoringApi.acknowledgeAlert).mockResolvedValue();

      const { result } = renderHook(() => useAcknowledgeAlert(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('alert-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(monitoringApi.acknowledgeAlert).toHaveBeenCalledWith('alert-1');
    });
  });

  describe('useResolveAlert', () => {
    it('resolves an alert', async () => {
      vi.mocked(monitoringApi.resolveAlert).mockResolvedValue();

      const { result } = renderHook(() => useResolveAlert(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('alert-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(monitoringApi.resolveAlert).toHaveBeenCalledWith('alert-1');
    });
  });
});
