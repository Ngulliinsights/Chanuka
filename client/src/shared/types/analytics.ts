/**
 * Shared Analytics Types
 * 
 * These types are used across both core and features to avoid circular dependencies.
 * Moved from features/analytics/types to enable core API integration.
 */

export interface AnalyticsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  billStatus?: string[];
  categories?: string[];
  location?: string;
  tags?: string[];
}

export interface BillAnalytics {
  bill_id: string;
  title: string;
  views: number;
  engagement_score: number;
  comments_count: number;
  votes_count: number;
  shares_count: number;
  time_spent_avg: number;
  bounce_rate: number;
  conversion_rate: number;
  trending_score: number;
  sentiment_score: number;
  demographics: {
    age_groups: Record<string, number>;
    locations: Record<string, number>;
    political_affiliation: Record<string, number>;
  };
  timeline: Array<{
    date: string;
    views: number;
    engagement: number;
  }>;
}

export interface AnalyticsSummary {
  total_bills: number;
  total_views: number;
  total_engagement: number;
  average_time_spent: number;
  top_categories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  engagement_trends: Array<{
    date: string;
    engagement: number;
    views: number;
  }>;
  user_demographics: {
    total_users: number;
    active_users: number;
    new_users: number;
    returning_users: number;
  };
}

export interface DashboardData {
  summary: AnalyticsSummary;
  top_bills: BillAnalytics[];
  recent_activity: UserActivity[];
  alerts: AnalyticsAlert[];
  performance_metrics: {
    page_load_time: number;
    api_response_time: number;
    error_rate: number;
    uptime: number;
  };
}

export interface EngagementReport {
  bill_id: string;
  total_engagement: number;
  engagement_breakdown: {
    views: number;
    comments: number;
    votes: number;
    shares: number;
    bookmarks: number;
  };
  engagement_timeline: Array<{
    date: string;
    engagement: number;
    type: 'view' | 'comment' | 'vote' | 'share' | 'bookmark';
  }>;
  user_segments: Array<{
    segment: string;
    engagement: number;
    percentage: number;
  }>;
  peak_engagement_times: Array<{
    hour: number;
    day_of_week: string;
    engagement: number;
  }>;
}

export interface ConflictReport {
  bill_id: string;
  conflict_score: number;
  conflicts: Array<{
    type: 'financial' | 'political' | 'ideological';
    severity: 'low' | 'medium' | 'high';
    description: string;
    entities: string[];
    evidence: string[];
  }>;
  stakeholder_analysis: Array<{
    stakeholder: string;
    position: 'support' | 'oppose' | 'neutral';
    influence_score: number;
    financial_interest: number;
  }>;
  network_analysis: {
    nodes: Array<{
      id: string;
      name: string;
      type: 'person' | 'organization' | 'bill';
      influence: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationship: string;
      strength: number;
    }>;
  };
}

export interface UserActivity {
  user_id: string;
  session_id: string;
  timestamp: string;
  action: 'view' | 'comment' | 'vote' | 'share' | 'bookmark' | 'search';
  target_type: 'bill' | 'comment' | 'user' | 'page';
  target_id: string;
  metadata: Record<string, unknown>;
  duration?: number;
  referrer?: string;
  user_agent?: string;
  ip_address?: string;
  location?: {
    country: string;
    state: string;
    city: string;
  };
}

export interface AnalyticsAlert {
  id: string;
  type: 'performance' | 'engagement' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata: Record<string, unknown>;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
}

export interface AnalyticsResponse<T = unknown> {
  data: T;
  meta: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
  filters?: AnalyticsFilters;
  execution_time: number;
  cached: boolean;
  cache_expires?: string;
}

export interface PerformanceMetrics {
  page_load_time: number;
  api_response_time: number;
  database_query_time: number;
  cache_hit_rate: number;
  error_rate: number;
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
  active_connections: number;
}

export interface TrendingTopic {
  topic: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  related_bills: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface StakeholderAnalysis {
  stakeholder_id: string;
  name: string;
  type: 'individual' | 'organization' | 'government';
  influence_score: number;
  financial_interest: number;
  position: 'support' | 'oppose' | 'neutral';
  confidence: number;
  evidence: Array<{
    type: 'donation' | 'statement' | 'vote' | 'lobbying';
    description: string;
    source: string;
    date: string;
    weight: number;
  }>;
  connections: Array<{
    target_id: string;
    relationship: string;
    strength: number;
  }>;
}

export interface AnalyticsExport {
  format: 'csv' | 'json' | 'xlsx';
  data: unknown;
  filename: string;
  size: number;
  generated_at: string;
  expires_at: string;
  download_url: string;
}

export interface RealtimeMetrics {
  active_users: number;
  current_engagement: number;
  recent_alerts: number;
  system_health: 'healthy' | 'warning' | 'error';
  last_updated: string;
  metrics: {
    page_views_per_minute: number;
    api_calls_per_minute: number;
    error_rate_per_minute: number;
    average_response_time: number;
  };
}