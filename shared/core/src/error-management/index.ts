// Main error-management barrel exports
// This provides backward compatibility and unified access to all error management capabilities

// Core primitives (foundation)
export * from '../primitives/errors';

// Specialized error classes
export * from './errors/specialized';

// Error handler chain
export * from './handlers';

// Circuit breaker pattern
export * from './patterns';

// Express middleware
export * from './middleware';

// Feature flag for gradual migration
export const useNewErrorManagement = process.env.USE_NEW_ERROR_MANAGEMENT === 'true';