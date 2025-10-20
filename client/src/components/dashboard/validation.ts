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
  dueDate: z.date().optional(),
  category: z.string().max(100, 'Category too long').optional(),
  billId: z.string().optional(),
  completed: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
  isActive: z.boolean(),
  createdAt: z.date(),
  description: z.string().max(500, 'Description too long').optional(),
  keywords: z.array(z.string().max(50, 'Keyword too long')).optional(),
});

export const DashboardConfigSchema = z.object({
  refreshInterval: z.number().int().min(1000, 'Refresh interval must be at least 1 second').max(3600000, 'Refresh interval too long'),
  maxActionItems: z.number().int().min(1, 'Must show at least 1 action item').max(100, 'Too many action items'),
  maxTrackedTopics: z.number().int().min(1, 'Must show at least 1 topic').max(50, 'Too many topics'),
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

/**
 * Validation utility functions
 */

export function validateActionItem(item: unknown): any {
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

export function validateActivitySummary(summary: unknown): any {
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

export function validateTrackedTopic(topic: unknown): any {
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

export function validateDashboardConfig(config: unknown): any {
  try {
    return DashboardConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid dashboard configuration';
      throw new DashboardValidationError(message, field, config, { zodError: error });
    }
    throw new DashboardValidationError('Dashboard configuration validation failed', 'config', config);
  }
}

export function validateDashboardData(data: unknown): any {
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

export function safeValidateActionItem(item: unknown): { success: boolean; data?: any; error?: DashboardValidationError } {
  try {
    const data = validateActionItem(item);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}

export function safeValidateTrackedTopic(topic: unknown): { success: boolean; data?: any; error?: DashboardValidationError } {
  try {
    const data = validateTrackedTopic(topic);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}

export function safeValidateDashboardConfig(config: unknown): { success: boolean; data?: any; error?: DashboardValidationError } {
  try {
    const data = validateDashboardConfig(config);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as DashboardValidationError };
  }
}