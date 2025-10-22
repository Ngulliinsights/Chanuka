import React, { useState, useEffect, useCallback } from 'react';
import { ErrorType, ErrorSeverity } from './PageErrorBoundary';
import { logger } from '@/utils/browser-logger';

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
  strategies: RecoveryStrategy[];
  onRecovery: (strategy: RecoveryStrategy) => void;
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
  const [currentStrategy, setCurrentStrategy] = useState<RecoveryStrategy | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const executeRecovery = useCallback(async (strategy: RecoveryStrategy) => {
    if (isRecovering) return;
    
    setIsRecovering(true);
    setCurrentStrategy(strategy);

    try {
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
    } catch (recoveryError) {
      logger.error('Recovery strategy failed:', { component: 'Chanuka' }, recoveryError);
      onFailure();
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, onRecovery, onFailure]);

  const findApplicableStrategy = useCallback(() => {
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
    });
  }, [strategies, error, errorType, attemptCount]);

  useEffect(() => {
    // Don't auto-recover for critical errors
    if (errorSeverity === 'critical') {
      return;
    }

    const strategy = findApplicableStrategy();
    if (strategy && !isRecovering) {
      const timer = setTimeout(() => {
        setAttemptCount(prev => prev + 1);
        executeRecovery(strategy);
      }, strategy.delay || 1000);

      return () => clearTimeout(timer);
    }
  }, [errorSeverity, findApplicableStrategy, isRecovering, executeRecovery]);

  // This component doesn't render anything - it's purely for recovery logic
  return null;
};

// Predefined recovery strategies for common error types
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

// Hook for using error recovery in components
export function useErrorRecovery(
  error: Error | null,
  errorType: ErrorType,
  errorSeverity: ErrorSeverity,
  customStrategies?: RecoveryStrategy[]
) {
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const strategies = customStrategies || getDefaultRecoveryStrategies(errorType);

  const handleRecovery = useCallback((strategy: RecoveryStrategy) => {
    setRecoveryAttempts(prev => prev + 1);
    console.log(`Executing recovery strategy: ${strategy.type} (attempt ${recoveryAttempts + 1})`);
  }, [recoveryAttempts]);

  const handleFailure = useCallback(() => {
    logger.error('All recovery strategies failed', { component: 'Chanuka' });
    setIsRecovering(false);
  }, []);

  const resetRecovery = useCallback(() => {
    setRecoveryAttempts(0);
    setIsRecovering(false);
  }, []);

  return {
    recoveryAttempts,
    isRecovering,
    strategies,
    handleRecovery,
    handleFailure,
    resetRecovery,
  };
}
