/**
 * Asset Loading Context
 */

import React, { createContext, memo, useMemo } from 'react';

import { useAssetLoadingIndicatorState } from '../hooks/useAssetLoadingIndicatorState';
import type { AssetLoadingIndicatorProps } from '../types';

interface AssetLoadingContextType {
  showIndicator: (options?: Partial<AssetLoadingIndicatorProps>) => void;
  hideIndicator: () => void;
  isIndicatorVisible: boolean;
}

export const AssetLoadingContext = createContext<AssetLoadingContextType | undefined>(undefined);

interface AssetLoadingProviderProps {
  children: React.ReactNode;
}

export const AssetLoadingProvider = memo<AssetLoadingProviderProps>(({ children }) => {
  const { isVisible, config: _config, show, hide } = useAssetLoadingIndicatorState();

  const contextValue = useMemo(
    () => ({
      showIndicator: show,
      hideIndicator: hide,
      isIndicatorVisible: isVisible,
    }),
    [show, hide, isVisible]
  );

  return (
    <AssetLoadingContext.Provider value={contextValue}>
      {children}
      {isVisible && (
        <div className="asset-loading-indicator">
          {/* AssetLoadingIndicator will be rendered here */}
        </div>
      )}
    </AssetLoadingContext.Provider>
  );
});

AssetLoadingProvider.displayName = 'AssetLoadingProvider';
