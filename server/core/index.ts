// Core Domain
// Centralized exports for core functionality

// Authentication
export * from './auth/index.js';

// Validation
export * from './validation/index.js';

// Error Handling
export { errorTracker } from './errors/error-tracker.js';

// Types
// Avoid re-exporting SocialProfile to prevent conflicts
export {
  User,
  Bill,
  BillComment,
  SocialShare,
  Stakeholder
} from './types/index.js';
export * from './StorageTypes.js';

// API Response Types
export { ApiSuccess, ApiError, ApiValidationError } from '@shared/core/utils/api'';

// Avoid re-exporting SocialProfile to prevent conflicts
// export * from './types/index.js'; // SocialProfile already exported elsewhere






































