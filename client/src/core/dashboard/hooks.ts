/**
 * Dashboard Hooks - Consolidated dashboard hook functionality
 */

import { useCallback } from 'react';
import { useDashboard } from './context';
import { WidgetConfig, WidgetType, AnalyticsMetrics, PerformanceMetrics, EngagementMetrics } from './types';

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
  const { 
    state, 
    refreshWidget, 
    updateWidget, 
    removeWidget,
    getWidgetData,
    isWidgetLoading,
    getWidgetError
  } = useDashboard();

  const widget = state.config?.layout.widgets.find(w => w.id === widgetId);
  const data = getWidgetData(widgetId);
  const loading = isWidgetLoading(widgetId);
  const error = getWidgetError(widgetId);

  const refresh = useCallback(() => {
    refreshWidget(widgetId);
  }, [widgetId, refreshWidget]);

  const update = useCallback((config: Partial<WidgetConfig>) => {
    updateWidget(widgetId, config);
  }, [widgetId, updateWidget]);

  const remove = useCallback(() => {
    removeWidget(widgetId);
  }, [widgetId, removeWidget]);

  return {
    widget,
    data,
    loading,
    error,
    refresh,
    update,
    remove,
  };
}

/**
 * Hook for analytics widgets
 */
export function useAnalyticsWidget(widgetId: string) {
  const { widget, data, loading, error, refresh } = useWidget(widgetId);
  
  const analyticsData = data as AnalyticsMetrics | undefined;

  return {
    widget,
    data: analyticsData,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for performance widgets
 */
export function usePerformanceWidget(widgetId: string) {
  const { widget, data, loading, error, refresh } = useWidget(widgetId);
  
  const performanceData = data as PerformanceMetrics | undefined;

  return {
    widget,
    data: performanceData,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for engagement widgets
 */
export function useEngagementWidget(widgetId: string) {
  const { widget, data, loading, error, refresh } = useWidget(widgetId);
  
  const engagementData = data as EngagementMetrics | undefined;

  return {
    widget,
    data: engagementData,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for dashboard layout management
 */
export function useDashboardLayout() {
  const { state, updateLayout } = useDashboard();

  const layout = state.config?.layout;

  const moveWidget = useCallback((widgetId: string, newPosition: { x: number; y: number }) => {
    if (!layout) return;

    const updatedWidgets = layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, position: newPosition }
        : widget
    );

    updateLayout({
      ...layout,
      widgets: updatedWidgets,
    });
  }, [layout, updateLayout]);

  const resizeWidget = useCallback((widgetId: string, newSize: { width: number; height: number }) => {
    if (!layout) return;

    const updatedWidgets = layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, size: newSize }
        : widget
    );

    updateLayout({
      ...layout,
      widgets: updatedWidgets,
    });
  }, [layout, updateLayout]);

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

  const settings = state.config?.settings;

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

  const createWidget = useCallback((
    type: WidgetType,
    title: string,
    position: { x: number; y: number },
    props: Record<string, any> = {}
  ) => {
    const widget: WidgetConfig = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      size: 'medium',
      position,
      props,
    };

    addWidget(widget);
    return widget.id;
  }, [addWidget]);

  return {
    createWidget,
  };
}