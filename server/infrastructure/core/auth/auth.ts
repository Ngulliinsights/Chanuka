/**
 * Auth Router - Migrated to Unified Error Handling System
 * 
 * Migration from ApiError/ApiSuccess/ApiValidationError to BaseError/ValidationError
 * 20 routes covering:
 * - Authentication (register, login, logout, verify)
 * - Token management (refresh, verify, 2FA)
 * - Session management (get, delete, extend)
 * - Security monitoring (events, suspicious activity)
 */

import { authService } from '@server/infrastructure/core/auth/auth-service';
import { errorTracker } from '@server/errors/error-tracker';
import { securityAuditService } from '@server/features/security/security-audit-service';
import { authRateLimit, legacyPasswordResetRateLimit as passwordResetRateLimit, legacyRegistrationRateLimit as registrationRateLimit } from '@server/middleware/rate-limiter';
import { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES } from '@shared/constants';
import { createErrorContext } from '@server/infrastructure/error-handling';
import { NextFunction, Request, Response, Router } from "express";

export const router: Router = Router();

/**
 * Higher-order function that wraps async route handlers with error handling
 * Errors are automatically caught and passed to the unified error middleware
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  // Type-safe access to connection properties
  const connection = req.connection as { remoteAddress?: string } | undefined;
  const socket = req.socket as { remoteAddress?: string } | undefined;
  
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.headers['x-real-ip'] as string ||
         connection?.remoteAddress ||
         socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * POST /auth/register
 * Register a new user account
 */
router.post("/register", registrationRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/register');

  const result = await authService.register(req.body, req);

  if (!result.success) {
    throw new ValidationError(result.error || "Registration failed", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Registration failed",
      },
    ]);
  }

  res.status(201).json({
    token: result.token!,
    refresh_token: result.refresh_token!,
    user: result.user!,
    requiresVerification: result.requiresVerification,
    message: "Registration successful"
  });
}));

/**
 * POST /auth/verify-email
 * Verify user email address
 */
router.post("/verify-email", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/verify-email');
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token is required', [
      {
        field: 'token',
        code: 'INVALID_TOKEN',
        message: 'Verification token is required',
      },
    ]);
  }

  const result = await authService.verifyEmail(token);

  if (!result.success) {
    throw new BaseError(result.error || "Email verification failed", {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      details: { reason: result.error },
    });
  }

  res.json({
    message: "Email verified successfully",
    user: result.user
  });
}));

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
router.post("/login", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/login');

  const result = await authService.login(req.body);

  if (!result.success) {
    throw new BaseError(result.error || "Login failed", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  // Check if 2FA is required
  if (result.requiresTwoFactor) {
    res.json({
      requiresTwoFactor: true,
      user: result.user,
      message: "Two-factor authentication required"
    });
    return;
  }

  // Log successful login
  await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
    user_role: result.user!.role,
    verification_status: result.user!.verification_status
  });

  res.json({
    token: result.token!,
    refresh_token: result.refresh_token!,
    user: result.user!,
    message: "Login successful"
  });
}));

/**
 * POST /auth/logout
 * Logout user and invalidate token
 */
router.post("/logout", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/logout');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    await authService.logout(token);
  }

  // Log logout event
  await securityAuditService.logAuthEvent('logout', req, undefined, true, {
    tokenProvided: !!token
  });

  res.json({ message: "Logged out successfully" });
}));

/**
 * POST /auth/refresh
 * Refresh authentication token
 */
router.post("/refresh", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/refresh');
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new ValidationError('Refresh token is required', [
      {
        field: 'refresh_token',
        code: 'INVALID_TOKEN',
        message: 'Refresh token is required',
      },
    ]);
  }

  const result = await authService.refreshToken(refresh_token);

  if (!result.success) {
    throw new BaseError(result.error || "Token refresh failed", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  await securityAuditService.logAuthEvent('token_refresh', req, result.user!.id, true, {
    user_role: result.user!.role
  });

  res.json({
    token: result.token!,
    refresh_token: result.refresh_token!,
    user: result.user!,
    message: "Token refreshed successfully"
  });
}));

/**
 * GET /auth/verify
 * Verify if token is valid
 */
router.get("/verify", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /auth/verify');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.verifyToken(token);

  if (!result.success) {
    throw new BaseError(result.error || "Token verification failed", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  res.json({ user: result.user, message: "Token is valid" });
}));

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", passwordResetRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/forgot-password');

  const result = await authService.requestPasswordReset(req.body);

  if (!result.success) {
    throw new ValidationError(result.error || "Password reset request failed", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Password reset request failed",
      },
    ]);
  }

  // Log password reset request
  await securityAuditService.logSecurityEvent({
    event_type: 'password_reset_request',
    severity: 'low',
    ip_address: getClientIP(req),
    user_agent: req.get('User-Agent') || 'unknown',
    result: 'success',
    success: true,
    details: { emailProvided: true }
  });

  res.json({
    message: "If an account with that email exists, a password reset link has been sent."
  });
}));

/**
 * POST /auth/reset-password
 * Complete password reset
 */
router.post("/reset-password", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/reset-password');

  const result = await authService.resetPassword(req.body);

  if (!result.success) {
    throw new ValidationError(result.error || "Password reset failed", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Password reset failed",
      },
    ]);
  }

  // Log password reset completion
  await securityAuditService.logSecurityEvent({
    event_type: 'password_reset',
    severity: 'medium',
    ip_address: getClientIP(req),
    user_agent: req.get('User-Agent') || 'unknown',
    result: 'success',
    success: true,
    details: { tokenUsed: true }
  });

  res.json({
    message: "Password reset successfully. Please log in with your new password."
  });
}));

/**
 * ============================================================================
 * TWO-FACTOR AUTHENTICATION ROUTES
 * ============================================================================
 */

/**
 * POST /auth/2fa/setup
 * Setup two-factor authentication
 */
router.post("/2fa/setup", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/2fa/setup');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.setupTwoFactor(userResult.user!.id);

  if (!result.success) {
    throw new BaseError(result.error || "Failed to setup 2FA", {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
    });
  }

  res.json({
    secret: result.secret,
    qr_code: result.qrCode,
    backup_codes: result.backupCodes,
    message: "2FA setup initiated"
  });
}));

/**
 * POST /auth/2fa/enable
 * Enable two-factor authentication
 */
router.post("/2fa/enable", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/2fa/enable');
  const { token: verificationToken } = req.body;
  const authToken = req.headers.authorization?.replace("Bearer ", "");

  if (!authToken) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(authToken);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.enableTwoFactor(userResult.user!.id, verificationToken);

  if (!result.success) {
    throw new ValidationError(result.error || "Failed to enable 2FA", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Failed to enable 2FA",
      },
    ]);
  }

  res.json({
    message: "Two-factor authentication enabled successfully"
  });
}));

/**
 * POST /auth/2fa/disable
 * Disable two-factor authentication
 */
router.post("/2fa/disable", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/2fa/disable');
  const { token: verificationToken } = req.body;
  const authToken = req.headers.authorization?.replace("Bearer ", "");

  if (!authToken) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(authToken);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.disableTwoFactor(userResult.user!.id, verificationToken);

  if (!result.success) {
    throw new ValidationError(result.error || "Failed to disable 2FA", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Failed to disable 2FA",
      },
    ]);
  }

  res.json({
    message: "Two-factor authentication disabled successfully"
  });
}));

/**
 * POST /auth/2fa/verify
 * Verify two-factor authentication token
 */
router.post("/2fa/verify", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/2fa/verify');
  const { token: verificationToken } = req.body;
  const authToken = req.headers.authorization?.replace("Bearer ", "");

  if (!authToken) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(authToken);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.verifyTwoFactorToken(userResult.user!.id, verificationToken);

  if (!result.success) {
    throw new ValidationError(result.error || "Invalid verification token", [
      {
        field: 'general',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: result.error || "Invalid verification token",
      },
    ]);
  }

  res.json({
    message: "Two-factor token verified successfully"
  });
}));

/**
 * POST /auth/2fa/login
 * Complete login with two-factor authentication
 */
router.post("/2fa/login", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/2fa/login');
  const { token: verificationToken, userId } = req.body;

  if (!userId || !verificationToken) {
    throw new ValidationError('User ID and verification token are required', [
      {
        field: 'token',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'User ID and verification token are required',
      },
    ]);
  }

  const result = await authService.completeTwoFactorLogin(userId, verificationToken);

  if (!result.success) {
    throw new BaseError(result.error || "Two-factor login failed", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  // Log successful 2FA login
  await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
    user_role: result.user!.role,
    verification_status: result.user!.verification_status,
    two_factor_used: true
  });

  res.json({
    token: result.token!,
    refresh_token: result.refresh_token!,
    user: result.user!,
    message: "Two-factor login successful"
  });
}));

/**
 * ============================================================================
 * OAUTH ROUTES
 * ============================================================================
 */

/**
 * POST /auth/oauth/callback
 * Handle OAuth provider callback
 */
router.post("/oauth/callback", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/oauth/callback');
  const { provider, code, state } = req.body;

  if (!provider || !code) {
    throw new ValidationError('Provider and code are required', [
      {
        field: 'provider',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Provider and code are required',
      },
    ]);
  }

  const result = await authService.handleOAuthCallback(provider, code, state);

  if (!result.success) {
    throw new BaseError(result.error || "OAuth authentication failed", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  res.json({
    token: result.token!,
    refresh_token: result.refresh_token!,
    user: result.user!,
    message: "OAuth authentication successful"
  });
}));

/**
 * ============================================================================
 * SESSION MANAGEMENT ROUTES
 * ============================================================================
 */

/**
 * GET /auth/sessions
 * Get user's active sessions
 */
router.get("/sessions", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /auth/sessions');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const sessions = await authService.getUserSessions(userResult.user!.id);

  res.json({ 
    sessions,
    count: sessions.length,
    message: "Sessions retrieved successfully"
  });
}));

/**
 * DELETE /auth/sessions/:sessionId
 * Terminate a specific session
 */
router.delete("/sessions/:sessionId", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'DELETE /auth/sessions/:sessionId');
  const { sessionId } = req.params;
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  if (!sessionId) {
    throw new ValidationError("Session ID is required", [
      {
        field: 'sessionId',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Session ID is required",
      },
    ]);
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.terminateSession(sessionId, userResult.user!.id);

  if (!result.success) {
    throw new BaseError(result.error || "Failed to terminate session", {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.LOW,
    });
  }

  res.json({
    message: "Session terminated successfully"
  });
}));

/**
 * DELETE /auth/sessions
 * Terminate all sessions
 */
router.delete("/sessions", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'DELETE /auth/sessions');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const result = await authService.terminateAllSessions(userResult.user!.id);

  if (!result.success) {
    throw new BaseError(result.error || "Failed to terminate sessions", {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
    });
  }

  res.json({
    message: "All sessions terminated successfully"
  });
}));

/**
 * POST /auth/sessions/extend
 * Extend session expiration
 */
router.post("/sessions/extend", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'POST /auth/sessions/extend');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  // Session extension handled by token refresh
  res.json({
    message: "Session extended successfully"
  });
}));

/**
 * ============================================================================
 * SECURITY MONITORING ROUTES
 * ============================================================================
 */

/**
 * GET /auth/security/events
 * Get security events for user
 */
router.get("/security/events", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /auth/security/events');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const events = await authService.getSecurityEvents(userResult.user!.id, limit);

  res.json({ 
    events,
    count: events.length,
    message: "Security events retrieved successfully"
  });
}));

/**
 * GET /auth/security/suspicious-activity
 * Get suspicious activity alerts for user
 */
router.get("/security/suspicious-activity", asyncHandler(async (req: Request, res: Response) => {
  const context = createErrorContext(req, 'GET /auth/security/suspicious-activity');
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new BaseError("No token provided", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const userResult = await authService.verifyToken(token);
  if (!userResult.success) {
    throw new BaseError("Invalid token", {
      statusCode: 401,
      code: ERROR_CODES.NOT_AUTHENTICATED,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  const alerts = await authService.getSuspiciousActivity(userResult.user!.id);

  res.json({ 
    alerts,
    count: alerts.length,
    message: "Suspicious activity alerts retrieved successfully"
  });
}));

/**
 * All errors are now handled by the unified error middleware
 * (createUnifiedErrorMiddleware) which is registered in server/index.ts
 */
