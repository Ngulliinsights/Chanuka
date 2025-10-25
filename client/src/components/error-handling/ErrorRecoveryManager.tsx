import React, { useState, useEffect, useCallback } from 'react';
import { ErrorType } from './PageErrorBoundary';
import { ErrorSeverity, BaseError, ErrorDomain } from '@shared/core';
import { AutomatedErrorRecoveryEngine, createErrorRecoveryEngine } from '@shared/core';
import { RecoverySuggestion } from '@shared/core';
import { logger } from '../../../utils/browser-logger';

export interface RecoveryStrategy {
  type: 'retry' | 'reload' | 'redirect' | 'fallback';
  delay?: number;
  maxAttempts?: number;
  condition?: (error: Error, errorType: ErrorType) => boolean;
}

export interface ErrorRecoveryManagerProps {
  error: Error;
  errorType: ErrorType;
  errorSeverity: ErrorSeverity;
  strategies?: RecoveryStrategy[]; // Made optional since we'll use shared engine
  onRecovery: (strategy: RecoveryStrategy | RecoverySuggestion) => void;
  onFailure: () => void;
}

export const ErrorRecoveryManager: React.FC<ErrorRecoveryManagerProps> = ({
  error,
  errorType,
  errorSeverity,
  strategies,
  onRecovery,
  onFailure,
}) => {
  const [currentStrategy, setCurrentStrategy] = useState<RecoveryStrategy | RecoverySuggestion | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEngine] = useState(() => createErrorRecoveryEngine());

  const executeRecovery = useCallback(async (strategy: RecoveryStrategy | RecoverySuggestion) => {
    if (isRecovering) return;

    setIsRecovering(true);
    setCurrentStrategy(strategy);

    try {
      // Handle legacy RecoveryStrategy
      if ('type' in strategy) {
        // Wait for delay if specified
        if (strategy.delay) {
          await new Promise(resolve => setTimeout(resolve, strategy.delay));
        }

        // Execute recovery based on strategy type
        switch (strategy.type) {
          case 'retry':
            onRecovery(strategy);
            break;
          case 'reload':
            window.location.reload();
            break;
          case 'redirect':
            window.location.href = '/';
            break;
          case 'fallback':
            onRecovery(strategy);
            break;
        }
      } else {
        // Handle RecoverySuggestion from shared engine
        await strategy.action();
        onRecovery(strategy);
      }
    } catch (recoveryError) {
      logger.error('Recovery strategy failed:', { component: 'ErrorRecoveryManager' }, recoveryError);
      onFailure();
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, onRecovery, onFailure]);

  const findApplicableStrategy = useCallback(async (): Promise<RecoveryStrategy | RecoverySuggestion | null> => {
    // First try to use shared recovery engine if error can be converted to BaseError
    try {
      const baseError = error instanceof BaseError ? error : new BaseError(error.message, {
        domain: errorType === 'network' ? ErrorDomain.NETWORK :
                errorType === 'chunk' ? ErrorDomain.INFRASTRUCTURE :
                errorType === 'timeout' ? ErrorDomain.NETWORK :
                errorType === 'javascript' ? ErrorDomain.SYSTEM : ErrorDomain.SYSTEM,
        severity: errorSeverity === ErrorSeverity.CRITICAL ? ErrorSeverity.CRITICAL :
                  errorSeverity === ErrorSeverity.HIGH ? ErrorSeverity.HIGH :
                  errorSeverity === ErrorSeverity.MEDIUM ? ErrorSeverity.MEDIUM : ErrorSeverity.LOW,
        source: 'ErrorRecoveryManager',
        retryable: true
      });

      const suggestions = await recoveryEngine.analyzeError(baseError);
      if (suggestions.length > 0) {
        return suggestions[0]; // Return the top suggestion
      }
    } catch (engineError) {
      logger.warn('Failed to use shared recovery engine, falling back to legacy strategies', { component: 'ErrorRecoveryManager' }, engineError);
    }

    // Fallback to legacy strategies if provided
    if (!strategies) return null;

    return strategies.find(strategy => {
      // Check if strategy has a condition and if it passes
      if (strategy.condition && !strategy.condition(error, errorType)) {
        return false;
      }

      // Check if we haven't exceeded max attempts
      if (strategy.maxAttempts && attemptCount >= strategy.maxAttempts) {
        return false;
      }

      return true;
    }) || null;
  }, [strategies, error, errorType, attemptCount, errorSeverity, recoveryEngine]);

  useEffect(() => {
    // Don't auto-recover for critical errors
    if (errorSeverity === ErrorSeverity.CRITICAL) {
      return;
    }

    const attemptRecovery = async () => {
      const strategy = await findApplicableStrategy();
      if (strategy && !isRecovering) {
        const delay = 'delay' in strategy ? strategy.delay || 1000 : 1000;
        const timer = setTimeout(() => {
          setAttemptCount(prev => prev + 1);
          executeRecovery(strategy);
        }, delay);

        return () => clearTimeout(timer);
      }
    };

    attemptRecovery();
  }, [errorSeverity, findApplicableStrategy, isRecovering, executeRecovery]);

  // This component doesn't render anything - it's purely for recovery logic
  return null;
};

// Predefined recovery strategies for common error types (legacy support)
export const getDefaultRecoveryStrategies = (errorType: ErrorType): RecoveryStrategy[] => {
  switch (errorType) {
    case 'network':
      return [
        {
          type: 'retry',
          delay: 2000,
          maxAttempts: 3,
          condition: () => navigator.onLine,
        },
        {
          type: 'fallback',
          delay: 5000,
          maxAttempts: 1,
        },
      ];

    case 'chunk':
      return [
        {
          type: 'reload',
          delay: 1000,
          maxAttempts: 1,
        },
      ];

    case 'timeout':
      return [
        {
          type: 'retry',
          delay: 3000,
          maxAttempts: 2,
        },
      ];

    case 'javascript':
      return [
        {
          type: 'retry',
          delay: 1000,
          maxAttempts: 1,
        },
        {
          type: 'reload',
          delay: 3000,
          maxAttempts: 1,
        },
      ];

    default:
      return [
        {
          type: 'retry',
          delay: 2000,
          maxAttempts: 1,
        },
      ];
  }
};

// Enhanced recovery strategies using shared patterns
export const getEnhancedRecoveryStrategies = (errorType: ErrorType): RecoveryStrategy[] => {
  // Use shared engine patterns but convert to legacy format for backward compatibility
  const engine = createErrorRecoveryEngine();

  // This would ideally integrate with the engine's suggestions
  // For now, return enhanced versions of default strategies
  return getDefaultRecoveryStrategies(errorType).map(strategy => ({
    ...strategy,
    // Add confidence scoring and learning capabilities
    confidence: 0.8,
    riskLevel: 'low' as const,
  }));
};

// Hook for using error recovery in components
export function useErrorRecovery(
  error: Error | null,
  errorType: ErrorType,
  errorSeverity: ErrorSeverity,
  customStrategies?: RecoveryStrategy[]
) {
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEngine] = useState(() => createErrorRecoveryEngine());

  const strategies = customStrategies || getDefaultRecoveryStrategies(errorType);

  const handleRecovery = useCallback((strategy: RecoveryStrategy | RecoverySuggestion) => {
    setRecoveryAttempts(prev => prev + 1);
    const strategyType = 'type' in strategy ? strategy.type : 'automated';
    logger.info(`Executing recovery strategy: ${strategyType} (attempt ${recoveryAttempts + 1})`, { component: 'ErrorRecoveryManager' });
  }, [recoveryAttempts]);

  const handleFailure = useCallback(() => {
    logger.error('All recovery strategies failed', { component: 'ErrorRecoveryManager' });
    setIsRecovering(false);
  }, []);

  const resetRecovery = useCallback(() => {
    setRecoveryAttempts(0);
    setIsRecovering(false);
  }, []);

  // Enhanced recovery analysis using shared engine
  const analyzeRecoveryOptions = useCallback(async (): Promise<RecoverySuggestion[]> => {
    if (!error) return [];

    try {
      const baseError = error instanceof BaseError ? error : new BaseError(error.message, {
        domain: errorType === 'network' ? ErrorDomain.NETWORK :
                errorType === 'chunk' ? ErrorDomain.INFRASTRUCTURE :
                errorType === 'timeout' ? ErrorDomain.NETWORK :
                errorType === 'javascript' ? ErrorDomain.SYSTEM : ErrorDomain.SYSTEM,
        severity: errorSeverity,
        source: 'useErrorRecovery',
        retryable: true
      });

      return await recoveryEngine.analyzeError(baseError);
    } catch (analysisError) {
      logger.warn('Failed to analyze recovery options with shared engine', { component: 'ErrorRecoveryManager' }, analysisError);
      return [];
    }
  }, [error, errorType, errorSeverity, recoveryEngine]);

  return {
    recoveryAttempts,
    isRecovering,
    strategies,
    handleRecovery,
    handleFailure,
    resetRecovery,
    analyzeRecoveryOptions,
    recoveryEngine,
  };
}
