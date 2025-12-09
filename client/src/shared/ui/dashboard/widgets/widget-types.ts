/**
 * Widget Types and Interfaces
 *
 * Type definitions for dashboard widgets
 */

import { ReactNode } from 'react';

// Base Widget Types
export type WidgetType =
  | 'chart'
  | 'metric'
  | 'table'
  | 'list'
  | 'form'
  | 'text'
  | 'image'
  | 'custom';

// Widget Size Presets
export type WidgetSize =
  | 'small'    // 1x1
  | 'medium'   // 2x2
  | 'large'    // 3x2
  | 'wide'     // 4x2
  | 'tall'     // 2x3
  | 'full';    // 4x3

// Widget Position
export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Widget Configuration
export interface WidgetConfig {
  /** Unique widget identifier */
  id: string;
  /** Widget type */
  type: WidgetType;
  /** Widget title */
  title: string;
  /** Widget description */
  description?: string;
  /** Widget size preset */
  size: WidgetSize;
  /** Custom position (overrides size preset) */
  position?: WidgetPosition;
  /** Widget-specific settings */
  settings?: Record<string, any>;
  /** Data source configuration */
  dataSource?: {
    type: 'api' | 'static' | 'realtime';
    endpoint?: string;
    refreshInterval?: number;
    params?: Record<string, any>;
  };
  /** Widget permissions */
  permissions?: string[];
  /** Widget styling */
  styling?: {
    variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
    theme?: 'light' | 'dark' | 'auto';
    customClasses?: string;
  };
  /** Widget behavior */
  behavior?: {
    resizable?: boolean;
    draggable?: boolean;
    removable?: boolean;
    collapsible?: boolean;
    refreshable?: boolean;
  };
}

// Widget Data Interfaces
export interface WidgetData {
  /** Data payload */
  data: any;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error?: string | null;
  /** Last updated timestamp */
  lastUpdated?: Date;
  /** Data metadata */
  metadata?: Record<string, any>;
}

// Chart Widget Types
export interface ChartWidgetConfig extends WidgetConfig {
  type: 'chart';
  settings: {
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    xAxis?: string;
    yAxis?: string;
    series?: Array<{
      name: string;
      data: number[];
      color?: string;
    }>;
    showLegend?: boolean;
    showGrid?: boolean;
  };
}

// Metric Widget Types
export interface MetricWidgetConfig extends WidgetConfig {
  type: 'metric';
  settings: {
    value: number | string;
    unit?: string;
    format?: 'number' | 'currency' | 'percentage';
    trend?: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
      label?: string;
    };
    thresholds?: Array<{
      value: number;
      color: string;
      label?: string;
    }>;
  };
}

// Table Widget Types
export interface TableWidgetConfig extends WidgetConfig {
  type: 'table';
  settings: {
    columns: Array<{
      key: string;
      title: string;
      sortable?: boolean;
      width?: number;
      align?: 'left' | 'center' | 'right';
    }>;
    pagination?: {
      enabled: boolean;
      pageSize: number;
      showSizeChanger?: boolean;
    };
    selectable?: boolean;
    expandable?: boolean;
  };
}

// List Widget Types
export interface ListWidgetConfig extends WidgetConfig {
  type: 'list';
  settings: {
    items: Array<{
      id: string;
      title: string;
      description?: string;
      icon?: string;
      status?: 'active' | 'inactive' | 'pending';
      actions?: Array<{
        label: string;
        action: string;
        icon?: string;
      }>;
    }>;
    sortable?: boolean;
    filterable?: boolean;
    searchable?: boolean;
  };
}

// Form Widget Types
export interface FormWidgetConfig extends WidgetConfig {
  type: 'form';
  settings: {
    fields: Array<{
      name: string;
      type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea';
      label: string;
      required?: boolean;
      placeholder?: string;
      options?: Array<{ label: string; value: any }>;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
      };
    }>;
    submitLabel?: string;
    resetLabel?: string;
    layout?: 'vertical' | 'horizontal' | 'inline';
  };
}

// Text Widget Types
export interface TextWidgetConfig extends WidgetConfig {
  type: 'text';
  settings: {
    content: string;
    format?: 'plain' | 'markdown' | 'html';
    alignment?: 'left' | 'center' | 'right';
    fontSize?: 'small' | 'medium' | 'large';
  };
}

// Image Widget Types
export interface ImageWidgetConfig extends WidgetConfig {
  type: 'image';
  settings: {
    src: string;
    alt: string;
    fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    clickable?: boolean;
    link?: string;
  };
}

// Custom Widget Types
export interface CustomWidgetConfig extends WidgetConfig {
  type: 'custom';
  settings: {
    component: string; // Component name or path
    props?: Record<string, any>;
  };
}

// Union type for all widget configurations
export type AnyWidgetConfig =
  | ChartWidgetConfig
  | MetricWidgetConfig
  | TableWidgetConfig
  | ListWidgetConfig
  | FormWidgetConfig
  | TextWidgetConfig
  | ImageWidgetConfig
  | CustomWidgetConfig;

// Widget Event Types
export interface WidgetEvent {
  type: 'update' | 'resize' | 'move' | 'remove' | 'refresh' | 'interact';
  widgetId: string;
  payload?: any;
  timestamp: Date;
}

// Widget Action Types
export type WidgetAction =
  | { type: 'UPDATE_CONFIG'; payload: Partial<WidgetConfig> }
  | { type: 'UPDATE_DATA'; payload: WidgetData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH' }
  | { type: 'RESIZE'; payload: { width: number; height: number } }
  | { type: 'MOVE'; payload: { x: number; y: number } };

// Widget State
export interface WidgetState {
  config: WidgetConfig;
  data: WidgetData;
  isEditing: boolean;
  isCollapsed: boolean;
}

// Size presets mapping
export const WIDGET_SIZE_PRESETS: Record<WidgetSize, WidgetPosition> = {
  small: { x: 0, y: 0, width: 1, height: 1 },
  medium: { x: 0, y: 0, width: 2, height: 2 },
  large: { x: 0, y: 0, width: 3, height: 2 },
  wide: { x: 0, y: 0, width: 4, height: 2 },
  tall: { x: 0, y: 0, width: 2, height: 3 },
  full: { x: 0, y: 0, width: 4, height: 3 },
};

// Default widget configurations
export const DEFAULT_WIDGET_CONFIGS: Record<WidgetType, Partial<WidgetConfig>> = {
  chart: {
    size: 'medium',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: true,
      refreshable: true,
    },
  },
  metric: {
    size: 'small',
    behavior: {
      resizable: false,
      draggable: true,
      removable: true,
      collapsible: false,
      refreshable: true,
    },
  },
  table: {
    size: 'large',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: true,
      refreshable: true,
    },
  },
  list: {
    size: 'medium',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: true,
      refreshable: true,
    },
  },
  form: {
    size: 'medium',
    behavior: {
      resizable: false,
      draggable: true,
      removable: true,
      collapsible: false,
      refreshable: false,
    },
  },
  text: {
    size: 'small',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: false,
      refreshable: false,
    },
  },
  image: {
    size: 'medium',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: false,
      refreshable: false,
    },
  },
  custom: {
    size: 'medium',
    behavior: {
      resizable: true,
      draggable: true,
      removable: true,
      collapsible: true,
      refreshable: true,
    },
  },
};