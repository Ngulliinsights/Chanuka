/**
 * Strategy Pattern Template
 *
 * Use this template for hooks that require configurable behavior
 * through multiple algorithms or conditional logic.
 *
 * Follows the pattern used in useErrorRecovery.ts
 */

import { useState, useCallback, useMemo, useRef } from 'react';

// 1. Define Strategy Interface
export interface Strategy<TContext, TResult> {
  id: string;
  condition: (context: TContext) => boolean;
  action: (context: TContext) => Promise<TResult>;
  description: string;
  priority: number;
  maxAttempts: number;
}

// 2. Define Context Interface
export interface StrategyContext {
  data: any;
  metadata: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

// 3. Define Result Interface
export interface StrategyResult<T = any> {
  success: boolean;
  result?: T;
  strategyId: string;
  executionTime: number;
  error?: Error;
}

// 4. Create Strategy Manager Hook
export function useStrategyManager<TContext, TResult>(
  strategies: Strategy<TContext, TResult>[],
  options: {
    fallbackStrategy?: Strategy<TContext, TResult>;
    maxRetries?: number;
    timeout?: number;
  } = {}
) {
  const { fallbackStrategy, maxRetries = 3, timeout = 5000 } = options;

  const [executionHistory, setExecutionHistory] = useState<StrategyResult<TResult>[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const strategyAttemptsRef = useRef<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // 5. Get Applicable Strategies
  const getApplicableStrategies = useCallback(
    (context: TContext): Strategy<TContext, TResult>[] => {
      return strategies
        .filter(strategy => {
          const attempts = strategyAttemptsRef.current[strategy.id] || 0;
          return attempts < strategy.maxAttempts && strategy.condition(context);
        })
        .sort((a, b) => a.priority - b.priority);
    },
    [strategies]
  );

  // 6. Execute Strategy
  const executeStrategy = useCallback(
    async (context: TContext): Promise<StrategyResult<TResult>> => {
      if (isExecuting) {
        return {
          success: false,
          strategyId: 'concurrent_execution',
          executionTime: 0,
          error: new Error('Strategy already executing'),
        };
      }

      setIsExecuting(true);
      setCurrentStrategy(null);
      const startTime = performance.now();

      try {
        const applicableStrategies = getApplicableStrategies(context);

        if (applicableStrategies.length === 0) {
          // Try fallback strategy
          if (fallbackStrategy && fallbackStrategy.condition(context)) {
            applicableStrategies.push(fallbackStrategy);
          } else {
            throw new Error('No applicable strategies found');
          }
        }

        for (const strategy of applicableStrategies) {
          const attempts = strategyAttemptsRef.current[strategy.id] || 0;

          if (attempts >= strategy.maxAttempts) continue;

          try {
            setCurrentStrategy(strategy.id);

            // Setup timeout
            abortControllerRef.current = new AbortController();
            const timeoutId = setTimeout(() => {
              abortControllerRef.current?.abort();
            }, timeout);

            const result = await strategy.action(context);

            clearTimeout(timeoutId);
            abortControllerRef.current = null;

            const executionTime = performance.now() - startTime;
            const strategyResult: StrategyResult<TResult> = {
              success: true,
              result,
              strategyId: strategy.id,
              executionTime,
            };

            // Update attempts
            strategyAttemptsRef.current[strategy.id] = attempts + 1;
            setExecutionHistory(prev => [...prev, strategyResult]);

            return strategyResult;
          } catch (error) {
            const executionTime = performance.now() - startTime;
            const strategyResult: StrategyResult<TResult> = {
              success: false,
              strategyId: strategy.id,
              executionTime,
              error: error as Error,
            };

            // Update attempts
            strategyAttemptsRef.current[strategy.id] = attempts + 1;
            setExecutionHistory(prev => [...prev, strategyResult]);

            // Continue to next strategy
            continue;
          }
        }

        // All strategies failed
        throw new Error('All strategies failed');
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const strategyResult: StrategyResult<TResult> = {
          success: false,
          strategyId: 'all_strategies_failed',
          executionTime,
          error: error as Error,
        };

        setExecutionHistory(prev => [...prev, strategyResult]);
        return strategyResult;
      } finally {
        setIsExecuting(false);
        setCurrentStrategy(null);
        if (abortControllerRef.current) {
          abortControllerRef.current = null;
        }
      }
    },
    [getApplicableStrategies, fallbackStrategy, timeout, isExecuting]
  );

  // 7. Get Strategy Statistics
  const getStrategyStats = useCallback(() => {
    const stats = strategies.reduce((acc, strategy) => {
      const executions = executionHistory.filter(h => h.strategyId === strategy.id);
      const successes = executions.filter(h => h.success);

      return {
        ...acc,
        [strategy.id]: {
          totalExecutions: executions.length,
          successes: successes.length,
          failures: executions.length - successes.length,
          successRate: executions.length > 0 ? successes.length / executions.length : 0,
          averageExecutionTime: executions.length > 0
            ? executions.reduce((sum, h) => sum + h.executionTime, 0) / executions.length
            : 0,
          attempts: strategyAttemptsRef.current[strategy.id] || 0,
        },
      };
    }, {} as Record<string, unknown>);

    return stats;
  }, [strategies, executionHistory]);

  // 8. Reset Strategy Manager
  const reset = useCallback(() => {
    setExecutionHistory([]);
    strategyAttemptsRef.current = {};
    setCurrentStrategy(null);
    setIsExecuting(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // 9. Return Manager Interface
  return {
    executeStrategy,
    getApplicableStrategies,
    getStrategyStats,
    reset,
    state: {
      isExecuting,
      currentStrategy,
      executionHistory,
      strategyAttempts: strategyAttemptsRef.current,
    },
  };
}

/**
 * Advanced Strategy Pattern with Dynamic Strategy Registration
 *
 * For scenarios requiring runtime strategy management
 */
export function useDynamicStrategyManager<TContext, TResult>() {
  const [strategies, setStrategies] = useState<Strategy<TContext, TResult>[]>([]);

  const strategyManager = useStrategyManager<TContext, TResult>(strategies);

  // 10. Register Strategy
  const registerStrategy = useCallback((strategy: Strategy<TContext, TResult>) => {
    setStrategies(prev => {
      // Check if strategy already exists
      const existingIndex = prev.findIndex(s => s.id === strategy.id);
      if (existingIndex >= 0) {
        const newStrategies = [...prev];
        newStrategies[existingIndex] = strategy;
        return newStrategies;
      }
      return [...prev, strategy];
    });
  }, []);

  // 11. Unregister Strategy
  const unregisterStrategy = useCallback((strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
  }, []);

  // 12. Update Strategy
  const updateStrategy = useCallback((strategyId: string, updates: Partial<Strategy<TContext, TResult>>) => {
    setStrategies(prev => prev.map(s =>
      s.id === strategyId ? { ...s, ...updates } : s
    ));
  }, []);

  return {
    ...strategyManager,
    strategies,
    registerStrategy,
    unregisterStrategy,
    updateStrategy,
  };
}

/**
 * Conditional Strategy Hook
 *
 * For scenarios where strategy selection depends on dynamic conditions
 */
export function useConditionalStrategy<TContext, TResult>(
  strategyMap: Record<string, Strategy<TContext, TResult>>,
  condition: (context: TContext) => string
) {
  const strategyManager = useStrategyManager<TContext, TResult>(Object.values(strategyMap));

  const executeConditionalStrategy = useCallback(
    async (context: TContext): Promise<StrategyResult<TResult>> => {
      const strategyId = condition(context);
      const strategy = strategyMap[strategyId];

      if (!strategy) {
        throw new Error(`No strategy found for condition: ${strategyId}`);
      }

      return strategyManager.executeStrategy(context);
    },
    [strategyMap, condition, strategyManager]
  );

  return {
    ...strategyManager,
    executeConditionalStrategy,
  };
}
