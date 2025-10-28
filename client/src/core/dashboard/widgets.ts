/**
 * Dashboard Widget Definitions - Consolidated widget configurations
 */

import { WidgetConfig, WidgetType, AnalyticsMetrics, PerformanceMetrics, EngagementMetrics } from './types';

/**
 * Widget factory functions for creating common widget configurations
 */
export class WidgetFactory {
  static createAnalyticsWidget(
    id: string,
    title: string = 'Analytics Overview',
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): WidgetConfig {
    return {
      id,
      type: 'analytics',
      title,
      size: 'large',
      position,
      props: {
        showTrends: true,
        showUserSegments: true,
        timeframe: 'weekly',
      },
      refreshInterval: 300, // 5 minutes
      dataSource: 'analytics-api',
    };
  }

  static createPerformanceWidget(
    id: string,
    title: string = 'Performance Metrics',
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): WidgetConfig {
    return {
      id,
      type: 'performance',
      title,
      size: 'medium',
      position,
      props: {
        showCoreWebVitals: true,
        showBundleSize: true,
        showRecommendations: true,
      },
      refreshInterval: 60, // 1 minute
      dataSource: 'performance-api',
    };
  }

  static createEngagementWidget(
    id: string,
    title: string = 'User Engagement',
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): WidgetConfig {
    return {
      id,
      type: 'engagement',
      title,
      size: 'large',
      position,
      props: {
        showBillInteractions: true,
        showUserProfiles: true,
        showTrends: true,
        timeframe: 'daily',
      },
      refreshInterval: 180, // 3 minutes
      dataSource: 'engagement-api',
    };
  }

  static createMetricsWidget(
    id: string,
    title: string,
    metricType: string,
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): WidgetConfig {
    return {
      id,
      type: 'metrics',
      title,
      size: 'small',
      position,
      props: {
        metricType,
        showTrend: true,
        format: 'number',
      },
      refreshInterval: 120, // 2 minutes
      dataSource: 'metrics-api',
    };
  }

  static createChartWidget(
    id: string,
    title: string,
    chartType: 'line' | 'bar' | 'pie' | 'area',
    position: { x: number; y: number } = { x: 0, y: 0 }
  ): WidgetConfig {
    return {
      id,
      type: 'chart',
      title,
      size: 'medium',
      position,
      props: {
        chartType,
        showLegend: true,
        showTooltips: true,
        responsive: true,
      },
      refreshInterval: 300, // 5 minutes
      dataSource: 'chart-api',
    };
  }

  static createCustomWidget(
    id: string,
    title: string,
    componentName: string,
    position: { x: number; y: number } = { x: 0, y: 0 },
    props: Record<string, any> = {}
  ): WidgetConfig {
    return {
      id,
      type: 'custom',
      title,
      size: 'medium',
      position,
      props: {
        componentName,
        ...props,
      },
      refreshInterval: 0, // No auto-refresh for custom widgets by default
    };
  }
}

/**
 * Predefined dashboard templates
 */
export const DashboardTemplates = {
  analytics: {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Comprehensive analytics overview',
    layout: {
      id: 'analytics-layout',
      name: 'Analytics Layout',
      columns: 12,
      responsive: true,
      widgets: [
        WidgetFactory.createAnalyticsWidget('analytics-overview', 'Analytics Overview', { x: 0, y: 0 }),
        WidgetFactory.createEngagementWidget('user-engagement', 'User Engagement', { x: 6, y: 0 }),
        WidgetFactory.createMetricsWidget('total-views', 'Total Views', 'views', { x: 0, y: 4 }),
        WidgetFactory.createMetricsWidget('total-users', 'Active Users', 'users', { x: 3, y: 4 }),
        WidgetFactory.createChartWidget('engagement-trend', 'Engagement Trend', 'line', { x: 6, y: 4 }),
      ],
    },
    permissions: {
      view: ['user', 'expert', 'admin'],
      edit: ['admin'],
      admin: ['admin'],
    },
    settings: {
      autoRefresh: true,
      refreshInterval: 300,
      theme: 'auto' as const,
      compactMode: false,
      showTitles: true,
      enableAnimations: true,
    },
  },

  performance: {
    id: 'performance-dashboard',
    name: 'Performance Dashboard',
    description: 'System performance monitoring',
    layout: {
      id: 'performance-layout',
      name: 'Performance Layout',
      columns: 12,
      responsive: true,
      widgets: [
        WidgetFactory.createPerformanceWidget('performance-overview', 'Performance Overview', { x: 0, y: 0 }),
        WidgetFactory.createMetricsWidget('performance-score', 'Performance Score', 'performance', { x: 6, y: 0 }),
        WidgetFactory.createChartWidget('core-web-vitals', 'Core Web Vitals', 'bar', { x: 0, y: 3 }),
        WidgetFactory.createMetricsWidget('bundle-size', 'Bundle Size', 'bundle', { x: 9, y: 0 }),
      ],
    },
    permissions: {
      view: ['expert', 'admin'],
      edit: ['admin'],
      admin: ['admin'],
    },
    settings: {
      autoRefresh: true,
      refreshInterval: 60,
      theme: 'auto' as const,
      compactMode: false,
      showTitles: true,
      enableAnimations: true,
    },
  },

  executive: {
    id: 'executive-dashboard',
    name: 'Executive Dashboard',
    description: 'High-level overview for executives',
    layout: {
      id: 'executive-layout',
      name: 'Executive Layout',
      columns: 12,
      responsive: true,
      widgets: [
        WidgetFactory.createMetricsWidget('total-bills', 'Total Bills', 'bills', { x: 0, y: 0 }),
        WidgetFactory.createMetricsWidget('active-users', 'Active Users', 'users', { x: 3, y: 0 }),
        WidgetFactory.createMetricsWidget('engagement-score', 'Engagement Score', 'engagement', { x: 6, y: 0 }),
        WidgetFactory.createMetricsWidget('system-health', 'System Health', 'health', { x: 9, y: 0 }),
        WidgetFactory.createChartWidget('monthly-trends', 'Monthly Trends', 'area', { x: 0, y: 2 }),
        WidgetFactory.createChartWidget('user-distribution', 'User Distribution', 'pie', { x: 6, y: 2 }),
      ],
    },
    permissions: {
      view: ['admin'],
      edit: ['admin'],
      admin: ['admin'],
    },
    settings: {
      autoRefresh: true,
      refreshInterval: 600,
      theme: 'auto' as const,
      compactMode: true,
      showTitles: true,
      enableAnimations: false,
    },
  },
};

/**
 * Widget validation utilities
 */
export class WidgetValidator {
  static validateConfig(config: WidgetConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.id) {
      errors.push('Widget ID is required');
    }

    if (!config.type) {
      errors.push('Widget type is required');
    }

    if (!config.title) {
      errors.push('Widget title is required');
    }

    if (!config.position || typeof config.position.x !== 'number' || typeof config.position.y !== 'number') {
      errors.push('Valid position coordinates are required');
    }

    if (config.refreshInterval && config.refreshInterval < 0) {
      errors.push('Refresh interval must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validatePermissions(userRole: string, permissions?: string[]): boolean {
    if (!permissions || permissions.length === 0) {
      return true; // No restrictions
    }

    return permissions.includes(userRole);
  }
}