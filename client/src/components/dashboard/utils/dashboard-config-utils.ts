/**
 * Dashboard configuration utilities
 * Following navigation component configuration patterns
 */

import type { DashboardConfig, DashboardSection } from '@client/types';

import { DashboardConfigurationError } from '@client/errors';
import { validateDashboardConfig } from '@client/validation';

import { dashboardConstants } from './dashboard-constants';

/**
 * Create a validated dashboard configuration
 */
export function createDashboardConfig(
  overrides: Partial<DashboardConfig> = {}
): DashboardConfig {
  const config = {
    ...dashboardConstants.DEFAULT_CONFIG,
    ...overrides
  };

  try {
    return validateDashboardConfig(config);
  } catch (error) {
    throw new DashboardConfigurationError(
      `Invalid dashboard configuration: ${error instanceof Error ? error.message : String(error)}`,
      { config, overrides }
    );
  }
}

/**
 * Merge dashboard configurations with validation
 */
export function mergeDashboardConfigs(
  baseConfig: DashboardConfig,
  overrides: Partial<DashboardConfig>
): DashboardConfig {
  const merged = {
    ...baseConfig,
    ...overrides
  };

  try {
    return validateDashboardConfig(merged);
  } catch (error) {
    throw new DashboardConfigurationError(
      `Failed to merge dashboard configurations: ${error instanceof Error ? error.message : String(error)}`,
      { baseConfig, overrides, merged }
    );
  }
}

/**
 * Get refresh interval options for UI
 */
export function getRefreshIntervalOptions(): Array<{
  value: number;
  label: string;
  description: string;
}> {
  return [
    {
      value: dashboardConstants.REFRESH_INTERVALS.FAST,
      label: '10 seconds',
      description: 'Fast refresh - high data usage'
    },
    {
      value: dashboardConstants.REFRESH_INTERVALS.NORMAL,
      label: '30 seconds',
      description: 'Normal refresh - recommended'
    },
    {
      value: dashboardConstants.REFRESH_INTERVALS.SLOW,
      label: '1 minute',
      description: 'Slow refresh - low data usage'
    },
    {
      value: dashboardConstants.REFRESH_INTERVALS.VERY_SLOW,
      label: '5 minutes',
      description: 'Very slow refresh - minimal data usage'
    }
  ];
}

/**
 * Get dashboard section options for UI
 */
export function getDashboardSectionOptions(): Array<{
  value: DashboardSection;
  label: string;
  icon: string;
  description: string;
}> {
  return [
    {
      value: dashboardConstants.SECTIONS.ACTIVITY.value,
      label: dashboardConstants.SECTIONS.ACTIVITY.label,
      icon: dashboardConstants.SECTIONS.ACTIVITY.icon,
      description: 'Overview of your legislative activity'
    },
    {
      value: dashboardConstants.SECTIONS.ACTIONS.value,
      label: dashboardConstants.SECTIONS.ACTIONS.label,
      icon: dashboardConstants.SECTIONS.ACTIONS.icon,
      description: 'Your pending and completed action items'
    },
    {
      value: dashboardConstants.SECTIONS.TOPICS.value,
      label: dashboardConstants.SECTIONS.TOPICS.label,
      icon: dashboardConstants.SECTIONS.TOPICS.icon,
      description: 'Topics you are tracking'
    },
    {
      value: dashboardConstants.SECTIONS.ANALYTICS.value,
      label: dashboardConstants.SECTIONS.ANALYTICS.label,
      icon: dashboardConstants.SECTIONS.ANALYTICS.icon,
      description: 'Analytics and insights'
    }
  ];
}

/**
 * Validate configuration limits
 */
export function validateConfigurationLimits(config: Partial<DashboardConfig>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check refresh interval
  if (config.refreshInterval !== undefined) {
    if (config.refreshInterval < dashboardConstants.LIMITS.MIN_REFRESH_INTERVAL) {
      errors.push('Refresh interval too short');
    }
    if (config.refreshInterval > dashboardConstants.LIMITS.MAX_REFRESH_INTERVAL) {
      errors.push(`Refresh interval too long (maximum: ${dashboardConstants.LIMITS.MAX_REFRESH_INTERVAL}ms)`);
    }
    if (config.refreshInterval < dashboardConstants.REFRESH_INTERVALS.NORMAL) {
      warnings.push('Fast refresh intervals may increase data usage');
    }
  }

  // Check max items limits
  if (config.maxActionItems !== undefined) {
    if (config.maxActionItems > dashboardConstants.LIMITS.MAX_ACTION_ITEMS_DISPLAY) {
      warnings.push(`High action item limit may affect performance (recommended: ${dashboardConstants.DEFAULT_CONFIG.maxActionItems})`);
    }
    if (config.maxActionItems < 1) {
      errors.push('Must display at least 1 action item');
    }
  }

  // Check max tracked topics limits
  if (config.maxTrackedTopics !== undefined) {
    if (config.maxTrackedTopics > dashboardConstants.LIMITS.MAX_TRACKED_TOPICS_DISPLAY) {
      warnings.push(`High topic limit may affect performance (recommended: ${dashboardConstants.DEFAULT_CONFIG.maxTrackedTopics})`);
    }
    if (config.maxTrackedTopics < 1) {
      errors.push('Must display at least 1 tracked topic');
    }
  }

  // Check for performance warnings
  if (config.refreshInterval !== undefined && config.refreshInterval < dashboardConstants.REFRESH_INTERVALS.NORMAL) {
    warnings.push('Fast refresh intervals may increase data usage');
  }

  if (config.maxTrackedTopics !== undefined) {
    if (config.maxTrackedTopics > dashboardConstants.LIMITS.MAX_TRACKED_TOPICS_DISPLAY) {
      warnings.push(`High topic limit may affect performance (recommended: ${dashboardConstants.DEFAULT_CONFIG.maxTrackedTopics})`);
    }
    if (config.maxTrackedTopics < 1) {
      errors.push('Must display at least 1 tracked topic');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get configuration recommendations based on usage patterns
 */
export function getConfigurationRecommendations(usage: {
  averageSessionDuration?: number;
  dataUsageConcern?: boolean;
  performanceConcern?: boolean;
  activityLevel?: 'low' | 'medium' | 'high';
}): Partial<DashboardConfig> {
  const recommendations: Partial<DashboardConfig> = {};

  // Refresh interval recommendations
  if (usage.dataUsageConcern) {
    recommendations.refreshInterval = dashboardConstants.REFRESH_INTERVALS.VERY_SLOW;
    recommendations.enableAutoRefresh = false;
  } else if (usage.performanceConcern) {
    recommendations.refreshInterval = dashboardConstants.REFRESH_INTERVALS.SLOW;
  } else if (usage.activityLevel === 'high') {
    recommendations.refreshInterval = dashboardConstants.REFRESH_INTERVALS.FAST;
  }

  // Display limits based on performance concerns
  if (usage.performanceConcern) {
    recommendations.maxActionItems = 5;
    recommendations.maxTrackedTopics = 10;
  } else if (usage.activityLevel === 'high') {
    recommendations.maxActionItems = 20;
    recommendations.maxTrackedTopics = 30;
  }

  // Session-based recommendations
  if (usage.averageSessionDuration && usage.averageSessionDuration < 300000) { // Less than 5 minutes
    recommendations.enableAutoRefresh = false;
    recommendations.showCompletedActions = false;
  }

  return recommendations;
}

/**
 * Export configuration for backup/sharing
 */
export function exportDashboardConfig(config: DashboardConfig): string {
  const exportData = {
    config,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import configuration from backup/sharing
 */
export function importDashboardConfig(configJson: string): DashboardConfig {
  try {
    const importData = JSON.parse(configJson);
    
    if (!importData.config) {
      throw new Error('Invalid configuration format - missing config object');
    }

    return validateDashboardConfig(importData.config);
  } catch (error) {
    throw new DashboardConfigurationError(
      `Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`,
      { configJson }
    );
  }
}

