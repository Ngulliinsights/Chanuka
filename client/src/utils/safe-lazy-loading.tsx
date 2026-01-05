/**
 * Safe Lazy Loading Utilities
 * Simplified and fixed version
 */

import React, { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';

// Simple logger fallback
const logger = {
  warn: (message: string, context?: any) => console.warn(message, context),
  error: (message: string, context?: any) => console.error(message, context),
};

// Simple route preloader mock
// Remove unused variables - placeholder for future implementation

/**
 * Create a safe lazy component with error handling
 */
function createSafeLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  componentName: string
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      logger.error(`Failed to load component ${componentName}:`, { error });

      // Return a simple error fallback
      const ErrorFallback: ComponentType<P> = () => (
        <div className="p-4 text-center">
          <p className="text-red-600">Failed to load {componentName}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      );

      return { default: ErrorFallback };
    }
  });
}

/**
 * Create a safe lazy page component
 */
export function createSafeLazyPage<P extends Record<string, never> = Record<string, never>>(
  path: string,
  _exportName: string,
  options: {
    enablePreloading?: boolean;
    preloadPriority?: 'high' | 'medium' | 'low';
    connectionAware?: boolean;
    displayName?: string;
  } = {}
): LazyExoticComponent<ComponentType<P>> {
  const { displayName } = options;
  const componentName = displayName || path.split('/').pop()?.replace('.tsx', '').replace('.ts', '') || 'UnknownPage';

  const importFn = () => {
    // Simple dynamic import based on path
    switch (path) {
      case '@/pages/home':
        return import('@/pages/home');
      case '@/pages/dashboard':
        return import('@/pages/dashboard');
      case '@/pages/bills-dashboard-page':
        return import('@/pages/bills/bills-dashboard-page');
      case '@/pages/auth-page':
        return import('@/pages/auth/auth-page');
      case '@/pages/not-found':
        return import('@/pages/not-found');
      default:
        return Promise.reject(new Error(`Unknown page path: ${path}`));
    }
  };

  return createSafeLazyComponent(importFn, componentName);
}

/**
 * Safe lazy wrapper component
 */
export interface SafeLazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
}

export const SafeLazyWrapper: React.FC<SafeLazyWrapperProps> = ({
  children,
  fallback: Fallback = () => <div>Loading...</div>,
}) => <Suspense fallback={<Fallback />}>{children}</Suspense>;

/**
 * Simplified lazy pages
 */
export const SafeLazyPages = {
  HomePage: createSafeLazyPage('@/pages/home', 'default', {
    displayName: 'HomePage',
  }),
  Dashboard: createSafeLazyPage('@/pages/dashboard', 'default', {
    displayName: 'Dashboard',
  }),
  BillsDashboard: createSafeLazyPage('@/pages/bills-dashboard-page', 'default', {
    displayName: 'BillsDashboard',
  }),
  AuthPage: createSafeLazyPage('@/pages/auth-page', 'default', {
    displayName: 'AuthPage',
  }),
  NotFound: createSafeLazyPage('@/pages/not-found', 'default', {
    displayName: 'NotFound',
  }),
} as const;

export default SafeLazyPages;
