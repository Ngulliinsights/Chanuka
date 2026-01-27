/**
 * Asset Loading Indicator State Hook
 */

import { useCallback, useState } from 'react';

import type { AssetLoadingIndicatorProps } from '../types';

export function useAssetLoadingIndicatorState() {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<Partial<AssetLoadingIndicatorProps>>({});

  const show = useCallback((options?: Partial<AssetLoadingIndicatorProps>) => {
    setConfig(options || {});
    setIsVisible(true);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  return { isVisible, config, show, hide };
}
