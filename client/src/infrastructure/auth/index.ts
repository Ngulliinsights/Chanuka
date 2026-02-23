/**
 * Unified Authentication Module
 *
 * Consolidates all authentication implementations into a single, coherent system.
 * This module eliminates redundancy while preserving all functionality from:
 * - useAuth hook (React Context + Redux)
 * - Auth API Service
 * - Token Management
 * - Session Management
 * - Auth Middleware
 * - Auth Validation
 */

// ============================================================================
// Core Types (Consolidated)
// ============================================================================

export type {
  // User and Auth Types
  User,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthTokens,
  TokenInfo,

  // Session Types
  SessionInfo,
  SessionValidation,
  TokenValidation,

  // Security Types
  TwoFactorSetup,
  SecurityEvent,
  SuspiciousActivityAlert,
  PasswordRequirements,
  PasswordValidationResult,

  // Privacy Types
  PrivacySettings,
  NotificationPreferences,
  ConsentRecord,
  DataRetentionPreference,
  DataExportRequest,
  DataDeletionRequest,
  UserPreferences,
  SocialLoginProvider,

  // Context Types
  AuthContextType,

  // UI Component Types
  ConsentModalProps,
  PrivacyDashboardProps,
} from './types';

// ============================================================================
// Core Services (Consolidated)
// ============================================================================

export {
  // Primary Auth Service (consolidated API service)
  AuthApiService,
  createAuthApiService,
  authApiService,
} from './services/auth-api-service';

export {
  // Comprehensive Auth Business Logic Service
  AuthService,
  authService,
} from './service';

export {
  // Token Management (unified implementation)
  TokenManager,
  tokenManager,
} from './services/token-manager';

export {
  // Session Management (comprehensive implementation)
  SessionManager,
  sessionManager,
} from './services/session-manager';

export {
  // Auth Validation (consolidated utilities)
  validatePasswordComprehensive,
  checkPasswordStrength,
  validateEmailDomain,
  validateFormBatch,
  createDebouncedValidator,
  formatValidationErrors,
  type PasswordStrength,
  type BatchValidationResult,
} from './utils/validation';

// ============================================================================
// React Integration
// ============================================================================

export {
  // Auth Context Provider
  AuthProvider,

  // Primary Auth Hook
  useAuth,

  // Legacy compatibility
  useAuthStore,
} from './hooks/useAuth';

// ============================================================================
// Redux Integration
// ============================================================================

export {
  // Auth Slice
  default as authReducer,

  // Actions
  login,
  register,
  logout,
  refreshTokens,
  clearError,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactor,
  updateUserProfile,
  loginWithOAuth,
  extendSession,
  getActiveSessions,
  terminateSession,
  terminateAllSessions,
  updatePrivacySettings,
  requestDataExport,
  requestDataDeletion,
  getSecurityEvents,
  getSuspiciousActivity,
  validateStoredTokens,

  // Selectors
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectSessionExpiry,
  selectIsInitialized,
  selectTwoFactorRequired,
  selectAuthStatus,
  selectUserProfile,

  // State type
  type AuthState,
} from './store/auth-slice';

export {
  // Auth Middleware
  createAuthMiddleware,
  authMiddleware,
  type AuthMiddlewareConfig,
} from './store/auth-middleware';

// ============================================================================
// HTTP Client Integration
// ============================================================================

export {
  // Authentication Interceptors
  AuthenticationInterceptor,
  TokenRefreshInterceptor,
  createAuthInterceptors,
  shouldRefreshToken,
  proactiveTokenRefresh,
  DEFAULT_AUTH_CONFIG,
  type AuthConfig,
} from './http/authentication-interceptors';

export {
  // Authenticated API Client
  AuthenticatedApiClient,
  type AuthenticatedApiClientConfig,
} from './http/authenticated-client';

// ============================================================================
// Utilities and Helpers
// ============================================================================

export {
  // Storage utilities (consolidated)
  storeSecurely,
  retrieveSecurely,
  getCurrentSession,
  isAuthenticated,
  getAuthToken,
} from './utils/storage-helpers';

export {
  // Permission helpers
  hasPermission,
  hasRole,
  hasAnyRole,
  checkResourcePermission,
} from './utils/permission-helpers';

export {
  // Security helpers
  sanitizeInput,
  isCommonPassword,
  hasSequentialChars,
  hasRepeatedChars,
} from './utils/security-helpers';

// ============================================================================
// Configuration and Initialization
// ============================================================================

export {
  // Auth configuration
  createAuthConfig,
  DEFAULT_AUTH_SETTINGS,
  type AuthSettings,
} from './config/auth-config';

export {
  // Initialization
  initializeAuth,
  configureAuth,
  type AuthInitOptions,
} from './config/auth-init';

// ============================================================================
// Constants and Enums
// ============================================================================

export {
  AUTH_VALIDATION_RULES,
  AUTH_ERROR_MESSAGES,
  SESSION_REFRESH_BUFFER_MS,
  MINIMUM_REFRESH_DELAY_MS,
} from './constants/auth-constants';

// ============================================================================
// Error Types (Auth-specific)
// ============================================================================

export {
  AuthValidationError,
  AuthenticationError,
  AuthorizationError,
  SessionExpiredError,
  TokenRefreshError,
} from './errors/auth-errors';

// ============================================================================
// Migration and Setup Scripts
// ============================================================================
// Note: These are exported for backward compatibility but should be imported
// directly from their respective files to avoid circular dependencies:
// - import { runAuthCleanup } from '@client/infrastructure/auth/scripts/cleanup-old-auth'
// - import { initAuthSystem } from '@client/infrastructure/auth/scripts/init-auth-system'
// - import { runMigrationHelper } from '@client/infrastructure/auth/scripts/migration-helper'

// ============================================================================
// Default Export (Main Auth Module)
// ============================================================================

// All exports are available as named exports from this module.
// Default export not needed - use named imports instead.
