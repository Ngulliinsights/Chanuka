/**
 * Dashboard Components Types - React component prop types
 *
 * Defines type signatures for all dashboard-related React components.
 *
 * @module shared/types/dashboard/dashboard-components
 */

import type { ReactNode } from 'react';

import type { WidgetConfig, DashboardLayout, DashboardPreferences, DashboardState } from './dashboard-base';
import type { AnalyticsMetrics } from './dashboard-metrics';

/**
 * Base props for all dashboard components
 *
 * @example
 * const Dashboard: React.FC<DashboardComponentProps> = ({ className, children }) => (
 *   <div className={className}>{children}</div>
 * );
 */
export interface DashboardComponentProps {
  /** CSS class name for styling */
  className?: string;
  /** Child elements */
  children?: ReactNode;
  /** Test ID for testing */
  testId?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

/**
 * Dashboard container props
 *
 * @example
 * <Dashboard config={config} onConfigChange={handleChange} />
 */
export interface DashboardProps extends DashboardComponentProps {
  /** Dashboard configuration */
  config?: DashboardState;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Configuration change handler */
  onConfigChange?: (config: DashboardState) => void;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Refresh handler */
  onRefresh?: () => Promise<void>;
}

/**
 * Dashboard header props
 *
 * @example
 * <DashboardHeader title="Sales" onRefresh={handleRefresh} />
 */
export interface DashboardHeaderProps extends DashboardComponentProps {
  /** Header title */
  title: string;
  /** Header subtitle or description */
  subtitle?: string;
  /** Action buttons */
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
  /** Refresh button handler */
  onRefresh?: () => void;
  /** Loading state for refresh button */
  isRefreshing?: boolean;
}

/**
 * Dashboard toolbar props
 *
 * @example
 * <DashboardToolbar
 *   onSearch={handleSearch}
 *   onFilterChange={handleFilter}
 * />
 */
export interface DashboardToolbarProps extends DashboardComponentProps {
  /** Search handler */
  onSearch?: (query: string) => void;
  /** Filter change handler */
  onFilterChange?: (filters: Record<string, unknown>) => void;
  /** Export handler */
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  /** Custom filters to display */
  availableFilters?: FilterDefinition[];
  /** Current filter values */
  currentFilters?: Record<string, unknown>;
}

/**
 * Filter definition for filter panels
 *
 * @example
 * const filter: FilterDefinition = {
 *   id: 'date-range',
 *   label: 'Date Range',
 *   type: 'daterange'
 * };
 */
export interface FilterDefinition {
  /** Filter identifier */
  id: string;
  /** Display label */
  label: string;
  /** Filter input type */
  type: 'select' | 'range' | 'toggle' | 'search' | 'daterange' | 'multiselect';
  /** Available options (for select/multiselect) */
  options?: Array<{ value: string | number; label: string }>;
  /** Min value (for range) */
  min?: number;
  /** Max value (for range) */
  max?: number;
  /** Whether filter is multi-select */
  multiple?: boolean;
  /** Default value */
  defaultValue?: unknown;
}

/**
 * Filter panel props
 *
 * @example
 * <FilterPanel
 *   filters={filters}
 *   onFilterChange={handleChange}
 *   resultCount={100}
 * />
 */
export interface FilterPanelProps extends DashboardComponentProps {
  /** Current filter values */
  filters: Record<string, unknown>;
  /** Available filter definitions */
  availableFilters: FilterDefinition[];
  /** Filter change handler */
  onFilterChange: (filterId: string, value: unknown) => void;
  /** Reset all filters handler */
  onReset: () => void;
  /** Total result count */
  resultCount?: number;
  /** Filtered result count */
  filteredCount?: number;
  /** Mobile view flag */
  isMobile?: boolean;
}

/**
 * Dashboard widget props
 *
 * @example
 * <Widget
 *   config={widgetConfig}
 *   data={widgetData}
 *   onRefresh={handleRefresh}
 * />
 */
export interface WidgetProps extends DashboardComponentProps {
  /** Widget configuration */
  config: WidgetConfig;
  /** Widget data */
  data?: unknown;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Refresh handler */
  onRefresh?: () => Promise<void>;
  /** Update configuration handler */
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  /** Remove widget handler */
  onRemove?: () => void;
}

/**
 * Dashboard section props
 *
 * @example
 * <DashboardSection
 *   title="Metrics"
 *   widgets={widgets}
 * />
 */
export interface DashboardSectionProps extends DashboardComponentProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Widgets in this section */
  widgets: WidgetConfig[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Widget update handler */
  onWidgetUpdate?: (widgetId: string, config: Partial<WidgetConfig>) => void;
  /** Widget remove handler */
  onWidgetRemove?: (widgetId: string) => void;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Dashboard layout props
 *
 * @example
 * <DashboardLayout config={layout} widgets={widgets} />
 */
export interface DashboardLayoutProps extends DashboardComponentProps {
  /** Layout configuration */
  config: DashboardLayout;
  /** Widgets to render */
  widgets: WidgetConfig[];
  /** Widget data */
  widgetData?: Record<string, unknown>;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Edit mode flag */
  isEditing?: boolean;
  /** Widget update handler */
  onWidgetUpdate?: (widgetId: string, config: Partial<WidgetConfig>) => void;
  /** Widget remove handler */
  onWidgetRemove?: (widgetId: string) => void;
}

/**
 * Dashboard preferences modal props
 *
 * @example
 * <PreferencesModal
 *   open={isOpen}
 *   preferences={prefs}
 *   onSave={handleSave}
 * />
 */
export interface PreferencesModalProps extends DashboardComponentProps {
  /** Modal open state */
  open: boolean;
  /** Open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Current preferences */
  preferences: DashboardPreferences;
  /** Preferences save handler */
  onSave: (preferences: DashboardPreferences) => void;
  /** Available theme options */
  themeOptions?: Array<{ value: string; label: string }>;
  /** Available layout options */
  layoutOptions?: Array<{ value: string; label: string }>;
}

/**
 * Data export modal props
 *
 * @example
 * <ExportModal
 *   open={isOpen}
 *   onExport={handleExport}
 * />
 */
export interface ExportModalProps extends DashboardComponentProps {
  /** Modal open state */
  open: boolean;
  /** Open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Export handler */
  onExport: (format: 'json' | 'csv' | 'pdf', options?: Record<string, unknown>) => Promise<void>;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
}

/**
 * Dashboard metrics display props
 *
 * @example
 * <MetricsDisplay metrics={metrics} period={period} />
 */
export interface MetricsDisplayProps extends DashboardComponentProps {
  /** Metrics data */
  metrics: AnalyticsMetrics;
  /** Comparison period metrics */
  previousMetrics?: AnalyticsMetrics;
  /** Show comparison */
  showComparison?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Metric click handler */
  onMetricClick?: (metricId: string) => void;
}

/**
 * Loading indicator props
 *
 * @example
 * <LoadingIndicator size="lg" message="Loading dashboard..." />
 */
export interface LoadingIndicatorProps extends DashboardComponentProps {
  /** Loading state */
  loading: boolean;
  /** Loading message */
  message?: string;
  /** Indicator size */
  size?: 'sm' | 'md' | 'lg';
  /** Show spinner animation */
  showSpinner?: boolean;
}

/**
 * Error display props
 *
 * @example
 * <ErrorDisplay error={error} onRetry={handleRetry} />
 */
export interface ErrorDisplayProps extends DashboardComponentProps {
  /** Error object */
  error: Error | null;
  /** Error title */
  title?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Show technical details */
  showDetails?: boolean;
}

/**
 * Empty state display props
 *
 * @example
 * <EmptyState
 *   title="No data"
 *   message="Try adjusting your filters"
 * />
 */
export interface EmptyStateProps extends DashboardComponentProps {
  /** Empty state title */
  title: string;
  /** Empty state message */
  message?: string;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Icon or illustration */
  icon?: ReactNode;
}
