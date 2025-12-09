/**
 * @deprecated This file has been moved to client/src/core/auth/types/
 * 
 * Please update your imports to use the new consolidated auth system:
 * 
 * Before: import { User } from '@/types/auth'
 * After:  import { User } from '@/core/auth'
 * 
 * This file will be removed in a future version.
 */

// Re-export from the new consolidated auth system for backward compatibility

export type {
  User,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthTokens,
  TokenInfo,
  SessionInfo,
  SessionValidation,
  TokenValidation,
  TwoFactorSetup,
  SecurityEvent,
  SuspiciousActivityAlert,
  PasswordRequirements,
  PasswordValidationResult,
  PrivacySettings,
  NotificationPreferences,
  ConsentRecord,
  DataRetentionPreference,
  DataExportRequest,
  DataDeletionRequest,
  UserPreferences,
  SocialLoginProvider,
  AuthContextType,
  ConsentModalProps,
  PrivacyDashboardProps
} from '../core/auth';