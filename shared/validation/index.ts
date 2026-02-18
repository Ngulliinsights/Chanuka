/**
 * Shared Validation Module
 *
 * Centralized validation schemas, validators, and middleware.
 * These work in both client and server environments.
 *
 * @example
 * ```typescript
 * // Domain validators
 * import { validateEmail, validatePassword } from '@shared/validation';
 * 
 * // Zod schemas
 * import { BillSchema, UserSchema } from '@shared/validation';
 * 
 * // Express middleware (server-only)
 * import { validateSchema } from '@shared/validation';
 * router.post('/users', validateSchema(UserSchema), handler);
 * 
 * // Transformer validation
 * import { createValidatingTransformer } from '@shared/validation';
 * ```
 */

// Export all schemas
export * from './schemas';

// Export domain validators
export * from './validators';

// Export validation helpers
export { validateUser, validateUserRegistration } from './schemas/user.schema';
export { validateBill } from './schemas/bill.schema';
export { validateComment } from './schemas/comment.schema';

// Export middleware (server-only, but safe to import)
export { 
  validateSchema, 
  validateQuery, 
  validateParams 
} from './middleware';

// Export transformer validation utilities
export {
  createValidatingTransformer,
  createSourceValidatingTransformer,
  createTargetValidatingTransformer,
  createBidirectionalValidatingTransformer,
  validateData,
  validateDataSafe,
} from '../utils/transformers/validation';

