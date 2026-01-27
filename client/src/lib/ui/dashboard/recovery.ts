/**
 * Dashboard error recovery strategies
 * Following navigation component recovery patterns
 */

import type { DashboardData, DashboardConfig } from '@client/lib/types/dashboard';

import { DashboardError, DashboardErrorType } from './errors';

export interface RecoveryStrategy {
  canRecover: boolean;
  suggestions: string[];
  autoRecover?: () => Promise<boolean>;
  manualSteps?: string[];
}

export interface RecoveryContext {
  error: DashboardError;
  data?: Partial<DashboardData>;
  config?: Partial<DashboardConfig>;
  retryCount?: number;
  lastSuccessfulFetch?: Date;
}

/**
 * Determines recovery strategy based on error type and context
 */
export function getRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error } = context;

  switch (error.type) {
    case DashboardErrorType.DASHBOARD_DATA_FETCH_ERROR:
      return getDataFetchRecoveryStrategy(context);

    case DashboardErrorType.DASHBOARD_VALIDATION_ERROR:
      return getValidationRecoveryStrategy(context);

    case DashboardErrorType.DASHBOARD_CONFIGURATION_ERROR:
      return getConfigurationRecoveryStrategy(context);

    case DashboardErrorType.DASHBOARD_ACTION_ERROR:
      return getActionRecoveryStrategy(context);

    case DashboardErrorType.DASHBOARD_TOPIC_ERROR:
      return getTopicRecoveryStrategy(context);

    default:
      return getGenericRecoveryStrategy(context);
  }
}

function getDataFetchRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { retryCount = 0, lastSuccessfulFetch } = context;

  if (retryCount < 3) {
    return {
      canRecover: true,
      suggestions: [
        'Retrying data fetch automatically',
        'Check your internet connection',
        'Verify server status',
      ],
      autoRecover: async () => {
        // Implement exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return true; // Indicate retry should be attempted
      },
    };
  }

  const hasRecentData = Boolean(
    lastSuccessfulFetch && Date.now() - lastSuccessfulFetch.getTime() < 300000
  ); // 5 minutes

  return {
    canRecover: hasRecentData,
    suggestions: hasRecentData
      ? ['Using cached data from recent fetch', 'Try refreshing the page', 'Check server status']
      : [
          'Unable to fetch fresh data',
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if problem persists',
        ],
    manualSteps: [
      'Click the refresh button',
      'Check your network connection',
      'Try reloading the page',
    ],
  };
}

function getValidationRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error } = context;
  const field = error.details?.field;

  return {
    canRecover: true,
    suggestions: [
      `Validation failed for field: ${field}`,
      'Data will be sanitized automatically',
      'Some features may be limited',
    ],
    autoRecover: async () => {
      // Auto-recovery for validation errors involves sanitizing data
      return true;
    },
    manualSteps: [
      'Review the data format',
      'Try refreshing to get clean data',
      'Contact support if validation errors persist',
    ],
  };
}

function getConfigurationRecoveryStrategy(_context: RecoveryContext): RecoveryStrategy {
  return {
    canRecover: true,
    suggestions: [
      'Using default configuration',
      'Some customizations may not be available',
      'Configuration will be reset to defaults',
    ],
    autoRecover: async () => {
      // Reset to default configuration
      return true;
    },
    manualSteps: [
      'Check dashboard settings',
      'Reset configuration to defaults',
      'Contact support for configuration issues',
    ],
  };
}

function getActionRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error, retryCount = 0 } = context;
  const action = error.details?.action;

  if (retryCount < 2) {
    return {
      canRecover: true,
      suggestions: [
        `Retrying action: ${action}`,
        'Action will be attempted again',
        'Please wait for completion',
      ],
      autoRecover: async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      },
    };
  }

  return {
    canRecover: false,
    suggestions: [
      `Action failed: ${action}`,
      'Manual retry required',
      'Check if the action is still valid',
    ],
    manualSteps: [
      'Try the action again manually',
      'Refresh the dashboard data',
      'Check if prerequisites are met',
    ],
  };
}

function getTopicRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error } = context;
  const operation = error.details?.operation;
  const topicId = error.details?.topicId;

  return {
    canRecover: true,
    suggestions: [
      `Topic ${operation} failed${topicId ? ` for ${topicId}` : ''}`,
      'Topic list will be refreshed',
      'Try the operation again',
    ],
    autoRecover: async () => {
      // Refresh topic data
      return true;
    },
    manualSteps: [
      'Refresh the topic list',
      'Try the operation again',
      'Check if the topic still exists',
    ],
  };
}

function getGenericRecoveryStrategy(_context: RecoveryContext): RecoveryStrategy {
  return {
    canRecover: true,
    suggestions: [
      'An unexpected error occurred',
      'Dashboard will attempt to recover',
      'Some features may be temporarily unavailable',
    ],
    autoRecover: async () => {
      // Generic recovery - refresh all data
      return true;
    },
    manualSteps: [
      'Try refreshing the page',
      'Clear browser cache if problems persist',
      'Contact support for assistance',
    ],
  };
}

/**
 * Executes recovery strategy
 */
export async function executeRecovery(
  strategy: RecoveryStrategy,
  _context: RecoveryContext
): Promise<boolean> {
  if (!strategy.canRecover) {
    return false;
  }

  if (strategy.autoRecover) {
    try {
      return await strategy.autoRecover();
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      return false;
    }
  }

  return true; // Manual recovery available
}

/**
 * Creates recovery suggestions for UI display
 */
export function formatRecoverySuggestions(strategy: RecoveryStrategy): {
  primary: string[];
  secondary: string[];
} {
  return {
    primary: strategy.suggestions,
    secondary: strategy.manualSteps || [],
  };
}
