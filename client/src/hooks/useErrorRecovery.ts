import { useState, useCallback, useRef, useEffect } from 'react';
import { useUnifiedLoading } from '../contexts/UnifiedLoadingContext';
import { logger } from '../utils/browser-logger';

export interface RecoveryStrategy {
  id: string;
  condition: (error: Error, context: RecoveryContext) => boolean;
  action: () => Promise<boolean>;
  description: string;
  priority: number;
  maxAttempts: number;
}

export interface RecoveryContext {
  error: Error;
  operationId: string;
  retryCount: number;
  timeElapsed: number;
  connectionType: string;
  isOnline: boolean;
}

export interface RecoveryState {
  isRecovering: boolean;
  currentStrategy: string | null;
  attempts: number;
  lastRecoveryTime: number | null;
  canRecover: boolean;
  suggestions: string[];
}

const DEFAULT_RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  {
    id: 'network-retry',
    condition: (error, context) => {
      return error.message.includes('network') ||
             error.message.includes('fetch') ||
             (error.message.includes('timeout') && context.isOnline);
    },
    action: async () => {
      // Wait for network recovery
      await new Promise(resolve => setTimeout(resolve, 2000));
      return navigator.onLine;
    },
    description: 'Retry after network recovery',
    priority: 1,
    maxAttempts: 3,
  },
  {
    id: 'connection-aware-retry',
    condition: (error, context) => {
      return context.connectionType === 'slow' && context.retryCount < 2;
    },
    action: async () => {
      // Wait longer on slow connections
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    },
    description: 'Extended retry for slow connections',
    priority: 2,
    maxAttempts: 2,
  },
  {
    id: 'cache-fallback',
    condition: (error) => {
      return error.message.includes('network') || error.message.includes('offline');
    },
    action: async () => {
      // Try to load from cache or service worker
      try {
        // This would integrate with service worker cache
        return true;
      } catch {
        return false;
      }
    },
    description: 'Attempt to load from cache',
    priority: 3,
    maxAttempts: 1,
  },
  {
    id: 'graceful-degradation',
    condition: () => true, // Always available as last resort
    action: async () => {
      // Show offline mode or reduced functionality
      return true;
    },
    description: 'Enable offline mode or reduced functionality',
    priority: 10,
    maxAttempts: 1,
  },
];

/**
 * Enhanced error recovery hook with intelligent retry strategies
 */
export function useErrorRecovery(
  operationId: string,
  customStrategies: RecoveryStrategy[] = []
): {
  recover: () => Promise<boolean>;
  recoveryState: RecoveryState;
  addStrategy: (strategy: RecoveryStrategy) => void;
  removeStrategy: (strategyId: string) => void;
  resetRecovery: () => void;
} {
  const { state, retryOperation, getOperation } = useUnifiedLoading();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRecovering: false,
    currentStrategy: null,
    attempts: 0,
    lastRecoveryTime: null,
    canRecover: true,
    suggestions: [],
  });

  const strategiesRef = useRef<RecoveryStrategy[]>([...DEFAULT_RECOVERY_STRATEGIES, ...customStrategies]);
  const recoveryAttemptsRef = useRef<Record<string, number>>({});

  const operation = getOperation(operationId);
  const context: RecoveryContext = {
    error: operation?.error || new Error('Unknown error'),
    operationId,
    retryCount: operation?.retryCount || 0,
    timeElapsed: operation ? Date.now() - operation.startTime : 0,
    connectionType: state.connectionInfo?.connectionType || 'unknown',
    isOnline: state.isOnline,
  };

  const getApplicableStrategies = useCallback((): RecoveryStrategy[] => {
    return strategiesRef.current
      .filter(strategy => {
        const attempts = recoveryAttemptsRef.current[strategy.id] || 0;
        return attempts < strategy.maxAttempts && strategy.condition(context.error, context);
      })
      .sort((a, b) => a.priority - b.priority);
  }, [context]);

  const recover = useCallback(async (): Promise<boolean> => {
    if (!recoveryState.canRecover || recoveryState.isRecovering) {
      return false;
    }

    const strategies = getApplicableStrategies();
    if (strategies.length === 0) {
      setRecoveryState(prev => ({
        ...prev,
        canRecover: false,
        suggestions: ['No recovery strategies available'],
      }));
      return false;
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      currentStrategy: strategies[0].id,
      attempts: prev.attempts + 1,
    }));

    for (const strategy of strategies) {
      const attempts = recoveryAttemptsRef.current[strategy.id] || 0;

      if (attempts >= strategy.maxAttempts) continue;

      try {
        logger.info(`Attempting recovery strategy: ${strategy.description}`, {
          operationId,
          strategy: strategy.id,
          attempt: attempts + 1,
          component: 'useErrorRecovery'
        });

        const success = await strategy.action();

        if (success) {
          // Mark strategy as used
          recoveryAttemptsRef.current[strategy.id] = attempts + 1;

          // Try the original operation again
          retryOperation(operationId);

          setRecoveryState(prev => ({
            ...prev,
            isRecovering: false,
            currentStrategy: null,
            lastRecoveryTime: Date.now(),
            canRecover: true,
            suggestions: [],
          }));

          logger.info(`Recovery successful with strategy: ${strategy.description}`, {
            operationId,
            strategy: strategy.id,
            component: 'useErrorRecovery'
          });

          return true;
        }
      } catch (error) {
        logger.warn(`Recovery strategy failed: ${strategy.description}`, {
          operationId,
          strategy: strategy.id,
          error,
          component: 'useErrorRecovery'
        });

        // Mark attempt
        recoveryAttemptsRef.current[strategy.id] = attempts + 1;
      }
    }

    // All strategies failed
    const suggestions = strategies.map(s => s.description);
    setRecoveryState(prev => ({
      ...prev,
      isRecovering: false,
      currentStrategy: null,
      canRecover: false,
      suggestions,
    }));

    logger.error('All recovery strategies failed', {
      operationId,
      strategies: strategies.map(s => s.id),
      component: 'useErrorRecovery'
    });

    return false;
  }, [operationId, recoveryState, getApplicableStrategies, retryOperation]);

  const addStrategy = useCallback((strategy: RecoveryStrategy) => {
    strategiesRef.current = [...strategiesRef.current, strategy];
  }, []);

  const removeStrategy = useCallback((strategyId: string) => {
    strategiesRef.current = strategiesRef.current.filter(s => s.id !== strategyId);
  }, []);

  const resetRecovery = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      currentStrategy: null,
      attempts: 0,
      lastRecoveryTime: null,
      canRecover: true,
      suggestions: [],
    });
    recoveryAttemptsRef.current = {};
  }, []);

  // Update suggestions when error changes
  useEffect(() => {
    if (operation?.error && !recoveryState.isRecovering) {
      const strategies = getApplicableStrategies();
      const suggestions = strategies.slice(0, 3).map(s => s.description);

      setRecoveryState(prev => ({
        ...prev,
        canRecover: strategies.length > 0,
        suggestions,
      }));
    }
  }, [operation?.error, recoveryState.isRecovering, getApplicableStrategies]);

  return {
    recover,
    recoveryState,
    addStrategy,
    removeStrategy,
    resetRecovery,
  };
}

/**
 * Hook for automatic error recovery with configurable triggers
 */
export function useAutoRecovery(
  operationId: string,
  options: {
    autoRecover: boolean;
    recoveryDelay: number;
    maxAutoAttempts: number;
    triggerConditions: Array<(error: Error) => boolean>;
  } = {
    autoRecover: true,
    recoveryDelay: 1000,
    maxAutoAttempts: 2,
    triggerConditions: [
      (error) => error.message.includes('network'),
      (error) => error.message.includes('timeout'),
    ],
  }
) {
  const { recover, recoveryState } = useErrorRecovery(operationId);
  const autoAttemptsRef = useRef(0);

  const { getOperation } = useUnifiedLoading();
  const operation = getOperation(operationId);

  useEffect(() => {
    if (!options.autoRecover || !operation?.error || recoveryState.isRecovering) return;

    const shouldAutoRecover = options.triggerConditions.some(condition =>
      condition(operation.error!)
    );

    if (shouldAutoRecover && autoAttemptsRef.current < options.maxAutoAttempts) {
      autoAttemptsRef.current++;

      const timeout = setTimeout(async () => {
        const success = await recover();
        if (!success) {
          logger.warn('Auto-recovery failed, manual intervention may be needed', {
            operationId,
            attempts: autoAttemptsRef.current,
            component: 'useAutoRecovery'
          });
        }
      }, options.recoveryDelay);

      return () => clearTimeout(timeout);
    }
  }, [operation?.error, options, recover, recoveryState.isRecovering, operationId]);

  return {
    recover,
    recoveryState,
    autoAttempts: autoAttemptsRef.current,
  };
}

/**
 * Hook for predictive error recovery based on patterns
 */
export function usePredictiveRecovery(operationId: string) {
  const { state } = useUnifiedLoading();
  const [predictions, setPredictions] = useState<Array<{
    type: string;
    probability: number;
    suggestedStrategy: string;
  }>>([]);

  // Analyze patterns and predict potential failures
  useEffect(() => {
    const operation = state.operations[operationId];
    if (!operation) return;

    const newPredictions: typeof predictions = [];

    // Network-based predictions
    if (!state.isOnline) {
      newPredictions.push({
        type: 'network',
        probability: 0.9,
        suggestedStrategy: 'cache-fallback',
      });
    } else if (state.connectionInfo?.connectionType === 'slow') {
      newPredictions.push({
        type: 'slow-connection',
        probability: 0.7,
        suggestedStrategy: 'connection-aware-retry',
      });
    }

    // Time-based predictions
    const elapsed = Date.now() - operation.startTime;
    const timeout = operation.timeout || state.adaptiveSettings.defaultTimeout;
    const progressRatio = elapsed / timeout;

    if (progressRatio > 0.8) {
      newPredictions.push({
        type: 'timeout-risk',
        probability: Math.min(0.8, progressRatio - 0.7),
        suggestedStrategy: 'graceful-degradation',
      });
    }

    setPredictions(newPredictions);
  }, [operationId, state]);

  return {
    predictions,
    hasHighRiskPredictions: predictions.some(p => p.probability > 0.7),
  };
}