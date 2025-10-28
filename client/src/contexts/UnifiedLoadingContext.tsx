/**
 * ADAPTER: UnifiedLoadingContext - Maintains backward compatibility
 * This file provides a React-specific adapter for the shared loading system
 */

import React from 'react';
import { createLoadingProvider, useLoading } from '../core/loading';
import { useConnectionAware } from '../hooks/useConnectionAware';
import { useOnlineStatus } from '../hooks/use-online-status';
import { assetLoadingManager } from '../utils/asset-loading';

// Create the React-specific provider
const LoadingProvider = createLoadingProvider(
  useConnectionAware,
  useOnlineStatus,
  assetLoadingManager
);

// Export with original name for backward compatibility
export { LoadingProvider as UnifiedLoadingProvider };

// Export hook with original name
export { useLoading as useUnifiedLoading };

// Re-export types for backward compatibility
export type {
  LoadingType,
  LoadingOperation,
  LoadingState,
  LoadingOptions,
  ProgressiveStage,
  LoadingResult
} from '../core/loading/types';

// Re-export hooks for backward compatibility
export {
  useLoadingOperation,
  usePageLoading,
  useComponentLoading,
  useProgressiveLoading,
  useTimeoutAwareOperation
} from '../core/loading/hooks';

// Convenience hooks for backward compatibility
export const usePageLoading = (pageId: string) => {
  const { startPageLoading, completePageLoading, getOperationsByType } = useLoading();

  return {
    startPageLoading: (message?: string) => startPageLoading(pageId, message),
    completePageLoading: (success?: boolean, error?: Error) => completePageLoading(pageId, success, error),
    getPageLoadingOperations: () => getOperationsByType('page'),
  };
};

export const useComponentLoading = () => {
  const { startComponentLoading, completeComponentLoading, updateOperation, getOperationsByType } = useLoading();

  const updateComponentProgress = (componentId: string, progress: number, message?: string) => {
    updateOperation(`component-${componentId}`, { progress, message });
  };

  return {
    startComponentLoading,
    updateComponentProgress,
    completeComponentLoading,
    getComponentLoadingOperations: () => getOperationsByType('component'),
  };
};

export const useApiLoading = () => {
  const { startApiLoading, completeApiLoading, updateOperation, getOperationsByType } = useLoading();

  const updateApiProgress = (apiId: string, progress: number, message?: string) => {
    updateOperation(`api-${apiId}`, { progress, message });
  };

  return {
    startApiLoading,
    updateApiProgress,
    completeApiLoading,
    getApiLoadingOperations: () => getOperationsByType('api'),
  };
};

export const useAssetLoading = () => {
  const { state } = useLoading();

  const loadAsset = async (url: string, type: string, config?: any) => {
    return assetLoadingManager.loadAsset(url, type, config);
  };

  const loadAssets = async (assets: any[], phase?: string) => {
    return assetLoadingManager.loadAssets(assets, phase);
  };

  const preloadCriticalAssets = async () => {
    return assetLoadingManager.preloadCriticalAssets();
  };

  const getStats = () => {
    return assetLoadingManager.getLoadingStats();
  };

  return {
    progress: state.assetLoadingProgress,
    loadAsset,
    loadAssets,
    preloadCriticalAssets,
    getStats,
  };
};