import { api } from '@/services/api';
import type {
  Comment,
  DiscussionThread,
  SocialShare,
  CommunityStats,
  CreateCommentRequest,
  CreateThreadRequest,
  UpdateCommentRequest,
  VoteRequest,
  ShareRequest,
  CommunityFilters,
  CommentsResponse,
  ThreadsResponse
} from '../types';

/**
 * Community API service - handles all community-related API calls
 * Centralizes API endpoints and response handling for the community feature
 */
export const communityApi = { // Comments endpoints
  async getComments(bill_id?: string, filters?: CommunityFilters): Promise<CommentsResponse> {
    try {
      // Server exposes comments by bill id as a path parameter
      if (bill_id) {
        return api.get(`/api/community/comments/${bill_id}`);
      }

      // No bill specified — fall back to recent engagement endpoint
      const recent = await api.get(`/api/community/engagement/recent?limit=${filters?.limit || 20}`);
      return {
        data: recent,
        pagination: { currentPage: 1, totalPages: 1, totalItems: recent.length, hasMore: false }
      } as CommentsResponse;
    } catch (err) {
      console.warn('getComments failed, returning empty list', err);
      return { data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasMore: false } } as CommentsResponse;
    }
  },

  async getComment(comment_id: string): Promise<Comment> {
    try {
      return await api.get(`/api/community/comments/${comment_id}`);
    } catch (err) {
      console.warn('getComment failed', comment_id, err);
      return null as any;
    }
  },

  async createComment(request: CreateCommentRequest): Promise<Comment> { const formData = new FormData();
    formData.append('content', request.content);

    if (request.bill_id) formData.append('bill_id', request.bill_id);
    if (request.parent_id) formData.append('parent_id', request.parent_id);

    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index }]`, file);
      });
    }

    return api.post('/api/community/comments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async updateComment(comment_id: string, request: UpdateCommentRequest): Promise<Comment> {
    const formData = new FormData();
    formData.append('content', request.content);

    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    return api.put(`/api/community/comments/${comment_id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteComment(comment_id: string): Promise<void> {
    return api.delete(`/api/community/comments/${comment_id}`);
  },

  async voteOnComment(request: VoteRequest): Promise<Comment> {
    return api.post(`/api/community/comments/${request.comment_id}/vote`, {
      vote: request.vote
    });
  },

  // Discussion threads endpoints
  async getThreads(filters?: CommunityFilters): Promise<ThreadsResponse> { const params = new URLSearchParams();
    // Threads are not implemented on the server; return empty response to avoid 404s
    console.warn('getThreads: server does not implement threads endpoint; returning empty result');
    return { data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasMore: false } } as ThreadsResponse;
  },

  async getThread(threadId: string): Promise<DiscussionThread> {
    return api.get(`/api/community/threads/${threadId}`);
  },

  async createThread(request: CreateThreadRequest): Promise<DiscussionThread> {
    console.warn('createThread: threads not implemented on server; no-op');
    return null as any;
  },

  async updateThread(threadId: string, updates: Partial<CreateThreadRequest>): Promise<DiscussionThread> {
    console.warn('updateThread: threads not implemented on server; no-op');
    return null as any;
  },

  async deleteThread(threadId: string): Promise<void> {
    console.warn('deleteThread: threads not implemented on server; no-op');
    return;
  },

  async lockThread(threadId: string, locked: boolean): Promise<DiscussionThread> {
    console.warn('lockThread: threads not implemented on server; no-op');
    return null as any;
  },

  async stickyThread(threadId: string, sticky: boolean): Promise<DiscussionThread> {
    console.warn('stickyThread: threads not implemented on server; no-op');
    return null as any;
  },

  // Social sharing endpoints
  async shareContent(request: ShareRequest): Promise<SocialShare> {
    console.warn('shareContent: social sharing endpoint not implemented on server; returning fallback');
    return null as any;
  },

  async getShares(bill_id?: string, threadId?: string): Promise<SocialShare[]> { const params = new URLSearchParams();
    console.warn('getShares: shares not implemented on server; returning empty list');
    return [];
  },

  async trackShareClick(shareId: string): Promise<void> {
    console.warn('trackShareClick: shares not implemented on server; no-op');
    return;
  },

  // Community stats and analytics
  async getCommunityStats(): Promise<CommunityStats> {
    // Server exposes participation stats at /participation/stats
    return api.get('/api/community/participation/stats');
  },

  async getTopContributors(limit = 10): Promise<any[]> {
    // Derive top contributors from participation stats (server returns topContributors for bill-specific stats)
    const stats = await api.get('/api/community/participation/stats');
    if (stats && stats.topContributors) {
      return stats.topContributors.slice(0, limit);
    }
    return [];
  },

  async getRecentActivity(limit = 20): Promise<any[]> {
    // Server exposes recent engagement at /engagement/recent
    return api.get(`/api/community/engagement/recent?limit=${limit}`);
  },

  // User participation
  async joinThread(threadId: string): Promise<void> {
    return api.post(`/api/community/threads/${threadId}/join`);
  },

  async leaveThread(threadId: string): Promise<void> {
    return api.post(`/api/community/threads/${threadId}/leave`);
  },

  async getThreadParticipants(threadId: string): Promise<any[]> {
    return api.get(`/api/community/threads/${threadId}/participants`);
  },

  // Moderation endpoints (admin only)
  async moderateComment(comment_id: string, action: 'approve' | 'reject' | 'delete', reason?: string): Promise<void> {
    return api.post(`/api/community/comments/${comment_id}/moderate`, {
      action,
      reason
    });
  },

  async moderateThread(threadId: string, action: 'lock' | 'unlock' | 'sticky' | 'unsticky' | 'delete', reason?: string): Promise<void> {
    return api.post(`/api/community/threads/${threadId}/moderate`, {
      action,
      reason
    });
  },

  // Search and discovery
  async searchCommunity(query: string, filters?: CommunityFilters): Promise<{
    comments: Comment[];
    threads: DiscussionThread[];
    total: number;
  }> { const params = new URLSearchParams();
    params.append('q', query);

    if (filters?.bill_id) params.append('bill_id', filters.bill_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return api.get(`/api/community/search?${params.toString() }`);
  },

  async getPopularTags(limit = 20): Promise<{ tag: string; count: number }[]> {
    return api.get(`/api/community/tags/popular?limit=${limit}`);
  }
};





































