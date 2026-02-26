/**
 * Authentication Types - Re-exports from Canonical Source
 * 
 * This file re-exports from the canonical User type location.
 * 
 * CANONICAL SOURCE: shared/types/domains/authentication/user.ts
 * 
 * @deprecated Import directly from '@shared/types' instead
 */

// ============================================================================
// Re-exports from Canonical Source
// ============================================================================

export type {
  User,
  UserProfile,
  UserPreferences,
  AuthenticatedUser,
  AuthenticatedRequest,
  CustomSession,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SessionValidationResult,
  AuthorizationContext,
  PermissionCheckResult,
  SessionConfig,
  OAuthProvider,
  SocialProfile,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../types/domains/authentication/user';

export {
  UserRole,
  UserStatus,
  VerificationStatus,
  AnonymityLevel,
  ROLE_HIERARCHY,
  isAuthenticated,
  hasRole,
  getUserId,
  isUser,
} from '../../types/domains/authentication/user';