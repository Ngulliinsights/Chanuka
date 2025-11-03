import { Comment, InsertComment, CommentVote, InsertCommentVote } from '@shared/schema';

export interface CommentWithUser {
  id: number;
  bill_id: number;
  user_id: string;
  content: string;
  commentType: string;
  is_verified: boolean;
  parent_id: number | null;
  upvotes: number;
  downvotes: number;
  created_at: Date;
  updated_at: Date;
  user: {
    id: string;
    name: string;
    role: string;
    verification_status: string;
  };
  user_profiles?: {
    expertise: string[] | null;
    organization: string | null;
    reputation_score: number;
  };
  replies?: CommentWithUser[];
  replyCount: number;
  netVotes: number;
}

export interface CreateCommentData {
  bill_id: number;
  user_id: string;
  content: string;
  commentType?: string;
  parent_id?: number;
}

export interface UpdateCommentData {
  content?: string;
  commentType?: string;
}

export interface CommentFilters {
  sort?: 'recent' | 'popular' | 'verified' | 'oldest';
  commentType?: string;
  expertOnly?: boolean;
  parent_id?: number;
  limit?: number;
  offset?: number;
}

export interface CommentStats {
  totalComments: number;
  expertComments: number;
  verifiedComments: number;
  averageEngagement: number;
  topContributors: Array<{
    user_id: string;
    userName: string;
    comment_count: number;
    totalVotes: number;
  }>;
}

export interface ICommentRepository {
  // Comment CRUD operations
  findById(id: number): Promise<CommentWithUser | null>;
  findByBillId(billId: number, filters: CommentFilters): Promise<{
    comments: CommentWithUser[];
    totalCount: number;
    hasMore: boolean;
  }>;
  findReplies(parentId: number, filters: CommentFilters): Promise<CommentWithUser[]>;
  create(data: CreateCommentData): Promise<CommentWithUser>;
  update(id: number, userId: string, data: UpdateCommentData): Promise<CommentWithUser>;
  delete(id: number, userId: string): Promise<boolean>;

  // Comment voting
  vote(commentId: number, userId: string, voteType: 'up' | 'down'): Promise<void>;
  getVote(commentId: number, userId: string): Promise<CommentVote | null>;

  // Comment statistics
  getStats(billId: number): Promise<CommentStats>;
  getReplyCount(commentId: number): Promise<number>;

  // Comment moderation
  verifyComment(id: number): Promise<void>;
  unverifyComment(id: number): Promise<void>;
}