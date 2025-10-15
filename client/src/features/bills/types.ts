// Bills feature types
export interface Bill {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  introducedDate: string;
  lastActionDate?: string;
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
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
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
  lastEngagedAt: string;
}

// Query parameters
export interface BillsQueryParams {
  search?: string;
  category?: string;
  status?: string;
  sponsor?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'introducedDate' | 'lastActionDate' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Mutation payloads
export interface CommentPayload {
  content: string;
  commentType?: string;
  userId: string;
  parentId?: string;
}

export interface EngagementPayload {
  userId: string;
  engagementType: 'view' | 'share' | 'bookmark' | 'comment';
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