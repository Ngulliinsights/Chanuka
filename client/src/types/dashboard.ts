export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  settings: Record<string, any>;
  dataSource?: string;
  refreshInterval?: number;
  permissions?: string[];
  visible: boolean;
  collapsible: boolean;
  removable: boolean;
  resizable: boolean;
  draggable: boolean;
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
  data: any;
  timestamp: Date;
  cacheKey?: string;
  expiresAt?: Date;
  error?: string;
}

export interface DashboardFilter {
  id: string;
  type: 'date' | 'category' | 'status' | 'custom';
  label: string;
  value: any;
  options?: FilterOption[];
  multiple: boolean;
  required: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
  count?: number;
}

export interface DashboardAction {
  id: string;
  type: 'refresh' | 'export' | 'share' | 'duplicate' | 'delete' | 'custom';
  label: string;
  icon?: string;
  permissions?: string[];
  handler: string;
  parameters?: Record<string, any>;
}

// Additional missing types
export interface DashboardSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number;
  notifications: boolean;
  layout: 'grid' | 'flex' | 'masonry';
  defaultWidgets: string[];
}

export type WidgetType = 'chart' | 'table' | 'stat' | 'gauge' | 'progress' | 'list' | 'custom';

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}