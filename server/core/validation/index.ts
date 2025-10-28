// Validation module exports - Consolidated with shared/core
export * from '@shared/core';

// Re-export server-specific validation services with explicit naming to avoid conflicts
export { DataCompletenessService } from './data-completeness.js';
export { DataValidationService as DataValidationServiceFromService } from './data-validation-service.js';
export { ValidationResult as ValidationResultFromService } from './data-validation-service.js';
export { ValidationResult as ValidationResultFromSchema } from './schema-validation-service.js';
export { InputValidationService } from './input-validation-service.js';
export { SchemaValidationService } from './schema-validation-service.js';





































