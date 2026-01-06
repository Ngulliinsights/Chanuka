/**
 * Design System Recovery Utilities
 * Simple recovery mechanisms for UI component errors
 */

import { isUIComponentError } from './errors';

export interface RecoveryResult {
  success: boolean;
  message: string;
  retryable: boolean;
}

export interface RecoverySuggestion {
  action: string;
  description: string;
  automated: boolean;
  priority: 'high' | 'medium' | 'low';
}

export async function attemptUIRecovery(error: unknown): Promise<RecoveryResult> {
  if (!isUIComponentError(error)) {
    return {
      success: false,
      message: 'Error is not a UI component error',
      retryable: false,
    };
  }

  // Simple recovery logic
  if (error.isRecoverable()) {
    return {
      success: true,
      message: 'Component error handled gracefully',
      retryable: true,
    };
  }

  return {
    success: false,
    message: 'Component error is not recoverable',
    retryable: false,
  };
}

export function getUIRecoverySuggestions(error: unknown): RecoverySuggestion[] {
  if (!isUIComponentError(error)) {
    return [
      {
        action: 'Check error type',
        description: 'This error is not a recognized UI component error',
        automated: false,
        priority: 'low',
      },
    ];
  }

  const suggestions: RecoverySuggestion[] = [];

  switch (error.operation) {
    case 'render':
      suggestions.push({
        action: 'Refresh component',
        description: 'Try refreshing the component state',
        automated: true,
        priority: 'high',
      });
      break;
    case 'interaction':
      suggestions.push({
        action: 'Retry action',
        description: 'Try the action again',
        automated: true,
        priority: 'high',
      });
      break;
    default:
      suggestions.push({
        action: 'Check console',
        description: 'Check browser console for more details',
        automated: false,
        priority: 'medium',
      });
  }

  return suggestions;
}
