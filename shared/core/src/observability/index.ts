// Observability - Single Source of Truth
// This module consolidates all logging, health, middleware, and error management

// Core observability
export * from './interfaces';
export * from './middleware';
export * from './correlation';
export * from './stack';
export * from './telemetry';

// Logging
export * from './logging';

// Health monitoring
export * from './health';

// Error management
export * from './error-management';

// Metrics and tracing
export * from './metrics';
export * from './tracing';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';

