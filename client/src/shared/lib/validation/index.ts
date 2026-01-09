/**
 * Validation Module
 *
 * FSD-structured validation with schemas, types, and utilities
 */

// Types
export type {
  ValidationContext,
  ValidationResult,
  FieldValidationConfig,
  FormValidationConfig,
  ValidationService,
  ValidationFactoryConfig,
  ValidationMiddleware,
  ValidationCache,
  ValidationRule,
  ValidationGroup,
} from './types/validation.types';

// Schemas
export {
  billValidationSchemas,
  type BillSearchQuery,
  type BillFilter,
  type CreateBillData,
  type UpdateBillData,
  type BillCommentData,
  type BillEngagementData,
} from './schemas/bill-schemas';

export {
  userValidationSchemas,
  type UserRegisterData,
  type UserLoginData,
  type UserProfileData,
  type UserPreferencesData,
  type UserPasswordChangeData,
  type UserPasswordResetData,
  type UserPasswordResetConfirmData,
  type UserNotificationPreferencesData,
} from './schemas/user-schemas';

export {
  formValidationSchemas,
  type ContactFormData,
  type NewsletterSignupData,
  type FeedbackFormData,
  type PaymentFormData,
} from './schemas/form-schemas';

// Utilities
export {
  validateField,
  validateForm,
  validateSchema,
  getValidationErrors,
  formatValidationErrors,
  createValidationContext,
  applyValidationMiddleware,
  createValidationCache,
  validateRules,
  validateGroup,
  createValidationService,
  validateEmail,
  validateKenyaPhoneNumber,
  validatePasswordStrength,
} from './utils/validation-utils';

// Common patterns
export { validationPatterns } from './types/validation.types';

// Legacy exports for backward compatibility
export { validationPatterns as validationPatternsLegacy } from './types/validation.types';

