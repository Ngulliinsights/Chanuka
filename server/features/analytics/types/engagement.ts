// Engagement analytics domain types

export interface UserEngagementMetrics { user_id: string;
  userName: string;
  totalComments: number;
  totalVotes: number;
  averageVotesPerComment: number;
  engagement_score: number;
  topCommentId: number | null;
  topCommentVotes: number;
  participationDays: number;
  expertiseAreas: string[];
 }

export interface BillEngagementMetrics { bill_id: number;
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

export interface EngagementLeaderboard { topCommenters: Array<{
    user_id: string;
    userName: string;
    comment_count: number;
    totalVotes: number;
    averageVotes: number;
   }>;
  topVoters: Array<{ user_id: string;
    userName: string;
    votesGiven: number;
    votesReceived: number;
    engagementRatio: number;
   }>;
  mostEngagedBills: Array<{ bill_id: number;
    billTitle: string;
    totalEngagement: number;
    uniqueUsers: number;
   }>;
}





































