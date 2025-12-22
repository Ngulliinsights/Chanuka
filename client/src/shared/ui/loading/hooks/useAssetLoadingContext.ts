/**
 * Asset Loading Context Hook
 */

import { useContext } from 'react';

import { AssetLoadingContext } from '../context/AssetLoadingContext';

export function useAssetLoadingContext() {
  const context = useContext(AssetLoadingContext);
  if (!context) {
    throw new Error('useAssetLoadingContext must be used within AssetLoadingProvider');
  }
  return context;
}