/**
 * Community API Contracts
 * Request/response types for community features (comments, voting, social interactions)
 */

import { ApiResponse, BaseQueryParams } from './core.contracts';

// Community Entities
export interface Comment {
  id: string;
  billId: string;
  userId: string;
  parentId?: string;
  content: string;
  type: CommentType;
  status: CommentStatus;
  metadata: CommentMetadata;
  engagement: CommentEngagement;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export interface CommentMetadata {
  isHighlighted: boolean;
  isOfficial: boolean;
  isPinned: boolean;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  language?: string;
}

export interface CommentEngagement {
  upvotes: number;
  downvotes: number;
  replies: number;
  reports: number;
  shares: number;
  userVote?: VoteType;
  userReported?: boolean;
}

export interface Vote {
  id: string;
  userId: string;
  targetId: string;
  targetType: VoteTargetType;
  type: VoteType;
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Enums
export enum CommentType {
  GENERAL = 'general',
  QUESTION = 'question',
  CONCERN = 'concern',
  SUPPORT = 'support',
  OPPOSITION = 'opposition',
  AMENDMENT = 'amendment',
  CLARIFICATION = 'clarification'
}

export enum CommentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  PENDING_REVIEW = 'pending_review',
  FLAGGED = 'flagged'
}

export enum VoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote'
}

export enum VoteTargetType {
  COMMENT = 'comment',
  BILL = 'bill',
  AMENDMENT = 'amendment'
}

export enum ReportTargetType {
  COMMENT = 'comment',
  USER = 'user',
  BILL = 'bill'
}

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  MISINFORMATION = 'misinformation',
  OFF_TOPIC = 'off_topic',
  DUPLICATE = 'duplicate',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

// Query Parameters
export interface CommentQueryParams extends BaseQueryParams {
  billId?: string;
  userId?: string;
  parentId?: string;
  type?: CommentType;
  status?: CommentStatus;
  isHighlighted?: boolean;
  isOfficial?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minUpvotes?: number;
  hasReplies?: boolean;
}

export interface VoteQueryParams extends BaseQueryParams {
  userId?: string;
  targetType?: VoteTargetType;
  type?: VoteType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportQueryParams extends BaseQueryParams {
  userId?: string;
  targetType?: ReportTargetType;
  reason?: ReportReason;
  status?: ReportStatus;
  dateFrom?: string;
  dateTo?: string;
}

// Request Types
export interface CreateCommentRequest {
  billId: string;
  parentId?: string;
  content: string;
  type?: CommentType;
  tags?: string[];
}

export interface UpdateCommentRequest {
  content?: string;
  type?: CommentType;
  tags?: string[];
}

export interface CreateVoteRequest {
  targetId: string;
  targetType: VoteTargetType;
  type: VoteType;
}

export interface CreateReportRequest {
  targetId: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  description?: string;
}

export interface UpdateReportRequest {
  status: ReportStatus;
  resolution?: string;
}

// Response Types
export interface CommentResponse extends ApiResponse<Comment> {}
export interface CommentListResponse extends ApiResponse<Comment[]> {}

export interface VoteResponse extends ApiResponse<Vote> {}
export interface VoteListResponse extends ApiResponse<Vote[]> {}

export interface ReportResponse extends ApiResponse<Report> {}
export interface ReportListResponse extends ApiResponse<Report[]> {}

export interface CommunityStatsResponse extends ApiResponse<{
  totalComments: number;
  totalVotes: number;
  totalReports: number;
  activeUsers: number;
  topContributors: Array<{
    userId: string;
    username: string;
    commentCount: number;
    upvotes: number;
  }>;
  engagementTrends: Array<{
    date: string;
    comments: number;
    votes: number;
  }>;
}> {}

export interface CommentTreeResponse extends ApiResponse<{
  comment: Comment;
  replies: CommentTreeResponse['data'][];
  hasMore: boolean;
}> {}