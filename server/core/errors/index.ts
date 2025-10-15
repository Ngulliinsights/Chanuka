// Errors module exports - Consolidated with shared/core
export * from '../../../shared/core/src/error-handling';

// Re-export server-specific error handling
export { errorTracker } from './error-tracker.js';