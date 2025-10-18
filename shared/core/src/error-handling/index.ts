// Core error handling types and primitives
export * from './core/types.js';

// Error patterns and rules
export * from './patterns/alert-rules.js';
export * from './patterns/error-patterns.js';

// Error handlers and middleware
export * from './handlers/error-boundary.js';

// Error reporting services
export * from './services/error-reporting.js';

// UI components (client-specific)
export * from './ui/error-fallbacks.js';

// Platform-specific adapters
export * from './platform/server/request-context.js';
export * from './platform/client/error-boundary-adapter.js';

// Legacy adapters for backward compatibility
export * from './legacy-adapters.js';