/**
 * Unified Loading States Management System
 * Consolidated from multiple implementations following error management pattern
 * Platform-agnostic loading concerns with cross-cutting integration
 */

// Core exports
export * from './types';
export * from './context';
export * from './hooks';
export * from './reducer';

// Utilities
export * from './utils';

// Re-export for backward compatibility
export { LoadingProvider as UnifiedLoadingProvider } from './context';
export { useLoading as useUnifiedLoading } from './context';

// Connection-aware utilities
export { getConnectionMultiplier, shouldSkipOperation } from './utils/connection-utils';

// Performance monitoring
export { LoadingPerformanceMonitor, globalLoadingMonitor } from './utils/loading-utils';

// Loading scenarios
export { LOADING_SCENARIOS, LoadingScenarioBuilder, createOperationFromScenario } from './utils/loading-utils';

// Error types
export {
  LoadingError,
  LoadingTimeoutError,
  LoadingRetryError,
  LoadingConnectionError
} from './types';
