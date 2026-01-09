import { useCallback, useState } from 'react';
import { logger } from '@client/utils/logger';

export function useDashboardError(initialError: string | null = null) {
  const [error, setError] = useState<string | null>(initialError);

  const handleError = useCallback((err: unknown, ctx?: Record<string, unknown>) => {
    const message = err instanceof Error ? err.message : String(err || 'Unknown error');
    setError(message);
    try {
      logger?.error?.('Dashboard error', { error: err, ...ctx });
    } catch {
      // ignore logging errors
    }
  }, []);

  return { error, setError, handleError } as const;
}
