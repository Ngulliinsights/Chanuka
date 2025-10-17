// Re-export all observability components

// Logging
export * from './logging';

// Health monitoring
export * from './health';

// Metrics collection
export * from './metrics';

// Distributed tracing
export * from './tracing';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';

// Feature flag for gradual migration
export const useUnifiedObservability = process.env.USE_UNIFIED_OBSERVABILITY === 'true';