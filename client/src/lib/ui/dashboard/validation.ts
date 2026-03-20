import { z } from 'zod';

import { DashboardValidationError } from './errors';

/**
 * Dashboard validation schemas and utilities
 * Following navigation component validation patterns
 */

export const ActionPrioritySchema = z.enum(['High', 'Medium', 'Low']);
export const TopicCategorySchema = z.enum(['legislative', 'community', 'policy', 'advocacy']);
export const DashboardSectionSchema = z.enum(['activity', 'actions', 'topics', 'analytics']);

export const ActionItemSchema = z.object({
  id: z.string().min(1, 'Action item ID cannot be empty'),
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long'),
  description: z.string().min(1, 'Description cannot be empty').max(1000, 'Description too long'),
  priority: ActionPrioritySchema,
  due_date: z.date().optional(),
  category: z.string().max(100, 'Category too long').optional(),
  bill_id: z.string().optional(),
  completed: z.boolean().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const ActivitySummarySchema = z.object({
  billsTracked: z.number().int().min(0, 'Bills tracked cannot be negative'),
  actionsNeeded: z.number().int().min(0, 'Actions needed cannot be negative'),
  topicsCount: z.number().int().min(0, 'Topics count cannot be negative'),
  recentActivity: z.number().int().min(0, 'Recent activity cannot be negative'),
  completedActions: z.number().int().min(0, 'Completed actions cannot be negative'),
  pendingActions: z.number().int().min(0, 'Pending actions cannot be negative'),
  lastUpdated: z.date(),
});

export const TrackedTopicSchema = z.object({
  id: z.string().min(1, 'Topic ID cannot be empty'),
  name: z.string().min(1, 'Topic name cannot be empty').max(100, 'Topic name too long'),
  category: TopicCategorySchema,
  billCount: z.number().int().min(0, 'Bill count cannot be negative'),
  is_active: z.boolean(),
  created_at: z.date(),
  description: z.string().max(500, 'Description too long').optional(),
  keywords: z.array(z.string().max(50, 'Keyword too long')).optional(),
});

export const DashboardConfigSchema = z.object({
  refreshInterval: z
    .number()
    .int()
    .min(1000, 'Refresh interval must be at least 1 second')
    .max(3600000, 'Refresh interval too long'),
  maxActionItems: z
    .number()
    .int()
    .min(1, 'Must show at least 1 action item')
    .max(100, 'Too many action items'),
  maxTrackedTopics: z
    .number()
    .int()
    .min(1, 'Must show at least 1 topic')
    .max(50, 'Too many topics'),
  enableAutoRefresh: z.boolean(),
  showCompletedActions: z.boolean(),
  defaultView: DashboardSectionSchema,
});

export const DashboardDataSchema = z.object({
  summary: ActivitySummarySchema,
  actionItems: z.array(ActionItemSchema),
  trackedTopics: z.array(TrackedTopicSchema),
  isLoading: z.boolean(),
  error: z.instanceof(Error).nullable(),
  lastRefresh: z.date().nullable(),
});

// Widget and Layout Schemas for complete DashboardConfig validation
export const WidgetPositionSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  z: z.number().int().optional(),
});

export const WidgetSizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
});

export const AppWidgetConfigSchema = z.object({
  id: z.string().min(1, 'Widget ID cannot be empty'),
  type: z.enum(['analytics', 'performance', 'engagement', 'metrics', 'chart', 'custom']),
  title: z.string().min(1, 'Widget title cannot be empty'),
  size: z.enum(['small', 'medium', 'large', 'full']),
  position: WidgetPositionSchema,
  props: z.record(z.unknown()),
  permissions: z.array(z.string()).optional(),
  refreshInterval: z.number().int().positive().optional(),
  dataSource: z.string().optional(),
});

export const AppDashboardLayoutSchema = z.object({
  id: z.string().min(1, 'Layout ID cannot be empty'),
  name: z.string().min(1, 'Layout name cannot be empty'),
  widgets: z.array(AppWidgetConfigSchema),
  columns: z.number().int().positive(),
  responsive: z.boolean(),
});

export const PermissionConfigSchema = z.object({
  view: z.array(z.string()),
  edit: z.array(z.string()),
  admin: z.array(z.string()),
});

export const DashboardSettingsSchema = z.object({
  autoRefresh: z.boolean(),
  refreshInterval: z.number().int().positive(),
  theme: z.enum(['light', 'dark', 'auto']),
  compactMode: z.boolean(),
  showTitles: z.boolean(),
  enableAnimations: z.boolean(),
});

// Complete DashboardConfig schema matching the types.ts definition
export const CompleteDashboardConfigSchema = z.object({
  id: z.string().min(1, 'Dashboard ID cannot be empty'),
  name: z.string().min(1, 'Dashboard name cannot be empty'),
  title: z.string().optional(),
  description: z.string().optional(),
  layout: AppDashboardLayoutSchema,
  permissions: PermissionConfigSchema,
  settings: DashboardSettingsSchema,
  refreshInterval: z.number().int().positive().optional(),
  maxActionItems: z.number().int().positive().optional(),
  maxTrackedTopics: z.number().int().positive().optional(),
  enableAutoRefresh: z.boolean().optional(),
  showCompletedActions: z.boolean().optional(),
  defaultView: DashboardSectionSchema.optional(),
  navigation: z
    .object({
      breadcrumbs: z
        .object({
          enabled: z.boolean(),
          separator: z.string().optional(),
        })
        .optional(),
      pageControls: z
        .object({
          enabled: z.boolean(),
        })
        .optional(),
    })
    .optional(),
  theme: z
    .object({
      colorScheme: z.enum(['light', 'dark', 'auto']),
    })
    .optional(),
});

// Type definitions derived from schemas
export type ActivitySummary = z.infer<typeof ActivitySummarySchema>;
export type TrackedTopic = z.infer<typeof TrackedTopicSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;
export type CompleteDashboardConfig = z.infer<typeof CompleteDashboardConfigSchema>;
export type DashboardData = z.infer<typeof DashboardDataSchema>;
export type ActionPriority = z.infer<typeof ActionPrioritySchema>;
export type TopicCategory = z.infer<typeof TopicCategorySchema>;
export type DashboardSection = z.infer<typeof DashboardSectionSchema>;

/**
 * Validation utility functions
 */

export function validateActionItem(item: unknown): ActionItem {
  try {
    return ActionItemSchema.parse(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid action item';
      throw new DashboardValidationError(message, field, item, { zodError: error });
    }
    throw new DashboardValidationError('Action item validation failed', 'item', item);
  }
}

export function validateActivitySummary(summary: unknown): ActivitySummary {
  try {
    return ActivitySummarySchema.parse(summary);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid activity summary';
      throw new DashboardValidationError(message, field, summary, { zodError: error });
    }
    throw new DashboardValidationError('Activity summary validation failed', 'summary', summary);
  }
}

export function validateTrackedTopic(topic: unknown): TrackedTopic {
  try {
    return TrackedTopicSchema.parse(topic);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid tracked topic';
      throw new DashboardValidationError(message, field, topic, { zodError: error });
    }
    throw new DashboardValidationError('Tracked topic validation failed', 'topic', topic);
  }
}

export function validateDashboardConfig(config: unknown): DashboardConfig {
  try {
    return DashboardConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid dashboard configuration';
      throw new DashboardValidationError(message, field, config, { zodError: error });
    }
    throw new DashboardValidationError(
      'Dashboard configuration validation failed',
      'config',
      config
    );
  }
}

export function validateCompleteDashboardConfig(config: unknown): CompleteDashboardConfig {
  try {
    const result = CompleteDashboardConfigSchema.parse(config);

    // Additional validation: ensure all widget positions reference existing widgets
    const widgetIds = new Set(result.layout.widgets.map((w) => w.id));
    for (const widget of result.layout.widgets) {
      if (!widgetIds.has(widget.id)) {
        throw new Error(`Widget position references non-existent widget: ${widget.id}`);
      }
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid dashboard configuration';
      throw new DashboardValidationError(message, field, config, { zodError: error });
    }
    throw new DashboardValidationError(
      'Complete dashboard configuration validation failed',
      'config',
      config
    );
  }
}

export function validateDashboardData(data: unknown): DashboardData {
  try {
    return DashboardDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid dashboard data';
      throw new DashboardValidationError(message, field, data, { zodError: error });
    }
    throw new DashboardValidationError('Dashboard data validation failed', 'data', data);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateActionItem(item: unknown): {
  success: boolean;
  data?: ActionItem;
  error?: DashboardValidationError;
} {
  try {
    const data = validateActionItem(item);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}

export function safeValidateTrackedTopic(topic: unknown): {
  success: boolean;
  data?: TrackedTopic;
  error?: DashboardValidationError;
} {
  try {
    const data = validateTrackedTopic(topic);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}

export function safeValidateDashboardConfig(config: unknown): {
  success: boolean;
  data?: DashboardConfig;
  error?: DashboardValidationError;
} {
  try {
    const data = validateDashboardConfig(config);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}

export function safeValidateCompleteDashboardConfig(config: unknown): {
  success: boolean;
  data?: CompleteDashboardConfig;
  error?: DashboardValidationError;
} {
  try {
    const data = validateCompleteDashboardConfig(config);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}
