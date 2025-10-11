// Engagement analytics domain types

export interface UserEngagementMetrics {
  userId: string;
  userName: string;
  totalComments: number;
  totalVotes: number;
  averageVotesPerComment: number;
  engagementScore: number;
  topCommentId: number | null;
  topCommentVotes: number;
  participationDays: number;
  expertiseAreas: string[];
}

export interface BillEngagementMetrics {
  billId: number;
  billTitle: string;
  totalComments: number;
  totalVotes: number;
  uniqueParticipants: number;
  averageEngagementPerUser: number;
  controversyScore: number;
  expertParticipation: number;
  timeToFirstComment: number; // hours
  peakEngagementHour: number;
}

export interface CommentEngagementTrends {
  hourly: Array<{ hour: number; comments: number; votes: number }>;
  daily: Array<{ date: string; comments: number; votes: number }>;
  weekly: Array<{ week: string; comments: number; votes: number }>;
}

export interface EngagementLeaderboard {
  topCommenters: Array<{
    userId: string;
    userName: string;
    commentCount: number;
    totalVotes: number;
    averageVotes: number;
  }>;
  topVoters: Array<{
    userId: string;
    userName: string;
    votesGiven: number;
    votesReceived: number;
    engagementRatio: number;
  }>;
  mostEngagedBills: Array<{
    billId: number;
    billTitle: string;
    totalEngagement: number;
    uniqueUsers: number;
  }>;
}