/**
 * Dashboard Hooks - Consolidated dashboard hook functionality
 */

import { useCallback } from 'react';

import { WidgetConfig } from '@client/shared/types';

import { useDashboard } from './context';

/**
 * Main dashboard hook - provides all dashboard functionality
 */
export function useDashboardSystem() {
  return useDashboard();
}

/**
 * Hook for widget management
 */
export function useWidget(widgetId: string) {
  const { refreshWidget, updateWidget, removeWidget, getWidget } = useDashboard();

  const widget = getWidget(widgetId);

  const refresh = useCallback(() => {
    refreshWidget(widgetId);
  }, [widgetId, refreshWidget]);

  const update = useCallback(
    (config: Partial<WidgetConfig>) => {
      updateWidget(widgetId, config);
    },
    [widgetId, updateWidget]
  );

  const remove = useCallback(() => {
    removeWidget(widgetId);
  }, [widgetId, removeWidget]);

  return {
    widget,
    refresh,
    update,
    remove,
  };
}

/**
 * Hook for analytics widgets
 */
export function useAnalyticsWidget(widgetId: string) {
  const { widget, refresh } = useWidget(widgetId);

  return {
    widget,
    refresh,
  };
}

/**
 * Hook for performance widgets
 */
export function usePerformanceWidget(widgetId: string) {
  const { widget, refresh } = useWidget(widgetId);

  return {
    widget,
    refresh,
  };
}

/**
 * Hook for engagement widgets
 */
export function useEngagementWidget(widgetId: string) {
  const { widget, refresh } = useWidget(widgetId);

  return {
    widget,
    refresh,
  };
}

/**
 * Hook for dashboard layout management
 */
export function useDashboardLayout() {
  const { state, updateLayout } = useDashboard();

  const layout = state.layout;

  const moveWidget = useCallback(
    (_widgetId: string, _newPosition: { x: number; y: number }) => {
      // Update the widget position - widgets are stored in state.widgets, not layout.widgets
      // This would need to be implemented via updateWidget instead
      // For now, just update layout properties
      updateLayout({
        ...layout,
      });
    },
    [layout, updateLayout]
  );

  const resizeWidget = useCallback(
    (_widgetId: string, _newSize: { width: number; height: number }) => {
      // Similar to moveWidget, resize operations would update the widget config
      // not the layout structure
      updateLayout({
        ...layout,
      });
    },
    [layout, updateLayout]
  );

  return {
    layout,
    moveWidget,
    resizeWidget,
    updateLayout,
  };
}

/**
 * Hook for dashboard settings
 */
export function useDashboardSettings() {
  const { state, updateSettings } = useDashboard();

  // Settings are stored as part of state in this implementation
  // You could extend DashboardState to include explicit settings or extract them here
  const settings = {
    theme: 'auto' as const,
    autoRefresh: state.autoRefresh,
    refreshInterval: state.refreshInterval,
  };

  return {
    settings,
    updateSettings,
  };
}

/**
 * Hook for creating new widgets
 */
export function useWidgetCreator() {
  const { addWidget } = useDashboard();

  const createWidget = useCallback(
    (
      type: string,
      title: string,
      position: { x: number; y: number },
      props: Record<string, unknown> = {}
    ) => {
      const widget: WidgetConfig = {
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        size: {
          width: 400,
          height: 300,
        },
        position,
        settings: props,
        visible: true,
        collapsible: true,
        removable: true,
        resizable: true,
        draggable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addWidget(widget);
      return widget.id;
    },
    [addWidget]
  );

  return {
    createWidget,
  };
}
