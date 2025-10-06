/**
 * Validation Module - Main Exports
 * 
 * Comprehensive validation framework with Zod integration, preprocessing, and caching
 */

// Main validation service
export { ValidationService, validationService, createValidationService } from './validation-service';

// Types and interfaces
export type {
  ValidationErrorDetail,
  ValidationOptions,
  ValidationResult,
  BatchValidationResult,
  CachedValidationResult,
  SchemaRegistration,
  ValidationMetrics,
  PreprocessingConfig,
  ValidationServiceConfig,
  ValidationContext,
} from './types';

// Error classes
export { ValidationError } from './types';

// Middleware and decorators
export {
  validateRequest,
  ValidationMiddleware,
  validate as validateDecorator,
  validateClass,
  validateBatch as validateBatchMiddleware,
  validateFileUpload,
  validationErrorHandler,
  getValidatedData,
  getBatchValidationResult,
  commonValidation,
} from './middleware';

export type {
  RequestValidationConfig,
  ValidationDecoratorOptions,
} from './middleware';

// Validation schemas
export * from './schemas';

// Ensure userRegistrationSchema is properly exported
export { userRegistrationSchema } from './schemas/auth';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';
export { LegacyValidationService, validationService as legacyValidationService } from './legacy-adapters/validation-service-adapter';
export type { LegacyValidationRule, LegacyValidationResult, LegacyValidationSchema } from './legacy-adapters/validation-service-adapter';

// Re-export commonly used Zod types for convenience
export type { ZodSchema, ZodError, ZodType } from 'zod';

// Utility functions for quick validation
export const validate = validationService.validate.bind(validationService);
export const validateSafe = validationService.validateSafe.bind(validationService);
export const validateBatch = validationService.validateBatch.bind(validationService);
export const registerSchema = validationService.registerSchema.bind(validationService);
export const getSchema = validationService.getSchema.bind(validationService);

// Default export for convenience
export default validationService;