/**
 * Dashboard Types - Unified Type System
 *
 * Centralized export point for all dashboard-related types.
 * This is the single source of truth for dashboard type definitions
 * across the entire codebase.
 *
 * @module shared/types/dashboard
 *
 * @example
 * // Import base types
 * import type { DashboardConfig, WidgetConfig } from '@client/shared/types/dashboard';
 *
 * // Import metrics
 * import type { AnalyticsMetrics, TimeSeries } from '@client/shared/types/dashboard';
 *
 * // Import component props
 * import type { DashboardProps, WidgetProps } from '@client/shared/types/dashboard';
 *
 * // Import events
 * import type { DashboardEvent, WidgetUpdatedEvent } from '@client/shared/types/dashboard';
 */

// ============================================================================
// Base Dashboard Types
// ============================================================================

export type {
  WidgetPosition,
  WidgetSize,
  WidgetConfig,
  DashboardLayout,
  ResponsiveLayout,
  BreakpointConfig,
  DashboardPreferences,
  DashboardConfig,
  DashboardState,
  WidgetData,
  WidgetTypeDef,
} from './dashboard-base';

export {
  isWidgetConfig,
  isDashboardLayout,
  isDashboardConfig,
} from './dashboard-base';

// ============================================================================
// Legacy Dashboard Application Types (from original dashboard.ts)
// ============================================================================

export type {
  ActionItem,
  ActionPriority,
  TrackedTopic,
  TopicCategory,
  DashboardData,
  DashboardAppConfig,
  DashboardSection,
  UseDashboardResult,
} from './dashboard-base';

// ============================================================================
// Metrics Types
// ============================================================================

export type {
  DateRange,
  Metric,
  TimeSeriesPoint,
  TimeSeries,
  CategoryMetric,
  DemographicData,
  EngagementMetrics,
  PerformanceMetrics,
  AnalyticsMetrics,
  MetricsComparison,
  MetricsSummary,
  KPIDefinition,
} from './dashboard-metrics';

export {
  isTimeSeries,
  isAnalyticsMetrics,
} from './dashboard-metrics';

// ============================================================================
// Component Props Types
// ============================================================================

export type {
  DashboardComponentProps,
  DashboardProps,
  DashboardHeaderProps,
  DashboardToolbarProps,
  FilterDefinition,
  FilterPanelProps,
  WidgetProps,
  DashboardSectionProps,
  DashboardLayoutProps,
  PreferencesModalProps,
  ExportModalProps,
  MetricsDisplayProps,
  LoadingIndicatorProps,
  ErrorDisplayProps,
  EmptyStateProps,
} from './dashboard-components';

// ============================================================================
// Event Types
// ============================================================================

export type {
  DashboardEventType,
  DashboardEvent,
  WidgetAddedEvent,
  WidgetRemovedEvent,
  WidgetUpdatedEvent,
  WidgetRefreshedEvent,
  WidgetErrorEvent,
  DashboardCreatedEvent,
  DashboardLoadedEvent,
  DashboardConfiguredEvent,
  DashboardRefreshedEvent,
  PreferencesChangedEvent,
  FilterAppliedEvent,
  ExportStartedEvent,
  ExportCompletedEvent,
  ErrorOccurredEvent,
  CustomDashboardEvent,
  AnyDashboardEvent,
  DashboardEventHandler,
  DashboardEventEmitter,
  DashboardEventLogger,
  DashboardEventFilter,
} from './dashboard-events';

export {
  isWidgetEvent,
  isDashboardEvent,
  isErrorEvent,
} from './dashboard-events';

// ============================================================================
// Preset Configurations and Constants
// ============================================================================

/**
 * Default breakpoint configurations for responsive layouts
 *
 * @example
 * import { DEFAULT_BREAKPOINTS } from '@client/shared/types/dashboard';
 * const layout: DashboardLayout = {
 *   breakpoints: DEFAULT_BREAKPOINTS,
 *   // ...
 * };
 */
export const DEFAULT_BREAKPOINTS = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 640,
    columns: 1,
    gap: 8,
  },
  {
    name: 'tablet',
    minWidth: 640,
    maxWidth: 1024,
    columns: 2,
    gap: 12,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1280,
    columns: 3,
    gap: 16,
  },
  {
    name: 'widescreen',
    minWidth: 1280,
    columns: 4,
    gap: 20,
  },
] as const;

/**
 * Default responsive layouts for breakpoints
 *
 * @example
 * import { DEFAULT_RESPONSIVE_LAYOUTS } from '@client/shared/types/dashboard';
 */
export const DEFAULT_RESPONSIVE_LAYOUTS = [
  {
    breakpoint: 'mobile',
    columns: 1,
    gap: 8,
  },
  {
    breakpoint: 'tablet',
    columns: 2,
    gap: 12,
  },
  {
    breakpoint: 'desktop',
    columns: 3,
    gap: 16,
  },
  {
    breakpoint: 'widescreen',
    columns: 4,
    gap: 20,
  },
] as const;

/**
 * Default dashboard preferences
 *
 * @example
 * import { DEFAULT_PREFERENCES } from '@client/shared/types/dashboard';
 */
export const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: 'auto',
  layout: 'standard',
  defaultView: 'grid',
  refreshInterval: 30000,
  hiddenWidgets: [],
} as const;

/**
 * Common widget types used across dashboards
 *
 * @example
 * import { WIDGET_TYPES } from '@client/shared/types/dashboard';
 * const type = WIDGET_TYPES.CHART;
 */
export const WIDGET_TYPES = {
  CHART: 'chart',
  METRIC: 'metric',
  TABLE: 'table',
  LIST: 'list',
  CARD: 'card',
  GAUGE: 'gauge',
  TIMELINE: 'timeline',
  HEATMAP: 'heatmap',
  MAP: 'map',
  CUSTOM: 'custom',
} as const;

/**
 * Dashboard layout types
 *
 * @example
 * import { LAYOUT_TYPES } from '@client/shared/types/dashboard';
 * const layout = LAYOUT_TYPES.GRID;
 */
export const LAYOUT_TYPES = {
  GRID: 'grid',
  FLEX: 'flex',
  MASONRY: 'masonry',
  CUSTOM: 'custom',
} as const;

/**
 * Widget size presets
 *
 * @example
 * import { WIDGET_SIZES } from '@client/shared/types/dashboard';
 * const size = WIDGET_SIZES.MEDIUM;
 */
export const WIDGET_SIZES = {
  SMALL: { width: 50, height: 30 },
  MEDIUM: { width: 100, height: 50 },
  LARGE: { width: 150, height: 75 },
  FULL: { width: 100, height: 100 },
} as const;

// Internal imports for utility functions
import type { DashboardPreferences, DashboardConfig, WidgetConfig } from './dashboard-base';

/**
 * Export helper for creating dashboard configurations
 *
 * @example
 * import { createDashboardConfig } from '@client/shared/types/dashboard';
 * const config = createDashboardConfig({
 *   id: 'dashboard-1',
 *   name: 'Sales Dashboard'
 * });
 */
export function createDashboardConfig(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
  return {
    id: overrides.id ?? `dashboard-${Date.now()}`,
    name: overrides.name ?? 'New Dashboard',
    description: overrides.description,
    layout: overrides.layout ?? {
      id: 'default-layout',
      name: 'Default Layout',
      type: 'grid',
      columns: 3,
      gap: 16,
      responsive: [...DEFAULT_RESPONSIVE_LAYOUTS],
      breakpoints: [...DEFAULT_BREAKPOINTS],
    },
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...overrides.preferences,
    },
    permissions: overrides.permissions,
    ownerId: overrides.ownerId,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

/**
 * Export helper for creating widget configurations
 *
 * @example
 * import { createWidgetConfig } from '@client/shared/types/dashboard';
 * const widget = createWidgetConfig({
 *   id: 'widget-1',
 *   type: 'chart',
 *   title: 'Sales Chart'
 * });
 */
export function createWidgetConfig<T extends Record<string, unknown> = Record<string, unknown>>(
  overrides: Partial<WidgetConfig<T>> = {}
): WidgetConfig<T> {
  return {
    id: overrides.id ?? `widget-${Date.now()}`,
    type: overrides.type ?? 'custom',
    title: overrides.title ?? 'New Widget',
    description: overrides.description,
    position: overrides.position ?? { x: 0, y: 0 },
    size: overrides.size ?? WIDGET_SIZES.MEDIUM,
    settings: (overrides.settings ?? {}) as T,
    dataSource: overrides.dataSource,
    refreshInterval: overrides.refreshInterval ?? 30000,
    permissions: overrides.permissions,
    visible: overrides.visible ?? true,
    collapsible: overrides.collapsible ?? true,
    removable: overrides.removable ?? true,
    resizable: overrides.resizable ?? true,
    draggable: overrides.draggable ?? true,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}
