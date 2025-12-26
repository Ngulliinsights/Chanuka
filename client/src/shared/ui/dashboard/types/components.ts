/**
 * Dashboard Component Types - Simplified
 * Props and interfaces for dashboard UI components
 */

import { BaseComponentProps, ErrorInfo } from '../../types';

import { DashboardConfig, WidgetConfig } from './core';

// ============================================================================
// Dashboard Component Props
// ============================================================================

export interface DashboardComponentProps extends BaseComponentProps {
  config?: DashboardConfig;
  loading?: boolean;
  error?: ErrorInfo;
  onConfigChange?: (config: DashboardConfig) => void;
  onError?: (error: ErrorInfo) => void;
  onRefresh?: () => void;
}

export interface DashboardHeaderProps extends BaseComponentProps {
  title: string;
  description?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  onRefresh?: () => void;
  loading?: boolean;
}

export interface DashboardContentProps extends BaseComponentProps {
  widgets: WidgetConfig[];
  layout?: 'grid' | 'stack' | 'tabs';
  columns?: number;
  gap?: number;
  loading?: boolean;
  error?: ErrorInfo;
  onWidgetUpdate?: (widgetId: string, config: Partial<WidgetConfig>) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

export interface DashboardSidebarProps extends BaseComponentProps {
  sections?: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      label: string;
      onClick: () => void;
      active?: boolean;
    }>;
  }>;
  collapsed?: boolean;
  onToggle?: () => void;
}

export interface DashboardFooterProps extends BaseComponentProps {
  lastUpdated?: Date;
  status?: 'online' | 'offline' | 'syncing';
  onSync?: () => void;
}

// ============================================================================
// Dashboard Section Types
// ============================================================================

export interface DashboardSectionProps extends BaseComponentProps {
  title: string;
  description?: string;
  widgets: WidgetConfig[];
  loading?: boolean;
  error?: ErrorInfo;
  onWidgetUpdate?: (widgetId: string, config: Partial<WidgetConfig>) => void;
  onWidgetRemove?: (widgetId: string) => void;
}

export interface StatsSection {
  totalBills: number;
  totalComments: number;
  activeTracking: number;
  civicScore: number;
  monthlyGrowth: number;
}

export interface ActivitySection {
  recentActivity: Array<{
    id: string;
    type: 'view' | 'comment' | 'save' | 'share';
    title: string;
    timestamp: Date;
  }>;
  actionItems: Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: Date;
    completed: boolean;
  }>;
}

export interface BillsSection {
  trackedBills: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    engagementCount: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    reason: string;
    relevanceScore: number;
  }>;
}

// ============================================================================
// Dashboard Modal Types
// ============================================================================

export interface DashboardPreferencesModalProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
}

export interface DataExportModalProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: 'json' | 'csv' | 'pdf') => void;
  loading?: boolean;
}

// ============================================================================
// Dashboard Variant Types
// ============================================================================

export interface FullPageDashboardProps extends DashboardComponentProps {
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

export interface SectionDashboardProps extends DashboardComponentProps {
  section: 'stats' | 'activity' | 'bills' | 'analytics';
  compact?: boolean;
}