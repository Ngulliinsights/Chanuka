/**
 * Shared Library Exports
 *
 * Central export point for shared utilities and helpers
 * Used across features and core modules
 */

// Form utilities
export { useFormBuilder, withFormBuilder, createFormBuilder } from './form-builder';
export type {} from './form-builder'; // Export types implicitly

// Route protection
export { default as ProtectedRoute } from './protected-route';

// React Query configuration
export {
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  cacheUtils,
  configureOfflineSupport,
  setupGlobalErrorHandler,
  devUtils,
} from './react-query-config';
export { apiRequest, getQueryFn } from './queryClient';

// Validation schemas
export {
  validationPatterns,
  billValidationSchemas,
  userValidationSchemas,
  formValidationSchemas,
  allValidationSchemas,
} from './validation-schemas';

// Type exports from validation-schemas
export type {
  BillSearchQuery,
  BillFilter,
  CreateBillData,
  UpdateBillData,
  BillCommentData,
  UserRegisterData,
  UserLoginData,
  UserProfileData,
  UserPreferencesData,
  ContactFormData,
  FeedbackFormData,
  PaymentFormData,
} from './validation-schemas';

// Utility functions
export {
  cn,
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  debounce,
  isValidEmail,
  isValidKenyaPhoneNumber,
  generateId,
  capitalize,
  slugify,
} from './utils';

// Default export for convenience
import * as utils from './utils';
export default utils;
