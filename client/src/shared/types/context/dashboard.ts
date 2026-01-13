/**
 * Dashboard Context Types - STANDARDIZED with DISCRIMINATED UNIONS
 *
 * Standardized dashboard context types using discriminated unions
 * Following the exemplary pattern from LoadingAction in loading.ts
 *
 * Key improvements:
 * - Discriminated unions for action types
 * - Consistent naming conventions
 * - Comprehensive documentation
 * - Type-safe dashboard state management
 */

import type { WidgetConfig, DashboardConfig } from '../../ui/types';
import type { ActionItem, TrackedTopic, DashboardData } from '../dashboard';

// ============================================================================
// Dashboard Context Value (Standardized)
// ============================================================================

export interface DashboardContextValue {
  // Dashboard state
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  config: DashboardConfig;

  // Dashboard actions
  refresh: () => Promise<void>;
  reset: () => void;

  // Topic management
  addTopic: (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => Promise<void>;
  removeTopic: (topicId: string) => Promise<void>;

  // Action management
  completeAction: (actionId: string) => Promise<void>;
  addAction: (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;

  // Widget management
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => Promise<void>;
  moveWidget: (widgetId: string, newPosition: { x: number; y: number }) => Promise<void>;
  resizeWidget: (widgetId: string, newSize: { width: number; height: number }) => Promise<void>;

  // Configuration management
  updateConfig: (updates: Partial<DashboardConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;

  // Layout management
  setLayout: (layout: 'grid' | 'stack' | 'tabs' | 'masonry') => void;
  setColumns: (columns: number) => void;
  setGap: (gap: number) => void;

  // Recovery functionality
  canRecover: boolean;
  suggestions: string[];
  recover: () => Promise<boolean>;
}

// ============================================================================
// Dashboard Context Actions (DISCRIMINATED UNION)
// ============================================================================
// Following the exact pattern from LoadingAction in loading.ts

export type DashboardContextAction =
  | {
      type: 'REFRESH_DASHBOARD';
      payload?: { force?: boolean };
    }
  | {
      type: 'RESET_DASHBOARD';
      payload?: { hardReset?: boolean };
    }
  | {
      type: 'ADD_TOPIC';
      payload: { topic: Omit<TrackedTopic, 'id' | 'created_at'> };
    }
  | {
      type: 'REMOVE_TOPIC';
      payload: { topicId: string };
    }
  | {
      type: 'COMPLETE_ACTION';
      payload: { actionId: string };
    }
  | {
      type: 'ADD_ACTION';
      payload: { action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'> };
    }
  | {
      type: 'ADD_WIDGET';
      payload: { widget: Omit<WidgetConfig, 'id'> };
    }
  | {
      type: 'REMOVE_WIDGET';
      payload: { widgetId: string };
    }
  | {
      type: 'UPDATE_WIDGET';
      payload: { widgetId: string; updates: Partial<WidgetConfig> };
    }
  | {
      type: 'MOVE_WIDGET';
      payload: { widgetId: string; newPosition: { x: number; y: number } };
    }
  | {
      type: 'RESIZE_WIDGET';
      payload: { widgetId: string; newSize: { width: number; height: number } };
    }
  | {
      type: 'UPDATE_CONFIG';
      payload: { updates: Partial<DashboardConfig> };
    }
  | {
      type: 'RESET_CONFIG';
      payload?: { hardReset?: boolean };
    }
  | {
      type: 'SET_LAYOUT';
      payload: { layout: 'grid' | 'stack' | 'tabs' | 'masonry' };
    }
  | {
      type: 'SET_COLUMNS';
      payload: { columns: number };
    }
  | {
      type: 'SET_GAP';
      payload: { gap: number };
    }
  | {
      type: 'UPDATE_DASHBOARD_DATA';
      payload: { data: Partial<DashboardData> };
    }
  | {
      type: 'SET_LOADING';
      payload: { loading: boolean };
    }
  | {
      type: 'SET_ERROR';
      payload: { error: Error | null };
    }
  | {
      type: 'RECOVER_DASHBOARD';
      payload?: { force?: boolean };
    };

// ============================================================================
// Dashboard Context State (Standardized)
// ============================================================================

export interface DashboardContextState {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  config: DashboardConfig;
  layout: {
    type: 'grid' | 'stack' | 'tabs' | 'masonry';
    columns: number;
    gap: number;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
  };
}

// ============================================================================
// Dashboard Context Provider Props
// ============================================================================

export interface DashboardContextProviderProps {
  children: React.ReactNode;
  initialData?: Partial<DashboardData>;
  initialConfig?: Partial<DashboardConfig>;
  initialLayout?: {
    type?: 'grid' | 'stack' | 'tabs' | 'masonry';
    columns?: number;
    gap?: number;
  };
  onError?: (error: Error) => void;
  onDataChange?: (data: DashboardData) => void;
  onConfigChange?: (config: DashboardConfig) => void;
}

// ============================================================================
// Widget Management Context (Specialized)
// ============================================================================

export interface WidgetManagementContextValue {
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

// ============================================================================
// Widget Management Context Actions (DISCRIMINATED UNION)
// ============================================================================

export type WidgetManagementContextAction =
  | {
      type: 'ADD_WIDGET';
      payload: { widget: Omit<WidgetConfig, 'id'> };
    }
  | {
      type: 'REMOVE_WIDGET';
      payload: { widgetId: string };
    }
  | {
      type: 'UPDATE_WIDGET';
      payload: { widgetId: string; updates: Partial<WidgetConfig> };
    }
  | {
      type: 'MOVE_WIDGET';
      payload: { widgetId: string; newPosition: { x: number; y: number } };
    }
  | {
      type: 'RESIZE_WIDGET';
      payload: { widgetId: string; newSize: { width: number; height: number } };
    }
  | {
      type: 'TOGGLE_WIDGET_VISIBILITY';
      payload: { widgetId: string };
    }
  | {
      type: 'UPDATE_WIDGET_SETTINGS';
      payload: { widgetId: string; settings: Record<string, any> };
    }
  | {
      type: 'SET_WIDGETS_LOADING';
      payload: { loading: boolean };
    }
  | {
      type: 'SET_WIDGETS_ERROR';
      payload: { error: Error | null };
    };

// ============================================================================
// Type Guards for Dashboard Context Actions
// ============================================================================

export function isRefreshDashboardAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'REFRESH_DASHBOARD' }> {
  return action.type === 'REFRESH_DASHBOARD';
}

export function isAddWidgetAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'ADD_WIDGET' }> {
  return action.type === 'ADD_WIDGET';
}

export function isRemoveWidgetAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'REMOVE_WIDGET' }> {
  return action.type === 'REMOVE_WIDGET';
}

export function isUpdateWidgetAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'UPDATE_WIDGET' }> {
  return action.type === 'UPDATE_WIDGET';
}

export function isUpdateConfigAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'UPDATE_CONFIG' }> {
  return action.type === 'UPDATE_CONFIG';
}

export function isSetLayoutAction(action: DashboardContextAction): action is Extract<DashboardContextAction, { type: 'SET_LAYOUT' }> {
  return action.type === 'SET_LAYOUT';
}