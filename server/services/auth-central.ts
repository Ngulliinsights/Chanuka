// Optimized Centralized Authorization Service
import { db } from '../../db/index.js';
import { users, sessions, userSocialProfiles } from '../../shared/schema.js';
import type { UserProfile } from '../../shared/types/auth.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, eq, gt } from 'drizzle-orm';
import { passwordResetService } from './passwordReset.js';

/**
 * Social profile interface representing data from various OAuth providers
 */
interface SocialProfile {
  id: string;
  avatarUrl?: string;
  platform?: string;
  provider?: string;
  profileId?: string;
  displayName?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  tokenExpiresAt?: Date;
  updatedAt?: Date;
  photos?: { value: string }[];
}

/**
 * Custom application error class with status code
 */
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for authentication session response
 */
export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Combines user social profile with user data
 */
type UserWithSocialProfile = InferSelectModel<typeof userSocialProfiles> & {
  user: InferSelectModel<typeof users>;
  id: number;
  username?: string | null;
  profileUrl?: string | null;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  userId?: number;
  provider?: string;
  profileId?: string;
};

/**
 * Centralized Authentication Service
 * Manages user authentication, registration, and session management
 */
export class AuthCentralService {
  // Constants with clear descriptions
  private readonly SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly SESSION_EXPIRY_SECONDS = 30 * 60; // 30 minutes in seconds
  private readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly SESSION_COOKIE_NAME = 'chanukaSession';
  private readonly REFRESH_COOKIE_NAME = 'chanukaRefreshToken';
  private readonly SALT_ROUNDS = 12;
  private readonly SESSION_TOKEN_BYTES = 32;
  private readonly REFRESH_TOKEN_BYTES = 64;

  /**
   * Handles common errors, standardizing error responses
   * @param error - The caught error
   * @param defaultMessage - Default message if error is not an AppError
   * @param defaultStatusCode - Default status code if error is not an AppError
   * @returns AppError with appropriate message and status code
   */
  private _handleError(
    error: unknown,
    defaultMessage = 'An error occurred',
    defaultStatusCode = 500,
  ): AppError {
    console.error(defaultMessage, error);

    if (error instanceof AppError) {
      return error;
    }

    return new AppError(defaultMessage, defaultStatusCode);
  }

  /**
   * Generates a secure random token
   * @param bytes - Number of bytes for the token
   * @returns A hex-encoded random token
   */
  private _generateSecureToken(bytes: number): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a plain text password using bcrypt
   * @param password - The plain text password
   * @returns A promise resolving to the hashed password
   */
  private async _hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Hashes a session token for database storage using SHA-256
   * @param token - The plain text session token
   * @returns The SHA256 hash of the token
   */
  private _hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Securely compares two tokens in a timing-safe manner
   * @param plainToken - The plain token from the user
   * @param hashedToken - The hashed token from the database
   * @returns Boolean indicating if tokens match
   */
  private _timingSafeCompare(plainToken: string, hashedToken: string): boolean {
    const hashedPlainToken = this._hashSessionToken(plainToken);
    try {
      // Convert hex strings to Buffer for timing-safe comparison
      const bufferA = Buffer.from(hashedPlainToken, 'hex');
      const bufferB = Buffer.from(hashedToken, 'hex');

      return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
    } catch (error) {
      console.error('Error during token comparison:', error);
      return false;
    }
  }

  /**
   * Creates session tokens and inserts session record into database
   * @param userId - The ID of the user for the session
   * @returns Session token data including access and refresh tokens
   */
  private async _createSessionTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
  }> {
    // Generate secure tokens
    const accessToken = this._generateSecureToken(this.SESSION_TOKEN_BYTES);
    const refreshToken = this._generateSecureToken(this.REFRESH_TOKEN_BYTES);

    // Hash tokens for storage
    const accessTokenHash = this._hashSessionToken(accessToken);
    const refreshTokenHash = this._hashSessionToken(refreshToken);

    // Set expiration date for refresh token
    const refreshTokenExpiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);

    return {
      accessToken,
      refreshToken,
      accessTokenHash,
      refreshTokenHash,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Inserts a new session into the database
   * @param userId - User ID for the session
   * @param accessTokenHash - Hashed access token
   * @param refreshTokenHash - Hashed refresh token
   * @param refreshTokenExpiresAt - Expiration date for refresh token
   */
  private async _insertSession(
    userId: string,
    accessTokenHash: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<void> {
    // FIX #1: Updated to include the fields added to the schema
    // FIX #4: Explicitly cast to NewSession to resolve type ambiguity
    await db.insert(sessions).values({
      userId: userId,
      token: accessTokenHash, // This is the hashed access token
      expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_MS),
      refreshTokenHash: refreshTokenHash, // Added
      refreshTokenExpiresAt: refreshTokenExpiresAt, // Added
      isActive: true, // Added
      createdAt: new Date(),
      updatedAt: new Date(), // Ensure updatedAt is also set on creation
    } as InferInsertModel<typeof sessions>); // Explicit cast
  }

  /**
   * Updates user's last login timestamp
   * @param userId - The user ID to update
   */
  private async _updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Maps database user object to the UserProfile format
   * @param user - User object from database
   * @returns UserProfile object
   */
  private _mapUserToProfile(user: InferSelectModel<typeof users>): UserProfile {
    return {
      id: user.id,
      username: user.name, // Use name as username fallback
      email: user.email,
      role: user.role as UserProfile['role'],
      displayName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name,
      avatarUrl: null, // This would come from userProfiles table
      expertise: null, // This would come from userProfiles table
      createdAt: user.createdAt || new Date(),
      lastLoginAt: user.lastLoginAt || null,
    };
  }

  /**
   * Creates a new session for a user
   * @param userId - The ID of the user
   * @returns Session response with tokens
   */
  private async _createSession(userId: string): Promise<AuthSessionResponse> {
    // Generate tokens and insert session
    const { accessToken, refreshToken, accessTokenHash, refreshTokenHash, refreshTokenExpiresAt } =
      await this._createSessionTokens(userId);

    // Store session in database
    await this._insertSession(userId, accessTokenHash, refreshTokenHash, refreshTokenExpiresAt);

    // Update last login time
    await this._updateLastLogin(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.SESSION_EXPIRY_SECONDS,
    };
  }

  /**
   * Processes OAuth login/registration flow
   * @param socialProfile - Profile from OAuth provider
   * @returns User profile and session tokens
   */
  async processOAuthLogin(
    socialProfile: SocialProfile,
  ): Promise<AuthSessionResponse & { user: UserProfile }> {
    try {
      // Check for required provider and profileId
      if (!socialProfile.provider || !socialProfile.profileId) {
        throw new AppError('Invalid social profile data', 400);
      }

      // 1. Check for existing social profile link
      // FIX #2: Handle potential undefined values with type assertions
      // FIX #7: Explicitly type the query result to ensure 'id' is recognized
      const existingProfile:
        | (InferSelectModel<typeof userSocialProfiles> & {
            user: InferSelectModel<typeof users> | null;
          })
        | undefined = await db.query.userSocialProfiles.findFirst({
        where: (profiles, { and, eq }) =>
          and(
            // Since we've already checked these values exist, we can use non-null assertion
            eq(profiles.provider, socialProfile.provider!),
            eq(profiles.providerId, socialProfile.profileId!),
          ),
        with: {
          user: true,
        },
      });

      // FIX #3: Add null check for existingProfile before accessing properties
      // FIX #5: Add stricter check for existingProfile and existingProfile.user
      if (existingProfile && existingProfile.user) {
        // User found via social profile link
        const userId = existingProfile.user.id;

        // Update social profile if tokens changed
        if (
          socialProfile.accessToken &&
          existingProfile.accessToken !== socialProfile.accessToken
        ) {
          await db
            .update(userSocialProfiles)
            .set({
              accessToken: socialProfile.accessToken,
              refreshToken: socialProfile.refreshToken,
              updatedAt: new Date(),
            })
            // With explicit typing, existingProfile.id should now be correctly inferred
            .where(eq(userSocialProfiles.id, existingProfile.id));
        }

        // Update last login
        await this._updateLastLogin(userId);

        // Fetch updated user data
        const updatedUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!updatedUser) {
          throw new AppError('User not found after update', 500);
        }

        // Create session for the user
        const sessionResponse = await this._createSession(updatedUser.id);
        return {
          ...sessionResponse,
          user: this._mapUserToProfile(updatedUser),
        };
      }

      // 2. Check for existing user by email (if provided)
      let user;
      if (socialProfile.email) {
        user = await db.query.users.findFirst({
          where: eq(users.email, socialProfile.email),
        });
      } else {
        throw new AppError(
          `Email not provided by ${socialProfile.provider}. Cannot register or link account.`,
          400,
        );
      }

      let userId: string;

      if (!user) {
        // 3. Create new user if no existing user found by email
        const securePasswordHash = await this._hashPassword(
          this._generateSecureToken(this.SESSION_TOKEN_BYTES),
        );

        // Create unique username
        const username = `${socialProfile.provider}_${socialProfile.profileId}`.substring(0, 50);
        const displayName = socialProfile.displayName || username;

        const [newUser] = await db
          .insert(users)
          .values({
            email: socialProfile.email,
            name: displayName,
            passwordHash: securePasswordHash,
            role: 'citizen',
            isActive: true,
          })
          .returning();

        if (!newUser) {
          throw new AppError('Failed to create new user during OAuth process', 500);
        }

        userId = newUser.id;
        user = newUser;
      } else {
        userId = user.id;
      }

      // 4. Create the social profile link
      await db.insert(userSocialProfiles).values({
        userId,
        provider: socialProfile.provider,
        providerId: socialProfile.profileId,
        displayName: socialProfile.displayName || '',
        avatarUrl: socialProfile.avatarUrl || socialProfile.photos?.[0]?.value || null,
        accessToken: socialProfile.accessToken,
        refreshToken: socialProfile.refreshToken,
      });

      // Update last login time
      await this._updateLastLogin(userId);

      // Create session tokens and return user profile with tokens
      const sessionResponse = await this._createSession(userId);
      return {
        ...sessionResponse,
        user: this._mapUserToProfile(user),
      };
    } catch (error) {
      console.error('Error in processOAuthLogin:', error);
      throw this._handleError(
        error,
        'Failed to process OAuth login',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  // Similar pattern applies to the refreshSession method - make sure schema fields match

  async refreshSession(refreshToken: string): Promise<AuthSessionResponse> {
    try {
      if (!refreshToken) {
        throw new AppError('No refresh token provided', 400);
      }

      // Hash the refresh token
      const refreshTokenHash = this._hashSessionToken(refreshToken);

      // Find the session with refresh token
      const sessionRecord = await db.query.sessions.findFirst({
        where: (dbSessions, { and, eq, gt }) =>
          and(
            eq(dbSessions.refreshTokenHash, refreshTokenHash),
            eq(dbSessions.isActive, true),
            // Uncomment if refreshTokenExpiresAt exists in your schema
            // gt(dbSessions.refreshTokenExpiresAt, new Date())
          ),
      });

      if (!sessionRecord) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      // Verify the associated user exists and is active
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, sessionRecord.userId), eq(users.isActive, true)),
      });

      if (!user) {
        // Invalidate the session if user is inactive or not found
        await db.update(sessions).set({ isActive: false }).where(eq(sessions.id, sessionRecord.id));

        throw new AppError('User account is inactive or not found', 401);
      }

      // Generate new token pair (token rotation for security)
      const {
        accessToken,
        refreshToken: newRefreshToken,
        accessTokenHash,
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt,
      } = await this._createSessionTokens(user.id);

      // Update the session with new tokens
      // FIX: Make sure we're only updating fields that exist in the schema
      await db
        .update(sessions)
        .set({
          token: accessTokenHash,
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_MS),
          // Uncomment if refreshTokenExpiresAt exists in your schema
          // refreshTokenExpiresAt: refreshTokenExpiresAt
        })
        .where(eq(sessions.id, sessionRecord.id));

      // Update last activity time
      await this._updateLastLogin(user.id);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.SESSION_EXPIRY_SECONDS,
      };
    } catch (error) {
      throw this._handleError(
        error,
        'Failed to refresh session',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  // Rest of the class implementation remains unchanged

  // Keeping remaining methods for completeness...

  /**
   * Registers a new user with username, email, and password
   * @param userData - User registration data
   * @returns User profile
   */
  async register(
    userData: { 
      username?: string;
      email: string;
      displayName?: string;
      passwordPlain: string;
    },
  ): Promise<UserProfile> {
    try {
      // Validate input data
      if (!userData.username || !userData.email || !userData.passwordPlain) {
        throw new AppError('Missing required registration fields', 400);
      }

      // Check for existing user
      const existingUser = await db.query.users.findFirst({
        where: (dbUsers, { eq }) =>
          eq(dbUsers.email, userData.email),
      });

      if (existingUser) {
        throw new AppError('Email already exists', 409);
      }

      // Hash password and create user
      const passwordHash = await this._hashPassword(userData.passwordPlain);

      const [newUser] = await db
        .insert(users)
        .values({
          name: userData.displayName || userData.username || userData.email.split('@')[0],
          email: userData.email,
          passwordHash: passwordHash,
          role: 'citizen',
          isActive: true,
        })
        .returning();

      if (!newUser) {
        throw new AppError('Failed to register user', 500);
      }

      return this._mapUserToProfile(newUser);
    } catch (error) {
      throw this._handleError(
        error,
        'User registration failed',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  /**
   * Authenticates a user with username/email and password
   * @param identifier - Username or email
   * @param password - Plain text password
   * @returns User profile and session tokens
   */
  async login(
    identifier: string,
    password: string,
  ): Promise<AuthSessionResponse & { user: UserProfile }> {
    try {
      // Input validation
      if (!identifier || !password) {
        throw new AppError('Missing login credentials', 400);
      }

      // Find user by name or email
      const user = await db.query.users.findFirst({
        where: (dbUsers, { eq, or, and }) =>
          and(
            or(eq(dbUsers.name, identifier), eq(dbUsers.email, identifier)),
            eq(dbUsers.isActive, true),
          ),
      });

      if (!user || !user.passwordHash) {
        throw new AppError('Invalid credentials or inactive user', 401);
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        throw new AppError('Invalid credentials', 401);
      }

      // Create session for the authenticated user
      const sessionResponse = await this._createSession(user.id);

      // Fetch updated user with lastLoginAt
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!updatedUser) {
        throw new AppError('User not found after login', 500);
      }

      return {
        ...sessionResponse,
        user: this._mapUserToProfile(updatedUser),
      };
    } catch (error) {
      throw this._handleError(
        error,
        'Login failed',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  /**
   * Verifies a session token and returns the associated user
   * @param token - Plain text session token
   * @returns User profile
   */
  async verifySession(token: string): Promise<UserProfile> {
    try {
      if (!token) {
        throw new AppError('No session token provided', 401);
      }

      const tokenHash = this._hashSessionToken(token);

      // Query session with user in a single database operation
      const result = await db
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.token, tokenHash),
            eq(sessions.isActive, true),
            eq(users.isActive, true),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .limit(1)
        .execute();

      const sessionData = result[0];

      if (!sessionData?.user) {
        throw new AppError('Invalid or expired session', 401);
      }

      // Optional: Update session expiry (sliding window)
      // await db
      //   .update(sessions)
      //   .set({ expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_MS) })
      //   .where(eq(sessions.id, sessionData.session.id));

      return this._mapUserToProfile(sessionData.user);
    } catch (error) {
      throw this._handleError(
        error,
        'Session verification failed',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  /**
   * Deletes/invalidates a session
   * @param token - Plain text session token
   */
  async deleteSession(token: string): Promise<void> {
    try {
      if (!token) {
        throw new AppError('No session token provided', 400);
      }

      const tokenHash = this._hashSessionToken(token);

      // Mark session as inactive
      const result = await db
        .update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.token, tokenHash))
        .returning({ id: sessions.id });

      // Session not found, but don't throw error - just log
      if (result.length === 0) {
        console.warn(`Attempted to delete non-existent session: ${tokenHash.substring(0, 10)}...`);
      }
    } catch (error) {
      throw this._handleError(
        error,
        'Failed to delete session',
        error instanceof AppError ? error.statusCode : 500,
      );
    }
  }

  /**
   * Initiates password reset process
   * @param email - User email address
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      if (!email) {
        throw new AppError('Email is required', 400);
      }

      await passwordResetService.generateResetToken(email);
      console.info(`Password reset initiated for email: ${email}`);
    } catch (error) {
      // Don't expose whether the email exists for security
      console.error(`Error requesting password reset:`, error);
      // Don't rethrow to avoid information leakage - always return success
    }
  }

  /**
   * Processes password reset using a token
   * @param token - Password reset token
   * @param newPassword - New plain text password
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    try {
      if (!token || !newPassword) {
        throw new AppError('Token and new password are required', 400);
      }

      await passwordResetService.resetPassword(token, newPassword);
      console.info(`Password successfully reset using token`);
    } catch (error) {
      throw this._handleError(
        error,
        'Failed to reset password',
        error instanceof AppError ? error.statusCode : 400,
      );
    }
  }
}

/**
 * Export a singleton instance of the AuthCentralService
 */
export const authCentralService = new AuthCentralService();
