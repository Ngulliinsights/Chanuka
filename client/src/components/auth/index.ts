/**
 * Authentication Components Index
 * Centralized exports for all authentication-related components
 */

// Core authentication components
export { AuthProvider } from './AuthProvider';
export { AuthGuard, RequireAuth, RequireRole, RequirePermission, RequireAdmin, RequireModerator, RequireExpert } from './AuthGuard';

// Authentication UI components
export { SessionManager } from './SessionManager';
export { SocialLogin } from './SocialLogin';
export { OAuthCallback } from './OAuthCallback';

// Re-export auth hook for convenience
export { useAuth } from '../../hooks/useAuth';

// Re-export RBAC utilities
export { 
  rbacManager, 
  usePermission, 
  usePermissions, 
  useMinimumRole,
  ROLES,
  RESOURCES,
  ACTIONS
} from '@client/utils/rbac';

// Re-export auth services
export { authService } from '@client/services/authService';
export { tokenManager } from '@client/utils/tokenManager';
export { sessionManager } from '@client/utils/session-manager';

// Re-export auth types
export type { 
  User, 
  AuthContextType, 
  AuthResponse,
  LoginCredentials,
  RegisterData,
  PrivacySettings,
  SessionInfo,
  SecurityEvent,
  SuspiciousActivityAlert
} from '@client/types/auth';

// Re-export middleware
export { authMiddleware, createAuthMiddleware } from '@client/store/middleware/authMiddleware';
export type { AuthMiddlewareConfig } from '@client/store/middleware/authMiddleware';