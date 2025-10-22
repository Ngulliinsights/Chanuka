
import { Router, Request, Response } from "express";
import { authService, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from "./auth-service.js";
import { ApiSuccess, ApiError, ApiValidationError, ApiUnauthorized, ApiForbidden, ApiNotFound, ErrorCodes, HttpStatus, ApiResponseWrapper } from "../../../shared/core/src/utilities/api";
import { authRateLimit, passwordResetRateLimit, registrationRateLimit } from "../../middleware/rate-limiter.js";
import { z } from "zod";
import { errorTracker } from '../errors/error-tracker.js';
import { logger } from '@shared/core';
import { securityAuditService } from '../../features/security/security-audit-service.js';

export const router = Router();

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
      refreshToken: result.refreshToken!,
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

    const response = {
      token: result.token!,
      refreshToken: result.refreshToken!,
      user: result.user!
    };

    // Log successful login
    await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
      userRole: result.user!.role,
      verificationStatus: result.user!.verificationStatus
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiValidationError(res, {
        field: 'refreshToken',
        message: 'Refresh token is required'
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const result = await authService.refreshToken(refreshToken);

    if (!result.success) {
      return ApiUnauthorized(res, result.error || "Token refresh failed",
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const response = {
      token: result.token!,
      refreshToken: result.refreshToken!,
      user: result.user!
    };

    // Log successful login
    await securityAuditService.logAuthEvent('login_success', req, result.user!.id, true, {
      userRole: result.user!.role,
      verificationStatus: result.user!.verificationStatus
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
      eventType: 'password_reset_request',
      severity: 'low',
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
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
      eventType: 'password_reset',
      severity: 'medium',
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
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












































