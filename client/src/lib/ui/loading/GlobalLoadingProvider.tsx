/**
 * Global Loading Provider
 *
 * Provides global loading state management and context for the application.
 * This component should be placed at the root of your app to enable
 * global loading indicators throughout the component tree.
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  startLoadingOperation,
  completeLoadingOperation,
  selectLoadingOperation,
  selectOperationsByPriority,
  selectActiveOperationsCount,
  selectShouldShowGlobalLoader,
  type LoadingStateData,
  type ExtendedLoadingOperation,
} from '@client/lib/infrastructure/store/slices/loadingSlice';
import { LoadingOperation, LoadingPriority } from '@client/lib/types/loading';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert ExtendedLoadingOperation to LoadingOperation for component compatibility
 */
const convertToLoadingOperation = (extended: ExtendedLoadingOperation): LoadingOperation => ({
  id: extended.id,
  type: extended.type,
  priority: extended.priority,
  startTime: extended.startTime,
  timeout: extended.timeout,
  retryCount: extended.retryCount,
  maxRetries: extended.maxRetries,
  error: extended.error,
  message: extended.message,
  progress: extended.progress,
});

/**
 * Convert a record of ExtendedLoadingOperation to LoadingOperation
 */
const convertOperationsRecord = (
  operations: Record<string, ExtendedLoadingOperation>
): Record<string, LoadingOperation> => {
  const converted: Record<string, LoadingOperation> = {};
  for (const [key, operation] of Object.entries(operations)) {
    converted[key] = convertToLoadingOperation(operation);
  }
  return converted;
};

// ============================================================================
// Context Types
// ============================================================================

interface GlobalLoadingContextValue {
  // State
  operations: Record<string, LoadingOperation>;
  isOnline: boolean;
  shouldShowGlobalLoader: boolean;
  activeOperationsCount: number;

  // Actions
  startOperation: (
    operation: Omit<LoadingOperation, 'startTime' | 'retryCount'>
  ) => Promise<string>;
  completeOperation: (id: string, success?: boolean, error?: string) => Promise<void>;

  // Selectors
  getOperation: (id: string) => LoadingOperation | undefined;
  getOperationsByPriority: (priority: LoadingPriority) => LoadingOperation[];
}

// ============================================================================
// Context Creation
// ============================================================================

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

// ============================================================================
// Hook for consuming context
// ============================================================================

/**
 * Hook to access global loading state and actions
 *
 * @throws Error if used outside of GlobalLoadingProvider
 */
export const useGlobalLoading = (): GlobalLoadingContextValue => {
  const context = useContext(GlobalLoadingContext);

  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }

  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

interface GlobalLoadingProviderProps {
  children: React.ReactNode;
}

/**
 * Global Loading Provider Component
 *
 * Wraps the application to provide global loading state management.
 * Connect this to your Redux store at the root of your app.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <Provider store={store}>
 *       <GlobalLoadingProvider>
 *         <YourApp />
 *       </GlobalLoadingProvider>
 *     </Provider>
 *   );
 * }
 * ```
 */
export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const dispatch = useDispatch();

  // Select loading state from Redux store
  const extendedOperations = useSelector(
    (state: { loading: LoadingStateData }) => state.loading.operations
  );
  const isOnline = useSelector((state: { loading: LoadingStateData }) => state.loading.isOnline);
  const shouldShowGlobalLoader = useSelector(selectShouldShowGlobalLoader);
  const activeOperationsCount = useSelector(selectActiveOperationsCount);

  // Convert extended operations to standard operations for component compatibility
  const operations = useMemo(
    () => convertOperationsRecord(extendedOperations),
    [extendedOperations]
  );

  // Action creators
  const startOperation = useCallback(
    async (operation: Omit<LoadingOperation, 'startTime' | 'retryCount'>): Promise<string> => {
      const result = await dispatch(startLoadingOperation(operation) as any);
      if (startLoadingOperation.fulfilled.match(result)) {
        return result.payload.id;
      }
      throw new Error(result.payload as string);
    },
    [dispatch]
  );

  const completeOperation = useCallback(
    async (id: string, success: boolean = true, error?: string): Promise<void> => {
      await dispatch(completeLoadingOperation({ id, success, error }) as any);
    },
    [dispatch]
  );

  // Selectors
  const getOperation = useCallback(
    (id: string): LoadingOperation | undefined => {
      const extended = selectLoadingOperation(
        { loading: { operations: extendedOperations, isOnline } as LoadingStateData },
        id
      );
      return extended ? convertToLoadingOperation(extended) : undefined;
    },
    [extendedOperations, isOnline]
  );

  const getOperationsByPriority = useCallback(
    (priority: LoadingPriority): LoadingOperation[] => {
      const extended = selectOperationsByPriority(
        { loading: { operations: extendedOperations, isOnline } as LoadingStateData },
        priority
      );
      return extended.map(convertToLoadingOperation);
    },
    [extendedOperations, isOnline]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): GlobalLoadingContextValue => ({
      operations,
      isOnline,
      shouldShowGlobalLoader,
      activeOperationsCount,
      startOperation,
      completeOperation,
      getOperation,
      getOperationsByPriority,
    }),
    [
      operations,
      isOnline,
      shouldShowGlobalLoader,
      activeOperationsCount,
      startOperation,
      completeOperation,
      getOperation,
      getOperationsByPriority,
    ]
  );

  return (
    <GlobalLoadingContext.Provider value={contextValue}>{children}</GlobalLoadingContext.Provider>
  );
};

export default GlobalLoadingProvider;
