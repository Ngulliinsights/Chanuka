/**
 * Consolidated Dashboard Types - Unified type system for all dashboard components
 * Combines generic widget types with application-specific dashboard types
 */

// ============================================================================
// Generic Widget and Layout Types (from client/src/types/dashboard.ts)
// ============================================================================

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  settings: Record<string, unknown>;
  dataSource?: string;
  refreshInterval?: number;
  permissions?: string[];
  visible: boolean;
  collapsible: boolean;
  removable: boolean;
  resizable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DashboardState {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: DashboardLayout;
  userId: string;
  isPublic: boolean;
  tags: string[];
  theme?: string;
  autoRefresh: boolean;
  refreshInterval: number;
  lastRefreshed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'masonry' | 'custom';
  columns: number;
  rows?: number;
  gap: number;
  responsive: ResponsiveLayout[];
  breakpoints: BreakpointConfig[];
}

export interface ResponsiveLayout {
  breakpoint: string;
  columns: number;
  gap: number;
  widgetOverrides?: Record<string, Partial<WidgetConfig>>;
}

export interface BreakpointConfig {
  name: string;
  minWidth: number;
  maxWidth?: number;
  columns: number;
  gap: number;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: PageMetric[];
  userDemographics: DemographicData;
  engagementMetrics: EngagementMetrics;
  performanceMetrics: PerformanceMetrics;
  timeRange: DateRange;
  lastUpdated: Date;
}

export interface PageMetric {
  path: string;
  views: number;
  uniqueViews: number;
  averageTime: number;
  bounceRate: number;
}

export interface DemographicData {
  ageGroups: Record<string, number>;
  locations: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
}

export interface EngagementMetrics {
  scrollDepth: number;
  clickThroughRate: number;
  socialShares: number;
  comments: number;
  likes: number;
  bookmarks: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export interface DateRange {
  start: Date;
  end: Date;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Omit<WidgetConfig, 'id' | 'position'>[];
  layout: DashboardLayout;
  thumbnail?: string;
  tags: string[];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface WidgetData {
  widgetId: string;
  data: unknown;
  timestamp: Date;
  cacheKey?: string;
  expiresAt?: Date;
  error?: string;
}

export interface DashboardFilter {
  id: string;
  type: 'date' | 'category' | 'status' | 'custom';
  label: string;
  value: unknown;
  options?: FilterOption[];
  multiple: boolean;
  required: boolean;
}

export interface FilterOption {
  label: string;
  value: unknown;
  count?: number;
}

export interface DashboardActionType {
  id: string;
  type: 'refresh' | 'export' | 'share' | 'duplicate' | 'delete' | 'custom';
  label: string;
  icon?: string;
  permissions?: string[];
  handler: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// Application-Specific Dashboard Types (from client/src/core/dashboard/types.ts)
// ============================================================================

export type WidgetType =
  | 'analytics'
  | 'performance'
  | 'engagement'
  | 'metrics'
  | 'chart'
  | 'custom';
export type WidgetSizeType = 'small' | 'medium' | 'large' | 'full';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface AppWidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSizeType;
  position: { x: number; y: number };
  props: Record<string, unknown>;
  permissions?: string[];
  refreshInterval?: number;
  dataSource?: string;
}

export interface AppDashboardLayout {
  id: string;
  name: string;
  widgets: AppWidgetConfig[];
  columns: number;
  responsive: boolean;
}

export interface DashboardConfig {
  id: string;
  name: string;
  title?: string;
  description?: string;
  layout: AppDashboardLayout;
  permissions: PermissionConfig;
  settings: DashboardSettings;
  // Additional configuration properties
  refreshInterval?: number;
  maxActionItems?: number;
  maxTrackedTopics?: number;
  enableAutoRefresh?: boolean;
  showCompletedActions?: boolean;
  // Navigation configuration
  navigation?: {
    breadcrumbs?: {
      enabled: boolean;
      separator?: string;
    };
    pageControls?: {
      enabled: boolean;
    };
  };
  // Theme configuration
  theme?: {
    colorScheme: 'light' | 'dark' | 'auto';
  };
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

export interface AppDashboardState {
  config: DashboardConfig | null;
  loading: boolean;
  error: Error | null;
  widgetData: Record<string, unknown>;
  widgetLoading: Record<string, boolean>;
  widgetErrors: Record<string, Error>;
}

// Enhanced metrics types for application use
export interface AppAnalyticsMetrics {
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

export interface AppPerformanceMetrics {
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

export interface AppEngagementMetrics {
  billInteractions: Array<{
    bill_id: number;
    billTitle: string;
    totalEngagement: number;
    viewPattern: {
      peakHours: number[];
      averageSessionDuration: number;
    };
  }>;
  user_profiles: Array<{
    user_id: string;
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

export interface WidgetProps {
  config: AppWidgetConfig;
  data?: unknown;
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
  | { type: 'SET_WIDGET_DATA'; payload: { widgetId: string; data: unknown } }
  | { type: 'SET_WIDGET_LOADING'; payload: { widgetId: string; loading: boolean } }
  | { type: 'SET_WIDGET_ERROR'; payload: { widgetId: string; error: Error | null } }
  | {
      type: 'UPDATE_WIDGET_CONFIG';
      payload: { widgetId: string; config: Partial<AppWidgetConfig> };
    }
  | { type: 'ADD_WIDGET'; payload: AppWidgetConfig }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'UPDATE_LAYOUT'; payload: AppDashboardLayout }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DashboardSettings> };

// ============================================================================
// Component Props Types
// ============================================================================

export interface DashboardComponentProps {
  className?: string;
  config?: unknown;
  onError?: (error: Error) => void;
  onDataChange?: (data: unknown) => void;
}

// ============================================================================
// Section Types (for dashboard sections)
// ============================================================================

export type DashboardSection = 'activity' | 'actions' | 'topics' | 'analytics';

export type ActionPriority = 'High' | 'Medium' | 'Low';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  due_date?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivitySummary {
  billsTracked: number;
  actionsNeeded: number;
  topicsCount: number;
  lastUpdated: Date;
}

export interface TrackedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  billCount: number;
  is_active: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TopicCategory = 'legislative' | 'community' | 'policy' | 'advocacy';

export interface DashboardData {
  summary?: ActivitySummary;
  actionItems?: ActionItem[];
  trackedTopics?: TrackedTopic[];
  lastRefresh?: Date;
}

export interface UseDashboardResult {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
  };
  recovery: {
    canRecover: boolean;
    recover: () => Promise<void>;
    suggestions: string[];
  };
}

// ============================================================================
// Widget Component Props Types
// ============================================================================

export interface DashboardStackProps {
  spacing?: 'tight' | 'normal' | 'loose';
  direction?: 'vertical' | 'horizontal';
  sections: DashboardSectionConfig[];
  className?: string;
  onSectionUpdate?: (sectionId: string, updates: Partial<DashboardSectionConfig>) => void;
}

export interface DashboardTabsProps {
  sections: DashboardSectionConfig[];
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
  defaultTab?: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
  onSectionUpdate?: (sectionId: string, updates: Partial<DashboardSectionConfig>) => void;
}

export interface DashboardSectionConfig {
  id: string;
  title: string;
  icon?: string;
  widgets: AppWidgetConfig[];
  visible?: boolean;
  order?: number;
  contentType?: 'widgets' | 'component' | 'custom';
  component?: string;
  description?: string;
  loading?: boolean;
  error?: string;
}
export interface DashboardFrameworkProps {
  config: Partial<DashboardConfig>;
  headerContent?: React.ReactNode;
  sidebarContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  className?: string;
  onWidgetUpdate?: (widgetId: string, updates: unknown) => void;
  onLayoutChange?: (updates: Partial<DashboardLayoutConfig>) => void;
  onThemeChange?: (updates: Partial<DashboardThemeConfig>) => void;
}

export interface DashboardLayoutConfig {
  type?: 'grid' | 'flex' | 'masonry' | 'custom';
  columns?: number;
  rows?: number;
  gap?: number;
  sidebarPosition?: 'left' | 'right';
  showFooter?: boolean;
  layoutMode?: 'grid' | 'stack' | 'tabs';
}

export interface DashboardThemeConfig {
  colorScheme: 'light' | 'dark' | 'auto';
  customTokens?: Record<string, string>;
}

export interface DashboardAccessibilityConfig {
  // Generated interface
  [key: string]: unknown;
}

export class ErrorInfo extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorInfo';
  }
}
