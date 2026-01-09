/**
 * Error Recovery Suggestion System
 *
 * Intelligent recovery suggestion system that provides context-aware, actionable
 * recovery suggestions based on error type, context, and system state
 */

import { AppError, ErrorContext, ErrorRecoveryStrategy } from '../types';
import { ErrorDomain, ErrorSeverity } from '../constants';
import { RecoveryStrategy } from '@client/hooks/useErrorRecovery';

// ============================================================================
// Recovery Suggestion Types
// ============================================================================

export interface RecoverySuggestion {
  id: string;
  title: string;
  description: string;
  action?: () => void | Promise<void>;
  priority: number;
  applicableDomains: ErrorDomain[];
  applicableSeverities: ErrorSeverity[];
  condition?: (error: AppError, context?: any) => boolean;
  automatic?: boolean;
  estimatedSuccessRate?: number;
}

// ============================================================================
// Core Recovery Suggestions
// ============================================================================

export const RECOVERY_SUGGESTIONS: RecoverySuggestion[] = [
  // Network Recovery Suggestions
  {
    id: 'retry-network-request',
    title: 'Retry Connection',
    description: 'Attempt to reconnect to the server',
    action: () => {
      // This would be implemented by the calling component
      console.log('Retrying network connection...');
    },
    priority: 1,
    applicableDomains: [ErrorDomain.NETWORK, ErrorDomain.EXTERNAL_SERVICE],
    applicableSeverities: [ErrorSeverity.LOW, ErrorSeverity.MEDIUM],
    condition: (error) => error.retryable,
    automatic: true,
    estimatedSuccessRate: 0.7,
  },

  {
    id: 'check-internet-connection',
    title: 'Check Internet Connection',
    description: 'Verify your internet connection is working',
    action: () => {
      window.open('https://www.google.com', '_blank');
    },
    priority: 2,
    applicableDomains: [ErrorDomain.NETWORK],
    applicableSeverities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    estimatedSuccessRate: 0.6,
  },

  {
    id: 'switch-network',
    title: 'Switch Network',
    description: 'Try switching to a different network connection',
    priority: 3,
    applicableDomains: [ErrorDomain.NETWORK],
    applicableSeverities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    estimatedSuccessRate: 0.5,
  },

  // Authentication Recovery Suggestions
  {
    id: 'relogin',
    title: 'Log In Again',
    description: 'Your session expired. Please log in again.',
    action: () => {
      // Redirect to login page
      window.location.href = '/login';
    },
    priority: 1,
    applicableDomains: [ErrorDomain.AUTHENTICATION, ErrorDomain.SESSION],
    applicableSeverities: [ErrorSeverity.HIGH],
    estimatedSuccessRate: 0.9,
  },

  {
    id: 'reset-password',
    title: 'Reset Password',
    description: 'Forgot your password? Reset it now.',
    action: () => {
      window.location.href = '/forgot-password';
    },
    priority: 2,
    applicableDomains: [ErrorDomain.AUTHENTICATION],
    applicableSeverities: [ErrorSeverity.MEDIUM],
    condition: (error) => error.message.includes('credentials'),
    estimatedSuccessRate: 0.8,
  },

  // System Recovery Suggestions
  {
    id: 'refresh-page',
    title: 'Refresh Page',
    description: 'Reload the current page to reset the application state',
    action: () => {
      window.location.reload();
    },
    priority: 1,
    applicableDomains: [ErrorDomain.SYSTEM, ErrorDomain.CACHE, ErrorDomain.UNKNOWN],
    applicableSeverities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    estimatedSuccessRate: 0.6,
  },

  {
    id: 'clear-cache',
    title: 'Clear Browser Cache',
    description: 'Clear your browser cache and reload the page',
    action: async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    },
    priority: 2,
    applicableDomains: [ErrorDomain.CACHE, ErrorDomain.SYSTEM],
    applicableSeverities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    estimatedSuccessRate: 0.7,
  },

  {
    id: 'restart-browser',
    title: 'Restart Browser',
    description: 'Close and restart your browser',
    priority: 3,
    applicableDomains: [ErrorDomain.SYSTEM, ErrorDomain.MEMORY],
    applicableSeverities: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    estimatedSuccessRate: 0.5,
  },

  // Validation Recovery Suggestions
  {
    id: 'correct-input',
    title: 'Correct Input',
    description: 'Review and correct the invalid input fields',
    priority: 1,
    applicableDomains: [ErrorDomain.VALIDATION],
    applicableSeverities: [ErrorSeverity.LOW, ErrorSeverity.MEDIUM],
    estimatedSuccessRate: 0.9,
  },

  {
    id: 'follow-format',
    title: 'Follow Format Instructions',
    description: 'Ensure your input follows the required format',
    priority: 2,
    applicableDomains: [ErrorDomain.VALIDATION],
    applicableSeverities: [ErrorSeverity.LOW],
    estimatedSuccessRate: 0.8,
  },

  // Database Recovery Suggestions
  {
    id: 'wait-and-retry',
    title: 'Wait and Retry',
    description: 'Wait a few minutes and try your operation again',
    action: () => {
      setTimeout(() => window.location.reload(), 300000); // 5 minutes
    },
    priority: 1,
    applicableDomains: [ErrorDomain.DATABASE, ErrorDomain.EXTERNAL_SERVICE],
    applicableSeverities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
    automatic: true,
    estimatedSuccessRate: 0.7,
  },

  {
    id: 'check-status-page',
    title: 'Check Status Page',
    description: 'Visit our status page for service updates',
    action: () => {
      window.open('/status', '_blank');
    },
    priority: 2,
    applicableDomains: [ErrorDomain.DATABASE, ErrorDomain.EXTERNAL_SERVICE, ErrorDomain.SYSTEM],
    applicableSeverities: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    estimatedSuccessRate: 0.4,
  },

  // Contact Support
  {
    id: 'contact-support',
    title: 'Contact Support',
    description: 'Get help from our support team',
    action: () => {
      window.location.href = '/support';
    },
    priority: 10,
    applicableDomains: Object.values(ErrorDomain),
    applicableSeverities: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    estimatedSuccessRate: 0.3,
  },
];

// ============================================================================
// Recovery Suggestion Engine
// ============================================================================

export function getRecoverySuggestions(
  error: AppError,
  context: any = {},
  maxSuggestions: number = 3
): RecoverySuggestion[] {
  return RECOVERY_SUGGESTIONS
    .filter(suggestion =>
      isSuggestionApplicable(suggestion, error, context)
    )
    .sort((a, b) => {
      // Sort by priority, then by estimated success rate
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return (b.estimatedSuccessRate || 0) - (a.estimatedSuccessRate || 0);
    })
    .slice(0, maxSuggestions);
}

export function isSuggestionApplicable(
  suggestion: RecoverySuggestion,
  error: AppError,
  context: any = {}
): boolean {
  // Check domain applicability
  const domainMatch = suggestion.applicableDomains.includes(error.type);

  // Check severity applicability
  const severityMatch = suggestion.applicableSeverities.includes(error.severity);

  // Check custom condition if provided
  const conditionMatch = suggestion.condition ? suggestion.condition(error, context) : true;

  return domainMatch && severityMatch && conditionMatch;
}

// ============================================================================
// Integration with Recovery Strategies
// ============================================================================

export function convertSuggestionsToRecoveryStrategies(
  suggestions: RecoverySuggestion[]
): RecoveryStrategy[] {
  return suggestions.map(suggestion => ({
    id: suggestion.id,
    condition: (error: Error) => true, // Always applicable for converted suggestions
    action: async () => {
      if (suggestion.action) {
        suggestion.action();
        return true;
      }
      return false;
    },
    description: suggestion.description,
    priority: suggestion.priority,
    maxAttempts: 1,
  }));
}

// ============================================================================
// Context-Aware Suggestion Enhancement
// ============================================================================

export function enhanceSuggestionsWithContext(
  suggestions: RecoverySuggestion[],
  error: AppError,
  systemContext: {
    isOnline?: boolean;
    connectionType?: string;
    memoryUsage?: number;
    browser?: string;
  } = {}
): RecoverySuggestion[] {
  return suggestions.map(suggestion => {
    const enhancedSuggestion = { ...suggestion };

    // Enhance based on network status
    if (!systemContext.isOnline && enhancedSuggestion.applicableDomains.includes(ErrorDomain.NETWORK)) {
      enhancedSuggestion.priority = Math.max(1, enhancedSuggestion.priority - 1);
      enhancedSuggestion.description += ' (You appear to be offline)';
    }

    // Enhance based on connection type
    if (systemContext.connectionType === 'slow' && enhancedSuggestion.applicableDomains.includes(ErrorDomain.NETWORK)) {
      enhancedSuggestion.description += ' (Your connection appears slow)';
    }

    // Enhance based on memory usage
    if (systemContext.memoryUsage && systemContext.memoryUsage > 100 * 1024 * 1024) {
      if (enhancedSuggestion.applicableDomains.includes(ErrorDomain.SYSTEM)) {
        enhancedSuggestion.priority = Math.max(1, enhancedSuggestion.priority - 1);
        enhancedSuggestion.description += ' (High memory usage detected)';
      }
    }

    return enhancedSuggestion;
  });
}

// ============================================================================
// Suggestion Analytics
// ============================================================================

export interface SuggestionAnalytics {
  suggestionId: string;
  errorId: string;
  timestamp: number;
  wasUsed: boolean;
  success?: boolean;
}

let suggestionAnalytics: SuggestionAnalytics[] = [];

export function trackSuggestionUsage(
  suggestionId: string,
  errorId: string,
  wasUsed: boolean,
  success?: boolean
): void {
  suggestionAnalytics.push({
    suggestionId,
    errorId,
    timestamp: Date.now(),
    wasUsed,
    success,
  });

  // Keep analytics array manageable
  if (suggestionAnalytics.length > 100) {
    suggestionAnalytics = suggestionAnalytics.slice(-50);
  }
}

export function getSuggestionAnalytics(): SuggestionAnalytics[] {
  return [...suggestionAnalytics];
}

export function clearSuggestionAnalytics(): void {
  suggestionAnalytics = [];
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getBestRecoverySuggestion(
  error: AppError,
  context: any = {}
): RecoverySuggestion | undefined {
  const suggestions = getRecoverySuggestions(error, context, 1);
  return suggestions.length > 0 ? suggestions[0] : undefined;
}

export function getSuggestionById(suggestionId: string): RecoverySuggestion | undefined {
  return RECOVERY_SUGGESTIONS.find(s => s.id === suggestionId);
}

export function addCustomRecoverySuggestion(suggestion: RecoverySuggestion): void {
  RECOVERY_SUGGESTIONS.push(suggestion);
}

export function removeRecoverySuggestion(suggestionId: string): boolean {
  const initialLength = RECOVERY_SUGGESTIONS.length;
  RECOVERY_SUGGESTIONS = RECOVERY_SUGGESTIONS.filter(s => s.id !== suggestionId);
  return RECOVERY_SUGGESTIONS.length < initialLength;
}
