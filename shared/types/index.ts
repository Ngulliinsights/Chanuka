/**
 * Shared Types Index
 * 
 * Central export point for all shared types across the application
 */

// Re-export core types from shared/core (excluding conflicting ValidationError)
export type {
  // Auth types
  User,
  UserRole,
  CustomSession,
  AuthenticatedRequest,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  SessionValidationResult,
  AuthorizationContext,
  PermissionCheckResult,
  SessionConfig,
  
  // Validation types (with aliases to resolve conflicts)
  ValidationOptions,
  BatchValidationResult,
  CachedValidationResult,
  SchemaRegistration,
  ValidationContext,
  ValidationMetrics,
  ValidationServiceConfig,
  ValidationErrorDetail,
  LegacyValidationResult,
  ValidationResult as CoreValidationResult,
  
  // Cache types
  CacheOptions,
  CacheMetrics,
  CacheHealthStatus,
  CacheEvent,
  SingleFlightOptions,
  
  // Circuit breaker types (with aliases)
  CacheCircuitBreakerState,
  ObservabilityCircuitBreakerState,
  
  // Health status types (with aliases)
  ObservabilityHealthStatus,
  MiddlewareHealthStatus,
  ServicesHealthStatus,
  
  // Rate limit types (with aliases)
  RateLimitingStore,
  ServicesRateLimitStore,
  MiddlewareRateLimitStore,
  RateLimitOptions,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitBucket,
  RateLimitData,
  IRateLimitStore,
  RateLimitConfig,
  AIRateLimitOptions,
  
  // Middleware types
  RegularMiddleware,
  ErrorMiddleware,
  AnyMiddleware,
  PerformanceMetrics,
  DetailedMetrics,
  CacheService,
  ValidationService,
  HealthChecker,
  
  // Modernization types
  ModernizationTask,
  ModernizationPhase,
  ModernizationConfig,
  ValidationScope,
  ValidationCheck,
  ValidationStatus,
  ValidationType,
  BackupResult,
  ProgressState,
  ModernizationValidationResult,
  
  // Observability types
  ObservabilityConfig,
  ObservabilityContext,
  ObservabilityEvent,
  ObservabilityProvider,
  ObservabilityMiddleware,
  ObservabilityStack,
  TelemetryData,
  TelemetryExporter,
  CircuitBreakerMetrics,
  HealthCheckResult
} from '../core/src/types/index';

// Export auth constants
export { ROLE_HIERARCHY } from '../core/src/types/index';

// Re-export ValidationError classes with explicit aliases to resolve conflicts
export { ValidationError as CoreValidationError } from '../core/src/validation/types';
export { ValidationError as ErrorManagementValidationError } from '../core/src/observability/error-management/errors/specialized-errors';
export { ValidationError as ModernizationValidationError } from '../core/src/modernization/types';

// Re-export other error types
export * from '../core/src/observability/error-management/errors/base-error';
export type {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError
} from '../core/src/observability/error-management/errors/specialized-errors';

// Re-export from local errors with explicit exports to avoid conflicts
export type {
  UnifiedValidationError,
  ErrorType
} from './errors';

export {
  AuthError,
  InvalidCredentialsError,
  UserExistsError,
  OAuthError,
  SponsorNotFoundError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createDatabaseError,
  asyncHandler,
  setupGlobalErrorHandlers
} from './errors';

// Re-export common interfaces
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
