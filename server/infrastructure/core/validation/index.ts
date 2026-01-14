// Validation module exports - Consolidated with shared/core
export * from '@shared/core';

// Re-export server-specific validation services with explicit naming to avoid conflicts
export { DataCompletenessService } from './data-completeness.js';
export { DataIntegrityValidationService } from './data-validation-service.js';
export type { ValidationResult as ValidationResultFromService } from './data-validation-service.js';
export type { ValidationResult as ValidationResultFromSchema } from './schema-validation-service.js';
export { InputValidationService } from './input-validation-service.js';
export { SchemaValidationService } from './schema-validation-service.js';

// Validation metrics and monitoring
export { ValidationMetricsCollector } from './validation-metrics.js';
export type { ValidationMetric, ValidationMetricsSummary, ValidationHealthStatus } from './validation-metrics.js';

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
} from './validation-services-init.js';
export type { ValidationServicesContainer } from './validation-services-init.js';






































