/**
 * Community Hub and Activity Feed Types
 * 
 * Defines interfaces for community engagement, activity feeds,
 * trending algorithms, and local impact filtering.
 */

export interface ActivityItem {
  id: string;
  type: 'comment' | 'discussion' | 'expert_contribution' | 'bill_save' | 'bill_share' | 'campaign_join' | 'petition_sign';
  userId: string;
  userName: string;
  userAvatar?: string;
  expertInfo?: {
    verificationType: 'official' | 'domain' | 'identity';
    credibilityScore: number;
    specializations: string[];
  };
  
  // Content
  title: string;
  content?: string;
  summary?: string;
  
  // Related entities
  billId?: number;
  billTitle?: string;
  discussionId?: string;
  campaignId?: string;
  petitionId?: string;
  
  // Metadata
  timestamp: string;
  location?: {
    state?: string;
    district?: string;
    county?: string;
  };
  
  // Engagement metrics
  likes: number;
  replies: number;
  shares: number;
  userHasLiked?: boolean;
  
  // Trending metrics
  velocity: number; // Activity rate over time
  diversity: number; // Variety of user engagement
  substance: number; // Quality/depth score
  trendingScore: number; // Calculated trending score
}

export interface TrendingTopic {
  id: string;
  title: string;
  description: string;
  category: 'bill' | 'policy_area' | 'campaign' | 'general';
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Trending metrics
  activityCount: number;
  participantCount: number;
  expertCount: number;
  velocity: number;
  diversity: number;
  substance: number;
  trendingScore: number;
  
  // Time-based data
  hourlyActivity: number[];
  dailyActivity: number[];
  weeklyActivity: number[];
  
  // Geographic data
  geographicDistribution: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
  
  timestamp: string;
  lastUpdated: string;
}

export interface ExpertInsight {
  id: string;
  expertId: string;
  expertName: string;
  expertAvatar?: string;
  verificationType: 'official' | 'domain' | 'identity';
  credibilityScore: number;
  specializations: string[];
  
  // Content
  title: string;
  content: string;
  summary: string;
  confidence: number;
  methodology?: string;
  sources?: string[];
  
  // Related entities
  billId?: number;
  billTitle?: string;
  policyAreas: string[];
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  communityValidation: {
    upvotes: number;
    downvotes: number;
    validationScore: number;
  };
  
  timestamp: string;
  lastUpdated: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  summary: string;
  type: 'advocacy' | 'petition' | 'awareness' | 'action';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Organizer info
  organizerId: string;
  organizerName: string;
  organizerType: 'individual' | 'organization' | 'expert';
  
  // Goals and progress
  goal?: number;
  currentCount: number;
  progressPercentage: number;
  
  // Geographic targeting
  targetGeography?: {
    states?: string[];
    districts?: string[];
    counties?: string[];
  };
  
  // Engagement
  participantCount: number;
  shareCount: number;
  
  // Dates
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Petition {
  id: string;
  title: string;
  description: string;
  summary: string;
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Petition details
  targetOfficial?: string;
  targetOffice?: string;
  goal: number;
  currentSignatures: number;
  progressPercentage: number;
  
  // Creator info
  creatorId: string;
  creatorName: string;
  
  // Geographic data
  signaturesByLocation: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
  
  // Status
  status: 'active' | 'successful' | 'closed' | 'expired';
  
  // Dates
  createdAt: string;
  deadline?: string;
  updatedAt: string;
}

export interface CommunityFilters {
  contentTypes: Array<'comments' | 'discussions' | 'expert_insights' | 'campaigns' | 'petitions'>;
  policyAreas: string[];
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'all';
  geography: {
    states: string[];
    districts: string[];
    counties: string[];
  };
  expertLevel: Array<'official' | 'domain' | 'identity' | 'community'>;
  sortBy: 'trending' | 'recent' | 'popular' | 'local_impact';
  showLocalOnly: boolean;
}

export interface TrendingAlgorithmConfig {
  velocityWeight: number; // How much recent activity matters
  diversityWeight: number; // How much variety in engagement matters
  substanceWeight: number; // How much quality/depth matters
  decayRate: number; // How quickly trending scores decay over time
  minimumActivity: number; // Minimum activity threshold for trending
  timeWindow: number; // Time window for calculating velocity (hours)
}

export interface LocalImpactMetrics {
  state?: string;
  district?: string;
  county?: string;
  
  // Activity metrics
  totalActivity: number;
  uniqueParticipants: number;
  expertParticipants: number;
  
  // Bill-specific metrics
  billsDiscussed: number;
  billsSaved: number;
  billsShared: number;
  
  // Engagement metrics
  campaignsActive: number;
  petitionsActive: number;
  averageEngagement: number;
  
  // Trending topics in this area
  topTopics: Array<{
    title: string;
    score: number;
    category: string;
  }>;
  
  lastUpdated: string;
}

export interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  activeThisWeek: number;
  totalDiscussions: number;
  totalComments: number;
  expertContributions: number;
  activeCampaigns: number;
  activePetitions: number;
  lastUpdated: string;
}

export type ActivityType = 'comment' | 'discussion' | 'expert_contribution' | 'bill_save' | 'bill_share' | 'campaign_join' | 'petition_sign';
export type CampaignType = 'advocacy' | 'petition' | 'awareness' | 'action';
export type CampaignStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type PetitionStatus = 'active' | 'successful' | 'closed' | 'expired';
export type SortOption = 'trending' | 'recent' | 'popular' | 'local_impact';