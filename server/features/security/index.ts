// Security Feature - DDD Architecture
// Centralized exports for security-related functionality

// Routes
// Note: security-monitoring router was removed during DDD refactoring

// Domain Services (Pure business logic)
export {
  InputSanitizationService,
  inputSanitizationService,
  QueryValidationService,
  queryValidationService,
  EncryptionService,
  encryptionService,
  TLSConfigService,
  tlsConfigService
} from './domain/services';

// Domain Value Objects (Immutable domain concepts)
export { PaginationParams, SecureQuery, QueryValidationResult } from './domain/value-objects';

// Application Services (Use case orchestration)
export { SecureQueryBuilderService, secureQueryBuilderService } from './application/services';

// Infrastructure Services (Technical concerns)
export {
  SecurityAuditService,
  securityAuditService,
  IntrusionDetectionService,
  intrusionDetectionService,
  SecurityEventTrackerService,
  getSecurityEventTrackerService,
  PrivacyService,
  SecurityInitializationService,
  createSecurityInitializationService,
  DataPrivacyService,
  dataPrivacyService
} from './infrastructure/services';


















































export * from './application/services/privacy-service';
