// Validation module exports - Consolidated with shared/core
export * from '@shared/core';

// Re-export server-specific validation services with explicit naming to avoid conflicts
export { DataCompletenessService } from './data-completeness';
export { DataIntegrityValidationService } from './data-validation-service';
export type { ValidationResult as ValidationResultFromService } from './data-validation-service';
export type { ValidationResult as ValidationResultFromSchema } from './schema-validation-service';
export { InputValidationService } from './input-validation-service';
export { SchemaValidationService } from './schema-validation-service';

// Validation metrics and monitoring
export { ValidationMetricsCollector } from './validation-metrics';
export type { ValidationMetric, ValidationMetricsSummary, ValidationHealthStatus } from './validation-metrics';

// Validation services initialization and management
export {
  initializeValidationServices,
  getValidationServices,
  getValidationService,
  areValidationServicesInitialized,
  resetValidationServices,
  shutdownValidationServices,
  validationMetricsCollector,
  inputValidationService,
  schemaValidationService,
  dataIntegrityValidationService,
  dataCompletenessService
} from './validation-services-init';
export type { ValidationServicesContainer } from './validation-services-init';

// Express validation middleware (moved from shared/validation)
// Phase 2A: Middleware is server-only (Express-specific)
export {
  validateSchema,
  validateQuery,
  validateParams,
  validateBody
} from './middleware';







































