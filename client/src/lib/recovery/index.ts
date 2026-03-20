/**
 * Recovery utilities for error handling and fallback mechanisms
 */

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: any;
  onError?: (error: Error) => void;
}

interface WindowWithErrorReporting extends Window {
  errorReporting?: {
    report: (error: Error, context?: { context?: string }) => void;
  };
}

export class RecoveryManager {
  private static instance: RecoveryManager;

  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }

  async withRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<T | null> {
    const { maxRetries = 3, retryDelay = 1000, fallbackValue = null, onError } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    if (onError && lastError) {
      onError(lastError);
    }

    return fallbackValue;
  }

  recoverFromError(error: Error, context?: string): void {
    console.error(`Recovery triggered for ${context || 'unknown context'}:`, error);

    // Log to external service if available
    if (typeof window !== 'undefined' && (window as WindowWithErrorReporting).errorReporting) {
      (window as WindowWithErrorReporting).errorReporting!.report(error, { context });
    }
  }

  createFallbackComponent(error: Error, componentName?: string) {
    return {
      error,
      componentName: componentName || 'Unknown Component',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    };
  }
}

export const recoveryManager = RecoveryManager.getInstance();

export function withErrorRecovery<T>(fn: () => T, fallback: T, context?: string): T {
  try {
    return fn();
  } catch (error) {
    recoveryManager.recoverFromError(error as Error, context);
    return fallback;
  }
}

export function getRecoverySuggestions(error: Error, context?: string): string[] {
  const suggestions: string[] = [];

  if (error.message.includes('navigation') || error.message.includes('route')) {
    suggestions.push('Try navigating to the home page');
    suggestions.push('Check if you have the required permissions');
    suggestions.push('Refresh the page and try again');
  }

  if (error.message.includes('auth') || error.message.includes('login')) {
    suggestions.push('Please log in to continue');
    suggestions.push('Check your credentials and try again');
  }

  if (error.message.includes('network') || error.message.includes('fetch')) {
    suggestions.push('Check your internet connection');
    suggestions.push('Try again in a few moments');
  }

  return suggestions.length > 0 ? suggestions : ['Please try again or contact support'];
}

export function createRecoveryContext(error: Error, additionalInfo?: Record<string, unknown>) {
  return {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    ...additionalInfo,
  };
}

export default recoveryManager;
