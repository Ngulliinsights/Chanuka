// services/passwordReset.ts
import { database as db } from '@shared/database';
// Import specific tables and functions needed from the consolidated schema
import { users } from '@shared/schema';
import { ValidationError } from '@shared/core/observability/error-management/errors/specialized-errors.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { sendTemplatedEmail } from '@server/infrastructure/notifications/email-service.js';

// Reset token expiration time in minutes
const TOKEN_EXPIRY_MINUTES = 60;

// Using users table directly, no need for separate interfaces

class PasswordResetService {
  /**
   * Generate a password reset token for a user
   * @param email - User's email address
   * @returns void
   * @throws Error if user not found
   */
  async generateResetToken(email: string): Promise<void> {
    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((rows: any) => rows[0] || null);

    // If user not found or inactive, silently return to prevent email enumeration
    if (!user || !user.is_active) {
      console.warn(`Password reset requested for non-existent or inactive user: ${email}`);
      return;
    }

    // Generate secure token and hash it
    const reset_token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(reset_token).digest('hex');

    // Store hashed token in users table
    const expiryDate = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({
          password_reset_token: tokenHash,
          password_reset_expires_at: expiryDate,
          updated_at: new Date()
        })
        .where(eq(users.id, user.id));
    });

    // Send email with the reset token
    const resetUrl = `http://localhost:${config.server.port}/reset-password?token=${reset_token}`;

    await sendTemplatedEmail('password-reset', user.email, {
      userName: user.name || user.email,
      resetUrl,
    });
  }

  /**
   * Reset password with token
   * @param token - Reset token
   * @param newPassword - New password
   * @returns void
   * @throws Error if token is invalid or expired
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the provided token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    // Find token in database and associated user, ensuring it's not expired
    const userResults = await db
      .select()
      .from(users)
      .where(and(
        eq(users.password_reset_token, tokenHash), 
        gt(users.password_reset_expires_at, now)
      ))
      .limit(1);

    if (userResults.length === 0) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const userEntry = userResults[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Use a transaction to update password and clear reset token
    await db.transaction(async (tx: any) => {
      // Update user's password and clear reset token
      await tx
        .update(users)
        .set({
          password_hash: hashedPassword,
          password_reset_token: null,
          password_reset_expires_at: null,
          updated_at: now,
        })
        .where(eq(users.id, userEntry.id));
    });

    // Send password change confirmation email
    await sendTemplatedEmail('welcome', userEntry.email, {
      userName: userEntry.name,
      loginUrl: `http://localhost:${config.server.port}/login`,
    });
  }

  /**
   * Validate if a token is valid without resetting the password
   * @param token - Reset token
   * @returns true if token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    // Hash the provided token for comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    // Find token in users table, ensuring it's not expired
    const userEntries = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.password_reset_token, tokenHash), 
        gt(users.password_reset_expires_at, now)
      ))
      .limit(1);

    return userEntries.length > 0;
  }
}

export const passwordResetService = new PasswordResetService();







































