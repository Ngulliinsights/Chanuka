/**
 * BACKWARD COMPATIBILITY: NavigationContext
 * This file provides backward compatibility for components that still import from the old location
 */

// Re-export everything from the core navigation system
export * from '@client/core/navigation/context';
export * from '@client/core/navigation/types';
export * from '@client/core/navigation/hooks';

// For components that need the provider factory
export { createNavigationProvider } from '@client/core/navigation/context';
