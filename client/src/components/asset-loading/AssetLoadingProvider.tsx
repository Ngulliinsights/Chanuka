import React, { createContext, useContext, useEffect } from 'react';
import { useOfflineDetection, OfflineDetectionState } from '@client/hooks/useOfflineDetection';
import { AssetLoadingManager } from '@client/utils/asset-loading';

interface AssetLoadingContextType {
  assetManager: AssetLoadingManager;
  connectionState: OfflineDetectionState;
}

const EnhancedAssetLoadingContext = createContext<AssetLoadingContextType | null>(null);

export function useAssetLoading() {
  const context = useContext(EnhancedAssetLoadingContext);
  if (!context) {
    throw new Error('useAssetLoading must be used within an EnhancedAssetLoadingProvider');
  }
  return context;
}

export function EnhancedAssetLoadingProvider({ children }: { children: React.ReactNode }) {
  const connectionState = useOfflineDetection();
  const assetManagerRef = React.useRef<AssetLoadingManager>();

  // Initialize the asset manager once
  if (!assetManagerRef.current) {
    assetManagerRef.current = new AssetLoadingManager();
  }

  // Update the asset manager with connection state
  useEffect(() => {
    if (assetManagerRef.current) {
      assetManagerRef.current.updateConnectionState(connectionState);
    }
  }, [connectionState]);

  const contextValue = useMemo(() => ({
    assetManager: assetManagerRef.current,
    connectionState
  }), [connectionState]);

  return (
    <EnhancedAssetLoadingContext.Provider value={contextValue}>
      {children}
    </EnhancedAssetLoadingContext.Provider>
  );
}