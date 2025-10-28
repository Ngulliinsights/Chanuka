// Analytics feature types
export interface EngagementMetrics {
  views: number;
  shares: number;
  comments: number;
  bookmarks: number;
  lastEngagedAt: string;
  engagementRate: number;
}

export interface ConflictAnalysis {
  billId: string;
  sponsorId: string;
  conflictLevel: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
  confidence: number;
  detectedAt: string;
}

export interface StakeholderImpact {
  group: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  affectedCount: number;
  confidence: number;
}

export interface BillAnalytics {
  id: string;
  billId: string;
  title: string;
  status: string;
  engagement: EngagementMetrics;
  conflicts: ConflictAnalysis[];
  stakeholders: StakeholderImpact[];
  trends: TrendData[];
  lastUpdated: string;
}

export interface TrendData {
  date: string;
  views: number;
  comments: number;
  shares: number;
  bookmarks: number;
}

export interface AnalyticsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  billStatus?: string[];
  conflictLevel?: string[];
  stakeholderGroup?: string[];
  minEngagement?: number;
}

export interface AnalyticsSummary {
  totalBills: number;
  totalEngagement: number;
  averageEngagementRate: number;
  conflictsDetected: number;
  topStakeholderGroups: string[];
  trendingTopics: string[];
  period: {
    start: string;
    end: string;
  };
}

export interface UserActivity {
  userId: string;
  actions: UserAction[];
  totalEngagement: number;
  favoriteTopics: string[];
  activityScore: number;
  lastActive: string;
}

export interface UserAction {
  type: 'view' | 'comment' | 'share' | 'bookmark' | 'vote';
  billId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DashboardData {
  summary: AnalyticsSummary;
  topBills: BillAnalytics[];
  recentActivity: UserActivity[];
  alerts: AnalyticsAlert[];
  charts: ChartData[];
}

export interface AnalyticsAlert {
  id: string;
  type: 'conflict' | 'engagement' | 'stakeholder' | 'trend';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  billId?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

// API response types
export interface AnalyticsResponse<T> {
  data: T;
  metadata: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface EngagementReport {
  billId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: EngagementMetrics;
  breakdown: {
    byDay: TrendData[];
    byUserType: Record<string, number>;
    byTopic: Record<string, number>;
  };
}

export interface ConflictReport {
  billId: string;
  conflicts: ConflictAnalysis[];
  summary: {
    totalConflicts: number;
    bySeverity: Record<string, number>;
    topIssues: string[];
  };
  recommendations: string[];
}





































