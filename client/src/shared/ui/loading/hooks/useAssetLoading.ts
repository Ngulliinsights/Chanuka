/**
 * Asset Loading Hook
 */

import { useCallback, useState } from 'react';

import { logger } from '../../../../utils/logger';
import type { LoadingProgress, LoadingStats } from '../types';

// Mock implementation of useAssetLoading
export function useAssetLoading() {
  const [progress] = useState<LoadingProgress>({
    loaded: 0,
    total: 0,
    phase: 'preload',
    currentAsset: undefined,
  });

  const getStats = useCallback((): LoadingStats => {
    return {
      loaded: progress.loaded,
      failed: 0,
      isOnline: navigator.onLine,
      connectionType: 'fast',
    };
  }, [progress.loaded]);

  const applyDegradedMode = useCallback(() => {
    logger.info('Applying degraded mode');
  }, []);

  return { progress, getStats, applyDegradedMode };
}
