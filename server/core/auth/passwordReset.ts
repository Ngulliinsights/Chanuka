// services/passwordReset.ts
import { database as db } from '../../../shared/database/connection.js';
// Import specific tables and functions needed from the consolidated schema
import { users, passwordResets } from '../../../shared/schema.js';
import { ValidationError } from '../../shared/types/errors.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { InferSelectModel } from 'drizzle-orm';
import { and, eq, gt } from 'drizzle-orm';
import { config } from '../config/index.js';
import { emailService } from './email.js';

// Reset token expiration time in minutes
const TOKEN_EXPIRY_MINUTES = 60;

interface PasswordResetEntry {
  id: number;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
type UserEntry = InferSelectModel<typeof users>;

// Define a type for the joined result based on your actual schema structure
interface JoinedResetResult {
  password_resets: {
    id: number;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  } | null;
  users: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // ...other user fields
  } | null;
}

/**
 * Helper function to ensure a value is a number
 * Converts strings to numbers and keeps numbers as they are
 */
function ensureNumber(value: string | number): number {
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
}

class PasswordResetService {
  /**
   * Generate a password reset token for a user
   * @param email - User's email address
   * @returns void
   * @throws Error if user not found
   */
  async generateResetToken(email: string): Promise<void> {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: (usersTable, { eq }) => eq(usersTable.email, email),
      columns: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // If user not found or inactive, silently return to prevent email enumeration
    if (!user || !user.isActive) {
      console.warn(`Password reset requested for non-existent or inactive user: ${email}`);
      return;
    }

    // Generate secure token and hash it
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in database
    const expiryDate = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await db.transaction(async tx => {
      // Use upsert logic: try to insert, on conflict (userId), update token and expiry
      await tx
        .insert(passwordResets)
        .values({
          userId: user.id,
          tokenHash: tokenHash,
          expiresAt: expiryDate,
        })
        .onConflictDoUpdate({
          target: passwordResets.userId,
          set: {
            tokenHash: tokenHash,
            expiresAt: expiryDate,
            updatedAt: new Date(),
          },
        });
    });

    // Send email with the reset token
    const resetUrl = `http://localhost:${config.port}/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail({
      to: user.email,
      username: user.name || user.email,
      resetUrl,
      expiryMinutes: TOKEN_EXPIRY_MINUTES,
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
    const results = (await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), gt(passwordResets.expiresAt, now)))
      .limit(1)
      .leftJoin(users, eq(passwordResets.userId, users.id))) as JoinedResetResult[];

    const result = results[0]; // Get the first result if it exists

    if (!result || !result.users || !result.password_resets) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const resetEntry = result.password_resets;
    const userEntry = result.users;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Use a transaction to update password and delete token
    await db.transaction(async tx => {
      // Update user's password
      await tx
        .update(users)
        .set({
          passwordHash: hashedPassword,
          updatedAt: now,
        })
        .where(eq(users.id, userEntry.id));

      // Delete the password reset token
      // Re-applying ensureNumber as TypeScript seems to incorrectly infer the type despite the interface definition
      // FIX #6: Remove ensureNumber as resetEntry.id should already be number
      await tx.delete(passwordResets).where(eq(passwordResets.id, resetEntry.id));
    });

    // Send password change confirmation email
    await emailService.sendPasswordChangeConfirmation({
      to: userEntry.email,
      username: userEntry.name,
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

    // Find token in database, ensuring it's not expired
    const resetEntries = await db
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), gt(passwordResets.expiresAt, now)))
      .limit(1);

    return resetEntries.length > 0;
  }
}

export const passwordResetService = new PasswordResetService();
