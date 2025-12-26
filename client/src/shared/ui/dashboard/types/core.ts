/**
 * Core Dashboard Types - Simplified and Essential
 */

// ============================================================================
// Core Widget Types
// ============================================================================

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings?: Record<string, unknown>;
  visible?: boolean;
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  layout?: {
    columns: number;
    gap: number;
  };
}

export interface DashboardState {
  config: DashboardConfig | null;
  loading: boolean;
  error: Error | null;
}

// ============================================================================
// Component Props
// ============================================================================

export interface DashboardProps {
  className?: string;
  config?: DashboardConfig;
  onConfigChange?: (config: DashboardConfig) => void;
  onError?: (error: Error) => void;
}

export interface WidgetProps {
  config: WidgetConfig;
  data?: unknown;
  loading?: boolean;
  error?: Error | null;
  onUpdate?: (config: WidgetConfig) => void;
  onRemove?: () => void;
}

// ============================================================================
// Data Types
// ============================================================================

export interface DashboardStats {
  totalBills: number;
  totalComments: number;
  activeTracking: number;
  civicScore: number;
}

export interface ActivityRecord {
  id: string;
  type: 'view' | 'comment' | 'save' | 'share' | 'vote';
  title: string;
  timestamp: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: Date;
  completed: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseDashboardResult {
  data: {
    stats?: DashboardStats;
    activity?: ActivityRecord[];
    actions?: ActionItem[];
  };
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
  };
}