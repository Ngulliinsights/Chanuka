// Errors module exports - Consolidated with shared/core
// Avoid re-exporting ErrorDomain and ErrorSeverity to prevent conflicts
export {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from '@shared/core/index.js';
export * from '../../utils/errors.js';

// Re-export server-specific error handling
export { errorTracker } from './error-tracker.js';






































