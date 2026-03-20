import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { 
  RootState, 
  AppDispatch,
  selectLoadingOperation,
  startLoadingOperation,
  completeLoadingOperation,
  retryLoadingOperation,
  setGlobalLoading,
  resetLoadingState
} from '@client/infrastructure/store';
import { LoadingOperation } from '@client/lib/types/loading';

/**
 * Hook for component-level loading state management.
 * Connects to the centralized Redux loading slice.
 */
export function useLoading() {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((state: RootState) => state.loading);

  const getOperation = useCallback(
    (id: string) => state.operations[id],
    [state.operations]
  );

  const startOperation = useCallback(
    (operation: Parameters<typeof startLoadingOperation>[0]) => 
      dispatch(startLoadingOperation(operation)),
    [dispatch]
  );

  const completeOperation = useCallback(
    (params: { id: string; success: boolean; error?: string }) => 
      dispatch(completeLoadingOperation(params)),
    [dispatch]
  );

  const retryOperation = useCallback(
    (id: string) => dispatch(retryLoadingOperation(id)),
    [dispatch]
  );

  return {
    state,
    getOperation,
    startOperation,
    completeOperation,
    retryOperation,
    setGlobalLoading: (loading: boolean) => dispatch(setGlobalLoading(loading)),
    resetLoadingState: () => dispatch(resetLoadingState()),
  };
}
