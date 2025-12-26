/**
 * Standard Hook Template
 * 
 * Use this template for creating new shared UI hooks.
 * Follow this pattern for consistency across the shared UI system.
 */

import { useState, useEffect, useCallback } from 'react';
import { useUIErrorHandler } from '../utils/error-handling';

// ============================================================================
// Types
// ============================================================================

export interface UseHookNameOptions {
  /** Option description */
  enabled?: boolean;
  /** Add your specific options here */
}

export interface UseHookNameResult {
  /** Result description */
  data: unknown | null;
  loading: boolean;
  error: Error | null;
  /** Add your specific return values here */
  
  // Actions
  actions: {
    refresh: () => Promise<void>;
    /** Add your specific actions here */
  };
}

// ============================================================================
// Hook
// ============================================================================

export const useHookName = (options: UseHookNameOptions = {}): UseHookNameResult => {
  const { enabled = true } = options;
  
  // State
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Error handling
  const { error, handleError, clearError } = useErrorHandler('useHookName');
  
  // Actions
  const refresh = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      clearError();
      
      // Your async logic here
      const result = await fetchData();
      setData(result);
      
    } catch (err) {
      handleError(err as Error, 'refresh');
    } finally {
      setLoading(false);
    }
  }, [enabled, handleError, clearError]);
  
  // Effects
  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);
  
  // Return
  return {
    data,
    loading,
    error,
    actions: {
      refresh,
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchData(): Promise<any> {
  // Implement your data fetching logic here
  return null;
}

// ============================================================================
// Usage Example
// ============================================================================

/*
import { useHookName } from '@client/shared/ui/hooks';

function MyComponent() {
  const { data, loading, error, actions } = useHookName({
    enabled: true,
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={actions.refresh}>Refresh</button>
    </div>
  );
}
*/