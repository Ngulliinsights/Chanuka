/**
 * Dashboard validation functions
 */

import type {
  ActionItem,
  TrackedTopic,
  DashboardData,
  DashboardAppConfig,
} from '@client/lib/types/dashboard';

export function validateActionItem(action: ActionItem): void {
  if (!action.id || typeof action.id !== 'string') {
    throw new Error('Action item must have a valid ID');
  }

  if (!action.title || typeof action.title !== 'string' || action.title.trim().length === 0) {
    throw new Error('Action item must have a valid title');
  }

  if (!['High', 'Medium', 'Low'].includes(action.priority)) {
    throw new Error('Action item must have a valid priority (High, Medium, or Low)');
  }

  if (typeof action.completed !== 'boolean') {
    throw new Error('Action item completed status must be a boolean');
  }

  if (!(action.created_at instanceof Date)) {
    throw new Error('Action item must have a valid created_at date');
  }

  if (!(action.updated_at instanceof Date)) {
    throw new Error('Action item must have a valid updated_at date');
  }
}

export function validateTrackedTopic(topic: TrackedTopic): void {
  if (!topic.id || typeof topic.id !== 'string') {
    throw new Error('Tracked topic must have a valid ID');
  }

  if (!topic.name || typeof topic.name !== 'string' || topic.name.trim().length === 0) {
    throw new Error('Tracked topic must have a valid name');
  }

  const validCategories = [
    'healthcare',
    'education',
    'environment',
    'economy',
    'security',
    'infrastructure',
    'social',
    'other',
  ];
  if (!validCategories.includes(topic.category)) {
    throw new Error('Tracked topic must have a valid category');
  }

  if (typeof topic.billCount !== 'number' || topic.billCount < 0) {
    throw new Error('Tracked topic bill count must be a non-negative number');
  }

  if (typeof topic.is_active !== 'boolean') {
    throw new Error('Tracked topic active status must be a boolean');
  }

  if (!(topic.created_at instanceof Date)) {
    throw new Error('Tracked topic must have a valid created_at date');
  }
}

export function validateDashboardData(data: DashboardData): void {
  if (!data.summary || typeof data.summary !== 'object') {
    throw new Error('Dashboard data must have a valid summary object');
  }

  if (!Array.isArray(data.actionItems)) {
    throw new Error('Dashboard data action items must be an array');
  }

  if (!Array.isArray(data.trackedTopics)) {
    throw new Error('Dashboard data tracked topics must be an array');
  }

  // Validate each action item
  data.actionItems.forEach((item, index) => {
    try {
      validateActionItem(item);
    } catch (error) {
      throw new Error(
        `Invalid action item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  // Validate each tracked topic
  data.trackedTopics.forEach((topic, index) => {
    try {
      validateTrackedTopic(topic);
    } catch (error) {
      throw new Error(
        `Invalid tracked topic at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

export function validateDashboardConfig(config: DashboardAppConfig): void {
  if (typeof config.refreshInterval !== 'number' || config.refreshInterval < 0) {
    throw new Error('Dashboard config refresh interval must be a non-negative number');
  }

  if (typeof config.maxActionItems !== 'number' || config.maxActionItems < 1) {
    throw new Error('Dashboard config max action items must be a positive number');
  }

  if (typeof config.maxTrackedTopics !== 'number' || config.maxTrackedTopics < 1) {
    throw new Error('Dashboard config max tracked topics must be a positive number');
  }

  if (typeof config.enableAutoRefresh !== 'boolean') {
    throw new Error('Dashboard config enable auto refresh must be a boolean');
  }

  if (typeof config.showCompletedActions !== 'boolean') {
    throw new Error('Dashboard config show completed actions must be a boolean');
  }

  const validViews = ['activity', 'actions', 'topics', 'analytics'];
  if (!validViews.includes(config.defaultView)) {
    throw new Error('Dashboard config default view must be a valid view type');
  }
}

export function safeValidateDashboardConfig(config: DashboardConfig): {
  success: boolean;
  data: DashboardConfig;
  error?: string;
} {
  try {
    validateDashboardConfig(config);
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      data: config, // Return the config anyway for fallback
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}
