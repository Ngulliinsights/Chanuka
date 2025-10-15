// Community feature types
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  billId?: string;
  parentId?: string;
  replies?: Comment[];
  votes: number;
  userVote?: 'up' | 'down' | null;
  createdAt: string;
  updatedAt?: string;
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

export interface Mention {
  id: string;
  userId: string;
  username: string;
  start: number;
  end: number;
}

export interface DiscussionThread {
  id: string;
  title: string;
  billId?: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string[];
  isSticky: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  lastReplyAt?: string;
  lastReplyBy?: string;
  createdAt: string;
  updatedAt?: string;
  participants: ThreadParticipant[];
}

export interface ThreadParticipant {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  lastSeenAt: string;
  postCount: number;
}

export interface SocialShare {
  id: string;
  billId?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  url: string;
  title: string;
  description?: string;
  sharedBy: string;
  sharedAt: string;
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

export interface Contributor {
  userId: string;
  username: string;
  avatar?: string;
  commentCount: number;
  threadCount: number;
  reputation: number;
  badge?: string;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'thread' | 'vote' | 'share';
  userId: string;
  username: string;
  billId?: string;
  threadId?: string;
  content: string;
  createdAt: string;
}

// API request/response types
export interface CreateCommentRequest {
  content: string;
  billId?: string;
  parentId?: string;
  attachments?: File[];
}

export interface CreateThreadRequest {
  title: string;
  content: string;
  billId?: string;
  tags: string[];
  isSticky?: boolean;
}

export interface UpdateCommentRequest {
  content: string;
  attachments?: File[];
}

export interface VoteRequest {
  commentId: string;
  vote: 'up' | 'down' | null;
}

export interface ShareRequest {
  billId?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  message?: string;
}

export interface CommunityFilters {
  billId?: string;
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
export interface CommentEvent {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted' | 'vote_changed';
  commentId: string;
  billId?: string;
  data: any;
}

export interface ThreadEvent {
  type: 'thread_created' | 'thread_updated' | 'thread_locked' | 'thread_unlocked';
  threadId: string;
  billId?: string;
  data: any;
}

export interface UserEvent {
  type: 'user_joined' | 'user_left' | 'user_typing';
  userId: string;
  threadId?: string;
  data: any;
}