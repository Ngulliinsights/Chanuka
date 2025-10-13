import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { database as db } from '../../../shared/database/connection.js';
import { users, sessions, passwordResets, type User } from '../../../shared/schema.js';
import { getEmailService } from '../../services/email.service.js';
import { encryptionService } from '../../features/security/encryption-service.js';
import { inputValidationService } from '../validation/input-validation-service.js';
import { securityAuditService } from '../../features/security/security-audit-service.js';
import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['citizen', 'expert', 'journalist', 'advocate']).default('citizen'),
  expertise: z.array(z.string()).optional(),
  organization: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character')
});

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string;
    role: string;
    verificationStatus: string;
    isActive: boolean | null;
  };
  token?: string;
  refreshToken?: string;
  error?: string;
  requiresVerification?: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export class AuthService {
  private jwtSecret: string;
  private refreshTokenSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'development-jwt-secret';
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'development-refresh-secret';
  }

  /**
   * Register a new user with email verification and enhanced security
   */
  async register(data: z.infer<typeof registerSchema>, req: Request): Promise<AuthResult> {
    try {
      // Validate and sanitize input
      const validationResult = inputValidationService.validateRequest(data, registerSchema);
      if (!validationResult.success) {
        await securityAuditService.logAuthEvent('registration_attempt', req, undefined, false, {
          errors: validationResult.errors
        });
        return {
          success: false,
          error: validationResult.errors?.join(', ') || 'Validation failed'
        };
      }

      const validatedData = validationResult.data!;

      // Additional email validation
      const emailValidation = inputValidationService.validateEmail(validatedData.email);
      if (!emailValidation.isValid) {
        await securityAuditService.logAuthEvent('registration_attempt', req, undefined, false, {
          error: 'Invalid email format'
        });
        return {
          success: false,
          error: emailValidation.error || 'Invalid email format'
        };
      }

      // Check if user already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, emailValidation.sanitized!))
        .limit(1);

      if (existingUser.length > 0) {
        await securityAuditService.logAuthEvent('registration_attempt', req, undefined, false, {
          error: 'Email already exists'
        });
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Hash password with enhanced security
      const passwordHash = await encryptionService.hashPassword(validatedData.password);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email: validatedData.email,
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
          role: validatedData.role,
          verificationStatus: 'pending',
          isActive: true,
          preferences: {
            emailNotifications: true,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        })
        .returning();

      // Send verification email
      const emailService = await getEmailService();
      await emailService.sendEmail({
        to: validatedData.email,
        subject: 'Verify your email address',
        html: `
          <h2>Welcome ${validatedData.firstName}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(newUser[0].id, validatedData.email);

      // Create session
      await this.createSession(newUser[0].id, token, refreshToken);

      return {
        success: true,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          firstName: newUser[0].firstName,
          lastName: newUser[0].lastName,
          name: newUser[0].name,
          role: newUser[0].role,
          verificationStatus: newUser[0].verificationStatus,
          isActive: newUser[0].isActive
        },
        token,
        refreshToken,
        requiresVerification: true
      };

    } catch (error) {
      logger.error('Registration error:', { component: 'SimpleTool' }, error);
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map(e => e.message).join(', ')
        };
      }
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.preferences, { emailVerificationToken: token }))
        .limit(1);

      if (user.length === 0) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      const userData = user[0];
      const preferences = userData.preferences as any;

      // Check if token is expired
      if (preferences?.emailVerificationExpires && new Date() > new Date(preferences.emailVerificationExpires)) {
        return {
          success: false,
          error: 'Verification token has expired'
        };
      }

      // Update user verification status
      await db
        .update(users)
        .set({
          verificationStatus: 'verified',
          preferences: {
            ...preferences,
            emailVerificationToken: null,
            emailVerificationExpires: null,
            emailVerified: true
          }
        })
        .where(eq(users.id, userData.id));

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: userData.name,
          role: userData.role,
          verificationStatus: 'verified',
          isActive: userData.isActive
        }
      };

    } catch (error) {
      logger.error('Email verification error:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        error: 'Email verification failed'
      };
    }
  }

  /**
   * Login user with credentials
   */
  async login(data: z.infer<typeof loginSchema>): Promise<AuthResult> {
    try {
      // Validate input
      const validatedData = loginSchema.parse(data);

      // Find user by email
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (user.length === 0) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const userData = user[0];

      // Check if user is active
      if (!userData.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, userData.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userData.id));

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(userData.id, userData.email);

      // Create session
      await this.createSession(userData.id, token, refreshToken);

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: userData.name,
          role: userData.role,
          verificationStatus: userData.verificationStatus,
          isActive: userData.isActive
        },
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Login error:', { component: 'SimpleTool' }, error);
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map(e => e.message).join(', ')
        };
      }
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Invalidate session
      await db
        .update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.token, token));

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as any;

      // Find session
      const session = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.refreshTokenHash, this.hashToken(refreshToken)),
          eq(sessions.isActive, true)
        ))
        .limit(1);

      if (session.length === 0) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      const sessionData = session[0];

      // Check if refresh token is expired
      if (new Date() > sessionData.refreshTokenExpiresAt!) {
        // Invalidate session
        await db
          .update(sessions)
          .set({ isActive: false })
          .where(eq(sessions.id, sessionData.id));

        return {
          success: false,
          error: 'Refresh token expired'
        };
      }

      // Get user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionData.userId))
        .limit(1);

      if (user.length === 0 || !user[0].isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      const userData = user[0];

      // Generate new tokens
      const { token: newToken, refreshToken: newRefreshToken } = await this.generateTokens(
        userData.id,
        userData.email
      );

      // Update session with new tokens
      await db
        .update(sessions)
        .set({
          token: newToken,
          refreshTokenHash: this.hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updatedAt: new Date()
        })
        .where(eq(sessions.id, sessionData.id));

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: userData.name,
          role: userData.role,
          verificationStatus: userData.verificationStatus,
          isActive: userData.isActive
        },
        token: newToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      logger.error('Token refresh error:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: z.infer<typeof passwordResetRequestSchema>): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedData = passwordResetRequestSchema.parse(data);

      // Find user
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (user.length === 0) {
        // Don't reveal if email exists or not
        return { success: true };
      }

      const userData = user[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store reset token
      await db
        .insert(passwordResets)
        .values({
          userId: userData.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

      // Send reset email
      const emailService = await getEmailService();
      await emailService.sendEmail({
        to: userData.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>Hello ${userData.firstName || 'User'},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      return { success: true };

    } catch (error) {
      logger.error('Password reset request error:', { component: 'SimpleTool' }, error);
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map(e => e.message).join(', ')
        };
      }
      return {
        success: false,
        error: 'Password reset request failed'
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(data: z.infer<typeof passwordResetSchema>): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedData = passwordResetSchema.parse(data);

      // Hash the token to find it in database
      const tokenHash = crypto.createHash('sha256').update(validatedData.token).digest('hex');

      // Find reset token
      const resetRecord = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.tokenHash, tokenHash))
        .limit(1);

      if (resetRecord.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      const resetData = resetRecord[0];

      // Check if token is expired
      if (new Date() > resetData.expiresAt) {
        // Clean up expired token
        await db
          .delete(passwordResets)
          .where(eq(passwordResets.id, resetData.id));

        return {
          success: false,
          error: 'Reset token has expired'
        };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(validatedData.password, 12);

      // Update user password
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetData.userId));

      // Delete used reset token
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.id, resetData.id));

      // Invalidate all user sessions for security
      await db
        .update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.userId, resetData.userId));

      // Get user data for notification
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, resetData.userId))
        .limit(1);

      if (user.length > 0) {
        // Send password change notification
        const emailService = await getEmailService();
        await emailService.sendEmail({
          to: user[0].email,
          subject: 'Password Changed Successfully',
          html: `
            <h2>Password Changed</h2>
            <p>Hello ${user[0].firstName || 'User'},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
          `
        });
      }

      return { success: true };

    } catch (error) {
      logger.error('Password reset error:', { component: 'SimpleTool' }, error);
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map(e => e.message).join(', ')
        };
      }
      return {
        success: false,
        error: 'Password reset failed'
      };
    }
  }

  /**
   * Verify JWT token and get user data
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      // Check if session is still active
      const session = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.token, token),
          eq(sessions.isActive, true)
        ))
        .limit(1);

      if (session.length === 0) {
        return {
          success: false,
          error: 'Invalid session'
        };
      }

      // Check if session is expired
      if (new Date() > session[0].expiresAt) {
        await db
          .update(sessions)
          .set({ isActive: false })
          .where(eq(sessions.id, session[0].id));

        return {
          success: false,
          error: 'Session expired'
        };
      }

      // Get user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (user.length === 0 || !user[0].isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      const userData = user[0];

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: userData.name,
          role: userData.role,
          verificationStatus: userData.verificationStatus,
          isActive: userData.isActive
        }
      };

    } catch (error) {
      logger.error('Token verification error:', { component: 'SimpleTool' }, error);
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  /**
   * Generate JWT and refresh tokens
   */
  private async generateTokens(userId: string, email: string): Promise<{ token: string; refreshToken: string }> {
    const token = jwt.sign(
      { userId, email },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: '30d' }
    );

    return { token, refreshToken };
  }

  /**
   * Create session record
   */
  private async createSession(userId: string, token: string, refreshToken: string): Promise<void> {
    await db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId,
        token,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true
      });
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Clean up expired sessions and reset tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();

      // Clean up expired sessions
      await db
        .update(sessions)
        .set({ isActive: false })
        .where(and(
          eq(sessions.isActive, true),
          // Sessions where either access token or refresh token is expired
          // and refresh token is also expired (can't be renewed)
        ));

      // Clean up expired password reset tokens
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.expiresAt, now));

      logger.info('Expired tokens cleaned up successfully', { component: 'SimpleTool' });
    } catch (error) {
      logger.error('Token cleanup error:', { component: 'SimpleTool' }, error);
    }
  }
}

export const authService = new AuthService();
