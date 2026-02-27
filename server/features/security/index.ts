// Security Feature - DDD Architecture
// Centralized exports for security-related functionality

// Routes
export { default as securityMonitoringRouter } from './security-monitoring';

// Domain Services (Pure business logic)
export {
  InputSanitizationService,./infrastructure/services/security-initialization.service
  inputSanitizationService,./infrastructure/services/security-monitoring.service
  QueryValidationService,
  queryValidationService,./infrastructure/services/privacy.service
  EncryptionService,
  encryptionService,
  TLSConfigService,./infrastructure/services/data-privacy.service
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
  SecurityMonitoringService,
  getSecurityMonitoringService,
  PrivacyService,
  SecurityInitializationService,
  createSecurityInitializationService,
  DataPrivacyService,
  dataPrivacyService
} from './infrastructure/services';

















































