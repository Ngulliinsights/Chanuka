/**
 * Authentication Error Classes
 *
 * Specialized error classes for authentication-related errors
 */

import { ErrorDomain, ErrorSeverity } from '../../error/constants';

/**
 * Base authentication error class
 */
export class AuthError extends Error {
  public readonly domain = ErrorDomain.AUTHENTICATION;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: string = 'AUTH_ERROR',
    context?: Record<string, unknown>,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AuthError';
    this.severity = severity;
    this.code = code;
    this.context = context;
    this.recoverable = recoverable;
  }
}

/**
 * Authentication validation error
 */
export class AuthValidationError extends AuthError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    code: string = 'VALIDATION_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.MEDIUM, code, context, true);
    this.name = 'AuthValidationError';
    this.field = field;
  }
}

/**
 * Authentication failure error (login/register failures)
 */
export class AuthenticationError extends AuthError {
  public readonly attemptCount?: number;
  public readonly lockoutUntil?: Date;

  constructor(
    message: string,
    code: string = 'AUTHENTICATION_FAILED',
    context?: Record<string, unknown>,
    attemptCount?: number,
    lockoutUntil?: Date
  ) {
    super(message, ErrorSeverity.HIGH, code, context, true);
    this.name = 'AuthenticationError';
    this.attemptCount = attemptCount;
    this.lockoutUntil = lockoutUntil;
  }
}

/**
 * Authorization error (permission/role failures)
 */
export class AuthorizationError extends AuthError {
  public readonly requiredPermission?: string;
  public readonly requiredRole?: string;
  public readonly userPermissions?: string[];
  public readonly userRole?: string;

  constructor(
    message: string,
    code: string = 'AUTHORIZATION_FAILED',
    context?: Record<string, unknown>,
    requiredPermission?: string,
    requiredRole?: string,
    userPermissions?: string[],
    userRole?: string
  ) {
    super(message, ErrorSeverity.HIGH, code, context, false);
    this.name = 'AuthorizationError';
    this.requiredPermission = requiredPermission;
    this.requiredRole = requiredRole;
    this.userPermissions = userPermissions;
    this.userRole = userRole;
  }
}

/**
 * Session expired error
 */
export class SessionExpiredError extends AuthError {
  public readonly sessionId?: string;
  public readonly expiredAt?: Date;

  constructor(
    message: string = 'Your session has expired. Please log in again.',
    sessionId?: string,
    expiredAt?: Date,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.MEDIUM, 'SESSION_EXPIRED', context, true);
    this.name = 'SessionExpiredError';
    this.sessionId = sessionId;
    this.expiredAt = expiredAt;
  }
}

/**
 * Token refresh error
 */
export class TokenRefreshError extends AuthError {
  public readonly refreshAttempts?: number;
  public readonly maxAttempts?: number;

  constructor(
    message: string = 'Failed to refresh authentication token',
    refreshAttempts?: number,
    maxAttempts?: number,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.HIGH, 'TOKEN_REFRESH_FAILED', context, true);
    this.name = 'TokenRefreshError';
    this.refreshAttempts = refreshAttempts;
    this.maxAttempts = maxAttempts;
  }
}

/**
 * Two-factor authentication error
 */
export class TwoFactorError extends AuthError {
  public readonly step?: 'setup' | 'enable' | 'disable' | 'verify';

  constructor(
    message: string,
    step?: 'setup' | 'enable' | 'disable' | 'verify',
    code: string = 'TWO_FACTOR_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.MEDIUM, code, context, true);
    this.name = 'TwoFactorError';
    this.step = step;
  }
}

/**
 * OAuth authentication error
 */
export class OAuthError extends AuthError {
  public readonly provider?: string;
  public readonly oauthError?: string;
  public readonly state?: string;

  constructor(
    message: string,
    provider?: string,
    oauthError?: string,
    state?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.MEDIUM, 'OAUTH_ERROR', context, true);
    this.name = 'OAuthError';
    this.provider = provider;
    this.oauthError = oauthError;
    this.state = state;
  }
}

/**
 * Account locked error
 */
export class AccountLockedError extends AuthError {
  public readonly lockedUntil?: Date;
  public readonly attemptCount?: number;
  public readonly maxAttempts?: number;

  constructor(
    message: string = 'Account is temporarily locked due to too many failed attempts',
    lockedUntil?: Date,
    attemptCount?: number,
    maxAttempts?: number,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.HIGH, 'ACCOUNT_LOCKED', context, false);
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
    this.attemptCount = attemptCount;
    this.maxAttempts = maxAttempts;
  }
}

/**
 * Email verification required error
 */
export class EmailVerificationRequiredError extends AuthError {
  public readonly email?: string;

  constructor(
    message: string = 'Please verify your email address before continuing',
    email?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.MEDIUM, 'EMAIL_VERIFICATION_REQUIRED', context, true);
    this.name = 'EmailVerificationRequiredError';
    this.email = email;
  }
}

/**
 * Session invalid error
 */
export class SessionInvalidError extends AuthError {
  public readonly sessionId?: string;
  public readonly reason?: string;

  constructor(
    message: string = 'Session is invalid',
    sessionId?: string,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.HIGH, 'SESSION_INVALID', context, false);
    this.name = 'SessionInvalidError';
    this.sessionId = sessionId;
    this.reason = reason;
  }
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends AuthError {
  public readonly sessionId?: string;

  constructor(
    message: string = 'Session not found',
    sessionId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.HIGH, 'SESSION_NOT_FOUND', context, false);
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}

/**
 * Session revoked error
 */
export class SessionRevokedError extends AuthError {
  public readonly sessionId?: string;
  public readonly revokedAt?: Date;
  public readonly reason?: string;

  constructor(
    message: string = 'Session has been revoked',
    sessionId?: string,
    revokedAt?: Date,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorSeverity.HIGH, 'SESSION_REVOKED', context, false);
    this.name = 'SessionRevokedError';
    this.sessionId = sessionId;
    this.revokedAt = revokedAt;
    this.reason = reason;
  }
}

// ==========================================================================
// Error Factory Functions
// ==========================================================================

/**
 * Creates a validation error with proper context
 */
export function createValidationError(
  message: string,
  field?: string,
  code?: string,
  context?: Record<string, unknown>
): AuthValidationError {
  return new AuthValidationError(message, field, code, context);
}

/**
 * Creates an authentication error with attempt tracking
 */
export function createAuthenticationError(
  message: string,
  code?: string,
  context?: Record<string, unknown>,
  attemptCount?: number,
  lockoutUntil?: Date
): AuthenticationError {
  return new AuthenticationError(message, code, context, attemptCount, lockoutUntil);
}

/**
 * Creates an authorization error with permission context
 */
export function createAuthorizationError(
  message: string,
  requiredPermission?: string,
  requiredRole?: string,
  userPermissions?: string[],
  userRole?: string,
  context?: Record<string, unknown>
): AuthorizationError {
  return new AuthorizationError(
    message,
    'AUTHORIZATION_FAILED',
    context,
    requiredPermission,
    requiredRole,
    userPermissions,
    userRole
  );
}

/**
 * Creates a session expired error with session context
 */
export function createSessionExpiredError(
  sessionId?: string,
  expiredAt?: Date,
  context?: Record<string, unknown>
): SessionExpiredError {
  return new SessionExpiredError(undefined, sessionId, expiredAt, context);
}

/**
 * Creates a token refresh error with attempt tracking
 */
export function createTokenRefreshError(
  message?: string,
  refreshAttempts?: number,
  maxAttempts?: number,
  context?: Record<string, unknown>
): TokenRefreshError {
  return new TokenRefreshError(message, refreshAttempts, maxAttempts, context);
}

/**
 * Creates a two-factor authentication error
 */
export function createTwoFactorError(
  message: string,
  step?: 'setup' | 'enable' | 'disable' | 'verify',
  code?: string,
  context?: Record<string, unknown>
): TwoFactorError {
  return new TwoFactorError(message, step, code, context);
}

/**
 * Creates an OAuth error with provider context
 */
export function createOAuthError(
  message: string,
  provider?: string,
  oauthError?: string,
  state?: string,
  context?: Record<string, unknown>
): OAuthError {
  return new OAuthError(message, provider, oauthError, state, context);
}

/**
 * Creates an account locked error with lockout details
 */
export function createAccountLockedError(
  lockedUntil?: Date,
  attemptCount?: number,
  maxAttempts?: number,
  context?: Record<string, unknown>
): AccountLockedError {
  return new AccountLockedError(undefined, lockedUntil, attemptCount, maxAttempts, context);
}

/**
 * Creates an email verification required error
 */
export function createEmailVerificationRequiredError(
  email?: string,
  context?: Record<string, unknown>
): EmailVerificationRequiredError {
  return new EmailVerificationRequiredError(undefined, email, context);
}

/**
 * Creates a session invalid error
 */
export function createSessionInvalidError(
  sessionId?: string,
  reason?: string,
  context?: Record<string, unknown>
): SessionInvalidError {
  return new SessionInvalidError(undefined, sessionId, reason, context);
}

/**
 * Creates a session not found error
 */
export function createSessionNotFoundError(
  sessionId?: string,
  context?: Record<string, unknown>
): SessionNotFoundError {
  return new SessionNotFoundError(undefined, sessionId, context);
}

/**
 * Creates a session revoked error
 */
export function createSessionRevokedError(
  sessionId?: string,
  revokedAt?: Date,
  reason?: string,
  context?: Record<string, unknown>
): SessionRevokedError {
  return new SessionRevokedError(undefined, sessionId, revokedAt, reason, context);
}

// ==========================================================================
// Error Type Guards
// ==========================================================================

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Type guard for AuthValidationError
 */
export function isAuthValidationError(error: unknown): error is AuthValidationError {
  return error instanceof AuthValidationError;
}

/**
 * Type guard for AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard for AuthorizationError
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Type guard for SessionExpiredError
 */
export function isSessionExpiredError(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError;
}

/**
 * Type guard for TokenRefreshError
 */
export function isTokenRefreshError(error: unknown): error is TokenRefreshError {
  return error instanceof TokenRefreshError;
}

/**
 * Type guard for TwoFactorError
 */
export function isTwoFactorError(error: unknown): error is TwoFactorError {
  return error instanceof TwoFactorError;
}

/**
 * Type guard for OAuthError
 */
export function isOAuthError(error: unknown): error is OAuthError {
  return error instanceof OAuthError;
}

/**
 * Type guard for AccountLockedError
 */
export function isAccountLockedError(error: unknown): error is AccountLockedError {
  return error instanceof AccountLockedError;
}

/**
 * Type guard for EmailVerificationRequiredError
 */
export function isEmailVerificationRequiredError(
  error: unknown
): error is EmailVerificationRequiredError {
  return error instanceof EmailVerificationRequiredError;
}

export function isSessionInvalidError(error: unknown): error is SessionInvalidError {
  return error instanceof SessionInvalidError;
}

export function isSessionNotFoundError(error: unknown): error is SessionNotFoundError {
  return error instanceof SessionNotFoundError;
}

export function isSessionRevokedError(error: unknown): error is SessionRevokedError {
  return error instanceof SessionRevokedError;
}

export default {
  // Error classes
  AuthError,
  AuthValidationError,
  AuthenticationError,
  AuthorizationError,
  SessionExpiredError,
  TokenRefreshError,
  TwoFactorError,
  OAuthError,
  AccountLockedError,
  EmailVerificationRequiredError,
  SessionInvalidError,
  SessionNotFoundError,
  SessionRevokedError,

  // Factory functions
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createSessionExpiredError,
  createTokenRefreshError,
  createTwoFactorError,
  createOAuthError,
  createAccountLockedError,
  createEmailVerificationRequiredError,
  createSessionInvalidError,
  createSessionNotFoundError,
  createSessionRevokedError,

  // Type guards
  isAuthError,
  isAuthValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isSessionExpiredError,
  isTokenRefreshError,
  isTwoFactorError,
  isOAuthError,
  isAccountLockedError,
  isEmailVerificationRequiredError,
  isSessionInvalidError,
  isSessionNotFoundError,
  isSessionRevokedError,
};
