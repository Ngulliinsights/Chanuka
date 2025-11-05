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
    const params = new URLSearchParams();

    if (bill_id) params.append('bill_id', bill_id);
    if (filters?.authorId) params.append('authorId', filters.authorId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return api.get(`/api/community/comments?${params.toString() }`);
  },

  async getComment(comment_id: string): Promise<Comment> {
    return api.get(`/api/community/comments/${comment_id}`);
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

    if (filters?.bill_id) params.append('bill_id', filters.bill_id);
    if (filters?.authorId) params.append('authorId', filters.authorId);
    if (filters?.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
     }
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return api.get(`/api/community/threads?${params.toString()}`);
  },

  async getThread(threadId: string): Promise<DiscussionThread> {
    return api.get(`/api/community/threads/${threadId}`);
  },

  async createThread(request: CreateThreadRequest): Promise<DiscussionThread> {
    return api.post('/api/community/threads', request);
  },

  async updateThread(threadId: string, updates: Partial<CreateThreadRequest>): Promise<DiscussionThread> {
    return api.put(`/api/community/threads/${threadId}`, updates);
  },

  async deleteThread(threadId: string): Promise<void> {
    return api.delete(`/api/community/threads/${threadId}`);
  },

  async lockThread(threadId: string, locked: boolean): Promise<DiscussionThread> {
    return api.post(`/api/community/threads/${threadId}/lock`, { locked });
  },

  async stickyThread(threadId: string, sticky: boolean): Promise<DiscussionThread> {
    return api.post(`/api/community/threads/${threadId}/sticky`, { sticky });
  },

  // Social sharing endpoints
  async shareContent(request: ShareRequest): Promise<SocialShare> {
    return api.post('/api/community/share', request);
  },

  async getShares(bill_id?: string, threadId?: string): Promise<SocialShare[]> { const params = new URLSearchParams();
    if (bill_id) params.append('bill_id', bill_id);
    if (threadId) params.append('threadId', threadId);

    return api.get(`/api/community/shares?${params.toString() }`);
  },

  async trackShareClick(shareId: string): Promise<void> {
    return api.post(`/api/community/shares/${shareId}/click`);
  },

  // Community stats and analytics
  async getCommunityStats(): Promise<CommunityStats> {
    return api.get('/api/community/stats');
  },

  async getTopContributors(limit = 10): Promise<any[]> {
    return api.get(`/api/community/contributors/top?limit=${limit}`);
  },

  async getRecentActivity(limit = 20): Promise<any[]> {
    return api.get(`/api/community/activity/recent?limit=${limit}`);
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





































