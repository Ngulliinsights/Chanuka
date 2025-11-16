// Community feature types
export interface Comment { id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  bill_id?: string;
  parent_id?: string;
  replies?: Comment[];
  votes: number;
  userVote?: 'up' | 'down' | null;
  created_at: string;
  updated_at?: string;
  isEdited: boolean;
  attachments?: Attachment[];
  mentions?: Mention[];
  }

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'link';
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
}

export interface Mention { id: string;
  user_id: string;
  username: string;
  start: number;
  end: number;
 }

export interface DiscussionThread { id: string;
  title: string;
  bill_id?: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string[];
  isSticky: boolean;
  isLocked: boolean;
  view_count: number;
  replyCount: number;
  lastReplyAt?: string;
  lastReplyBy?: string;
  created_at: string;
  updated_at?: string;
  participants: ThreadParticipant[];
 }

export interface ThreadParticipant { user_id: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  last_seen_at: string;
  postCount: number;
 }

export interface SocialShare { id: string;
  bill_id?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  url: string;
  title: string;
  description?: string;
  sharedBy: string;
  shared_at: string;
  clickCount: number;
 }

export interface CommunityStats {
  totalUsers: number;
  activeUsers: number;
  totalComments: number;
  totalThreads: number;
  totalShares: number;
  topContributors: Contributor[];
  recentActivity: ActivityItem[];
}

export interface Contributor { user_id: string;
  username: string;
  avatar?: string;
  comment_count: number;
  threadCount: number;
  reputation: number;
  badge?: string;
 }

export interface ActivityItem { id: string;
  type: 'comment' | 'thread' | 'vote' | 'share';
  user_id: string;
  username: string;
  bill_id?: string;
  threadId?: string;
  content: string;
  created_at: string;
  }

// API request/response types
export interface CreateCommentRequest { content: string;
  bill_id?: string;
  parent_id?: string;
  attachments?: File[];
 }

export interface CreateThreadRequest { title: string;
  content: string;
  bill_id?: string;
  tags: string[];
  isSticky?: boolean;
 }

export interface UpdateCommentRequest {
  content: string;
  attachments?: File[];
}

export interface VoteRequest {
  comment_id: string;
  vote: 'up' | 'down' | null;
}

export interface ShareRequest { bill_id?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  message?: string;
 }

export interface CommunityFilters { bill_id?: string;
  authorId?: string;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending';
  limit?: number;
  offset?: number;
 }

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  hasMore: boolean;
}

export interface ThreadsResponse {
  threads: DiscussionThread[];
  total: number;
  hasMore: boolean;
}

// Real-time event types
export interface CommentEvent { type: 'comment_created' | 'comment_updated' | 'comment_deleted' | 'vote_changed';
  comment_id: string;
  bill_id?: string;
  data: any;
 }

export interface ThreadEvent { type: 'thread_created' | 'thread_updated' | 'thread_locked' | 'thread_unlocked';
  threadId: string;
  bill_id?: string;
  data: any;
 }

export interface UserEvent { type: 'user_joined' | 'user_left' | 'user_typing';
  user_id: string;
  threadId?: string;
  data: any;
 }





































