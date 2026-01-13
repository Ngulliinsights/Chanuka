/**
 * Dashboard Component Types - UNIFIED AND CONSOLIDATED
 *
 * This file serves as the primary type definitions for dashboard components.
 * It re-exports core types from @client/shared/types/dashboard for consistency
 * and extends them with React-specific component props.
 *
 * IMPORTANT: This is the single source of truth for dashboard component types.
 * Do not duplicate types defined here elsewhere in the codebase.
 *
 * @module shared/types/components/dashboard
 */

import type { ReactNode } from 'react';

import type {
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
  DashboardConfig,
  DashboardPreferences,
  DashboardState,
  DashboardLayout,
  BreakpointConfig,
  ResponsiveLayout,
} from '../dashboard/index';

// ============================================================================
// Re-exports from Dashboard Module (Core Types)
// ============================================================================

export type {
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
  DashboardConfig,
  DashboardPreferences,
  DashboardState,
  DashboardLayout,
  BreakpointConfig,
  ResponsiveLayout,
} from '../dashboard/index';

// ============================================================================
// Layout Mode Type (distinct from DashboardLayout interface)
// ============================================================================

/**
 * Layout display mode - distinct from DashboardLayout configuration
 * Used to specify how widgets are visually arranged on the dashboard
 */
export type LayoutMode = 'grid' | 'stack' | 'tabs' | 'masonry';

/**
 * Dashboard theme preference
 */
export type DashboardTheme = 'light' | 'dark' | 'system';

// ============================================================================
// Base Component Props
// ============================================================================

/**
 * Base props for all dashboard components
 * Foundation for all dashboard-related React components
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
  /** Data attributes for analytics/tracking */
  dataAttributes?: Record<string, string>;
}

/**
 * Widget component props
 * Standardized interface for widget rendering
 */
export interface WidgetProps extends DashboardComponentProps {
  /** Widget configuration */
  readonly config: WidgetConfig;
  /** Refresh handler */
  readonly onRefresh?: () => void | Promise<void>;
  /** Error handler */
  readonly onError?: (error: Error) => void;
  /** Loading state */
  readonly isLoading?: boolean;
}

// ============================================================================
// Layout Component Props - Discriminated Union Types
// ============================================================================

/**
 * Widget grid layout props
 * Grid-specific layout with row/column positioning
 * Used when layout === 'grid'
 */
export interface WidgetGridProps extends DashboardComponentProps {
  /** Discriminator: grid layout type */
  readonly layout: 'grid';
  /** Widget configurations */
  readonly widgets: WidgetConfig[];
  /** Number of grid columns */
  readonly columns: number;
  /** Row height in pixels */
  readonly rowHeight?: number;
  /** Enable widget dragging */
  readonly isDraggable?: boolean;
  /** Enable widget resizing */
  readonly isResizable?: boolean;
}

/**
 * Widget stack layout props
 * Linear layout for stacking widgets vertically or horizontally
 * Used when layout === 'stack'
 */
export interface WidgetStackProps extends DashboardComponentProps {
  /** Discriminator: stack layout type */
  readonly layout: 'stack';
  /** Widget configurations */
  readonly widgets: WidgetConfig[];
  /** Stack direction */
  readonly direction?: 'vertical' | 'horizontal';
  /** Spacing preset */
  readonly spacing?: 'tight' | 'normal' | 'loose';
  /** Gap between widgets */
  readonly gap?: string | number;
}

/**
 * Widget tabs layout props
 * Tabbed interface for organizing widgets into sections
 * Used when layout === 'tabs'
 */
export interface WidgetTabsPropsLayout extends DashboardComponentProps {
  /** Discriminator: tabs layout type */
  readonly layout: 'tabs';
  /** Widget configurations */
  readonly widgets: WidgetConfig[];
  /** Tab sections */
  readonly sections: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly widgets: WidgetConfig[];
  }>;
  /** Default active section ID */
  readonly defaultSection?: string;
  /** Tab change handler */
  readonly onTabChange?: (sectionId: string) => void;
}

/**
 * Widget masonry layout props
 * Masonry/waterfall layout for responsive widget arrangement
 * Used when layout === 'masonry'
 */
export interface WidgetMasonryProps extends DashboardComponentProps {
  /** Discriminator: masonry layout type */
  readonly layout: 'masonry';
  /** Widget configurations */
  readonly widgets: WidgetConfig[];
  /** Gap between widgets */
  readonly gap?: string | number;
  /** Enable widget dragging */
  readonly isDraggable?: boolean;
  /** Enable widget resizing */
  readonly isResizable?: boolean;
}

/**
 * Widget layout container props - Discriminated union
 * Use this type for components that render different layouts.
 * The 'layout' property discriminates which specific layout type is used.
 * TypeScript will enforce that only valid props for the selected layout are provided.
 *
 * @example
 * const renderLayout = (props: WidgetLayoutProps) => {
 *   if (props.layout === 'grid') {
 *     return <GridLayout columns={props.columns} {...props} />;  // ✅ TypeScript knows about columns
 *   } else if (props.layout === 'stack') {
 *     return <StackLayout direction={props.direction} {...props} />;  // ✅ TypeScript knows about direction
 *   }
 * };
 */
export type WidgetLayoutProps = WidgetGridProps | WidgetStackProps | WidgetTabsPropsLayout | WidgetMasonryProps;

// ============================================================================
// Dashboard Structure Component Props
// ============================================================================

/**
 * Dashboard header props
 * Top section with title, subtitle, and actions
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
  onRefresh?: () => void | Promise<void>;
  /** Loading state for refresh button */
  isRefreshing?: boolean;
}

/**
 * Dashboard content props
 * Main content area with flexible widget layout
 */
export interface DashboardContentProps extends DashboardComponentProps {
  /** Widget configurations */
  widgets: WidgetConfig[];
  /** Layout display mode */
  layout?: LayoutMode;
  /** Show empty state when no widgets */
  showEmptyState?: boolean;
  /** Empty state message */
  emptyStateMessage?: string;
}

/**
 * Dashboard sidebar props
 * Side navigation and additional widget sections
 */
export interface DashboardSidebarProps extends DashboardComponentProps {
  /** Sidebar sections with widgets */
  sections?: Array<{
    title: string;
    widgets: WidgetConfig[];
  }>;
  /** Whether sidebar is collapsible */
  isCollapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Collapse state change handler */
  onCollapseChange?: (isCollapsed: boolean) => void;
}

/**
 * Dashboard footer props
 * Bottom section with metadata and links
 */
export interface DashboardFooterProps extends DashboardComponentProps {
  /** Last update timestamp */
  lastUpdated?: Date;
  /** Show version info */
  showVersion?: boolean;
  /** Version string */
  version?: string;
  /** Footer links */
  links?: Array<{
    href: string;
    label: string;
    icon?: ReactNode;
  }>;
}

/**
 * Dashboard section props
 * Themed section container for content grouping
 */
export interface DashboardSectionProps extends DashboardComponentProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Section theme */
  theme?: DashboardTheme;
  /** Section content */
  children: ReactNode;
}

// ============================================================================
// Full Dashboard Props
// ============================================================================

/**
 * Full-page dashboard props
 * Complete dashboard layout with all sections
 */
export interface FullPageDashboardProps extends DashboardComponentProps {
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Show sidebar */
  showSidebar?: boolean;
  /** Sidebar width */
  sidebarWidth?: string | number;
  /** Show header */
  showHeader?: boolean;
  /** Show footer */
  showFooter?: boolean;
  /** Configuration change handler */
  onConfigChange?: (config: DashboardConfig) => void;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Refresh handler */
  onRefresh?: () => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Section-specific dashboard props
 * Focused dashboard view for specific sections
 */
export interface SectionDashboardProps extends DashboardComponentProps {
  /** Section type */
  section: 'stats' | 'activity' | 'bills' | 'analytics' | 'custom';
  /** Show section title */
  showTitle?: boolean;
  /** Custom section title */
  title?: string;
  /** Section data */
  data?: unknown;
  /** Section configuration */
  config?: DashboardConfig;
}

// ============================================================================
// Modal & Dialog Props
// ============================================================================

/**
 * Dashboard preferences modal props
 * User customization interface for dashboard settings
 */
export interface DashboardPreferencesModalProps extends DashboardComponentProps {
  /** Modal open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Save handler */
  onSave: (preferences: Partial<DashboardPreferences>) => void;
  /** Current preferences */
  initialPreferences?: DashboardPreferences;
}

/**
 * Data export modal props
 * Interface for exporting dashboard data
 */
export interface DataExportModalProps extends DashboardComponentProps {
  /** Modal open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Export handler */
  onExport: (format: 'csv' | 'json' | 'pdf') => void | Promise<void>;
  /** Available export formats */
  availableFormats?: Array<'csv' | 'json' | 'pdf'>;
  /** Data to export */
  data?: unknown;
  /** Export filename */
  filename?: string;
}

// ============================================================================
// Type Guards & Discriminators
// ============================================================================

/**
 * Check if a value is a valid LayoutMode
 */
export function isLayoutMode(value: unknown): value is LayoutMode {
  return typeof value === 'string' && ['grid', 'stack', 'tabs', 'masonry'].includes(value);
}

/**
 * Check if a value is a valid DashboardTheme
 */
export function isDashboardTheme(value: unknown): value is DashboardTheme {
  return typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
}

/**
 * Type guard for grid layout props
 * Use this to narrow WidgetLayoutProps to WidgetGridProps
 * @example
 * if (isGridLayout(props)) {
 *   console.log(props.columns);  // ✅ TypeScript knows about columns property
 * }
 */
export function isGridLayout(props: WidgetLayoutProps): props is WidgetGridProps {
  return props.layout === 'grid';
}

/**
 * Type guard for stack layout props
 * Use this to narrow WidgetLayoutProps to WidgetStackProps
 */
export function isStackLayout(props: WidgetLayoutProps): props is WidgetStackProps {
  return props.layout === 'stack';
}

/**
 * Type guard for tabs layout props
 * Use this to narrow WidgetLayoutProps to WidgetTabsPropsLayout
 */
export function isTabsLayout(props: WidgetLayoutProps): props is WidgetTabsPropsLayout {
  return props.layout === 'tabs';
}

/**
 * Type guard for masonry layout props
 * Use this to narrow WidgetLayoutProps to WidgetMasonryProps
 */
export function isMasonryLayout(props: WidgetLayoutProps): props is WidgetMasonryProps {
  return props.layout === 'masonry';
}
