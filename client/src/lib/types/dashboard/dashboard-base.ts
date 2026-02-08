/**
 * Core Dashboard Base Types - Single Source of Truth
 *
 * Unified type definitions for all dashboard components across the codebase.
 * This is the primary location for dashboard-related types to prevent duplication
 * and inconsistency.
 *
 * @module shared/types/dashboard/dashboard-base
 */

/**
 * Position of a widget within the dashboard grid
 *
 * @example
 * const position: WidgetPosition = { x: 0, y: 0, z: 1 };
 */
export interface WidgetPosition {
  /** Column index (0-based) */
  x: number;
  /** Row index (0-based) */
  y: number;
  /** Z-index for layering */
  z?: number;
}

/**
 * Size configuration for a dashboard widget
 *
 * @example
 * const size: WidgetSize = {
 *   width: 100,
 *   height: 50,
 *   minWidth: 50,
 *   maxWidth: 200
 * };
 */
export interface WidgetSize {
  /** Width in percentage or pixels */
  width: number;
  /** Height in percentage or pixels */
  height: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
}

/**
 * Configuration for a single dashboard widget
 *
 * Represents all data needed to render and manage a widget within the dashboard.
 * Includes visual, functional, and data-related properties.
 *
 * @template T Generic type for widget-specific settings
 *
 * @example
 * const widget: WidgetConfig = {
 *   id: 'widget-1',
 *   type: 'chart',
 *   title: 'Sales Chart',
 *   position: { x: 0, y: 0 },
 *   size: { width: 100, height: 50 },
 *   visible: true,
 *   settings: { chartType: 'line' }
 * };
 */
export interface WidgetConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the widget */
  id: string;
  /** Widget type (e.g., 'chart', 'metrics', 'list', 'custom') */
  type: string;
  /** Display title for the widget */
  title: string;
  /** Optional description or subtitle */
  description?: string;
  /** Position within the dashboard grid */
  position: WidgetPosition | { x: number; y: number };
  /** Size of the widget - can be object or string preset */
  size: WidgetSize | 'small' | 'medium' | 'large' | 'full';
  /** Widget-specific settings and configuration */
  settings?: T;
  /** Widget-specific props or configuration */
  props?: Record<string, any>;
  /** Optional data source identifier */
  dataSource?: string;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Permissions required to view this widget */
  permissions?: string[];
  /** Whether widget is visible */
  visible?: boolean;
  /** Whether widget can be collapsed */
  collapsible?: boolean;
  /** Whether widget can be removed */
  removable?: boolean;
  /** Whether widget can be resized */
  resizable?: boolean;
  /** Whether widget can be dragged */
  draggable?: boolean;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Responsive layout configuration for a specific breakpoint
 *
 * @example
 * const responsive: ResponsiveLayout = {
 *   breakpoint: 'md',
 *   columns: 2,
 *   gap: 16
 * };
 */
export interface ResponsiveLayout {
  /** Breakpoint identifier (e.g., 'sm', 'md', 'lg', 'xl') */
  breakpoint: string;
  /** Number of columns at this breakpoint */
  columns: number;
  /** Gap between widgets in pixels */
  gap: number;
  /** Widget-specific overrides for this breakpoint */
  widgetOverrides?: Record<string, Partial<WidgetConfig>>;
}

/**
 * Breakpoint configuration for responsive behavior
 *
 * @example
 * const breakpoint: BreakpointConfig = {
 *   name: 'tablet',
 *   minWidth: 768,
 *   maxWidth: 1024,
 *   columns: 2,
 *   gap: 16
 * };
 */
export interface BreakpointConfig {
  /** Human-readable breakpoint name */
  name: string;
  /** Minimum viewport width in pixels */
  minWidth: number;
  /** Maximum viewport width in pixels (optional) */
  maxWidth?: number;
  /** Number of grid columns */
  columns: number;
  /** Gap between widgets */
  gap: number;
}

/**
 * Dashboard layout configuration
 *
 * Defines how widgets are arranged and responsive behavior across breakpoints.
 *
 * @example
 * const layout: DashboardLayout = {
 *   id: 'layout-1',
 *   type: 'grid',
 *   columns: 3,
 *   gap: 16,
 *   responsive: [
 *     { breakpoint: 'sm', columns: 1, gap: 8 },
 *     { breakpoint: 'md', columns: 2, gap: 12 }
 *   ]
 * };
 */
export interface DashboardLayout {
  /** Unique identifier */
  id: string;
  /** Human-readable layout name */
  name: string;
  /** Layout type (grid, flex, masonry, custom) */
  type: 'grid' | 'flex' | 'masonry' | 'custom';
  /** Number of grid columns (for grid layouts) */
  columns: number;
  /** Number of grid rows (optional) */
  rows?: number;
  /** Gap between widgets in pixels */
  gap: number;
  /** Responsive configurations for different breakpoints */
  responsive: ResponsiveLayout[];
  /** Breakpoint definitions */
  breakpoints: BreakpointConfig[];
}

/**
 * Preferences for dashboard display and behavior
 *
 * @example
 * const prefs: DashboardPreferences = {
 *   theme: 'dark',
 *   layout: 'compact',
 *   refreshInterval: 30000
 * };
 */
export interface DashboardPreferences {
  /** Color theme (light, dark, or auto) */
  theme?: 'light' | 'dark' | 'auto';
  /** Layout density (compact, standard, expanded) */
  layout?: 'compact' | 'standard' | 'expanded';
  /** Default view mode (list, grid, cards) */
  defaultView?: 'list' | 'grid' | 'cards';
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Widgets to hide by default */
  hiddenWidgets?: string[];
  /** Custom preferences (key-value pairs) */
  custom?: Record<string, unknown>;
  
  // Legacy compatibility props
  pinnedSections?: string[];
  hiddenSections?: string[];
}

/**
 * Dashboard configuration combining layout and preferences
 *
 * @example
 * const config: DashboardConfig = {
 *   id: 'dashboard-1',
 *   name: 'Sales Dashboard',
 *   layout: { ... },
 *   preferences: { theme: 'dark' }
 * };
 */
export interface DashboardConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Layout configuration */
  layout: DashboardLayout;
  /** Display preferences */
  preferences: DashboardPreferences;
  /** Permissions required to view */
  permissions?: string[];
  /** Owner/creator identifier */
  ownerId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;

  // Legacy compatibility props
  title?: string; // alias for name
  navigation?: any;
  theme?: any;
  refreshInterval?: number;
  enableAutoRefresh?: boolean;
  
  // Dashboard application configuration properties
  /** Maximum number of action items to display */
  maxActionItems?: number;
  /** Maximum number of tracked topics to display */
  maxTrackedTopics?: number;
  /** Whether to show completed actions */
  showCompletedActions?: boolean;
  /** Default view section */
  defaultView?: DashboardSection;
}

/**
 * Complete dashboard state including all widgets and metadata
 *
 * @example
 * const state: DashboardState = {
 *   id: 'dashboard-1',
 *   config: { ... },
 *   widgets: [ ... ],
 *   loading: false,
 *   error: null
 * };
 */
export interface DashboardState {
  /** Dashboard identifier */
  id: string;
  /** Dashboard configuration */
  config: DashboardConfig;
  /** All widgets in the dashboard */
  widgets: WidgetConfig[];
  /** Whether dashboard is loading */
  loading: boolean;
  /** Error state (if any) */
  error: Error | null;
  /** Last refresh timestamp */
  lastRefreshed?: Date;
  /** Data for all widgets */
  widgetData: Record<string, unknown>;
}

/**
 * Widget data with loading and error states
 *
 * @template T Type of the widget data
 *
 * @example
 * const widgetData: WidgetData<number[]> = {
 *   id: 'widget-1',
 *   data: [1, 2, 3],
 *   loading: false,
 *   error: null
 * };
 */
export interface WidgetData<T = unknown> {
  /** Widget identifier */
  id: string;
  /** Widget data */
  data: T;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Last fetch timestamp */
  lastFetched?: Date;
}

/**
 * Widget type definition for registry
 *
 * @example
 * const widgetType: WidgetTypeDef = {
 *   type: 'chart',
 *   label: 'Chart Widget',
 *   category: 'visualization',
 *   defaultConfig: { ... }
 * };
 */
export interface WidgetTypeDef {
  /** Widget type identifier */
  type: string;
  /** Human-readable label */
  label: string;
  /** Category for organizing widgets */
  category: 'visualization' | 'metric' | 'list' | 'action' | 'custom';
  /** Description */
  description?: string;
  /** Default configuration */
  defaultConfig: Record<string, unknown>;
  /** Required permissions to use */
  requiredPermissions?: string[];
  /** Minimum size */
  minSize?: WidgetSize;
  /** Maximum size */
  maxSize?: WidgetSize;
}

/**
 * Type guard for WidgetConfig
 *
 * @example
 * if (isWidgetConfig(obj)) {
 *   // obj is WidgetConfig
 * }
 */
export function isWidgetConfig(value: unknown): value is WidgetConfig {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.title === 'string' &&
    obj.position !== undefined &&
    obj.size !== undefined
  );
}

/**
 * Type guard for DashboardLayout
 *
 * @example
 * if (isDashboardLayout(obj)) {
 *   // obj is DashboardLayout
 * }
 */
export function isDashboardLayout(value: unknown): value is DashboardLayout {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.columns === 'number' &&
    Array.isArray(obj.responsive)
  );
}

/**
 * Type guard for DashboardConfig
 *
 * @example
 * if (isDashboardConfig(obj)) {
 *   // obj is DashboardConfig
 * }
 */
export function isDashboardConfig(value: unknown): value is DashboardConfig {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    isDashboardLayout(obj.layout)
  );
}

// ============================================================================
// Legacy Dashboard Application Types (from original dashboard.ts)
// ============================================================================

/**
 * Action item for the dashboard
 */
export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  priority: ActionPriority;
  due_date?: Date;
  category: string;
  bill_id?: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ActionPriority = 'High' | 'Medium' | 'Low';

/**
 * Tracked topic for the dashboard
 */
export interface TrackedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  billCount: number;
  is_active: boolean;
  description?: string;
  keywords?: string[];
  created_at: Date;
}

export type TopicCategory =
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'economy'
  | 'security'
  | 'infrastructure'
  | 'social'
  | 'other';

/**
 * Dashboard data containing summary and items
 */
export interface DashboardData {
  summary: {
    billsTracked: number;
    actionsNeeded: number;
    topicsCount: number;
    recentActivity: number;
    completedActions: number;
    pendingActions: number;
    lastUpdated: Date;
  };
  actionItems: ActionItem[];
  trackedTopics: TrackedTopic[];
  isLoading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
}

/**
 * Dashboard application configuration
 * Note: Different from DashboardConfig which is the layout/widget config
 */
export interface DashboardAppConfig {
  refreshInterval: number;
  maxActionItems: number;
  maxTrackedTopics: number;
  enableAutoRefresh: boolean;
  showCompletedActions: boolean;
  defaultView: DashboardSection;
}

export type DashboardSection = 'activity' | 'actions' | 'topics' | 'analytics';

/**
 * Result from useDashboard hook
 */
export interface UseDashboardResult {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
    reset: () => void;
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    addAction: (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}
