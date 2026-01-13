# Dashboard Types Consolidation - Quick Reference

## Import Statement
```typescript
import type {
  // Base widget and layout types
  WidgetConfig,
  WidgetSize,
  WidgetPosition,
  DashboardLayout,
  DashboardConfig,
  DashboardState,
  ResponsiveLayout,
  BreakpointConfig,
  DashboardPreferences,
  
  // Legacy application types
  ActionItem,
  ActionPriority,
  TrackedTopic,
  TopicCategory,
  DashboardData,
  DashboardAppConfig,
  DashboardSection,
  UseDashboardResult,
  
  // Metrics
  AnalyticsMetrics,
  PerformanceMetrics,
  EngagementMetrics,
  UserMetrics,
  
  // Component props
  DashboardProps,
  WidgetProps,
  DashboardSectionProps,
  FilterPanelProps,
  DataVisualizationProps,
  ExportMenuProps,
  
  // Events
  DashboardEvent,
  WidgetChangeEvent,
  LayoutChangeEvent,
  FilterChangeEvent,
  RefreshEvent,
  ExportEvent,
} from '@client/shared/types/dashboard';
```

## Type Organization

### 1. Core Types (`dashboard-base.ts`)
**Widget Level Types:**
- `WidgetPosition`: { x, y, z? }
- `WidgetSize`: { width, height, minWidth?, ... }
- `WidgetConfig`: Complete widget configuration

**Layout Level Types:**
- `DashboardLayout`: Grid/layout configuration
- `ResponsiveLayout`: Breakpoint-specific settings
- `BreakpointConfig`: Responsive breakpoint definition
- `DashboardPreferences`: User display preferences
- `DashboardConfig`: Complete dashboard config

**State Types:**
- `DashboardState`: Full dashboard state
- `WidgetData<T>`: Widget data container

**Legacy Application Types:**
- `ActionItem`: Action to display
- `TrackedTopic`: Topic tracking
- `DashboardData`: Dashboard container
- `DashboardAppConfig`: App configuration
- `UseDashboardResult`: Hook return type

### 2. Metrics Types (`dashboard-metrics.ts`)
- `AnalyticsMetrics`: Analytics data
- `PerformanceMetrics`: Performance data
- `EngagementMetrics`: User engagement
- `UserMetrics`: User statistics
- `ComparisonMetrics`: Metric comparisons
- `TimeSeries<T>`: Time-series data

### 3. Component Props (`dashboard-components.ts`)
- `DashboardProps`: Root dashboard props
- `WidgetProps`: Single widget props
- `DashboardSectionProps`: Section container props
- `FilterPanelProps`: Filter UI props
- `DataVisualizationProps`: Chart/viz props
- `ExportMenuProps`: Export UI props
- `DashboardHeaderProps`: Header component props
- `DashboardSidebarProps`: Sidebar component props
- `DashboardFooterProps`: Footer component props

### 4. Events (`dashboard-events.ts`)
- `DashboardEvent`: Base event
- `WidgetChangeEvent`: Widget update event
- `LayoutChangeEvent`: Layout change event
- `FilterChangeEvent`: Filter update event
- `RefreshEvent`: Refresh trigger event
- `ExportEvent`: Export action event

## Common Usage Patterns

### Creating a Widget
```typescript
const widget: WidgetConfig = {
  id: 'analytics-widget-1',
  type: 'analytics',
  title: 'Sales Analytics',
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
  settings: { timeframe: 'monthly' },
  dataSource: 'analytics-api',
};
```

### Creating a Dashboard Config
```typescript
const config: DashboardConfig = {
  id: 'dashboard-1',
  name: 'Sales Dashboard',
  layout: {
    id: 'layout-1',
    name: 'Grid Layout',
    type: 'grid',
    columns: 12,
    gap: 16,
    responsive: [...],
    breakpoints: [...]
  },
  preferences: {
    theme: 'dark',
    layout: 'standard',
    refreshInterval: 30000
  },
};
```

### Using in a Component
```typescript
export const Dashboard: React.FC<DashboardProps> = ({
  config,
  widgets,
  onWidgetChange,
  onLayoutChange,
}) => {
  // Component logic
};
```

### Hook Usage
```typescript
const { data, loading, error, actions, recovery } = useDashboard(config);

// Access data
const actionItems: ActionItem[] = data.actionItems;
const topics: TrackedTopic[] = data.trackedTopics;

// Perform actions
await actions.completeAction(actionId);
await actions.addTopic(topicData);
```

## Type Guards & Utilities

### Available Type Guards
```typescript
import { 
  isWidgetConfig, 
  isDashboardLayout, 
  isDashboardConfig 
} from '@client/shared/types/dashboard';

if (isWidgetConfig(obj)) {
  // obj is WidgetConfig
}
```

### Layout Utilities
```typescript
import {
  getWidgetDimensions,
  isValidPosition,
  widgetsOverlap,
  findNextAvailablePosition,
  optimizeLayout,
  calculateLayoutHeight,
  generateResponsiveLayout,
} from '@client/core/dashboard/utils';

// Get dimensions for a widget
const dims = getWidgetDimensions(widget.size);
// Returns: { width: number, height: number }

// Find optimal position for new widget
const pos = findNextAvailablePosition(widget, layout, existingWidgets);

// Optimize layout (remove gaps)
const optimized = optimizeLayout(layout, widgets);

// Calculate responsive layout
const { layout: responsive, widgets: responsive Widgets } = 
  generateResponsiveLayout(layout, widgets, 'mobile');
```

## Migration Guide

### Old Pattern → New Pattern

**Before:**
```typescript
import { DashboardConfig } from '@client/shared/ui/dashboard/types';
```

**After:**
```typescript
import type { DashboardConfig } from '@client/shared/types/dashboard';
```

**Or for legacy app config:**
```typescript
import type { DashboardAppConfig } from '@client/shared/types/dashboard';
```

### Updating Components
```typescript
// Old
import { DashboardComponentProps, DashboardConfig } from './types';

// New
import type { DashboardComponentProps } from './types';
import type { DashboardConfig } from '@client/shared/types/dashboard';
```

## Common Type Combinations

### For a Dashboard Container Component
```typescript
interface DashboardContainerProps {
  config: DashboardConfig;
  state: DashboardState;
  onStateChange: (state: DashboardState) => void;
  onEvent: (event: DashboardEvent) => void;
}
```

### For a Widget Renderer
```typescript
interface WidgetRendererProps {
  widget: WidgetConfig;
  data: WidgetData<any>;
  metrics?: AnalyticsMetrics;
  onUpdate: (updates: Partial<WidgetConfig>) => void;
  onEvent: (event: WidgetChangeEvent) => void;
}
```

### For Dashboard Hooks
```typescript
function useDashboard(config: DashboardConfig): UseDashboardResult {
  // Implementation
}

function useDashboardMetrics(): {
  metrics: Record<string, AnalyticsMetrics>;
  loading: boolean;
  error: Error | null;
} {
  // Implementation
}
```

## Error Handling

### Type Safety with Unknown Data
```typescript
import { isWidgetConfig, isDashboardConfig } from '@client/shared/types/dashboard';

function processData(data: unknown): void {
  if (isWidgetConfig(data)) {
    // Safely use as WidgetConfig
  } else if (isDashboardConfig(data)) {
    // Safely use as DashboardConfig
  }
}
```

## Related Documentation
- [Phase 1 Consolidation Progress](./PHASE_1_CONSOLIDATION_PROGRESS.md)
- [TypeScript Configuration](./client/tsconfig.json)
- [Dashboard Component Examples](./client/src/shared/ui/dashboard/)

## File Locations
| Type Category | Location |
|--------------|----------|
| Widget & Layout Types | `shared/types/dashboard/dashboard-base.ts` |
| Metrics Types | `shared/types/dashboard/dashboard-metrics.ts` |
| Component Props | `shared/types/dashboard/dashboard-components.ts` |
| Event Types | `shared/types/dashboard/dashboard-events.ts` |
| All Exports | `shared/types/dashboard/index.ts` |
| Legacy App Types | `shared/types/dashboard/dashboard-base.ts` |
| Utilities | `core/dashboard/utils.ts` |

---

**Last Updated**: 2026-01-13
**Version**: 1.0 (Phase 1 Complete)
