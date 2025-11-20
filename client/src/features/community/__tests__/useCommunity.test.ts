import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useComments,
  useThreads,
  useThread,
  useSocialSharing,
  useCommunityStats,
  useThreadParticipation,
  useCommunitySearch,
  usePopularTags,
  useRealtimeCommunity
} from '../hooks/useCommunity';

// Mock the community API
vi.mock('../services/community-api', () => ({
  communityApi: {
    getComments: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    voteOnComment: vi.fn(),
    getThreads: vi.fn(),
    createThread: vi.fn(),
    updateThread: vi.fn(),
    deleteThread: vi.fn(),
    getThread: vi.fn(),
    shareContent: vi.fn(),
    trackShareClick: vi.fn(),
    getCommunityStats: vi.fn(),
    getTopContributors: vi.fn(),
    getRecentActivity: vi.fn(),
    getThreadParticipants: vi.fn(),
    joinThread: vi.fn(),
    leaveThread: vi.fn(),
    searchCommunity: vi.fn(),
    getPopularTags: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe('useCommunity Hooks', () => {
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

  describe('useComments', () => {
    it('should fetch comments for a bill', async () => {
      const mockComments = {
        comments: [
          { id: '1', content: 'Test comment', authorId: 'user1', bill_id: 'bill1' }
        ]
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getComments as any).mockResolvedValue(mockComments);

      const { result } = renderHook(() => useComments('bill1'), { wrapper });

      await waitFor(() => {
        expect(result.current.comments.isSuccess).toBe(true);
      });

      expect(result.current.comments.data).toEqual(mockComments);
      expect(communityApi.getComments).toHaveBeenCalledWith('bill1', undefined);
    });

    it('should create a comment successfully', async () => {
      const mockComment = {
        id: '1',
        content: 'New comment',
        authorId: 'user1',
        bill_id: 'bill1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.createComment as any).mockResolvedValue(mockComment);

      const { result } = renderHook(() => useComments('bill1'), { wrapper });

      await act(async () => {
        await result.current.createComment.mutateAsync({
          content: 'New comment',
          bill_id: 'bill1',
          user_id: 'user1'
        });
      });

      expect(communityApi.createComment).toHaveBeenCalledWith({
        content: 'New comment',
        bill_id: 'bill1',
        user_id: 'user1'
      });
    });

    it('should update a comment', async () => {
      const updatedComment = {
        id: '1',
        content: 'Updated comment',
        bill_id: 'bill1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.updateComment as any).mockResolvedValue(updatedComment);

      const { result } = renderHook(() => useComments('bill1'), { wrapper });

      await act(async () => {
        await result.current.updateComment.mutateAsync({
          comment_id: '1',
          request: { content: 'Updated comment' }
        });
      });

      expect(communityApi.updateComment).toHaveBeenCalledWith('1', {
        content: 'Updated comment'
      });
    });

    it('should delete a comment', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.deleteComment as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useComments('bill1'), { wrapper });

      await act(async () => {
        await result.current.deleteComment.mutateAsync('1');
      });

      expect(communityApi.deleteComment).toHaveBeenCalledWith('1');
    });

    it('should vote on a comment', async () => {
      const updatedComment = {
        id: '1',
        votes: 5,
        bill_id: 'bill1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.voteOnComment as any).mockResolvedValue(updatedComment);

      const { result } = renderHook(() => useComments('bill1'), { wrapper });

      await act(async () => {
        await result.current.voteOnComment.mutateAsync({
          comment_id: '1',
          user_id: 'user1',
          vote_type: 'up'
        });
      });

      expect(communityApi.voteOnComment).toHaveBeenCalledWith({
        comment_id: '1',
        user_id: 'user1',
        vote_type: 'up'
      });
    });
  });

  describe('useThreads', () => {
    it('should fetch discussion threads', async () => {
      const mockThreads = {
        threads: [
          { id: '1', title: 'Test Thread', authorId: 'user1' }
        ]
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getThreads as any).mockResolvedValue(mockThreads);

      const { result } = renderHook(() => useThreads(), { wrapper });

      await waitFor(() => {
        expect(result.current.threads.isSuccess).toBe(true);
      });

      expect(result.current.threads.data).toEqual(mockThreads);
      expect(communityApi.getThreads).toHaveBeenCalledWith(undefined);
    });

    it('should create a thread', async () => {
      const mockThread = {
        id: '1',
        title: 'New Thread',
        content: 'Thread content',
        authorId: 'user1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.createThread as any).mockResolvedValue(mockThread);

      const { result } = renderHook(() => useThreads(), { wrapper });

      await act(async () => {
        await result.current.createThread.mutateAsync({
          title: 'New Thread',
          content: 'Thread content',
          author_id: 'user1'
        });
      });

      expect(communityApi.createThread).toHaveBeenCalledWith({
        title: 'New Thread',
        content: 'Thread content',
        author_id: 'user1'
      });
    });

    it('should update a thread', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.updateThread as any).mockResolvedValue({ id: '1', title: 'Updated' });

      const { result } = renderHook(() => useThreads(), { wrapper });

      await act(async () => {
        await result.current.updateThread.mutateAsync({
          threadId: '1',
          updates: { title: 'Updated Title' }
        });
      });

      expect(communityApi.updateThread).toHaveBeenCalledWith('1', {
        title: 'Updated Title'
      });
    });

    it('should delete a thread', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.deleteThread as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useThreads(), { wrapper });

      await act(async () => {
        await result.current.deleteThread.mutateAsync('1');
      });

      expect(communityApi.deleteThread).toHaveBeenCalledWith('1');
    });
  });

  describe('useThread', () => {
    it('should fetch a single thread', async () => {
      const mockThread = {
        id: '1',
        title: 'Test Thread',
        content: 'Thread content',
        authorId: 'user1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getThread as any).mockResolvedValue(mockThread);

      const { result } = renderHook(() => useThread('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockThread);
      expect(communityApi.getThread).toHaveBeenCalledWith('1');
    });

    it('should not fetch when threadId is undefined', () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;

      renderHook(() => useThread(undefined), { wrapper });

      expect(communityApi.getThread).not.toHaveBeenCalled();
    });
  });

  describe('useSocialSharing', () => {
    it('should share content successfully', async () => {
      const mockShare = {
        id: '1',
        platform: 'twitter',
        content_id: 'content1',
        user_id: 'user1'
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.shareContent as any).mockResolvedValue(mockShare);

      const { result } = renderHook(() => useSocialSharing(), { wrapper });

      await act(async () => {
        await result.current.shareContent.mutateAsync({
          content_id: 'content1',
          platform: 'twitter',
          user_id: 'user1'
        });
      });

      expect(communityApi.shareContent).toHaveBeenCalledWith({
        content_id: 'content1',
        platform: 'twitter',
        user_id: 'user1'
      });
    });

    it('should track share clicks', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.trackShareClick as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSocialSharing(), { wrapper });

      await act(async () => {
        await result.current.trackClick.mutateAsync('share1');
      });

      expect(communityApi.trackShareClick).toHaveBeenCalledWith('share1');
    });
  });

  describe('useCommunityStats', () => {
    it('should fetch community statistics', async () => {
      const mockStats = {
        totalComments: 150,
        totalThreads: 25,
        activeUsers: 45,
        totalShares: 89
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getCommunityStats as any).mockResolvedValue(mockStats);

      const { result } = renderHook(() => useCommunityStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.stats.isSuccess).toBe(true);
      });

      expect(result.current.stats.data).toEqual(mockStats);
    });

    it('should fetch top contributors', async () => {
      const mockContributors = [
        { userId: 'user1', commentCount: 25, threadCount: 5 }
      ];

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getTopContributors as any).mockResolvedValue(mockContributors);

      const { result } = renderHook(() => useCommunityStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.topContributors.isSuccess).toBe(true);
      });

      expect(result.current.topContributors.data).toEqual(mockContributors);
    });

    it('should fetch recent activity', async () => {
      const mockActivity = [
        { type: 'comment', userId: 'user1', timestamp: '2024-01-01T00:00:00Z' }
      ];

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getRecentActivity as any).mockResolvedValue(mockActivity);

      const { result } = renderHook(() => useCommunityStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.recentActivity.isSuccess).toBe(true);
      });

      expect(result.current.recentActivity.data).toEqual(mockActivity);
    });
  });

  describe('useThreadParticipation', () => {
    it('should fetch thread participants', async () => {
      const mockParticipants = [
        { userId: 'user1', joinedAt: '2024-01-01T00:00:00Z' }
      ];

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getThreadParticipants as any).mockResolvedValue(mockParticipants);

      const { result } = renderHook(() => useThreadParticipation('thread1'), { wrapper });

      await waitFor(() => {
        expect(result.current.participants.isSuccess).toBe(true);
      });

      expect(result.current.participants.data).toEqual(mockParticipants);
    });

    it('should join a thread', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.joinThread as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useThreadParticipation('thread1'), { wrapper });

      await act(async () => {
        await result.current.joinThread.mutateAsync();
      });

      expect(communityApi.joinThread).toHaveBeenCalledWith('thread1');
    });

    it('should leave a thread', async () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.leaveThread as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useThreadParticipation('thread1'), { wrapper });

      await act(async () => {
        await result.current.leaveThread.mutateAsync();
      });

      expect(communityApi.leaveThread).toHaveBeenCalledWith('thread1');
    });
  });

  describe('useCommunitySearch', () => {
    it('should search community content when query is long enough', async () => {
      const mockResults = {
        threads: [],
        comments: [],
        total: 0
      };

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.searchCommunity as any).mockResolvedValue(mockResults);

      const { result } = renderHook(() => useCommunitySearch('test query'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResults);
      expect(communityApi.searchCommunity).toHaveBeenCalledWith('test query', undefined);
    });

    it('should not search when query is too short', () => {
      const communityApi = (await import('@client/services/community-api')).communityApi;

      renderHook(() => useCommunitySearch('ab'), { wrapper });

      expect(communityApi.searchCommunity).not.toHaveBeenCalled();
    });
  });

  describe('usePopularTags', () => {
    it('should fetch popular tags', async () => {
      const mockTags = [
        { tag: 'legislation', count: 150 },
        { tag: 'policy', count: 89 }
      ];

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getPopularTags as any).mockResolvedValue(mockTags);

      const { result } = renderHook(() => usePopularTags(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTags);
      expect(communityApi.getPopularTags).toHaveBeenCalledWith(20);
    });

    it('should accept custom limit', async () => {
      const mockTags = [{ tag: 'test', count: 10 }];

      const communityApi = (await import('@client/services/community-api')).communityApi;
      (communityApi.getPopularTags as any).mockResolvedValue(mockTags);

      const { result } = renderHook(() => usePopularTags(10), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(communityApi.getPopularTags).toHaveBeenCalledWith(10);
    });
  });

  describe('useRealtimeCommunity', () => {
    it('should return realtime connection interface', () => {
      const { result } = renderHook(() => useRealtimeCommunity(), { wrapper });

      expect(result.current).toEqual({
        isConnected: false,
        connectionStatus: 'disconnected',
        subscribeToThread: expect.any(Function),
        subscribeToComments: expect.any(Function),
        unsubscribe: expect.any(Function),
      });
    });

    it('should handle thread subscription', () => {
      const { result } = renderHook(() => useRealtimeCommunity(), { wrapper });

      // Should not throw
      expect(() => {
        result.current.subscribeToThread('thread1');
      }).not.toThrow();
    });

    it('should handle comments subscription', () => {
      const { result } = renderHook(() => useRealtimeCommunity(), { wrapper });

      // Should not throw
      expect(() => {
        result.current.subscribeToComments('bill1');
      }).not.toThrow();
    });

    it('should handle unsubscribe', () => {
      const { result } = renderHook(() => useRealtimeCommunity(), { wrapper });

      // Should not throw
      expect(() => {
        result.current.unsubscribe();
      }).not.toThrow();
    });
  });
});

// Helper function for act
async function act(callback: () => Promise<void>) {
  await callback();
}