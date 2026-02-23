/**
 * Core Validation Module
 */

export * from './dashboard-validation';

// Re-export navigation validators for backward compatibility
export {
  validateNavigationPath,
  validateUserRole,
  validateNavigationItem,
  validateRelatedPage,
  validateUseRelatedPagesOptions,
  safeValidateNavigationPath,
  safeValidateUserRole,
} from '@client/lib/ui/navigation/validation';
