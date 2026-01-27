/**
 * Community Feature Types
 * Defines types for community interactions, activities, and user engagement
 */

export interface ActivityItem {
  id: string;
  type: 'comment' | 'vote' | 'share' | 'follow' | 'expert_opinion' | 'bill_update' | 'discussion';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  summary?: string;
  billId?: string;
  billTitle?: string;
  location?: string;
  timestamp: string;
  expertInfo?: {
    isVerified: boolean;
    specialty: string;
    credibilityScore: number;
  };
  trendingScore?: number;
  likes: number;
  replies: number;
  shares: number;
  userHasLiked: boolean;
  metadata?: Record<string, unknown>;
}

export interface CommunityStats {
  totalMembers: number;
  activeMembers: number;
  totalDiscussions: number;
  totalComments: number;
  trendingTopics: string[];
  expertCount: number;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  participants: string[];
  replyCount: number;
  viewCount: number;
  isSticky: boolean;
  isLocked: boolean;
}

export interface CommunityProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  expertise: string[];
  joinDate: string;
  lastActive: string;
  reputation: number;
  isExpert: boolean;
  stats: {
    discussionsStarted: number;
    commentsPosted: number;
    votesCast: number;
    reputation: number;
  };
}
