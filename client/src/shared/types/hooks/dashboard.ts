/**
 * Dashboard Hook Types - STANDARDIZED
 *
 * Standardized dashboard hook return types following the exemplary patterns
 * Key improvements:
 * - Consistent naming conventions
 * - Proper generic typing
 * - Comprehensive documentation
 */

import type { WidgetConfig, DashboardConfig } from '../../ui/types';
import type { ActionItem, TrackedTopic, DashboardData } from '../dashboard';

// ============================================================================
// Dashboard Hook Return Types
// ============================================================================

/**
 * Result type for useDashboard hook
 * Comprehensive dashboard functionality
 */
export interface UseDashboardResult {
  // Dashboard data
  data: DashboardData;
  loading: boolean;
  error: Error | null;

  // Dashboard actions
  actions: {
    refresh: () => Promise<void>;
    reset: () => void;
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    addAction: (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  };

  // Recovery functionality
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };

  // Widget management
  widgets: {
    addWidget: (widget: WidgetConfig) => Promise<void>;
    removeWidget: (widgetId: string) => Promise<void>;
    updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => Promise<void>;
    getWidget: (widgetId: string) => WidgetConfig | undefined;
    getAllWidgets: () => WidgetConfig[];
  };

  // Configuration management
  config: {
    getConfig: () => DashboardConfig;
    updateConfig: (updates: Partial<DashboardConfig>) => Promise<void>;
    resetConfig: () => Promise<void>;
  };
}

/**
 * Result type for useWidgetManagement hook
 * Widget-specific functionality
 */
export interface UseWidgetManagementResult {
  widgets: WidgetConfig[];
  loading: boolean;
  error: Error | null;

  // Widget actions
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => Promise<WidgetConfig>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => Promise<WidgetConfig>;
  moveWidget: (widgetId: string, newPosition: { x: number; y: number }) => Promise<void>;
  resizeWidget: (widgetId: string, newSize: { width: number; height: number }) => Promise<void>;

  // Widget queries
  getWidget: (widgetId: string) => WidgetConfig | undefined;
  getWidgetsByType: (type: string) => WidgetConfig[];
  getVisibleWidgets: () => WidgetConfig[];

  // Widget state
  toggleWidgetVisibility: (widgetId: string) => Promise<void>;
  updateWidgetSettings: (widgetId: string, settings: Record<string, any>) => Promise<void>;
}

/**
 * Result type for useDashboardLayout hook
 * Layout management functionality
 */
export interface UseDashboardLayoutResult {
  layout: 'grid' | 'stack' | 'tabs' | 'masonry';
  columns: number;
  gap: number;

  // Layout actions
  setLayout: (layout: 'grid' | 'stack' | 'tabs' | 'masonry') => void;
  setColumns: (columns: number) => void;
  setGap: (gap: number) => void;

  // Layout utilities
  canAddWidget: () => boolean;
  getAvailablePositions: () => Array<{ x: number; y: number }>;
  optimizeLayout: () => Promise<void>;

  // Responsive layout
  isMobileLayout: boolean;
  toggleMobileLayout: () => void;
}

/**
 * Result type for useDashboardAnalytics hook
 * Analytics and metrics functionality
 */
export interface UseDashboardAnalyticsResult {
  metrics: {
    widgetCount: number;
    visibleWidgetCount: number;
    actionCount: number;
    topicCount: number;
    userEngagement: number;
    lastUpdated: Date | null;
  };

  // Analytics actions
  trackWidgetInteraction: (widgetId: string, interactionType: 'view' | 'click' | 'update' | 'remove') => void;
  trackActionCompletion: (actionId: string) => void;
  trackTopicView: (topicId: string) => void;

  // Analytics queries
  getWidgetUsageStats: () => Record<string, { views: number; clicks: number; updates: number }>;
  getMostUsedWidgets: (limit?: number) => WidgetConfig[];
  getLeastUsedWidgets: (limit?: number) => WidgetConfig[];

  // Export functionality
  exportAnalytics: (format: 'json' | 'csv') => Promise<string>;
}

/**
 * Options for useDashboard hook
 * Configuration interface
 */
export interface UseDashboardOptions {
  initialConfig?: Partial<DashboardConfig>;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onDataChange?: (data: DashboardData) => void;
  onConfigChange?: (config: DashboardConfig) => void;
}

/**
 * Options for useWidgetManagement hook
 * Widget configuration
 */
export interface UseWidgetManagementOptions {
  initialWidgets?: WidgetConfig[];
  autoSave?: boolean;
  maxWidgets?: number;
  onWidgetAdd?: (widget: WidgetConfig) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetUpdate?: (widget: WidgetConfig) => void;
}

/**
 * Options for useDashboardLayout hook
 * Layout configuration
 */
export interface UseDashboardLayoutOptions {
  initialLayout?: 'grid' | 'stack' | 'tabs' | 'masonry';
  initialColumns?: number;
  initialGap?: number;
  responsiveBreakpoint?: number;
  onLayoutChange?: (layout: string) => void;
}