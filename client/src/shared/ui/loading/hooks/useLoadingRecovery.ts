/**
 * Loading Recovery Hook
 */

import { useCallback, useState } from 'react';

import type { RecoveryState } from '../types';

interface UseLoadingRecoveryOptions {
  maxRecoveryAttempts: number;
  onRecoverySuccess: () => void;
}

export function useLoadingRecovery(options: UseLoadingRecoveryOptions) {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    canRecover: true,
    isRecovering: false,
    attempts: 0,
    suggestions: ['Check your internet connection', 'Try refreshing the page'],
  });

  const recover = useCallback(() => {
    if (recoveryState.attempts >= options.maxRecoveryAttempts) {
      setRecoveryState((prev) => ({ ...prev, canRecover: false }));
      return;
    }

    setRecoveryState((prev) => ({
      ...prev,
      isRecovering: true,
      attempts: prev.attempts + 1,
    }));

    setTimeout(() => {
      options.onRecoverySuccess();
      setRecoveryState((prev) => ({ ...prev, isRecovering: false }));
    }, 1000);
  }, [recoveryState.attempts, options]);

  return { recoveryState, recover };
}