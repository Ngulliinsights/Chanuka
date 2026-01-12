/**
 * Widget Types - Simplified
 * Essential widget types for dashboard components
 */

import { BaseComponentProps, ErrorInfo } from '../../types';

import { WidgetConfig, WidgetType } from './core';

export interface WidgetProps extends BaseComponentProps {
  config: WidgetConfig;
  data?: unknown;
  loading?: boolean;
  error?: ErrorInfo;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  onRefresh?: () => void;
}

// ============================================================================
// Specific Widget Types
// ============================================================================

export interface AnalyticsWidgetData {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueUsers: number;
  engagementScore: number;
}

export interface PerformanceWidgetData {
  loadTime: number;
  performanceScore: number;
  coreWebVitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

export interface EngagementWidgetData {
  billInteractions: Array<{
    bill_id: number;
    billTitle: string;
    totalEngagement: number;
  }>;
  userProfiles: Array<{
    user_id: string;
    userName: string;
    engagementLevel: 'high' | 'medium' | 'low';
  }>;
}

export interface MetricsWidgetData {
  totalBills: number;
  totalComments: number;
  activeTracking: number;
  civicScore: number;
  monthlyGrowth: number;
}

export interface ChartWidgetData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }>;
}

// ============================================================================
// Widget Layout Types
// ============================================================================

export interface WidgetLayoutProps extends BaseComponentProps {
  widgets: WidgetConfig[];
  layout?: 'grid' | 'stack' | 'tabs';
  columns?: number;
  gap?: number;
  onWidgetUpdate?: (widgetId: string, config: Partial<WidgetConfig>) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

export interface WidgetGridProps extends WidgetLayoutProps {
  columns: number;
  responsive?: boolean;
}

export interface WidgetStackProps extends WidgetLayoutProps {
  direction?: 'vertical' | 'horizontal';
  spacing?: 'tight' | 'normal' | 'loose';
}

export interface WidgetTabsProps extends WidgetLayoutProps {
  sections: Array<{
    id: string;
    title: string;
    widgets: WidgetConfig[];
  }>;
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}
