/**
 * Dashboard System Types - Consolidated from multiple implementations
 * Platform-agnostic types for cross-cutting dashboard concerns
 */

export type WidgetType = 'analytics' | 'performance' | 'engagement' | 'metrics' | 'chart' | 'custom';
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface WidgetConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number };
  props: T;
  permissions?: string[];
  refreshInterval?: number;
  dataSource?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  columns: number;
  responsive: boolean;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  permissions: PermissionConfig;
  settings: DashboardSettings;
}

export interface PermissionConfig {
  view: string[];
  edit: string[];
  admin: string[];
}

export interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showTitles: boolean;
  enableAnimations: boolean;
}

export interface DashboardState {
  config: DashboardConfig | null;
  loading: boolean;
  error: Error | null;
  widgetData: Record<string, Record<string, unknown>>;
  widgetLoading: Record<string, boolean>;
  widgetErrors: Record<string, Error | null>;
}

// Widget-specific types
export interface AnalyticsMetrics {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueUsers: number;
  averageEngagementScore: number;
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  topCategories: Array<{
    category: string;
    engagement_score: number;
    billCount: number;
  }>;
  userSegments: {
    highlyEngaged: number;
    moderatelyEngaged: number;
    lowEngaged: number;
  };
}

export interface PerformanceMetrics {
  coreWebVitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
  performanceScore: number;
  bundleSize: number;
  loadTime: number;
  memoryUsage: number;
  recommendations: string[];
}

export interface EngagementMetrics { billInteractions: Array<{
    bill_id: number;
    billTitle: string;
    totalEngagement: number;
    viewPattern: {
      peakHours: number[];
      averageSessionDuration: number;
     };
  }>;
  user_profiles: Array<{ user_id: string;
    userName: string;
    engagementLevel: 'high' | 'medium' | 'low';
    totalEngagementScore: number;
   }>;
  trends: Array<{
    period: string;
    totalEngagement: number;
    newUsers: number;
    returningUsers: number;
  }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface WidgetProps<T extends Record<string, unknown> = Record<string, unknown>> {
  config: WidgetConfig<T>;
  data?: T;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

// Action types for reducer
export type DashboardAction =
  | { type: 'SET_CONFIG'; payload: DashboardConfig }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_WIDGET_DATA'; payload: { widgetId: string; data: Record<string, unknown> } }
  | { type: 'SET_WIDGET_LOADING'; payload: { widgetId: string; loading: boolean } }
  | { type: 'SET_WIDGET_ERROR'; payload: { widgetId: string; error: Error | null } }
  | { type: 'UPDATE_WIDGET_CONFIG'; payload: { widgetId: string; config: Partial<WidgetConfig> } }
  | { type: 'ADD_WIDGET'; payload: WidgetConfig }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'UPDATE_LAYOUT'; payload: DashboardLayout }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DashboardSettings> };

