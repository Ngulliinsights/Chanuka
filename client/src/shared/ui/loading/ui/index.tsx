/**
 * Loading UI components barrel exports
 * Following navigation component patterns for UI organization
 */

import React from 'react';

export { LoadingIndicator } from './LoadingIndicator';
export { ProgressiveLoader } from './ProgressiveLoader';
export { TimeoutAwareLoader } from './TimeoutAwareLoader';

// Skeleton components for layout stability
export { Skeleton } from './Skeleton';
export { CardSkeleton } from './CardSkeleton';
export { ListSkeleton } from './ListSkeleton';
export { FormSkeleton } from './FormSkeleton';
export { TextSkeleton } from './TextSkeleton';
export { AvatarSkeleton } from './AvatarSkeleton';

// Placeholder components for demo compatibility
export const LoadingStateManager: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const PageLoader: React.FC<{ isLoading: boolean }> = ({ isLoading }) => 
  isLoading ? <div>Loading page...</div> : null;

export const ComponentLoader: React.FC<{ isLoading: boolean }> = ({ isLoading }) => 
  isLoading ? <div>Loading component...</div> : null;

export const ConnectionAwareLoader: React.FC<{ isLoading: boolean }> = ({ isLoading }) => 
  isLoading ? <div>Loading...</div> : null;