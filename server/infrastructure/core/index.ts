// Core Domain
// Centralized exports for core functionality

// Authentication - Export from auth modules (server-specific implementations)
export * from './auth/index';

// Validation - Export from validation modules
// Note: Explicitly avoid re-exporting AuthResult and SessionValidationResult from shared/core
// as they're already exported from ./auth/index.js
export {
  DataCompletenessService,
  DataIntegrityValidationService,
  InputValidationService,
  SchemaValidationService,
  ValidationMetricsCollector,
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
} from './validation/index';

export type {
  ValidationResultFromService,
  ValidationResultFromSchema,
  ValidationMetric,
  ValidationMetricsSummary,
  ValidationHealthStatus,
  ValidationServicesContainer
} from './validation/index';

// Error Handling
export { errorTracker } from '../observability/monitoring/error-tracker';

// Types
export type {
  User,
  Bill,
  BillComment,
  SocialShare,
  Stakeholder
} from './types';
export * from './StorageTypes';













































