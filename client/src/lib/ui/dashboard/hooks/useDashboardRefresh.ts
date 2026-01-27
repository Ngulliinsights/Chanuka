import { useCallback, useState } from 'react';

export function useDashboardRefresh() {
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const runRefresh = useCallback(async (fn: () => Promise<void>) => {
    setRefreshing(true);
    try {
      await fn();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, runRefresh } as const;
}
