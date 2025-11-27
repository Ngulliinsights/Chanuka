
import { Router, Request, Response } from "express";
import { authService } from "./auth-service.js";
import { ApiSuccess, ApiError, ApiValidationError, ApiUnauthorized  } from '@shared/core/utils/api-utils.js';
import { ErrorCodes, HttpStatus, ApiResponseWrapper  } from '@shared/core/utils/api-utils.js';
import { authRateLimit, legacyPasswordResetRateLimit as passwordResetRateLimit, legacyRegistrationRateLimit as registrationRateLimit } from '@server/middleware/rate-limiter.js';
import { errorTracker } from '@shared/errors/error-tracker.js';
import { securityAuditService } from '@server/features/security/security-audit-service.ts';

export const router: Router = Router();

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.headers['x-real-ip'] as string ||
         (req as any).connection?.remoteAddress ||
         (req as any).socket?.remoteAddress ||
         req.ip ||
         'unknown';
}
// Register endpoint
router.post("/register", registrationRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const result = await authService.register(req.body, req);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Registration failed"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refresh_token: result.refresh_token!,
      user: result.user!,
      requiresVerification: result.requiresVerification
    };

    return ApiSuccess(res, response, ApiResponseWrapper.createMetadata(startTime, 'database'), HttpStatus.CREATED);
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'medium',
       'authentication'
     );
     return ApiError(res, {
       code: ErrorCodes.DATABASE_ERROR,
       message: "Internal server error"
     }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Email verification endpoint
router.post("/verify-email", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { token } = req.body;

    if (!token) {
      return ApiValidationError(res, {
        field: 'token',
        message: 'Verification token is required'
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Email verification failed"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "Email verified successfully",
      user: result.user
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'medium',
       'authentication'
     );
     return ApiError(res, {
       code: ErrorCodes.DATABASE_ERROR,
       message: "Internal server error"
     }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Login endpoint
router.post("/login", authRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const result = await authService.login(req.body);

    if (!result.success) {
      return ApiUnauthorized(res, result.error || "Login failed",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    // Check if 2FA is required
    if (result.requiresTwoFactor) {
      return ApiSuccess(res, {
        requiresTwoFactor: true,
        user: result.user
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refresh_token: result.refresh_token!,
      user: result.user!
    };

    // Log successful login
    await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
      user_role: result.user!.role,
      verification_status: result.user!.verification_status
    });

    return ApiSuccess(res, response, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'high',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.DATABASE_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Logout endpoint
router.post("/logout", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      await authService.logout(token);
    }

    // Log logout event
    await securityAuditService.logAuthEvent('logout', req, undefined, true, {
      tokenProvided: !!token
    });

    return ApiSuccess(res, { message: "Logged out successfully" },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'medium',
       'authentication'
     );
     return ApiError(res, {
       code: ErrorCodes.DATABASE_ERROR,
       message: "Internal server error"
     }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return ApiValidationError(res, {
        field: 'refresh_token',
        message: 'Refresh token is required'
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.refreshToken(refresh_token);

    if (!result.success) {
      return ApiUnauthorized(res, result.error || "Token refresh failed",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refresh_token: result.refresh_token!,
      user: result.user!
    };

    // Log successful login
    await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
      user_role: result.user!.role,
      verification_status: result.user!.verification_status
    });

    return ApiSuccess(res, response, ApiResponseWrapper.createMetadata(startTime, 'database'));
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'high',
       'authentication'
     );
     return ApiError(res, {
       code: ErrorCodes.DATABASE_ERROR,
       message: "Internal server error"
     }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Verify token endpoint
router.get("/verify", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return ApiUnauthorized(res, "No token provided",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.verifyToken(token);

    if (!result.success) {
      return ApiUnauthorized(res, result.error || "Token verification failed",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, { user: result.user },
      ApiResponseWrapper.createMetadata(startTime, 'database'));
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'high',
       'authentication'
     );
     return ApiUnauthorized(res, "Invalid token",
       ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Password reset request endpoint
router.post("/forgot-password", passwordResetRateLimit, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const result = await authService.requestPasswordReset(req.body);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Password reset request failed"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
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

    return ApiSuccess(res, {
      message: "If an account with that email exists, a password reset link has been sent."
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
   } catch (error) {
     errorTracker.trackRequestError(
       error as Error,
       req,
       'medium',
       'authentication'
     );
     return ApiError(res, {
       code: ErrorCodes.DATABASE_ERROR,
       message: "Internal server error"
     }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
   }
});

// Password reset endpoint
router.post("/reset-password", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const result = await authService.resetPassword(req.body);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Password reset failed"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
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

    return ApiSuccess(res, {
      message: "Password reset successfully. Please log in with your new password."
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'high',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.DATABASE_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// ============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// ============================================================================

// Setup 2FA
router.post("/2fa/setup", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.setupTwoFactor(userResult.user!.id);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: result.error || "Failed to setup 2FA"
      }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      secret: result.secret,
      qr_code: result.qrCode,
      backup_codes: result.backupCodes
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Enable 2FA
router.post("/2fa/enable", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { token: verificationToken } = req.body;
    const authToken = req.headers.authorization?.replace("Bearer ", "");

    if (!authToken) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(authToken);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.enableTwoFactor(userResult.user!.id, verificationToken);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Failed to enable 2FA"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "Two-factor authentication enabled successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Disable 2FA
router.post("/2fa/disable", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { token: verificationToken } = req.body;
    const authToken = req.headers.authorization?.replace("Bearer ", "");

    if (!authToken) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(authToken);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.disableTwoFactor(userResult.user!.id, verificationToken);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Failed to disable 2FA"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "Two-factor authentication disabled successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Verify 2FA token
router.post("/2fa/verify", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { token: verificationToken } = req.body;
    const authToken = req.headers.authorization?.replace("Bearer ", "");

    if (!authToken) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(authToken);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.verifyTwoFactorToken(userResult.user!.id, verificationToken);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Invalid verification token"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "Two-factor token verified successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Complete 2FA login
router.post("/2fa/login", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { token: verificationToken, userId } = req.body;

    if (!userId || !verificationToken) {
      return ApiValidationError(res, {
        field: 'token',
        message: 'User ID and verification token are required'
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.completeTwoFactorLogin(userId, verificationToken);

    if (!result.success) {
      return ApiUnauthorized(res, result.error || "Two-factor login failed",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refresh_token: result.refresh_token!,
      user: result.user!
    };

    // Log successful 2FA login
    await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
      user_role: result.user!.role,
      verification_status: result.user!.verification_status,
      two_factor_used: true
    });

    return ApiSuccess(res, response, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'high',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// ============================================================================
// OAUTH ROUTES
// ============================================================================

// OAuth callback
router.post("/oauth/callback", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { provider, code, state } = req.body;

    if (!provider || !code) {
      return ApiValidationError(res, {
        field: 'provider',
        message: 'Provider and code are required'
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.handleOAuthCallback(provider, code, state);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.UNAUTHORIZED,
        message: result.error || "OAuth authentication failed"
      }, HttpStatus.UNAUTHORIZED, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refresh_token: result.refresh_token!,
      user: result.user!
    };

    return ApiSuccess(res, response, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'high',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// ============================================================================
// SESSION MANAGEMENT ROUTES
// ============================================================================

// Get user sessions
router.get("/sessions", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const sessions = await authService.getUserSessions(userResult.user!.id);

    return ApiSuccess(res, { sessions }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Terminate session
router.delete("/sessions/:sessionId", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { sessionId } = req.params;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    if (!sessionId) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Session ID is required"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.terminateSession(sessionId, userResult.user!.id);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: result.error || "Failed to terminate session"
      }, HttpStatus.BAD_REQUEST, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "Session terminated successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Terminate all sessions
router.delete("/sessions", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.terminateAllSessions(userResult.user!.id);

    if (!result.success) {
      return ApiError(res, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: result.error || "Failed to terminate sessions"
      }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    return ApiSuccess(res, {
      message: "All sessions terminated successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Extend session
router.post("/sessions/extend", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    // For now, just return success - session extension would be handled by token refresh
    return ApiSuccess(res, {
      message: "Session extended successfully"
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// ============================================================================
// SECURITY MONITORING ROUTES
// ============================================================================

// Get security events
router.get("/security/events", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const events = await authService.getSecurityEvents(userResult.user!.id, limit);

    return ApiSuccess(res, { events }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get suspicious activity
router.get("/security/suspicious-activity", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return ApiUnauthorized(res, "No token provided", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const userResult = await authService.verifyToken(token);
    if (!userResult.success) {
      return ApiUnauthorized(res, "Invalid token", ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const alerts = await authService.getSuspiciousActivity(userResult.user!.id);

    return ApiSuccess(res, { alerts }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    errorTracker.trackRequestError(
      error as Error,
      req,
      'medium',
      'authentication'
    );
    return ApiError(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error"
    }, HttpStatus.INTERNAL_SERVER_ERROR, ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});














































