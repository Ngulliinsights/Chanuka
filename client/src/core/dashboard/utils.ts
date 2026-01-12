/**
 * Dashboard Utilities - Helper functions for dashboard operations
 */

import type { WidgetConfig, WidgetSize, DashboardLayout } from '@client/shared/ui/dashboard/types';

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
export function getWidgetDimensions(size: 'small' | 'medium' | 'large' | 'full'): { width: number; height: number } {
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
  const position = typeof widget.position === 'number' ? { x: widget.position, y: 0 } : (widget.position as any);

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

  const x1 = typeof widget1.position === 'number' ? widget1.position : (widget1.position as any).x || 0;
  const y1 = typeof widget1.position === 'number' ? 0 : (widget1.position as any).y || 0;
  const x2 = typeof widget2.position === 'number' ? widget2.position : (widget2.position as any).x || 0;
  const y2 = typeof widget2.position === 'number' ? 0 : (widget2.position as any).y || 0;

  return !(
    x1 + dims1.width <= x2 ||
    x2 + dims2.width <= x1 ||
    y1 + dims1.height <= y2 ||
    y2 + dims2.height <= y1
  );
}

/**
 * Find next available position for a widget
 */
export function findNextAvailablePosition(
  widget: WidgetConfig,
  layout: DashboardLayout
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
    ...layout.widgets.map(w => {
      const dims = getWidgetDimensions(w.size);
      return w.position.y + dims.height;
    }),
    0
  );

  return { x: 0, y: maxY };
}

/**
 * Optimize layout by removing gaps
 */
export function optimizeLayout(layout: DashboardLayout): DashboardLayout {
  const sortedWidgets = [...layout.widgets].sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }
    return a.position.x - b.position.x;
  });

  const optimizedWidgets: WidgetConfig[] = [];

  for (const widget of sortedWidgets) {
    const optimizedPosition = findNextAvailablePosition(widget, {
      ...layout,
      widgets: optimizedWidgets,
    });

    optimizedWidgets.push({
      ...widget,
      position: optimizedPosition,
    });
  }

  return {
    ...layout,
    widgets: optimizedWidgets,
  };
}

/**
 * Calculate layout height
 */
export function calculateLayoutHeight(layout: DashboardLayout): number {
  if ((layout as any).widgets && (layout as any).widgets.length === 0) return 0;

  return 0;
}

/**
 * Generate responsive breakpoints for layout
 */
export function generateResponsiveLayout(
  layout: DashboardLayout,
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): DashboardLayout {
  const columnMap = {
    mobile: 1,
    tablet: 6,
    desktop: 12,
  };

  const targetColumns = columnMap[breakpoint];

  if (targetColumns >= layout.columns) {
    return layout; // No changes needed
  }

  // Stack widgets vertically for smaller screens
  const stackedWidgets = (layout as any).widgets ? (layout as any).widgets.map((widget: WidgetConfig, index: number) => ({
    ...widget,
    position: { x: 0, y: index * 4 }, // Stack with some spacing
    size: breakpoint === 'mobile' ? 'full' : widget.size,
  })) : [];

  return {
    ...layout,
    columns: targetColumns,
    widgets: stackedWidgets,
  };
}

/**
 * Format chart data for different chart types
 */
export function formatChartData(
  rawData: any[],
  chartType: 'line' | 'bar' | 'pie' | 'area',
  labelField: string,
  valueField: string
): ChartData {
  const labels = rawData.map((item: any) => item[labelField]);
  const values = rawData.map((item: any) => item[valueField]);

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
export function validateDashboardConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Dashboard ID is required');
  }

  if (!config.name) {
    errors.push('Dashboard name is required');
  }

  if (!config.layout) {
    errors.push('Dashboard layout is required');
  } else {
    if (!Array.isArray(config.layout.widgets)) {
      errors.push('Layout widgets must be an array');
    }

    if (typeof config.layout.columns !== 'number' || config.layout.columns < 1) {
      errors.push('Layout columns must be a positive number');
    }
  }

  if (!config.permissions) {
    errors.push('Dashboard permissions are required');
  }

  if (!config.settings) {
    errors.push('Dashboard settings are required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

const defaultExport = {};
export default defaultExport;
