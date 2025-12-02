// Bills feature types
export interface Bill {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  introduced_date: string;
  last_action_date?: string;
  sponsors: Sponsor[];
  comments: Comment[];
  analysis?: BillAnalysis;
  trackingCount?: number;
  engagementMetrics?: EngagementMetrics;
}

export interface Sponsor {
  id: string;
  name: string;
  party: string;
  district: string;
  role: string;
  conflictOfInterest?: ConflictOfInterest[];
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  created_at: string;
  updated_at?: string;
  parent_id?: string;
  replies?: Comment[];
  votes?: number;
}

export interface BillAnalysis {
  summary: string;
  keyPoints: string[];
  potentialImpact: string;
  stakeholderAnalysis: StakeholderImpact[];
  generatedAt: string;
}

export interface StakeholderImpact {
  group: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  confidence: number;
}

export interface ConflictOfInterest {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export interface EngagementMetrics {
  views: number;
  shares: number;
  comments: number;
  bookmarks: number;
  last_engaged_at: string;
}

// Query parameters
export interface BillsQueryParams {
  query?: string;
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  sponsors?: string[];
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Mutation payloads
export interface CommentPayload { content: string;
  commentType?: string;
  user_id: string;
  parent_id?: string;
 }

export interface EngagementPayload { user_id: string;
  engagement_type: 'view' | 'share' | 'bookmark' | 'comment';
  metadata?: Record<string, any>;
 }

// API response types
export interface BillsResponse {
  bills: Bill[];
  total: number;
  hasMore: boolean;
}

export interface BillCategoriesResponse {
  categories: string[];
}

export interface BillStatusesResponse {
  statuses: string[];
}





































