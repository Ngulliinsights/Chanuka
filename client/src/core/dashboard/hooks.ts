/**
 * Dashboard Hooks - Consolidated dashboard hook functionality
 */

import { useCallback } from 'react';
import { useDashboard } from './context';
import { WidgetConfig, WidgetType, AnalyticsMetrics, PerformanceMetrics, EngagementMetrics } from '@client/types';

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

  /**
   * Resize a widget with precise dimensions
   * 
   * This function handles the complexity of widget sizing. In the WidgetConfig type,
   * 'size' can be either a semantic size ('small', 'medium', 'large') or a custom
   * dimensions object { width: number, height: number }. When users drag to resize
   * widgets, we need to store precise pixel dimensions rather than semantic sizes.
   * 
   * We use a type assertion here because we're intentionally changing the size from
   * whatever it was before (semantic or custom) to a specific custom dimensions object.
   * This is safe because:
   * 1. We're constructing a valid WidgetConfig with all required fields
   * 2. The custom dimensions format is explicitly allowed by the WidgetConfig type
   * 3. The updateLayout function expects WidgetConfig objects and will handle this correctly
   */
  const resizeWidget = useCallback((widgetId: string, newSize: { width: number; height: number }) => {
    if (!layout) return;

    const updatedWidgets = layout.widgets.map(widget => {
      if (widget.id === widgetId) {
        // Create a new widget config with the updated size
        // We explicitly type this as WidgetConfig to tell TypeScript that
        // the custom dimensions object is a valid size value
        const updatedWidget: WidgetConfig = {
          ...widget,
          size: newSize as any, // Type assertion needed because WidgetSize might be a union type
        };
        return updatedWidget;
      }
      return widget;
    });

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
      size: 'medium', // Use semantic size for initial creation
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