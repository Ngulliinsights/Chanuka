/**
 * Validation Module - Main Exports
 *
 * Unified validation framework with adapter pattern, schema caching, and comprehensive error handling
 */

// ===== CORE INTERFACES =====
export * from './core';

// ===== ADAPTERS =====
export * from './adapters';

// ===== MIDDLEWARE =====
export * from './middleware';

// ===== SCHEMAS =====
export * from './schemas';

// ===== LEGACY COMPATIBILITY =====
// Re-export existing validation service for backward compatibility
export { ValidationService, validationService, createValidationService } from './validation-service';

// Import for utility functions
import { validationService } from './validation-service';
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
export { ValidationError } from './types';

// Legacy adapters for backward compatibility
export * from './legacy-adapters';
export { LegacyValidationService, validationService as legacyValidationService } from './legacy-adapters/validation-service-adapter';
export type { LegacyValidationRule, LegacyValidationResult, LegacyValidationSchema } from './legacy-adapters/validation-service-adapter';

// ===== UTILITY EXPORTS =====
// Re-export commonly used Zod types for convenience
export type { ZodSchema, ZodError, ZodType } from 'zod';

// Utility functions for quick validation (legacy)
export const validate = validationService.validate.bind(validationService);
export const validateSafe = validationService.validateSafe.bind(validationService);
export const validateBatch = validationService.validateBatch.bind(validationService);
export const registerSchema = validationService.registerSchema.bind(validationService);
export const getSchema = validationService.getSchema.bind(validationService);

// ===== FEATURE FLAG SUPPORT =====
/**
 * Feature flag for gradual migration to unified validation system
 * Set to true to use new adapter-based validation system
 * Set to false to use legacy validation system
 */
export const useUnifiedValidation = process.env.USE_UNIFIED_VALIDATION === 'true' || false;

// ===== DEFAULT EXPORTS =====
// Default export uses feature flag to determine which system to use
export default useUnifiedValidation ? validationService : validationService;












































