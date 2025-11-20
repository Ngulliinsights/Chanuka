import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { eq, and, gt, lt, isNotNull, desc, ne } from 'drizzle-orm';
import { database as db } from '@shared/database/connection.js';

import { users, sessions, oauth_providers, oauth_tokens, user_sessions } from '@shared/schema';
import { getEmailService } from '../../infrastructure/notifications/email-service';
import { encryptionService } from '@client/features/security/encryption-service.js';
import { inputValidationService } from '../validation/input-validation-service.js';
import { securityAuditService } from '@client/features/security/security-audit-service.js';
import { Request } from 'express';
import { z } from 'zod';
import { logger } from '@shared/core/src/index.js';

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
          verification_token: verification_token,
          verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
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
        refresh_token,
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
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.verification_token, token))
        .limit(1);

      if (userResults.length === 0) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      const userData = userResults[0];

      // Check if token is expired
      if (userData.verification_expires_at && new Date() > userData.verification_expires_at) {
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
          verification_token: null,
          verification_expires_at: null,
          updated_at: new Date()
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
  async login(data: z.infer<typeof loginSchema>): Promise<AuthResult & { requiresTwoFactor?: boolean }> {
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

      // Check if 2FA is enabled
      if (userData.two_factor_enabled) {
        return {
          success: true,
          requiresTwoFactor: true,
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
        refresh_token
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
      // Invalidate session by setting expiration to now
      // We need to find the session by user_id from the token
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      await db
        .update(sessions)
        .set({ expires_at: new Date() })
        .where(eq(sessions.user_id, decoded.user_id));

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

      // Find session by user_id from decoded token
      const session = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.user_id, decoded.user_id),
          gt(sessions.expires_at, new Date())
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

      if (user.length === 0 || !user[0].is_active) {
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

      // Update session expiration
      await db
        .update(sessions)
        .set({
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

      if (user.length === 0) {
        // Don't reveal if email exists or not
        return { success: true };
      }

      const userData = user[0];

      // Generate reset token
      const reset_token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(reset_token).digest('hex');

      // Store reset token in users table
      await db
        .update(users)
        .set({
          password_reset_token: tokenHash,
          password_reset_expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          updated_at: new Date()
        })
        .where(eq(users.id, userData.id));

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

      // Find user with reset token
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.password_reset_token, tokenHash))
        .limit(1);

      if (userRecord.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      const userData = userRecord[0];

      // Check if token is expired
      if (!userData.password_reset_expires_at || new Date() > userData.password_reset_expires_at) {
        // Clean up expired token
        await db
          .update(users)
          .set({
            password_reset_token: null,
            password_reset_expires_at: null,
            updated_at: new Date()
          })
          .where(eq(users.id, userData.id));

        return {
          success: false,
          error: 'Reset token has expired'
        };
      }

      // Hash new password
      const password_hash = await bcrypt.hash(validatedData.password, 12);

      // Update user password and clear reset token
      await db
        .update(users)
        .set({
          password_hash,
          password_reset_token: null,
          password_reset_expires_at: null,
          updated_at: new Date()
        })
        .where(eq(users.id, userData.id));

      // Invalidate all user sessions for security
      await db
        .update(sessions)
        .set({ expires_at: new Date() }) // Mark sessions as expired
        .where(eq(sessions.user_id, userData.id));

      // Get user data for notification
      const userForNotification = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);

      if (userForNotification.length > 0) {
        // Send password change notification
        const emailService = await getEmailService();
        await emailService.sendEmail({
          to: userForNotification[0].email,
          subject: 'Password Changed Successfully',
          html: `
            <h2>Password Changed</h2>
            <p>Hello ${userForNotification[0].first_name || 'User'},</p>
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
          eq(sessions.user_id, decoded.user_id),
          gt(sessions.expires_at, new Date())
        ))
        .limit(1);

      if (session.length === 0) {
        return {
          success: false,
          error: 'Invalid session'
        };
      }

      // Session is already filtered by expires_at > now, so no need to check again

      // Get user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.user_id))
        .limit(1);

      if (user.length === 0 || !user[0].is_active) {
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
      logger.error('Token verification error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
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
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        data: {
          token_hash: this.hashToken(token),
          refresh_token_hash: this.hashToken(refresh_token),
          refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
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

      // Clean up expired sessions (delete them entirely)
      await db
        .delete(sessions)
        .where(lt(sessions.expires_at, now));

      // Clean up expired password reset tokens in users table
      await db
        .update(users)
        .set({
          password_reset_token: null,
          password_reset_expires_at: null,
          updated_at: new Date()
        })
        .where(and(
          isNotNull(users.password_reset_token),
          lt(users.password_reset_expires_at, now)
        ));

      logger.info('Expired tokens cleaned up successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Token cleanup error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'Chanuka'
      });
    }
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Setup two-factor authentication for a user
   */
  async setupTwoFactor(userId: string): Promise<{ success: boolean; secret?: string; qrCode?: string; backupCodes?: string[]; error?: string }> {
    try {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: 'Chanuka Platform',
        issuer: 'Chanuka',
        length: 32
      });

      // Generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }

      // Generate QR code
      const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

      // Store in database (don't enable yet)
      await db
        .update(users)
        .set({
          two_factor_secret: secret.base32,
          backup_codes: backupCodes,
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        secret: secret.base32,
        qrCode,
        backupCodes
      };
    } catch (error) {
      logger.error('2FA setup error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to setup two-factor authentication'
      };
    }
  }

  /**
   * Enable two-factor authentication after verification
   */
  async enableTwoFactor(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user data
      const userResult = await db
        .select({ two_factor_secret: users.two_factor_secret })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0 || !userResult[0].two_factor_secret) {
        return { success: false, error: 'Two-factor authentication not set up' };
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: userResult[0].two_factor_secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time windows (30 seconds each)
      });

      if (!verified) {
        return { success: false, error: 'Invalid verification token' };
      }

      // Enable 2FA
      await db
        .update(users)
        .set({
          two_factor_enabled: true,
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      logger.error('2FA enable error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to enable two-factor authentication'
      };
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user data
      const userResult = await db
        .select({ two_factor_secret: users.two_factor_secret })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0 || !userResult[0].two_factor_secret) {
        return { success: false, error: 'Two-factor authentication not enabled' };
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: userResult[0].two_factor_secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return { success: false, error: 'Invalid verification token' };
      }

      // Disable 2FA
      await db
        .update(users)
        .set({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: [],
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      logger.error('2FA disable error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to disable two-factor authentication'
      };
    }
  }

  /**
   * Complete login with two-factor verification
   */
  async completeTwoFactorLogin(userId: string, token: string): Promise<AuthResult> {
    try {
      // First verify the 2FA token
      const verifyResult = await this.verifyTwoFactorToken(userId, token);
      if (!verifyResult.success) {
        return {
          success: false,
          error: verifyResult.error || 'Invalid two-factor token'
        };
      }

      // Get user data
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const userData = userResult[0];

      // Update last login
      await db
        .update(users)
        .set({ last_login_at: new Date() })
        .where(eq(users.id, userData.id));

      // Generate tokens
      const { token: accessToken, refresh_token } = await this.generateTokens(userData.id, userData.email);

      // Create session
      await this.createSession(userData.id, accessToken, refresh_token);

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
        token: accessToken,
        refresh_token
      };
    } catch (error) {
      logger.error('Complete 2FA login error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to complete two-factor login'
      };
    }
  }

  /**
   * Verify two-factor token during login
   */
  async verifyTwoFactorToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user data
      const userResult = await db
        .select({ two_factor_secret: users.two_factor_secret, backup_codes: users.backup_codes })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0 || !userResult[0].two_factor_secret) {
        return { success: false, error: 'Two-factor authentication not enabled' };
      }

      const { two_factor_secret, backup_codes } = userResult[0];

      // Check if it's a backup code first
      if (backup_codes && backup_codes.includes(token)) {
        // Remove used backup code
        const updatedBackupCodes = backup_codes.filter((code: string) => code !== token);
        await db
          .update(users)
          .set({
            backup_codes: updatedBackupCodes,
            updated_at: new Date()
          })
          .where(eq(users.id, userId));

        return { success: true };
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: two_factor_secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        return { success: false, error: 'Invalid verification token' };
      }

      return { success: true };
    } catch (error) {
      logger.error('2FA verification error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to verify two-factor token'
      };
    }
  }

  // ============================================================================
  // OAUTH METHODS
  // ============================================================================

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(provider: string, _code: string, _state?: string): Promise<AuthResult> {
    try {
      // Get OAuth provider config
      const providerResult = await db
        .select()
        .from(oauth_providers)
        .where(eq(oauth_providers.provider_name, provider))
        .limit(1);

      if (providerResult.length === 0) {
        return { success: false, error: 'OAuth provider not configured' };
      }

      const providerConfig = providerResult[0];

      // Exchange code for tokens (simplified - would need actual OAuth client)
      // This is a placeholder for the actual OAuth token exchange
      const tokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      // Get user info from provider (simplified)
      const userInfo = {
        id: 'mock_provider_user_id',
        email: 'oauth@example.com',
        name: 'OAuth User',
        verified: true
      };

      // Check if OAuth token already exists
      const existingToken = await db
        .select()
        .from(oauth_tokens)
        .where(and(
          eq(oauth_tokens.provider_id, providerConfig.id),
          eq(oauth_tokens.provider_user_id, userInfo.id)
        ))
        .limit(1);

      let userId: string;

      if (existingToken.length > 0) {
        // Update existing token
        userId = existingToken[0].user_id;
        await db
          .update(oauth_tokens)
          .set({
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
            updated_at: new Date()
          })
          .where(eq(oauth_tokens.id, existingToken[0].id));
      } else {
        // Check if user with this email exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, userInfo.email))
          .limit(1);

        if (existingUser.length > 0) {
          userId = existingUser[0].id;
        } else {
          // Create new user
          const newUser = await db
            .insert(users)
            .values({
              email: userInfo.email,
              password_hash: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
              role: 'citizen',
              is_verified: userInfo.verified,
              name: userInfo.name
            })
            .returning();
          userId = newUser[0].id;
        }

        // Create OAuth token record
        await db
          .insert(oauth_tokens)
          .values({
            user_id: userId,
            provider_id: providerConfig.id,
            provider_user_id: userInfo.id,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000)
          });
      }

      // Generate JWT tokens
      const { token, refresh_token } = await this.generateTokens(userId, userInfo.email);

      // Create session
      await this.createSession(userId, token, refresh_token);

      // Get user data
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return {
        success: true,
        user: {
          id: userData[0].id,
          email: userData[0].email,
          first_name: userData[0].first_name,
          last_name: userData[0].last_name,
          name: userData[0].name,
          role: userData[0].role,
          verification_status: userData[0].is_verified ? 'verified' : 'pending',
          is_active: userData[0].is_active
        },
        token,
        refresh_token
      };
    } catch (error) {
      logger.error('OAuth callback error:', {
        error: error instanceof Error ? error.message : String(error),
        provider,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'OAuth authentication failed'
      };
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getOAuthUrl(_provider: string, state?: string): string {
    // This would generate the OAuth authorization URL for the provider
    // Simplified implementation
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&redirect_uri=mock&scope=openid profile email&response_type=code&state=${state || 'default'}`;
  }

  // ============================================================================
  // SESSION MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const userSessions = await db
        .select({
          id: user_sessions.id,
          device_info: user_sessions.device_info,
          ip_address: user_sessions.ip_address,
          user_agent: user_sessions.user_agent,
          location: user_sessions.location,
          last_activity: user_sessions.last_activity,
          created_at: user_sessions.created_at
        })
        .from(user_sessions)
        .where(and(
          eq(user_sessions.user_id, userId),
          eq(user_sessions.is_active, true)
        ))
        .orderBy(desc(user_sessions.last_activity));

      return userSessions;
    } catch (error) {
      logger.error('Get user sessions error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return [];
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db
        .update(user_sessions)
        .set({
          is_active: false,
          expires_at: new Date(),
          updated_at: new Date()
        })
        .where(and(
          eq(user_sessions.id, sessionId),
          eq(user_sessions.user_id, userId)
        ));

      if (result.rowCount === 0) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Terminate session error:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to terminate session'
      };
    }
  }

  /**
   * Terminate all sessions for a user except current
   */
  async terminateAllSessions(userId: string, currentSessionId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let query = db
        .update(user_sessions)
        .set({
          is_active: false,
          expires_at: new Date(),
          updated_at: new Date()
        })
        .where(and(
          eq(user_sessions.user_id, userId),
          eq(user_sessions.is_active, true)
        ));

      if (currentSessionId) {
        query = query.where(ne(user_sessions.id, currentSessionId));
      }

      await query;
      return { success: true };
    } catch (error) {
      logger.error('Terminate all sessions error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to terminate sessions'
      };
    }
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db
        .update(user_sessions)
        .set({
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          last_activity: new Date(),
          updated_at: new Date()
        })
        .where(eq(user_sessions.id, sessionId));

      if (result.rowCount === 0) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Extend session error:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        component: 'Chanuka'
      });
      return {
        success: false,
        error: 'Failed to extend session'
      };
    }
  }

  /**
   * Create a new user session
   */
  async createUserSession(userId: string, deviceInfo: any, ipAddress?: string, userAgent?: string): Promise<string> {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');

      const [session] = await db
        .insert(user_sessions)
        .values({
          user_id: userId,
          session_token: sessionToken,
          device_info: deviceInfo,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })
        .returning({ id: user_sessions.id });

      return session.id;
    } catch (error) {
      logger.error('Create user session error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      throw error;
    }
  }

  // ============================================================================
  // SECURITY MONITORING METHODS
  // ============================================================================

  /**
   * Get security events for a user
   */
  async getSecurityEvents(userId: string, _limit: number = 50): Promise<any[]> {
    try {
      // This would query security events from a security_events table
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      logger.error('Get security events error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return [];
    }
  }

  /**
   * Get suspicious activity alerts
   */
  async getSuspiciousActivity(userId: string): Promise<any[]> {
    try {
      // This would analyze user activity patterns and return alerts
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      logger.error('Get suspicious activity error:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        component: 'Chanuka'
      });
      return [];
    }
  }
}

export const authService = new AuthService();






































