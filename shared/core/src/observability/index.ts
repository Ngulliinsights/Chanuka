/**
 * Unified Observability System
 * 
 * This module provides a comprehensive observability solution that includes:
 * - Structured logging with multiple transports
 * - Unified error management and recovery
 * - Metrics collection and reporting
 * - Distributed tracing
 * - Health monitoring
 * 
 * All components are designed to work together seamlessly and provide
 * a complete picture of system behavior and performance.
 */

// Core logging functionality
export * from './logging';

// Unified error management
export * from './error-management';

// Health monitoring
export * from './health';

// Metrics collection
export * from './metrics';

// Distributed tracing
export * from './tracing';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';

// Default exports for common use cases
export { logger } from './logging';

// Feature flag for gradual migration
export const useUnifiedObservability = process.env.USE_UNIFIED_OBSERVABILITY === 'true';