/**
 * Reducer Pattern Template
 *
 * Use this template for hooks that require complex state management
 * with predictable state transitions.
 *
 * Follows the pattern used in use-toast.ts
 */

import { useReducer, useCallback, useEffect } from 'react';

// 1. Define State Interface
export interface ExampleState {
  data: unknown[];
  loading: boolean;
  error: Error | null;
  lastUpdated: number;
}

// 2. Define Action Types
export type ExampleAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: unknown[] }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'RESET_STATE' };

// 3. Define Initial State
const initialState: ExampleState = {
  data: [],
  loading: false,
  error: null,
  lastUpdated: 0,
};

// 4. Create Pure Reducer Function
// IMPORTANT: Reducer must be pure - no side effects
const reducer = (state: ExampleState, action: ExampleAction): ExampleState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_DATA':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
};

// 5. Create Hook Implementation
export function useExampleReducer(initialData?: unknown[]) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    data: initialData || [],
  });

  // 6. Define Actions
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setData = useCallback((data: unknown[]) => {
    dispatch({ type: 'SET_DATA', payload: data });
  }, []);

  const setError = useCallback((error: Error | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // 7. Side Effects in useEffect
  useEffect(() => {
    // Handle side effects here, not in reducer
    if (state.error) {
      console.error('State error occurred:', state.error);
    }
  }, [state.error]);

  // 8. Return State and Actions
  return {
    state,
    actions: {
      setLoading,
      setData,
      setError,
      resetState,
    },
  };
}

/**
 * Advanced Reducer Pattern with Middleware
 *
 * For more complex scenarios requiring middleware-like behavior
 */
export function useAdvancedReducer<TState, TAction>(
  reducer: (state: TState, action: TAction) => TState,
  initialState: TState,
  middleware?: Array<(action: TAction, state: TState) => TAction>
) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const enhancedDispatch = useCallback(
    (action: TAction) => {
      let processedAction = action;

      // Apply middleware
      if (middleware) {
        for (const mw of middleware) {
          processedAction = mw(processedAction, state);
        }
      }

      dispatch(processedAction);
    },
    [dispatch, middleware, state]
  );

  return [state, enhancedDispatch] as const;
}
