import { Suspense, ReactElement } from 'react';
import React from 'react';

import { LoadingStates } from '@client/lib/ui/loading/LoadingStates';

interface LazyPageWrapperProps {
  children: React.ComponentType;
  fallback?: ReactElement;
}

/**
 * Wrapper component that properly handles lazy-loaded React components
 * by wrapping them in a Suspense boundary with a fallback UI.
 *
 * This solves the TypeScript error where LazyExoticComponent cannot be
 * directly assigned to ReactNode in React Router's Route element prop.
 */
export function LazyPageWrapper({
  children,
  fallback = <LoadingStates.PageLoading />,
}: LazyPageWrapperProps) {
  const Component = children;
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}
