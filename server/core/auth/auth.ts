
import { Router, Request, Response } from "express";
import { authService, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from "./auth-service.js";
import { createApiResponse, createErrorResponse } from "../../types/api.js";
import { authRateLimit, passwordResetRateLimit, registrationRateLimit } from "../../middleware/rate-limiter.js";
import { z } from "zod";

export const router = Router();
// Register endpoint
router.post("/register", registrationRateLimit, async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body, req);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(result.error || "Registration failed", "REGISTRATION_FAILED"));
    }

    const response = {
      token: result.token!,
      refreshToken: result.refreshToken!,
      user: result.user!,
      requiresVerification: result.requiresVerification
    };

    res.status(201).json(createApiResponse(true, response));
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Email verification endpoint
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json(createErrorResponse("Verification token is required", "MISSING_TOKEN"));
    }

    const result = await authService.verifyEmail(token);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(result.error || "Email verification failed", "VERIFICATION_FAILED"));
    }

    res.json(createApiResponse(true, { 
      message: "Email verified successfully",
      user: result.user 
    }));
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Login endpoint
router.post("/login", authRateLimit, async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    
    if (!result.success) {
      return res.status(401).json(createErrorResponse(result.error || "Login failed", "LOGIN_FAILED"));
    }

    const response = {
      token: result.token!,
      refreshToken: result.refreshToken!,
      user: result.user!
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Logout endpoint
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (token) {
      await authService.logout(token);
    }
    
    res.json(createApiResponse(true, { message: "Logged out successfully" }));
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json(createErrorResponse("Refresh token is required", "MISSING_REFRESH_TOKEN"));
    }

    const result = await authService.refreshToken(refreshToken);
    
    if (!result.success) {
      return res.status(401).json(createErrorResponse(result.error || "Token refresh failed", "REFRESH_FAILED"));
    }

    const response = {
      token: result.token!,
      refreshToken: result.refreshToken!,
      user: result.user!
    };

    res.json(createApiResponse(true, response));
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Verify token endpoint
router.get("/verify", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json(createErrorResponse("No token provided", "NO_TOKEN"));
    }

    const result = await authService.verifyToken(token);
    
    if (!result.success) {
      return res.status(401).json(createErrorResponse(result.error || "Token verification failed", "INVALID_TOKEN"));
    }

    res.json(createApiResponse(true, { user: result.user }));
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json(createErrorResponse("Invalid token", "INVALID_TOKEN"));
  }
});

// Password reset request endpoint
router.post("/forgot-password", passwordResetRateLimit, async (req: Request, res: Response) => {
  try {
    const result = await authService.requestPasswordReset(req.body);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(result.error || "Password reset request failed", "RESET_REQUEST_FAILED"));
    }

    res.json(createApiResponse(true, { 
      message: "If an account with that email exists, a password reset link has been sent." 
    }));
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});

// Password reset endpoint
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const result = await authService.resetPassword(req.body);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(result.error || "Password reset failed", "RESET_FAILED"));
    }

    res.json(createApiResponse(true, { 
      message: "Password reset successfully. Please log in with your new password." 
    }));
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json(createErrorResponse("Internal server error", "INTERNAL_ERROR"));
  }
});
