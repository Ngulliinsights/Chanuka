import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { readDatabase } from '@shared/database/connection.js';
const db = readDatabase;
import { users as users, session as sessions, passwordReset as passwordResets, type User } from '@/shared/schema';
import { getEmailService } from '../../infrastructure/notifications/email-service';
import { encryptionService } from '../../features/security/encryption-service.js';
import { inputValidationService } from '../validation/input-validation-service.js';
import { securityAuditService } from '../../features/security/security-audit-service.js';
import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@shared/core/index.js';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'),
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
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
    first_name: string | null;
    last_name: string | null;
    name: string;
    role: string;
    verification_status: string;
    is_active: boolean | null;
  };
  token?: string;
  refresh_token?: string;
  error?: string;
  requiresVerification?: boolean;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  refresh_token_expires_at: Date;
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
      const password_hash = await encryptionService.hashPassword(validatedData.password);

      // Generate email verification token
      const verification_token = crypto.randomBytes(32).toString('hex');

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email: validatedData.email,
          password_hash,
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          name: `${validatedData.first_name} ${validatedData.last_name}`.trim(),
          role: validatedData.role,
          verification_status: 'pending',
          is_active: true,
          preferences: {
            emailNotifications: true,
            emailVerificationToken: verification_token,
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
          <h2>Welcome ${validatedData.first_name}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${verification_token}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });

      // Generate tokens
      const { token, refresh_token } = await this.generateTokens(newUser[0].id, validatedData.email);

      // Create session
      await this.createSession(newUser[0].id, token, refresh_token);

      return {
        success: true,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          first_name: newUser[0].first_name,
          last_name: newUser[0].last_name,
          name: newUser[0].name,
          role: newUser[0].role,
          verification_status: newUser[0].verification_status,
          is_active: newUser[0].is_active
        },
        token,
        refreshToken,
        requiresVerification: true
      };

    } catch (error) {
      logger.error('Registration error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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

      if (users.length === 0) {
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
          verification_status: 'verified',
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
          first_name: userData.first_name,
          last_name: userData.last_name,
          name: userData.name,
          role: userData.role,
          verification_status: 'verified',
          is_active: userData.is_active
        }
      };

    } catch (error) {
      logger.error('Email verification error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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

      if (users.length === 0) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const userData = user[0];

      // Check if user is active
      if (!userData.is_active) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, userData.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Update last login
      await db
        .update(users)
        .set({ last_login_at: new Date() })
        .where(eq(users.id, userData.id));

      // Generate tokens
      const { token, refresh_token } = await this.generateTokens(userData.id, userData.email);

      // Create session
      await this.createSession(userData.id, token, refresh_token);

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          name: userData.name,
          role: userData.role,
          verification_status: userData.verification_status,
          is_active: userData.is_active
        },
        token,
        refreshToken
      };

    } catch (error) {
      logger.error('Login error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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
        .set({ is_active: false })
        .where(eq(sessions.token, token));

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refresh_token: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refresh_token, this.refreshTokenSecret) as any;

      // Find session
      const session = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.refresh_token_hash, this.hashToken(refresh_token)),
          eq(sessions.is_active, true)
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
      if (new Date() > sessionData.refresh_token_expires_at!) {
        // Invalidate session
        await db
          .update(sessions)
          .set({ is_active: false })
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
        .where(eq(users.id, sessionData.user_id))
        .limit(1);

      if (users.length === 0 || !user[0].is_active) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      const userData = user[0];

      // Generate new tokens
      const { token: newToken, refresh_token: newRefreshToken } = await this.generateTokens(
        userData.id,
        userData.email
      );

      // Update session with new tokens
      await db
        .update(sessions)
        .set({
          token: newToken,
          refresh_token_hash: this.hashToken(newRefreshToken),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updated_at: new Date()
        })
        .where(eq(sessions.id, sessionData.id));

      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          name: userData.name,
          role: userData.role,
          verification_status: userData.verification_status,
          is_active: userData.is_active
        },
        token: newToken,
        refresh_token: newRefreshToken
      };

    } catch (error) {
      logger.error('Token refresh error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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

      if (users.length === 0) {
        // Don't reveal if email exists or not
        return { success: true };
      }

      const userData = user[0];

      // Generate reset token
      const reset_token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(reset_token).digest('hex');

      // Store reset token
      await db
        .insert(passwordResets)
        .values({
          user_id: userData.id,
          tokenHash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

      // Send reset email
      const emailService = await getEmailService();
      await emailService.sendEmail({
        to: userData.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>Hello ${userData.first_name || 'User'},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${reset_token}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      return { success: true };

    } catch (error) {
      logger.error('Password reset request error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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
      if (new Date() > resetData.expires_at) {
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
      const password_hash = await bcrypt.hash(validatedData.password, 12);

      // Update user password
      await db
        .update(users)
        .set({ password_hash })
        .where(eq(users.id, resetData.user_id));

      // Delete used reset token
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.id, resetData.id));

      // Invalidate all user sessions for security
      await db
        .update(sessions)
        .set({ is_active: false })
        .where(eq(sessions.user_id, resetData.user_id));

      // Get user data for notification
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, resetData.user_id))
        .limit(1);

      if (users.length > 0) {
        // Send password change notification
        const emailService = await getEmailService();
        await emailService.sendEmail({
          to: user[0].email,
          subject: 'Password Changed Successfully',
          html: `
            <h2>Password Changed</h2>
            <p>Hello ${user[0].first_name || 'User'},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
          `
        });
      }

      return { success: true };

    } catch (error) {
      logger.error('Password reset error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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
          eq(sessions.is_active, true)
        ))
        .limit(1);

      if (session.length === 0) {
        return {
          success: false,
          error: 'Invalid session'
        };
      }

      // Check if session is expired
      if (new Date() > session[0].expires_at) {
        await db
          .update(sessions)
          .set({ is_active: false })
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
        .where(eq(users.id, decoded.user_id))
        .limit(1);

      if (users.length === 0 || !user[0].is_active) {
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
          first_name: userData.first_name,
          last_name: userData.last_name,
          name: userData.name,
          role: userData.role,
          verification_status: userData.verification_status,
          is_active: userData.is_active
        }
      };

    } catch (error) {
      logger.error('Token verification error:', error instanceof Error ? error : new Error(String(error)), { component: 'Chanuka' });
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  /**
   * Generate JWT and refresh tokens
   */
  private async generateTokens(user_id: string, email: string): Promise<{ token: string; refresh_token: string }> {
    const token = jwt.sign(
      { user_id, email },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    const refresh_token = jwt.sign(
      { user_id, email, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: '30d' }
    );

    return { token, refresh_token };
  }

  /**
   * Create session record
   */
  private async createSession(user_id: string, token: string, refresh_token: string): Promise<void> {
    await db
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        user_id,
        token,
        refresh_token_hash: this.hashToken(refresh_token),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_active: true
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
        .set({ is_active: false })
        .where(and(
          eq(sessions.is_active, true),
          // Sessions where either access token or refresh token is expired
          // and refresh token is also expired (can't be renewed)
        ));

      // Clean up expired password reset tokens
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.expires_at, now));

      logger.info('Expired tokens cleaned up successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Token cleanup error:', error instanceof Error ? error : new Error(String(error)), { component: 'Chanuka' });
    }
  }
}

export const authService = new AuthService();






































