/**
 * UI component error recovery strategies and utilities
 * Following navigation component recovery patterns for consistency
 */

import { UIError, UIValidationError, UIComponentError, UIFormError, UIInputError } from './errors';

export interface RecoveryStrategy {
  type: 'automatic' | 'manual' | 'fallback';
  description: string;
  action: () => Promise<boolean> | boolean;
  priority: number;
}

export interface RecoveryContext {
  component: string;
  error: UIError;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

export interface RecoveryResult {
  success: boolean;
  strategy?: RecoveryStrategy;
  message?: string;
  shouldRetry?: boolean;
  fallbackComponent?: React.ComponentType<any>;
}

/**
 * Recovery strategy implementations
 */

export class UIRecoveryManager {
  private static instance: UIRecoveryManager;
  private recoveryStrategies: Map<string, RecoveryStrategy[]> = new Map();
  private recoveryHistory: Map<string, RecoveryContext[]> = new Map();

  static getInstance(): UIRecoveryManager {
    if (!UIRecoveryManager.instance) {
      UIRecoveryManager.instance = new UIRecoveryManager();
    }
    return UIRecoveryManager.instance;
  }

  /**
   * Register recovery strategies for specific error types
   */
  registerStrategy(errorType: string, strategy: RecoveryStrategy): void {
    const strategies = this.recoveryStrategies.get(errorType) || [];
    strategies.push(strategy);
    strategies.sort((a, b) => b.priority - a.priority);
    this.recoveryStrategies.set(errorType, strategies);
  }

  /**
   * Attempt recovery for a given error
   */
  async attemptRecovery(context: RecoveryContext): Promise<RecoveryResult> {
    const errorType = context.error.type;
    const strategies = this.recoveryStrategies.get(errorType) || [];

    // Record recovery attempt
    this.recordRecoveryAttempt(context);

    // Check if we've exceeded max retries
    if (context.retryCount >= context.maxRetries) {
      return {
        success: false,
        message: 'Maximum retry attempts exceeded',
        shouldRetry: false,
        fallbackComponent: this.getFallbackComponent(errorType)
      };
    }

    // Try each strategy in priority order
    for (const strategy of strategies) {
      try {
        const success = await strategy.action();
        if (success) {
          return {
            success: true,
            strategy,
            message: `Recovery successful using ${strategy.description}`,
            shouldRetry: false
          };
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy failed: ${strategy.description}`, recoveryError);
      }
    }

    // No strategy worked
    return {
      success: false,
      message: 'All recovery strategies failed',
      shouldRetry: context.retryCount < context.maxRetries - 1,
      fallbackComponent: this.getFallbackComponent(errorType)
    };
  }

  /**
   * Get recovery suggestions for manual recovery
   */
  getRecoverySuggestions(error: UIError): string[] {
    const suggestions: string[] = [];

    if (error instanceof UIValidationError) {
      suggestions.push('Check the input format and try again');
      suggestions.push('Ensure all required fields are filled');
      if (error.details?.field) {
        suggestions.push(`Focus on the ${error.details.field} field`);
      }
    } else if (error instanceof UIInputError) {
      suggestions.push('Clear the input and try typing again');
      suggestions.push('Check for special characters or formatting issues');
      if (error.details?.inputName) {
        suggestions.push(`Verify the ${error.details.inputName} format`);
      }
    } else if (error instanceof UIFormError) {
      suggestions.push('Review all form fields for errors');
      suggestions.push('Try refreshing the page and filling the form again');
      if (error.details?.errors) {
        Object.keys(error.details.errors).forEach(field => {
          suggestions.push(`Fix the ${field} field`);
        });
      }
    } else if (error instanceof UIComponentError) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache and try again');
      suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }

  /**
   * Check if automatic recovery is possible
   */
  canAutoRecover(error: UIError): boolean {
    const autoRecoverableTypes = [
      'UI_VALIDATION_ERROR',
      'UI_INPUT_ERROR'
    ];
    return autoRecoverableTypes.includes(error.type);
  }

  private recordRecoveryAttempt(context: RecoveryContext): void {
    const key = `${context.component}-${context.error.type}`;
    const history = this.recoveryHistory.get(key) || [];
    history.push(context);
    
    // Keep only last 10 attempts
    if (history.length > 10) {
      history.shift();
    }
    
    this.recoveryHistory.set(key, history);
  }

  private getFallbackComponent(errorType: string): React.ComponentType<any> | undefined {
    // Return appropriate fallback components based on error type
    switch (errorType) {
      case 'UI_FORM_ERROR':
        return undefined; // Could return a simple form fallback
      case 'UI_TABLE_ERROR':
        return undefined; // Could return a simple table fallback
      default:
        return undefined;
    }
  }
}

/**
 * Specific recovery strategies for different UI components
 */

// Input recovery strategies
export const inputRecoveryStrategies: RecoveryStrategy[] = [
  {
    type: 'automatic',
    description: 'Clear invalid characters',
    priority: 10,
    action: () => {
      // This would be implemented in the component to clear invalid chars
      return true;
    }
  },
  {
    type: 'automatic',
    description: 'Reset to last valid value',
    priority: 8,
    action: () => {
      // This would be implemented in the component to restore last valid value
      return true;
    }
  },
  {
    type: 'manual',
    description: 'Focus input for user correction',
    priority: 5,
    action: () => {
      // This would be implemented in the component to focus the input
      return true;
    }
  }
];

// Form recovery strategies
export const formRecoveryStrategies: RecoveryStrategy[] = [
  {
    type: 'automatic',
    description: 'Restore form from local storage',
    priority: 10,
    action: async () => {
      try {
        const saved = localStorage.getItem('form-backup');
        return !!saved;
      } catch {
        return false;
      }
    }
  },
  {
    type: 'automatic',
    description: 'Clear validation errors and retry',
    priority: 8,
    action: () => {
      // This would be implemented in the component to clear errors
      return true;
    }
  },
  {
    type: 'manual',
    description: 'Scroll to first error field',
    priority: 6,
    action: () => {
      // This would be implemented in the component to scroll to errors
      return true;
    }
  }
];

// Select recovery strategies
export const selectRecoveryStrategies: RecoveryStrategy[] = [
  {
    type: 'automatic',
    description: 'Reset to default option',
    priority: 10,
    action: () => {
      // This would be implemented in the component to reset selection
      return true;
    }
  },
  {
    type: 'automatic',
    description: 'Reload options from source',
    priority: 8,
    action: async () => {
      // This would be implemented in the component to reload options
      return true;
    }
  }
];

// Dialog recovery strategies
export const dialogRecoveryStrategies: RecoveryStrategy[] = [
  {
    type: 'automatic',
    description: 'Reset dialog state',
    priority: 10,
    action: () => {
      // This would be implemented in the component to reset dialog
      return true;
    }
  },
  {
    type: 'manual',
    description: 'Close and reopen dialog',
    priority: 5,
    action: () => {
      // This would be implemented in the component to close/reopen
      return true;
    }
  }
];

// Table recovery strategies
export const tableRecoveryStrategies: RecoveryStrategy[] = [
  {
    type: 'automatic',
    description: 'Reload table data',
    priority: 10,
    action: async () => {
      // This would be implemented in the component to reload data
      return true;
    }
  },
  {
    type: 'automatic',
    description: 'Reset table filters and sorting',
    priority: 8,
    action: () => {
      // This would be implemented in the component to reset filters
      return true;
    }
  },
  {
    type: 'fallback',
    description: 'Show simplified table view',
    priority: 3,
    action: () => {
      // This would be implemented in the component to show fallback
      return true;
    }
  }
];

/**
 * Initialize default recovery strategies
 */
export function initializeUIRecoveryStrategies(): void {
  const manager = UIRecoveryManager.getInstance();

  // Register input strategies
  inputRecoveryStrategies.forEach(strategy => {
    manager.registerStrategy('UI_INPUT_ERROR', strategy);
    manager.registerStrategy('UI_VALIDATION_ERROR', strategy);
  });

  // Register form strategies
  formRecoveryStrategies.forEach(strategy => {
    manager.registerStrategy('UI_FORM_ERROR', strategy);
  });

  // Register select strategies
  selectRecoveryStrategies.forEach(strategy => {
    manager.registerStrategy('UI_VALIDATION_ERROR', strategy);
  });

  // Register dialog strategies
  dialogRecoveryStrategies.forEach(strategy => {
    manager.registerStrategy('UI_DIALOG_ERROR', strategy);
  });

  // Register table strategies
  tableRecoveryStrategies.forEach(strategy => {
    manager.registerStrategy('UI_TABLE_ERROR', strategy);
  });
}

/**
 * Utility functions for component recovery
 */

export function createRecoveryContext(
  component: string,
  error: UIError,
  retryCount: number = 0,
  maxRetries: number = 3,
  additionalData?: Record<string, any>
): RecoveryContext {
  return {
    component,
    error,
    timestamp: new Date(),
    retryCount,
    maxRetries,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    additionalData
  };
}

export async function attemptUIRecovery(
  component: string,
  error: UIError,
  retryCount: number = 0,
  maxRetries: number = 3,
  additionalData?: Record<string, any>
): Promise<RecoveryResult> {
  const manager = UIRecoveryManager.getInstance();
  const context = createRecoveryContext(component, error, retryCount, maxRetries, additionalData);
  return manager.attemptRecovery(context);
}

export function getUIRecoverySuggestions(error: UIError): string[] {
  const manager = UIRecoveryManager.getInstance();
  return manager.getRecoverySuggestions(error);
}

export function canAutoRecoverUI(error: UIError): boolean {
  const manager = UIRecoveryManager.getInstance();
  return manager.canAutoRecover(error);
}