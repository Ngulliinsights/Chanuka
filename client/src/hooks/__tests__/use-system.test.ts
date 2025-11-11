import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSystemHealth,
  useSystemStats,
  useSystemActivity,
  useSystemSchema,
  useSystemEnvironment
} from '../use-system';

// Mock the API service
vi.mock('../services/api', () => ({
  systemApi: {
    getHealth: vi.fn(),
    getStats: vi.fn(),
    getActivity: vi.fn(),
    getSchema: vi.fn(),
    getEnvironment: vi.fn(),
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useSystem Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  });

  describe('useSystemHealth', () => {
    it('should fetch system health data', async () => {
      const mockHealthData = {
        status: 'healthy',
        uptime: 3600,
        version: '1.0.0',
        timestamp: Date.now()
      };

      const { systemApi } = await import('../services/api');
      (systemApi.getHealth as any).mockResolvedValue(mockHealthData);

      const { result } = renderHook(() => useSystemHealth(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHealthData);
      expect(systemApi.getHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle health check errors', async () => {
      const errorMessage = 'Service unavailable';
      const { systemApi } = await import('../services/api');
      (systemApi.getHealth as any).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSystemHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe(errorMessage);
    });

    it('should refetch every 30 seconds', async () => {
      vi.useFakeTimers();

      const { systemApi } = await import('../services/api');
      (systemApi.getHealth as any).mockResolvedValue({ status: 'healthy' });

      renderHook(() => useSystemHealth(), { wrapper });

      expect(systemApi.getHealth).toHaveBeenCalledTimes(1);

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(systemApi.getHealth).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('useSystemStats', () => {
    it('should fetch system statistics', async () => {
      const mockStatsData = {
        totalUsers: 1000,
        activeUsers: 150,
        totalBills: 500,
        processedBills: 450,
        systemLoad: 0.65,
        memoryUsage: 0.78
      };

      const { systemApi } = await import('../services/api');
      (systemApi.getStats as any).mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useSystemStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStatsData);
      expect(systemApi.getStats).toHaveBeenCalledTimes(1);
    });

    it('should refetch every minute', async () => {
      vi.useFakeTimers();

      const { systemApi } = await import('../services/api');
      (systemApi.getStats as any).mockResolvedValue({ totalUsers: 1000 });

      renderHook(() => useSystemStats(), { wrapper });

      expect(systemApi.getStats).toHaveBeenCalledTimes(1);

      // Advance time by 60 seconds
      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(systemApi.getStats).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('useSystemActivity', () => {
    it('should fetch system activity data', async () => {
      const mockActivityData = {
        recentLogins: 25,
        apiRequests: 1500,
        errorRate: 0.02,
        responseTime: 120,
        activeConnections: 45
      };

      const { systemApi } = await import('../services/api');
      (systemApi.getActivity as any).mockResolvedValue(mockActivityData);

      const { result } = renderHook(() => useSystemActivity(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActivityData);
      expect(systemApi.getActivity).toHaveBeenCalledTimes(1);
    });

    it('should refetch every 30 seconds', async () => {
      vi.useFakeTimers();

      const { systemApi } = await import('../services/api');
      (systemApi.getActivity as any).mockResolvedValue({ recentLogins: 25 });

      renderHook(() => useSystemActivity(), { wrapper });

      expect(systemApi.getActivity).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(systemApi.getActivity).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('useSystemSchema', () => {
    it('should fetch system schema information', async () => {
      const mockSchemaData = {
        version: '1.2.3',
        tables: ['users', 'bills', 'votes', 'comments'],
        migrations: ['001_initial', '002_add_indexes', '003_add_constraints'],
        lastMigration: '2024-01-15T10:30:00Z'
      };

      const { systemApi } = await import('../services/api');
      (systemApi.getSchema as any).mockResolvedValue(mockSchemaData);

      const { result } = renderHook(() => useSystemSchema(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSchemaData);
      expect(systemApi.getSchema).toHaveBeenCalledTimes(1);
    });

    it('should not refetch automatically', async () => {
      vi.useFakeTimers();

      const { systemApi } = await import('../services/api');
      (systemApi.getSchema as any).mockResolvedValue({ version: '1.2.3' });

      renderHook(() => useSystemSchema(), { wrapper });

      expect(systemApi.getSchema).toHaveBeenCalledTimes(1);

      // Advance time significantly
      vi.advanceTimersByTime(300000); // 5 minutes

      // Should not have refetched
      expect(systemApi.getSchema).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('useSystemEnvironment', () => {
    it('should fetch system environment information', async () => {
      const mockEnvData = {
        nodeVersion: '18.17.0',
        environment: 'production',
        databaseUrl: 'postgresql://localhost:5432/app',
        redisUrl: 'redis://localhost:6379',
        features: {
          analytics: true,
          notifications: true,
          caching: true
        }
      };

      const { systemApi } = await import('../services/api');
      (systemApi.getEnvironment as any).mockResolvedValue(mockEnvData);

      const { result } = renderHook(() => useSystemEnvironment(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEnvData);
      expect(systemApi.getEnvironment).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle network errors consistently across hooks', async () => {
      const errorMessage = 'Network Error';
      const { systemApi } = await import('../services/api');

      // Test each hook with network error
      const hooks = [
        { hook: useSystemHealth, apiMethod: 'getHealth' },
        { hook: useSystemStats, apiMethod: 'getStats' },
        { hook: useSystemActivity, apiMethod: 'getActivity' },
        { hook: useSystemSchema, apiMethod: 'getSchema' },
        { hook: useSystemEnvironment, apiMethod: 'getEnvironment' }
      ];

      for (const { hook, apiMethod } of hooks) {
        (systemApi[apiMethod] as any).mockRejectedValue(new Error(errorMessage));

        const { result } = renderHook(() => hook(), { wrapper });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error?.message).toBe(errorMessage);
      }
    });

    it('should handle API response errors', async () => {
      const errorResponse = { message: 'Internal Server Error', status: 500 };
      const { systemApi } = await import('../services/api');
      (systemApi.getHealth as any).mockRejectedValue(errorResponse);

      const { result } = renderHook(() => useSystemHealth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('loading states', () => {
    it('should show loading state initially', () => {
      const { result } = renderHook(() => useSystemHealth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should transition from loading to success', async () => {
      const { systemApi } = await import('../services/api');
      (systemApi.getHealth as any).mockResolvedValue({ status: 'healthy' });

      const { result } = renderHook(() => useSystemHealth(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});