/**
 * Community API Service
 * Modernized API service for community features (comments, voting, reports)
 */

import { BaseApiService } from '@shared/core/api/base-api-service';
import { globalApiClient } from '@client/infrastructure/api/client';
import {
  Comment,
  Vote,
  Report,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateVoteRequest,
  CreateReportRequest,
  UpdateReportRequest,
  CommentQueryParams,
  VoteQueryParams,
  ReportQueryParams,
  CommentResponse,
  CommentListResponse,
  VoteResponse,
  VoteListResponse,
  ReportResponse,
  ReportListResponse,
  CommunityStatsResponse,
  CommentTreeResponse
} from '@shared/types/api/contracts/community.contracts';

class CommunityApiService {
  private readonly baseUrl = '/api/community';
  private readonly client = globalApiClient;

  // Comment Operations
  async getComments(params?: CommentQueryParams): Promise<CommentListResponse> {
    return this.client.get(`${this.baseUrl}/comments`, params);
  }

  async getComment(id: string): Promise<CommentResponse> {
    return this.client.get(`${this.baseUrl}/comments/${id}`);
  }

  async createComment(data: CreateCommentRequest): Promise<CommentResponse> {
    return this.client.post(`${this.baseUrl}/comments`, data);
  }

  async updateComment(id: string, data: UpdateCommentRequest): Promise<CommentResponse> {
    return this.client.patch(`${this.baseUrl}/comments/${id}`, data);
  }

  async deleteComment(id: string): Promise<void> {
    return this.client.delete(`${this.baseUrl}/comments/${id}`);
  }

  // Comment Tree Operations
  async getCommentTree(billId: string, params?: { 
    maxDepth?: number; 
    sortBy?: 'newest' | 'oldest' | 'popular'; 
    limit?: number 
  }): Promise<CommentTreeResponse> {
    return this.client.get(`${this.baseUrl}/comments/tree/${billId}`, params);
  }

  async getCommentReplies(commentId: string, params?: Partial<CommentQueryParams>): Promise<CommentListResponse> {
    return this.client.get(`${this.baseUrl}/comments/${commentId}/replies`, params);
  }

  // Comment Moderation
  async highlightComment(id: string, highlight: boolean): Promise<CommentResponse> {
    return this.client.patch(`${this.baseUrl}/comments/${id}/highlight`, { highlight });
  }

  async pinComment(id: string, pin: boolean): Promise<CommentResponse> {
    return this.client.patch(`${this.baseUrl}/comments/${id}/pin`, { pin });
  }

  async moderateComment(id: string, action: 'approve' | 'hide' | 'delete', reason?: string): Promise<CommentResponse> {
    return this.client.patch(`${this.baseUrl}/comments/${id}/moderate`, { action, reason });
  }

  // Vote Operations
  async getVotes(params?: VoteQueryParams): Promise<VoteListResponse> {
    return this.client.get(`${this.baseUrl}/votes`, params);
  }

  async createVote(data: CreateVoteRequest): Promise<VoteResponse> {
    return this.client.post(`${this.baseUrl}/votes`, data);
  }

  async updateVote(id: string, type: 'upvote' | 'downvote'): Promise<VoteResponse> {
    return this.client.patch(`${this.baseUrl}/votes/${id}`, { type });
  }

  async deleteVote(id: string): Promise<void> {
    return this.client.delete(`${this.baseUrl}/votes/${id}`);
  }

  // Vote by target (convenience methods)
  async voteOnComment(commentId: string, type: 'upvote' | 'downvote'): Promise<VoteResponse> {
    return this.createVote({
      targetId: commentId,
      targetType: 'comment',
      type
    });
  }

  async voteOnBill(billId: string, type: 'upvote' | 'downvote'): Promise<VoteResponse> {
    return this.createVote({
      targetId: billId,
      targetType: 'bill',
      type
    });
  }

  async getUserVote(targetId: string, targetType: 'comment' | 'bill' | 'amendment'): Promise<VoteResponse | null> {
    try {
      return await this.client.get(`${this.baseUrl}/votes/user/${targetType}/${targetId}`);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  // Report Operations
  async getReports(params?: ReportQueryParams): Promise<ReportListResponse> {
    return this.client.get(`${this.baseUrl}/reports`, params);
  }

  async getReport(id: string): Promise<ReportResponse> {
    return this.client.get(`${this.baseUrl}/reports/${id}`);
  }

  async createReport(data: CreateReportRequest): Promise<ReportResponse> {
    return this.client.post(`${this.baseUrl}/reports`, data);
  }

  async updateReport(id: string, data: UpdateReportRequest): Promise<ReportResponse> {
    return this.client.patch(`${this.baseUrl}/reports/${id}`, data);
  }

  async resolveReport(id: string, resolution: string): Promise<ReportResponse> {
    return this.client.patch(`${this.baseUrl}/reports/${id}/resolve`, { resolution });
  }

  async dismissReport(id: string, reason: string): Promise<ReportResponse> {
    return this.client.patch(`${this.baseUrl}/reports/${id}/dismiss`, { reason });
  }

  // Statistics and Analytics
  async getCommunityStats(params?: {
    dateFrom?: string;
    dateTo?: string;
    billId?: string;
    userId?: string;
  }): Promise<CommunityStatsResponse> {
    return this.client.get(`${this.baseUrl}/stats`, params);
  }

  async getEngagementTrends(params: {
    period: 'day' | 'week' | 'month';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    trends: Array<{
      date: string;
      comments: number;
      votes: number;
      reports: number;
      activeUsers: number;
    }>;
  }> {
    return this.client.get(`${this.baseUrl}/trends`, params);
  }

  async getTopContributors(params?: {
    period?: 'day' | 'week' | 'month' | 'all';
    limit?: number;
  }): Promise<{
    contributors: Array<{
      userId: string;
      username: string;
      avatar?: string;
      stats: {
        comments: number;
        upvotes: number;
        helpfulVotes: number;
        reputation: number;
      };
    }>;
  }> {
    return this.client.get(`${this.baseUrl}/contributors/top`, params);
  }

  // Bulk Operations
  async bulkModerateComments(commentIds: string[], action: 'approve' | 'hide' | 'delete', reason?: string): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return this.client.patch(`${this.baseUrl}/comments/bulk/moderate`, {
      commentIds,
      action,
      reason
    });
  }

  async bulkResolveReports(reportIds: string[], resolution: string): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    return this.client.patch(`${this.baseUrl}/reports/bulk/resolve`, {
      reportIds,
      resolution
    });
  }

  // Search Operations
  async searchComments(query: string, params?: {
    billId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<CommentListResponse> {
    return this.client.get(`${this.baseUrl}/comments/search`, { q: query, ...params });
  }

  // Real-time Operations
  async subscribeToComments(billId: string, callback: (comment: Comment) => void): Promise<() => void> {
    // WebSocket subscription implementation
    // This would connect to a WebSocket endpoint for real-time comment updates
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/community/comments/${billId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_comment') {
        callback(data.comment);
      }
    };

    return () => ws.close();
  }

  async subscribeToVotes(targetId: string, targetType: string, callback: (vote: Vote) => void): Promise<() => void> {
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/community/votes/${targetType}/${targetId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'vote_update') {
        callback(data.vote);
      }
    };

    return () => ws.close();
  }
}

// Export singleton instance
export const communityApiService = new CommunityApiService();
export default communityApiService;