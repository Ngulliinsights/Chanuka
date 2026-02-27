// ============================================================================
// USER DOMAIN SERVICE
// ============================================================================
// Implements business logic for users using repositories through dependency injection.
// NO direct database access - all data access through repositories.

import type { UserRepository } from '../repositories/user.repository';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import type { User, InsertUser, UserRole, UserProfile, InsertUserProfile } from '../repositories/user.repository';
import * as crypto from 'crypto';

/**
 * User registration data
 */
export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  county: string;
  constituency?: string;
  phoneNumber?: string;
}

/**
 * User authentication result
 */
export interface AuthenticationResult {
  user: User;
  token: string;
}

/**
 * User domain service implementing business logic.
 * 
 * DESIGN PRINCIPLES:
 * - Consumes repositories through dependency injection
 * - Implements business logic (validation, authentication, authorization)
 * - NO direct database access
 * - Returns Result<T, Error> for explicit error handling
 * 
 * @example Basic Usage
 * ```typescript
 * const service = new UserDomainService(userRepository);
 * 
 * // Register user
 * const result = await service.registerUser({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   name: 'John Doe',
 *   county: 'Nairobi'
 * });
 * ```
 */
export class UserDomainService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Register new user with validation
   * 
   * Business Rules:
   * - Email must be unique
   * - Email must be valid format
   * - Password must be at least 8 characters
   * - Name must be at least 3 characters
   * - County is required
   * 
   * @param data - User registration data
   * @returns Result containing created user
   */
  async registerUser(data: RegisterUserData): Promise<Result<User, Error>> {
    try {
      // Validate email format
      if (!this.isValidEmail(data.email)) {
        return Err(new Error('Invalid email format'));
      }

      // Validate password length
      if (data.password.length < 8) {
        return Err(new Error('Password must be at least 8 characters'));
      }

      // Validate name length
      if (data.name.length < 3) {
        return Err(new Error('Name must be at least 3 characters'));
      }

      // Check if email already exists
      const existingUserResult = await this.userRepository.findByEmail(data.email);
      if (!existingUserResult.isOk) {
        return Err(existingUserResult.error);
      }
      if (existingUserResult.value !== null) {
        return Err(new Error('Email already registered'));
      }

      // Hash password (in production, use bcrypt)
      const passwordHash = this.hashPassword(data.password);

      // Generate verification token
      const verificationToken = this.generateToken();
      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const userData: InsertUser = {
        email: data.email,
        password_hash: passwordHash,
        name: data.name,
        county: data.county,
        constituency: data.constituency,
        phone_number: data.phoneNumber,
        role: 'citizen',
        is_active: true,
        is_verified: false,
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      return await this.userRepository.create(userData);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Verify user email with token
   * 
   * Business Rules:
   * - Token must be valid
   * - Token must not be expired
   * - User must not already be verified
   * 
   * @param token - Verification token
   * @returns Result containing verified user
   */
  async verifyEmail(token: string): Promise<Result<User, Error>> {
    try {
      // Find user by verification token
      const userResult = await this.userRepository.findByVerificationToken(token);
      if (!userResult.isOk) {
        return Err(userResult.error);
      }
      if (userResult.value === null) {
        return Err(new Error('Invalid verification token'));
      }

      const user = userResult.value;

      // Check if already verified
      if (user.is_verified) {
        return Err(new Error('Email already verified'));
      }

      // Check if token expired
      if (user.verification_expires_at && new Date() > user.verification_expires_at) {
        return Err(new Error('Verification token expired'));
      }

      // Update user as verified
      return await this.userRepository.update(user.email, {
        is_verified: true,
        verification_token: null,
        verification_expires_at: null,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Request password reset
   * 
   * Business Rules:
   * - User must exist
   * - User must be active
   * - Generates reset token valid for 1 hour
   * 
   * @param email - User email
   * @returns Result containing reset token
   */
  async requestPasswordReset(email: string): Promise<Result<string, Error>> {
    try {
      // Find user
      const userResult = await this.userRepository.findByEmail(email);
      if (!userResult.isOk) {
        return Err(userResult.error);
      }
      if (userResult.value === null) {
        return Err(new Error('User not found'));
      }

      const user = userResult.value;

      // Check if user is active
      if (!user.is_active) {
        return Err(new Error('User account is not active'));
      }

      // Generate reset token
      const resetToken = this.generateToken();
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      const updateResult = await this.userRepository.updateAuthTokens(email, {
        password_reset_token: resetToken,
        password_reset_expires_at: resetExpiresAt,
      });

      if (!updateResult.isOk) {
        return Err(updateResult.error);
      }

      return Ok(resetToken);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Reset password with token
   * 
   * Business Rules:
   * - Token must be valid
   * - Token must not be expired
   * - New password must be at least 8 characters
   * 
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Result containing updated user
   */
  async resetPassword(token: string, newPassword: string): Promise<Result<User, Error>> {
    try {
      // Validate new password
      if (newPassword.length < 8) {
        return Err(new Error('Password must be at least 8 characters'));
      }

      // Find user by reset token
      const userResult = await this.userRepository.findByPasswordResetToken(token);
      if (!userResult.isOk) {
        return Err(userResult.error);
      }
      if (userResult.value === null) {
        return Err(new Error('Invalid reset token'));
      }

      const user = userResult.value;

      // Check if token expired
      if (user.password_reset_expires_at && new Date() > user.password_reset_expires_at) {
        return Err(new Error('Reset token expired'));
      }

      // Hash new password
      const passwordHash = this.hashPassword(newPassword);

      // Update password and clear reset token
      return await this.userRepository.update(user.email, {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update user profile
   * 
   * @param userId - User ID
   * @param profile - Profile data
   * @returns Result containing updated profile
   */
  async updateUserProfile(
    userId: string,
    profile: Partial<InsertUserProfile>
  ): Promise<Result<UserProfile, Error>> {
    return await this.userRepository.updateProfile(userId, profile);
  }

  /**
   * Enable two-factor authentication
   * 
   * Business Rules:
   * - User must exist
   * - Generates secret and backup codes
   * 
   * @param email - User email
   * @returns Result containing 2FA secret and backup codes
   */
  async enableTwoFactor(email: string): Promise<Result<{
    secret: string;
    backupCodes: string[];
  }, Error>> {
    try {
      // Find user
      const userResult = await this.userRepository.findByEmail(email);
      if (!userResult.isOk) {
        return Err(userResult.error);
      }
      if (userResult.value === null) {
        return Err(new Error('User not found'));
      }

      // Generate 2FA secret
      const secret = this.generateToken();

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => this.generateToken().substring(0, 8));

      // Update user security settings
      const updateResult = await this.userRepository.updateSecuritySettings(email, {
        two_factor_enabled: true,
        two_factor_secret: secret,
        backup_codes: backupCodes,
      });

      if (!updateResult.isOk) {
        return Err(updateResult.error);
      }

      return Ok({ secret, backupCodes });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get users by county
   * 
   * @param county - County name
   * @param limit - Maximum number of users
   * @returns Result containing users
   */
  async getUsersByCounty(county: string, limit: number = 50): Promise<Result<User[], Error>> {
    return await this.userRepository.findByCounty(county, { limit });
  }

  /**
   * Get user statistics
   * 
   * @returns Result containing user statistics
   */
  async getUserStatistics(): Promise<Result<{
    total: number;
    active: number;
    verified: number;
    byRole: Record<UserRole, number>;
  }, Error>> {
    try {
      // Get total count
      const totalResult = await this.userRepository.count();
      if (!totalResult.isOk) {
        return Err(totalResult.error);
      }

      // Get active count
      const activeResult = await this.userRepository.count({ isActive: true });
      if (!activeResult.isOk) {
        return Err(activeResult.error);
      }

      // Get verified count
      const verifiedResult = await this.userRepository.count({ isVerified: true });
      if (!verifiedResult.isOk) {
        return Err(verifiedResult.error);
      }

      // Get counts by role
      const roles: UserRole[] = ['citizen', 'representative', 'admin', 'moderator'];
      const roleCounts: Record<UserRole, number> = {} as any;

      for (const role of roles) {
        const countResult = await this.userRepository.count({ role });
        if (!countResult.isOk) {
          return Err(countResult.error);
        }
        roleCounts[role] = countResult.value;
      }

      return Ok({
        total: totalResult.value,
        active: activeResult.value,
        verified: verifiedResult.value,
        byRole: roleCounts,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate email format
   * 
   * @param email - Email to validate
   * @returns True if valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash password (simplified - use bcrypt in production)
   * 
   * @param password - Password to hash
   * @returns Hashed password
   */
  private hashPassword(password: string): string {
    // In production, use bcrypt
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Generate random token
   * 
   * @returns Random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
