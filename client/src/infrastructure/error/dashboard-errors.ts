/**
 * Dashboard-specific error classes
 */

import { BaseError } from './classes';
import { ErrorDomain, ErrorSeverity } from './constants';

export class DashboardError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      context: details ? { details } : undefined,
    });
    this.name = 'DashboardError';
  }
}

export class DashboardDataFetchError extends DashboardError {
  constructor(source: string, message: string, details?: Record<string, unknown>) {
    super(`Data fetch failed from ${source}: ${message}`, { source, ...details });
    this.name = 'DashboardDataFetchError';
  }
}

export class DashboardActionError extends DashboardError {
  constructor(action: string, message: string, details?: Record<string, unknown>) {
    super(`Action '${action}' failed: ${message}`, { action, ...details });
    this.name = 'DashboardActionError';
  }
}

export class DashboardTopicError extends DashboardError {
  constructor(
    operation: string,
    topicId?: string,
    message?: string,
    details?: Record<string, unknown>
  ) {
    const errorMessage = message || `Topic operation '${operation}' failed`;
    super(errorMessage, { operation, topicId, ...details });
    this.name = 'DashboardTopicError';
  }
}

export class DashboardConfigurationError extends DashboardError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Configuration error: ${message}`, details);
    this.name = 'DashboardConfigurationError';
  }
}

// ============================================================================
// Dashboard Recovery Logic (Consolidated from legacy recovery module)
// ============================================================================

export interface RecoveryContext {
  error: Error;
  data: unknown;
  config: unknown;
  retryCount: number;
  lastSuccessfulFetch?: Date;
}

export interface RecoveryStrategy {
  canRecover: boolean;
  suggestions: string[];
}

/**
 * Get recovery strategy for dashboard errors
 */
export function getRecoveryStrategy(context: RecoveryContext): RecoveryStrategy {
  const { error, retryCount } = context;

  // Network-related errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    if (retryCount < 3) {
      return {
        canRecover: true,
        suggestions: [
          'Check your internet connection',
          'Retry the operation',
          'Try refreshing the page',
        ],
      };
    }

    return {
      canRecover: false,
      suggestions: [
        'Check your internet connection',
        'Try again later',
        'Contact support if the problem persists',
      ],
    };
  }

  // Validation errors
  if (error.message.includes('validation') || error.message.includes('Invalid')) {
    return {
      canRecover: true,
      suggestions: ['Check your input data', 'Reset to default configuration', 'Clear cached data'],
    };
  }

  // Configuration errors
  if (error.message.includes('configuration') || error.message.includes('config')) {
    return {
      canRecover: true,
      suggestions: [
        'Reset configuration to defaults',
        'Check configuration values',
        'Clear browser storage',
      ],
    };
  }

  // Generic recovery
  return {
    canRecover: retryCount < 2,
    suggestions: [
      'Try refreshing the page',
      'Clear browser cache',
      'Contact support if the problem persists',
    ],
  };
}

/**
 * Execute recovery strategy for dashboard
 */
export async function executeRecovery(
  strategy: RecoveryStrategy,
  _context: RecoveryContext
): Promise<boolean> {
  if (!strategy.canRecover) {
    return false;
  }

  // Simulate recovery attempt (following legacy pattern)
  try {
    // Add actual recovery logic here based on error type
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.3; // 70% success rate for simulation
  } catch {
    return false;
  }
}
