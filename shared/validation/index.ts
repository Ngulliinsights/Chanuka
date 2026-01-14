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
 * import { CommentValidationRules, validateComment } from '@shared/validation';
 * const errors = validateComment(formData);
 */

export {
  BILL_VALIDATION_RULES,
  BillSchema,
  validateBill,
  type BillValidationInput,
  type Bill,
} from './bill.validation';

export {
  COMMENT_VALIDATION_RULES,
  CommentSchema,
  validateComment,
  type CommentValidationInput,
  type Comment,
} from './comment.validation';

export {
  USER_VALIDATION_RULES,
  UserSchema,
  UserRegistrationSchema,
  validateUser,
  validateUserRegistration,
  type UserValidationInput,
  type User,
  type UserRegistrationInput,
} from './user.validation';
