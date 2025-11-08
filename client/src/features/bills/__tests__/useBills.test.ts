import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useBills,
  useBill,
  useBillComments,
  useBillSponsors,
  useBillAnalysis,
  useBillCategories,
  useBillStatuses,
  useAddBillComment,
  useRecordBillEngagement,
  useTrackBill
} from '../hooks/useBills';

// Mock the bill API
vi.mock('../services/bill-api', () => ({
  billApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getComments: vi.fn(),
    addComment: vi.fn(),
    recordEngagement: vi.fn(),
    getSponsors: vi.fn(),
    getAnalysis: vi.fn(),
    getCategories: vi.fn(),
    getStatuses: vi.fn(),
    trackBill: vi.fn(),
    untrackBill: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe('useBills Hooks', () => {
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

  describe('useBills', () => {
    it('should fetch bills with default parameters', async () => {
      const mockBillsResponse = {
        bills: [{ id: '1', title: 'Test Bill' }],
        total: 1,
        hasMore: false
      };

      const { billApi } = await import('../services/bill-api');
      (billApi.getAll as any).mockResolvedValue(mockBillsResponse);

      const { result } = renderHook(() => useBills(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBillsResponse);
      expect(billApi.getAll).toHaveBeenCalledWith({});
    });

    it('should fetch bills with custom parameters', async () => {
      const params = { search: 'test', category: 'health', limit: 10 };
      const mockBillsResponse = {
        bills: [{ id: '1', title: 'Test Bill' }],
        total: 1,
        hasMore: false
      };

      const { billApi } = await import('../services/bill-api');
      (billApi.getAll as any).mockResolvedValue(mockBillsResponse);

      const { result } = renderHook(() => useBills(params), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(billApi.getAll).toHaveBeenCalledWith(params);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Failed to fetch bills';
      const { billApi } = await import('../services/bill-api');
      (billApi.getAll as any).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useBills(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe(errorMessage);
    });
  });

  describe('useBill', () => {
    it('should fetch a single bill by ID', async () => {
      const mockBill = { id: '1', title: 'Test Bill', summary: 'Test summary' };
      const billApi = (await import('../services/bill-api')).billApi;
      (billApi.getById as any).mockResolvedValue(mockBill);

      const { result } = renderHook(() => useBill('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBill);
      expect(billApi.getById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when ID is undefined', () => {
      const billApi = (await import('../services/bill-api')).billApi;

      renderHook(() => useBill(undefined), { wrapper });

      expect(billApi.getById).not.toHaveBeenCalled();
    });

    it('should handle numeric IDs', async () => {
      const mockBill = { id: 123, title: 'Test Bill' };
      const { billApi } = await import('../services/bill-api');
      (billApi.getById as any).mockResolvedValue(mockBill);

      const { result } = renderHook(() => useBill(123), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(billApi.getById).toHaveBeenCalledWith(123);
    });
  });

  describe('useBillComments', () => {
    it('should fetch comments for a bill', async () => {
      const mockComments = [
        { id: '1', content: 'Test comment', authorId: 'user1' }
      ];
      const { billApi } = await import('../services/bill-api');
      (billApi.getComments as any).mockResolvedValue(mockComments);

      const { result } = renderHook(() => useBillComments('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockComments);
      expect(billApi.getComments).toHaveBeenCalledWith('1');
    });

    it('should not fetch when bill_id is undefined', () => {
      const { billApi } = await import('../services/bill-api');

      renderHook(() => useBillComments(undefined), { wrapper });

      expect(billApi.getComments).not.toHaveBeenCalled();
    });
  });

  describe('useBillSponsors', () => {
    it('should fetch sponsors for a bill', async () => {
      const mockSponsors = [
        { id: '1', name: 'John Doe', party: 'Democrat' }
      ];
      const { billApi } = await import('../services/bill-api');
      (billApi.getSponsors as any).mockResolvedValue(mockSponsors);

      const { result } = renderHook(() => useBillSponsors('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSponsors);
      expect(billApi.getSponsors).toHaveBeenCalledWith('1');
    });
  });

  describe('useBillAnalysis', () => {
    it('should fetch analysis for a bill', async () => {
      const mockAnalysis = {
        summary: 'Test analysis',
        keyPoints: ['Point 1', 'Point 2'],
        generatedAt: '2024-01-01T00:00:00Z'
      };
      const { billApi } = await import('../services/bill-api');
      (billApi.getAnalysis as any).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useBillAnalysis('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAnalysis);
      expect(billApi.getAnalysis).toHaveBeenCalledWith('1');
    });
  });

  describe('useBillCategories', () => {
    it('should fetch bill categories', async () => {
      const mockCategories = {
        categories: ['health', 'education', 'environment']
      };
      const { billApi } = await import('../services/bill-api');
      (billApi.getCategories as any).mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useBillCategories(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(billApi.getCategories).toHaveBeenCalledTimes(1);
    });
  });

  describe('useBillStatuses', () => {
    it('should fetch bill statuses', async () => {
      const mockStatuses = {
        statuses: ['introduced', 'committee', 'passed', 'failed']
      };
      const { billApi } = await import('../services/bill-api');
      (billApi.getStatuses as any).mockResolvedValue(mockStatuses);

      const { result } = renderHook(() => useBillStatuses(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStatuses);
      expect(billApi.getStatuses).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAddBillComment', () => {
    it('should add a comment successfully', async () => {
      const mockComment = { id: '1', content: 'Test comment', authorId: 'user1' };
      const { billApi } = await import('../services/bill-api');
      (billApi.addComment as any).mockResolvedValue(mockComment);

      const { result } = renderHook(() => useAddBillComment('1'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          content: 'Test comment',
          user_id: 'user1'
        });
      });

      expect(billApi.addComment).toHaveBeenCalledWith('1', {
        content: 'Test comment',
        user_id: 'user1'
      });
    });

    it('should invalidate queries on success', async () => {
      const mockComment = { id: '1', content: 'Test comment', authorId: 'user1' };
      const { billApi } = await import('../services/bill-api');
      (billApi.addComment as any).mockResolvedValue(mockComment);

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddBillComment('1'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          content: 'Test comment',
          user_id: 'user1'
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['bills', '1', 'comments']
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['bills', '1']
      });
    });
  });

  describe('useRecordBillEngagement', () => {
    it('should record engagement without retry', async () => {
      const { billApi } = await import('../services/bill-api');
      (billApi.recordEngagement as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRecordBillEngagement('1'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          user_id: 'user1',
          engagement_type: 'view'
        });
      });

      expect(billApi.recordEngagement).toHaveBeenCalledWith('1', {
        user_id: 'user1',
        engagement_type: 'view'
      });
    });

    it('should not retry on failure', async () => {
      const { billApi } = await import('../services/bill-api');
      (billApi.recordEngagement as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRecordBillEngagement('1'), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            user_id: 'user1',
            engagement_type: 'view'
          });
        } catch (error) {
          // Expected to fail
        }
      });

      expect(billApi.recordEngagement).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('useTrackBill', () => {
    it('should track a bill', async () => {
      const { billApi } = await import('../services/bill-api');
      (billApi.trackBill as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTrackBill('1'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(true);
      });

      expect(billApi.trackBill).toHaveBeenCalledWith('1');
    });

    it('should untrack a bill', async () => {
      const { billApi } = await import('../services/bill-api');
      (billApi.untrackBill as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTrackBill('1'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(false);
      });

      expect(billApi.untrackBill).toHaveBeenCalledWith('1');
    });
  });
});

// Helper function for act
async function act(callback: () => Promise<void>) {
  await callback();
}