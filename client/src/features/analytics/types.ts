// Analytics feature types
export interface EngagementMetrics {
  views: number;
  shares: number;
  comments: number;
  bookmarks: number;
  last_engaged_at: string;
  engagementRate: number;
}

export interface ConflictAnalysis {
  bill_id: string;
  sponsor_id: string;
  conflict_level: 'low' | 'medium' | 'high';
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
  bill_id: string;
  title: string;
  status: string;
  engagement: EngagementMetrics;
  conflicts: ConflictAnalysis[];
  stakeholders: StakeholderImpact[];
  trends: TrendData[];
  lastUpdated: string;
  riskLevel?: 'low' | 'medium' | 'high';
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
  conflict_level?: string[];
  stakeholderGroup?: string[];
  minEngagement?: number;
  limit?: number;
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
  engagementGrowthRate?: number;
  riskScore?: number;
}

export interface UserActivity {
  user_id: string;
  actions: UserAction[];
  totalEngagement: number;
  favoriteTopics: string[];
  activityScore: number;
  lastActive: string;
  engagementScore?: number;
  activityLevel?: 'low' | 'medium' | 'high';
}

export interface UserAction {
  type: 'view' | 'comment' | 'share' | 'bookmark' | 'vote';
  bill_id: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
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
  bill_id?: string;
  created_at: string;
  acknowledged: boolean;
  priority?: number;
  impact?: 'low' | 'medium' | 'high';
}

export interface ChartDataPoint {
  [key: string]: string | number | boolean | null;
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: ChartDataPoint[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

export interface TrendingTopic {
  topic: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  sentiment?: number;
  velocity: number;
}

export interface StakeholderAnalysis {
  group: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  affectedCount: number;
  confidence: number;
  impactScore?: number;
}

export interface RealtimeMetrics {
  activeUsers: number;
  currentEngagement: number;
  recentAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  healthScore?: number;
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
  bill_id: string;
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
  trendAnalysis?: {
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    momentum: number;
  };
  engagementScore?: number;
}

export interface ConflictReport {
  bill_id: string;
  conflicts: ConflictAnalysis[];
  summary: {
    totalConflicts: number;
    bySeverity: Record<string, number>;
    topIssues: string[];
  };
  recommendations: string[];
  priorityScore?: number;
}
