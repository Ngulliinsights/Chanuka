/**
 * Loading state management hook
 * Following navigation component patterns for hook implementation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingState, LoadingType, LoadingPriority } from '../types';
import { LoadingError } from '../errors';
import { debounce } from '../utils/loading-utils';

export interface LoadingStateOptions {
  initialState?: LoadingState;
  debounceMs?: number;
  autoReset?: boolean;
  autoResetDelay?: number;
  onStateChange?: (state: LoadingState) => void;
}

export interface UseLoadingStateResult {
  state: LoadingState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isTimeout: boolean;
  isOffline: boolean;
  error: Error | null;
  
  // Actions
  setLoading: (message?: string) => void;
  setSuccess: (message?: string) => void;
  setError: (error: Error | string) => void;
  setTimeout: () => void;
  setOffline: () => void;
  reset: () => void;
  
  // Utilities
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
  withLoadingCallback: <T extends any[]>(fn: (...args: T) => Promise<any>) => (...args: T) => Promise<void>;
}

export function useLoadingState(options: LoadingStateOptions = {}): UseLoadingStateResult {
  const {
    initialState = 'loading',
    debounceMs = 0,
    autoReset = false,
    autoResetDelay = 3000,
    onStateChange,
  } = options;

  const [state, setState] = useState<LoadingState>(initialState);
  const [error, setErrorState] = useState<Error | null>(null);
  const autoResetTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced state setter
  const debouncedSetState = useCallback(
    debounceMs > 0 ? debounce(setState, debounceMs) : setState,
    [debounceMs]
  );

  // Clear auto-reset timeout
  const clearAutoReset = useCallback(() => {
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = undefined;
    }
  }, []);

  // Set auto-reset timeout
  const setAutoReset = useCallback(() => {
    if (autoReset && autoResetDelay > 0) {
      clearAutoReset();
      autoResetTimeoutRef.current = setTimeout(() => {
        setState('loading');
        setErrorState(null);
      }, autoResetDelay);
    }
  }, [autoReset, autoResetDelay, clearAutoReset]);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoReset();
    };
  }, [clearAutoReset]);

  const setLoading = useCallback((message?: string) => {
    clearAutoReset();
    setErrorState(null);
    debouncedSetState('loading');
  }, [clearAutoReset, debouncedSetState]);

  const setSuccess = useCallback((message?: string) => {
    clearAutoReset();
    setErrorState(null);
    debouncedSetState('success');
    setAutoReset();
  }, [clearAutoReset, debouncedSetState, setAutoReset]);

  const setError = useCallback((errorInput: Error | string) => {
    clearAutoReset();
    const errorObj = typeof errorInput === 'string' ? new Error(errorInput) : errorInput;
    setErrorState(errorObj);
    debouncedSetState('error');
    setAutoReset();
  }, [clearAutoReset, debouncedSetState, setAutoReset]);

  const setTimeout = useCallback(() => {
    clearAutoReset();
    debouncedSetState('timeout');
    setAutoReset();
  }, [clearAutoReset, debouncedSetState, setAutoReset]);

  const setOffline = useCallback(() => {
    clearAutoReset();
    debouncedSetState('offline');
    setAutoReset();
  }, [clearAutoReset, debouncedSetState, setAutoReset]);

  const reset = useCallback(() => {
    clearAutoReset();
    setErrorState(null);
    setState('loading');
  }, [clearAutoReset]);

  // Utility function to wrap async operations
  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    try {
      setLoading();
      const result = await asyncFn();
      setSuccess();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [setLoading, setSuccess, setError]);

  // Utility function to create loading-wrapped callbacks
  const withLoadingCallback = useCallback(<T extends any[]>(
    fn: (...args: T) => Promise<any>
  ) => {
    return async (...args: T): Promise<void> => {
      try {
        setLoading();
        await fn(...args);
        setSuccess();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      }
    };
  }, [setLoading, setSuccess, setError]);

  return {
    state,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isTimeout: state === 'timeout',
    isOffline: state === 'offline',
    error,
    
    setLoading,
    setSuccess,
    setError,
    setTimeout,
    setOffline,
    reset,
    
    withLoading,
    withLoadingCallback,
  };
}

/**
 * Hook for managing multiple loading states
 */

export interface UseMultiLoadingStateOptions {
  debounceMs?: number;
  onStateChange?: (states: Record<string, LoadingState>) => void;
}

export interface UseMultiLoadingStateResult {
  states: Record<string, LoadingState>;
  errors: Record<string, Error | null>;
  
  // State checks
  isAnyLoading: boolean;
  isAllSuccess: boolean;
  hasAnyError: boolean;
  getState: (key: string) => LoadingState;
  getError: (key: string) => Error | null;
  
  // Actions
  setLoading: (key: string, message?: string) => void;
  setSuccess: (key: string, message?: string) => void;
  setError: (key: string, error: Error | string) => void;
  setTimeout: (key: string) => void;
  setOffline: (key: string) => void;
  reset: (key?: string) => void;
  
  // Utilities
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
}

export function useMultiLoadingState(options: UseMultiLoadingStateOptions = {}): UseMultiLoadingStateResult {
  const { debounceMs = 0, onStateChange } = options;
  
  const [states, setStates] = useState<Record<string, LoadingState>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  // Debounced state setter
  const debouncedSetStates = useCallback(
    debounceMs > 0 ? debounce(setStates, debounceMs) : setStates,
    [debounceMs]
  );

  // Notify state changes
  useEffect(() => {
    onStateChange?.(states);
  }, [states, onStateChange]);

  const updateState = useCallback((key: string, state: LoadingState, error?: Error | null) => {
    debouncedSetStates(prev => ({ ...prev, [key]: state }));
    if (error !== undefined) {
      setErrors(prev => ({ ...prev, [key]: error }));
    }
  }, [debouncedSetStates]);

  const setLoading = useCallback((key: string, message?: string) => {
    updateState(key, 'loading', null);
  }, [updateState]);

  const setSuccess = useCallback((key: string, message?: string) => {
    updateState(key, 'success', null);
  }, [updateState]);

  const setError = useCallback((key: string, errorInput: Error | string) => {
    const errorObj = typeof errorInput === 'string' ? new Error(errorInput) : errorInput;
    updateState(key, 'error', errorObj);
  }, [updateState]);

  const setTimeout = useCallback((key: string) => {
    updateState(key, 'timeout');
  }, [updateState]);

  const setOffline = useCallback((key: string) => {
    updateState(key, 'offline');
  }, [updateState]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setStates(prev => {
        const newStates = { ...prev };
        delete newStates[key];
        return newStates;
      });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    } else {
      setStates({});
      setErrors({});
    }
  }, []);

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || 'loading';
  }, [states]);

  const getError = useCallback((key: string): Error | null => {
    return errors[key] || null;
  }, [errors]);

  const withLoading = useCallback(async <T>(key: string, asyncFn: () => Promise<T>): Promise<T> => {
    try {
      setLoading(key);
      const result = await asyncFn();
      setSuccess(key);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(key, error);
      throw error;
    }
  }, [setLoading, setSuccess, setError]);

  const stateValues = Object.values(states);
  const isAnyLoading = stateValues.includes('loading');
  const isAllSuccess = stateValues.length > 0 && stateValues.every(state => state === 'success');
  const hasAnyError = stateValues.includes('error') || stateValues.includes('timeout') || stateValues.includes('offline');

  return {
    states,
    errors,
    
    isAnyLoading,
    isAllSuccess,
    hasAnyError,
    getState,
    getError,
    
    setLoading,
    setSuccess,
    setError,
    setTimeout,
    setOffline,
    reset,
    
    withLoading,
  };
}