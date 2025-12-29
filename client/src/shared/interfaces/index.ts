/**
 * Shared Interfaces Module
 * 
 * Common interface definitions and contracts
 */

// Unified interfaces
export * from './unified-interfaces';

// Export the main unified interfaces type
export type UnifiedInterfaces = {
  LoadingSystem: import('./unified-interfaces').UnifiedLoadingSystem;
  ErrorSystem: import('./unified-interfaces').UnifiedErrorSystem;
  FormSystem: import('./unified-interfaces').UnifiedFormSystem;
  NavigationSystem: import('./unified-interfaces').UnifiedNavigationSystem;
};