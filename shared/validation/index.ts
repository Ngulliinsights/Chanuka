/**
 * Shared Validation Module
 *
 * Centralized validation schemas and rules for domain models.
 * These schemas work with @shared/core/validation framework
 * and can be used in both client and server without duplication.
 *
 * @example
 * // In server
 * import { BillSchema, validateBill } from '@shared/validation';
 * const result = validateBill(data);
 *
 * // In client
 * import { COMMENT_VALIDATION_RULES, validateComment } from '@shared/validation';
 * const errors = validateComment(formData);
 */

// Export all schemas and validation utilities from the schemas directory
export * from './schemas';

// Export validation helpers
export { validateUser, validateUserRegistration } from './schemas/user.schema';
export { validateBill } from './schemas/bill.schema';
export { validateComment } from './schemas/comment.schema';
