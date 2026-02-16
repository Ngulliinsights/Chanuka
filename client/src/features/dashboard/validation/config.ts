/**
 * Dashboard Configuration Validator
 * Validates dashboard configuration objects according to Requirements 15.1, 15.2, 15.3
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export type WidgetType = 'chart' | 'table' | 'metric' | 'list';

export interface Widget {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  columns: number;
  rows: number;
  positions: WidgetPosition[];
}

export interface DashboardConfig {
  widgets: Widget[];
  layout: Layout;
  theme?: string;
  refreshInterval?: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

const WidgetTypeSchema = z.enum(['chart', 'table', 'metric', 'list'], {
  errorMap: () => ({ message: 'Widget type must be one of: chart, table, metric, list' }),
});

const WidgetSchema = z.object({
  id: z.string().min(1, 'Widget ID cannot be empty'),
  type: WidgetTypeSchema,
  config: z.record(z.unknown()),
});

const WidgetPositionSchema = z.object({
  widgetId: z.string().min(1, 'Widget ID in position cannot be empty'),
  x: z.number().int().nonnegative('X position must be a non-negative integer'),
  y: z.number().int().nonnegative('Y position must be a non-negative integer'),
  width: z.number().int().positive('Width must be a positive integer'),
  height: z.number().int().positive('Height must be a positive integer'),
});

const LayoutSchema = z.object({
  columns: z.number().int().positive('Columns must be a positive integer'),
  rows: z.number().int().positive('Rows must be a positive integer'),
  positions: z.array(WidgetPositionSchema),
});

export const dashboardConfigSchema = z.object({
  widgets: z.array(WidgetSchema).min(1, 'Dashboard must have at least one widget'),
  layout: LayoutSchema,
  theme: z.string().optional(),
  refreshInterval: z.number().int().positive('Refresh interval must be a positive integer').optional(),
});

// ============================================================================
// Validation Function
// ============================================================================

/**
 * Validates a dashboard configuration object
 * 
 * Requirements:
 * - 15.1: Validate all required fields (widgets, layout)
 * - 15.2: Reject configs with invalid widget types
 * - 15.3: Reject configs with invalid layout
 * - 15.5: Ensure widget positions reference existing widgets
 * 
 * @param config - The dashboard configuration to validate
 * @returns The validated dashboard configuration
 * @throws Error with descriptive message if validation fails
 */
export function validateDashboardConfig(config: unknown): DashboardConfig {
  // First, validate the structure using Zod
  const result = dashboardConfigSchema.safeParse(config);

  if (!result.success) {
    // Format Zod errors into a descriptive error message
    const errors = result.error.errors.map(err => {
      const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
      return `${path}${err.message}`;
    });
    
    throw new Error(
      `Invalid dashboard configuration: ${errors.join(', ')}`
    );
  }

  const validatedConfig = result.data;

  // Additional validation: ensure all widget positions reference existing widgets
  const widgetIds = new Set(validatedConfig.widgets.map(w => w.id));
  
  for (const position of validatedConfig.layout.positions) {
    if (!widgetIds.has(position.widgetId)) {
      throw new Error(
        `Widget position references non-existent widget: ${position.widgetId}`
      );
    }
  }

  return validatedConfig;
}

// ============================================================================
// Safe Validation Function
// ============================================================================

/**
 * Safe validation that returns a result object instead of throwing
 * 
 * @param config - The dashboard configuration to validate
 * @returns Validation result with success flag and data or error
 */
export function safeValidateDashboardConfig(config: unknown): {
  success: boolean;
  data?: DashboardConfig;
  error?: string;
} {
  try {
    const data = validateDashboardConfig(config);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
