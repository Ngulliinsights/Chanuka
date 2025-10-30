/**
 * BACKWARD COMPATIBILITY: NavigationContext
 * This file provides backward compatibility for components that still import from the old location
 */

// Re-export everything from the core navigation system
export * from '../core/navigation/context';
export * from '../core/navigation/types';
export * from '../core/navigation/hooks';

// For components that need the provider factory
export { createNavigationProvider } from '../core/navigation/context';

// Deprecated warning for old imports
console.warn(
  'Importing from contexts/NavigationContext is deprecated. ' +
  'Please import from core/navigation/context instead.'
);