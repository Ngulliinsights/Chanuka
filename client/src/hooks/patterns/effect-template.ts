/**
 * Effect Pattern Template
 *
 * Use this template for hooks that require side effects
 * such as event listeners, data fetching, or cleanup operations.
 *
 * Follows the pattern used in useOfflineDetection.tsx
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// 1. Define Effect Configuration Interface
export interface EffectConfig {
  enabled?: boolean;
  dependencies?: any[];
  cleanup?: boolean;
  immediate?: boolean;
}

// 2. Define Effect State Interface
export interface EffectState {
  isRunning: boolean;
  lastExecution: number;
  error: Error | null;
  retries: number;
}

// 3. Create Hook with Side Effects
export function useExampleEffect(config: EffectConfig = {}) {
  const { enabled = true, dependencies = [], cleanup = true, immediate = false } = config;

  const [state, setState] = useState<EffectState>({
    isRunning: false,
    lastExecution: 0,
    error: null,
    retries: 0,
  });

  const effectRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const cleanupRef = useRef<(() => void)[]>([]);

  // 4. Define Effect Logic
  const executeEffect = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    setState(prev => ({ ...prev, isRunning: true, error: null }));

    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setState(prev => ({
        ...prev,
        isRunning: false,
        lastExecution: Date.now(),
        retries: 0,
      }));

      console.log('Effect executed successfully');
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error as Error,
        retries: prev.retries + 1,
      }));

      console.error('Effect failed:', error);
    }
  }, [enabled]);

  // 5. Define Cleanup Function
  const performCleanup = useCallback(() => {
    if (effectRef.current) {
      clearTimeout(effectRef.current);
      effectRef.current = null;
    }

    // Execute all cleanup functions
    cleanupRef.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });

    cleanupRef.current = [];
  }, []);

  // 6. Main Effect Hook
  useEffect(() => {
    mountedRef.current = true;

    if (immediate) {
      executeEffect();
    }

    // Setup effect
    const setupEffect = () => {
      if (!enabled) return;

      // Clear existing timeout
      if (effectRef.current) {
        clearTimeout(effectRef.current);
      }

      // Set new timeout
      effectRef.current = setTimeout(executeEffect, 1000);
    };

    setupEffect();

    // Return cleanup function
    return () => {
      mountedRef.current = false;
      if (cleanup) {
        performCleanup();
      }
    };
  }, [enabled, immediate, executeEffect, performCleanup, ...dependencies]);

  // 7. Event Listener Management
  const addEventListener = useCallback((
    target: EventTarget,
    eventType: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    if (!mountedRef.current) return;

    target.addEventListener(eventType, listener, options);

    // Add cleanup function
    cleanupRef.current.push(() => {
      target.removeEventListener(eventType, listener, options);
    });
  }, []);

  // 8. Resource Management
  const manageResource = useCallback((
    resource: any,
    cleanupFn: () => void
  ) => {
    if (!mountedRef.current) return;

    // Add cleanup function for resource
    cleanupRef.current.push(cleanupFn);
  }, []);

  // 9. Return State and Utilities
  return {
    state,
    utilities: {
      executeEffect,
      performCleanup,
      addEventListener,
      manageResource,
    },
  };
}

/**
 * Advanced Effect Pattern with Multiple Side Effects
 *
 * For complex scenarios requiring multiple coordinated effects
 */
export function useAdvancedEffect(
  effects: Array<{
    id: string;
    enabled: boolean;
    effect: () => void | (() => void);
    dependencies: any[];
  }>,
  options: {
    parallel?: boolean;
    sequential?: boolean;
    retry?: boolean;
  } = {}
) {
  const { parallel = true, sequential = false, retry = false } = options;

  const [effectStates, setEffectStates] = useState<Record<string, EffectState>>(
    effects.reduce((acc, effect) => ({
      ...acc,
      [effect.id]: {
        isRunning: false,
        lastExecution: 0,
        error: null,
        retries: 0,
      },
    }), {})
  );

  const mountedRef = useRef(true);

  // Execute effects based on configuration
  useEffect(() => {
    mountedRef.current = true;

    const executeEffects = async () => {
      if (sequential) {
        // Execute effects sequentially
        for (const effect of effects) {
          if (!effect.enabled || !mountedRef.current) continue;

          try {
            setEffectStates(prev => ({
              ...prev,
              [effect.id]: { ...prev[effect.id], isRunning: true },
            }));

            const cleanup = effect.effect();

            setEffectStates(prev => ({
              ...prev,
              [effect.id]: {
                ...prev[effect.id],
                isRunning: false,
                lastExecution: Date.now(),
              },
            }));

            // Handle cleanup
            if (cleanup && typeof cleanup === 'function') {
              return cleanup;
            }
          } catch (error) {
            setEffectStates(prev => ({
              ...prev,
              [effect.id]: {
                ...prev[effect.id],
                isRunning: false,
                error: error as Error,
              },
            }));
          }
        }
      } else if (parallel) {
        // Execute effects in parallel
        await Promise.allSettled(
          effects.map(async (effect) => {
            if (!effect.enabled || !mountedRef.current) return;

            try {
              setEffectStates(prev => ({
                ...prev,
                [effect.id]: { ...prev[effect.id], isRunning: true },
              }));

              const cleanup = effect.effect();

              setEffectStates(prev => ({
                ...prev,
                [effect.id]: {
                  ...prev[effect.id],
                  isRunning: false,
                  lastExecution: Date.now(),
                },
              }));

              return cleanup;
            } catch (error) {
              setEffectStates(prev => ({
                ...prev,
                [effect.id]: {
                  ...prev[effect.id],
                  isRunning: false,
                  error: error as Error,
                },
              }));
            }
          })
        );
      }
    };

    executeEffects();

    return () => {
      mountedRef.current = false;
    };
  }, effects.map(e => e.dependencies).flat());

  return effectStates;
}

/**
 * Debounced Effect Hook
 *
 * For effects that should be debounced to prevent excessive executions
 */
export function useDebouncedEffect(
  effect: () => void,
  delay: number,
  dependencies: any[] = []
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(effect, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}
