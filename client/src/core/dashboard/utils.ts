/**
 * Dashboard Utilities - Helper functions for dashboard operations
 */

import type { WidgetConfig, WidgetSize, DashboardLayout } from '@client/lib/types/dashboard';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string | string[];
    borderWidth?: number;
  }>;
}

/**
 * Calculate widget dimensions based on size
 */
export function getWidgetDimensions(size: 'small' | 'medium' | 'large' | 'full' | WidgetSize): { width: number; height: number } {
  if (typeof size === 'object') {
    return { width: size.width, height: size.height };
  }

  const dimensions = {
    small: { width: 3, height: 2 },
    medium: { width: 6, height: 4 },
    large: { width: 9, height: 6 },
    full: { width: 12, height: 8 },
  };

  return dimensions[size] || dimensions.medium;
}

/**
 * Check if widget position is valid within layout
 */
export function isValidPosition(
  widget: WidgetConfig,
  layout: DashboardLayout,
  excludeWidgetId?: string
): boolean {
  const dimensions = getWidgetDimensions(widget.size);
  const position = typeof widget.position === 'number' 
    ? { x: widget.position, y: 0 } 
    : typeof widget.position === 'object' && widget.position !== null && 'x' in widget.position && 'y' in widget.position
      ? { x: widget.position.x, y: widget.position.y }
      : { x: 0, y: 0 };

  // Check if widget fits within layout bounds
  if (position.x < 0 || position.y < 0 || position.x + dimensions.width > layout.columns) {
    return false;
  }

  return true;
}

/**
 * Check if two widgets overlap
 */
export function widgetsOverlap(widget1: WidgetConfig, widget2: WidgetConfig): boolean {
  const dims1 = getWidgetDimensions(widget1.size);
  const dims2 = getWidgetDimensions(widget2.size);

  const getPosition = (widget: WidgetConfig): { x: number; y: number } => {
    if (typeof widget.position === 'number') {
      return { x: widget.position, y: 0 };
    }
    if (typeof widget.position === 'object' && widget.position !== null && 'x' in widget.position && 'y' in widget.position) {
      return { x: widget.position.x || 0, y: widget.position.y || 0 };
    }
    return { x: 0, y: 0 };
  };

  const pos1 = getPosition(widget1);
  const pos2 = getPosition(widget2);

  return !(
    pos1.x + dims1.width <= pos2.x ||
    pos2.x + dims2.width <= pos1.x ||
    pos1.y + dims1.height <= pos2.y ||
    pos2.y + dims2.height <= pos1.y
  );
}

/**
 * Find next available position for a widget
 */
export function findNextAvailablePosition(
  widget: WidgetConfig,
  layout: DashboardLayout,
  existingWidgets: WidgetConfig[] = []
): { x: number; y: number } {
  const dimensions = getWidgetDimensions(widget.size);

  // Try to place widget in the first available position
  for (let y = 0; y < 100; y++) {
    // Reasonable upper limit
    for (let x = 0; x <= layout.columns - dimensions.width; x++) {
      const testWidget = {
        ...widget,
        position: { x, y },
      };

      if (isValidPosition(testWidget, layout)) {
        return { x, y };
      }
    }
  }

  // Fallback to bottom of layout
  const maxY = Math.max(
    ...existingWidgets.map(w => {
      const dims = getWidgetDimensions(w.size);
      const position = typeof w.position === 'number'
        ? { x: w.position, y: 0 }
        : typeof w.position === 'object' && w.position !== null && 'x' in w.position && 'y' in w.position
          ? { x: w.position.x || 0, y: w.position.y || 0 }
          : { x: 0, y: 0 };
      return position.y + dims.height;
    }),
    0
  );

  return { x: 0, y: maxY };
}

/**
 * Optimize layout by removing gaps
 */
export function optimizeLayout(layout: DashboardLayout, widgets: WidgetConfig[]): WidgetConfig[] {
  const getPosition = (widget: WidgetConfig): { x: number; y: number } => {
    if (typeof widget.position === 'number') {
      return { x: widget.position, y: 0 };
    }
    if (typeof widget.position === 'object' && widget.position !== null && 'x' in widget.position && 'y' in widget.position) {
      return { x: widget.position.x || 0, y: widget.position.y || 0 };
    }
    return { x: 0, y: 0 };
  };

  const sortedWidgets = [...widgets].sort((a, b) => {
    const aPos = getPosition(a);
    const bPos = getPosition(b);
    if (aPos.y !== bPos.y) {
      return aPos.y - bPos.y;
    }
    return aPos.x - bPos.x;
  });

  const optimizedWidgets: WidgetConfig[] = [];

  for (const widget of sortedWidgets) {
    const optimizedPosition = findNextAvailablePosition(widget, layout, optimizedWidgets);

    optimizedWidgets.push({
      ...widget,
      position: optimizedPosition,
    });
  }

  return optimizedWidgets;
}

/**
 * Calculate layout height
 */
export function calculateLayoutHeight(widgets: WidgetConfig[]): number {
  if (!widgets || widgets.length === 0) return 0;

  const getPosition = (widget: WidgetConfig): { x: number; y: number } => {
    if (typeof widget.position === 'number') {
      return { x: widget.position, y: 0 };
    }
    if (typeof widget.position === 'object' && widget.position !== null && 'x' in widget.position && 'y' in widget.position) {
      return { x: widget.position.x || 0, y: widget.position.y || 0 };
    }
    return { x: 0, y: 0 };
  };

  const maxY = Math.max(
    ...widgets.map(w => {
      const dims = getWidgetDimensions(w.size);
      const position = getPosition(w);
      return position.y + dims.height;
    }),
    0
  );

  return maxY * 60; // Rough estimate based on standard row height
}

/**
 * Generate responsive breakpoints for layout
 */
export function generateResponsiveLayout(
  layout: DashboardLayout,
  widgets: WidgetConfig[],
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): { layout: DashboardLayout; widgets: WidgetConfig[] } {
  const columnMap = {
    mobile: 1,
    tablet: 6,
    desktop: 12,
  };

  const targetColumns = columnMap[breakpoint];

  if (targetColumns >= layout.columns) {
    return { layout, widgets }; // No changes needed
  }

  // Stack widgets vertically for smaller screens
  const stackedWidgets = widgets.map((widget: WidgetConfig, index: number) => ({
    ...widget,
    position: { x: 0, y: index * 4 }, // Stack with some spacing
    size: breakpoint === 'mobile' ? 'full' : widget.size,
  }));

  return {
    layout: {
      ...layout,
      columns: targetColumns,
    },
    widgets: stackedWidgets,
  };
}

/**
 * Format chart data for different chart types
 */
export function formatChartData(
  rawData: Record<string, unknown>[],
  chartType: 'line' | 'bar' | 'pie' | 'area',
  labelField: string,
  valueField: string
): ChartData {
  const labels = rawData.map((item: Record<string, unknown>) => String(item[labelField] ?? ''));
  const values = rawData.map((item: Record<string, unknown>) => Number(item[valueField] ?? 0));

  const baseDataset = {
    label: 'Data',
    data: values,
  };

  switch (chartType) {
    case 'line':
      return {
        labels,
        datasets: [
          {
            ...baseDataset,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
          },
        ],
      };

    case 'bar':
      return {
        labels,
        datasets: [
          {
            ...baseDataset,
            backgroundColor: '#3b82f6',
            borderColor: '#1d4ed8',
            borderWidth: 1,
          },
        ],
      };

    case 'pie':
      return {
        labels,
        datasets: [
          {
            ...baseDataset,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
          },
        ],
      };

    case 'area':
      return {
        labels,
        datasets: [
          {
            ...baseDataset,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 2,
          },
        ],
      };

    default:
      return { labels, datasets: [baseDataset] };
  }
}

/**
 * Calculate widget performance score
 */
export function calculateWidgetPerformanceScore(
  loadTime: number,
  errorRate: number,
  refreshRate: number
): number {
  // Base score
  let score = 100;

  // Penalize slow load times (over 2 seconds)
  if (loadTime > 2000) {
    score -= Math.min(30, (loadTime - 2000) / 100);
  }

  // Penalize high error rates
  score -= errorRate * 50;

  // Penalize frequent refreshes (under 30 seconds)
  if (refreshRate > 0 && refreshRate < 30) {
    score -= (30 - refreshRate) / 2;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Generate widget export data
 */
export function exportWidgetData(widget: WidgetConfig, data: any): string {
  const exportData = {
    widget: {
      id: widget.id,
      type: widget.type,
      title: widget.title,
      size: widget.size,
      position: widget.position,
    },
    data,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config !== 'object' || config === null) {
    errors.push('Dashboard configuration must be an object');
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  if (!cfg.id) {
    errors.push('Dashboard ID is required');
  }

  if (!cfg.name) {
    errors.push('Dashboard name is required');
  }

  if (!cfg.layout) {
    errors.push('Dashboard layout is required');
  } else if (typeof cfg.layout === 'object' && cfg.layout !== null) {
    const layout = cfg.layout as Record<string, unknown>;
    if (!Array.isArray(layout.widgets)) {
      errors.push('Layout widgets must be an array');
    }

    if (typeof layout.columns !== 'number' || layout.columns < 1) {
      errors.push('Layout columns must be a positive number');
    }
  }

  if (!cfg.permissions) {
    errors.push('Dashboard permissions are required');
  }

  if (!cfg.settings) {
    errors.push('Dashboard settings are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

const defaultExport = {};
export default defaultExport;
