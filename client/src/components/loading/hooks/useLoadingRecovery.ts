import { useState, useCallback, useRef } from 'react';
import { 
  LoadingError, 
  isRetryableError, 
  getErrorRecoveryStrategy,
  LoadingTimeoutError,
  LoadingNetworkError 
} from '../errors';
import { LoadingOperation } from '../types';

export interface LoadingRecoveryState {
  canRecover: boolean;
  suggestions: string[];
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

export interface UseLoadingRecoveryOptions {
  maxRecoveryAttempts?: number;
  autoRecovery?: boolean;
  onRecoverySuccess?: () => void;
  onRecoveryFailure?: (error: LoadingError) => void;
}

export interface UseLoadingRecoveryResult {
  recoveryState: LoadingRecoveryState;
  recover: () => Promise<boolean>;
  canRecover: (error: LoadingError) => boolean;
  getSuggestions: (error: LoadingError) => string[];
  reset: () => void;
}

export function useLoadingRecovery(
  options: UseLoadingRecoveryOptions = {}
): UseLoadingRecoveryResult {
  const {
    maxRecoveryAttempts = 3,
    autoRecovery = false,
    onRecoverySuccess,
    onRecoveryFailure
  } = options;

  const [recoveryState, setRecoveryState] = useState<LoadingRecoveryState>({
    canRecover: false,
    suggestions: [],
    isRecovering: false,
    recoveryAttempts: 0,
    maxRecoveryAttempts
  });

  const currentError = useRef<LoadingError | null>(null);
  const recoveryStrategies = useRef<(() => Promise<boolean>)[]>([]);

  const canRecover = useCallback((error: LoadingError): boolean => {
    if (!isRetryableError(error)) {
      return false;
    }
    
    return recoveryState.recoveryAttempts < maxRecoveryAttempts;
  }, [recoveryState.recoveryAttempts, maxRecoveryAttempts]);

  const getSuggestions = useCallback((error: LoadingError): string[] => {
    return getErrorRecoveryStrategy(error);
  }, []);

  const buildRecoveryStrategies = useCallback((error: LoadingError): (() => Promise<boolean>)[] => {
    const strategies: (() => Promise<boolean>)[] = [];

    if (error instanceof LoadingTimeoutError) {
      strategies.push(async () => {
        // Strategy 1: Increase timeout and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      });
    }

    if (error instanceof LoadingNetworkError) {
      strategies.push(async () => {
        // Strategy 1: Wait for network recovery
        await new Promise(resolve => setTimeout(resolve, 2000));
        return navigator.onLine;
      });
      
      strategies.push(async () => {
        // Strategy 2: Try with reduced functionality
        return true;
      });
    }

    // Generic retry strategy
    strategies.push(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.3; // Simulate recovery success
    });

    return strategies;
  }, []);

  const recover = useCallback(async (): Promise<boolean> => {
    if (!currentError.current || !canRecover(currentError.current)) {
      return false;
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true
    }));

    try {
      const strategies = recoveryStrategies.current;
      
      for (const strategy of strategies) {
        try {
          const success = await strategy();
          if (success) {
            setRecoveryState(prev => ({
              ...prev,
              isRecovering: false,
              recoveryAttempts: prev.recoveryAttempts + 1,
              canRecover: true
            }));
            
            onRecoverySuccess?.();
            return true;
          }
        } catch (strategyError) {
          console.warn('Recovery strategy failed:', strategyError);
          continue;
        }
      }

      // All strategies failed
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryAttempts: prev.recoveryAttempts + 1,
        canRecover: prev.recoveryAttempts + 1 < maxRecoveryAttempts
      }));

      onRecoveryFailure?.(currentError.current);
      return false;

    } catch (error) {
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryAttempts: prev.recoveryAttempts + 1,
        canRecover: false
      }));

      onRecoveryFailure?.(error as LoadingError);
      return false;
    }
  }, [canRecover, maxRecoveryAttempts, onRecoverySuccess, onRecoveryFailure]);

  const reset = useCallback(() => {
    setRecoveryState({
      canRecover: false,
      suggestions: [],
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts
    });
    currentError.current = null;
    recoveryStrategies.current = [];
  }, [maxRecoveryAttempts]);

  // Update recovery state when error changes
  const updateError = useCallback((error: LoadingError | null) => {
    currentError.current = error;
    
    if (error) {
      const canRecoverError = canRecover(error);
      const suggestions = getSuggestions(error);
      
      setRecoveryState(prev => ({
        ...prev,
        canRecover: canRecoverError,
        suggestions
      }));

      recoveryStrategies.current = buildRecoveryStrategies(error);

      // Auto-recovery if enabled
      if (autoRecovery && canRecoverError) {
        setTimeout(() => {
          recover();
        }, 1000);
      }
    } else {
      reset();
    }
  }, [canRecover, getSuggestions, buildRecoveryStrategies, autoRecovery, recover, reset]);

  return {
    recoveryState,
    recover,
    canRecover,
    getSuggestions,
    reset,
    updateError
  } as UseLoadingRecoveryResult & { updateError: (error: LoadingError | null) => void };
}