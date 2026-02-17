/**
 * Authentication Service
 *
 * Handles all authentication-related functionality including:
 * - User login/logout
 * - Registration
 * - Token management
 * - Two-factor authentication
 * - Session management
 */

import { CacheService } from '@client/lib/services/cache';
import {
  ServiceErrorFactory,
  AuthenticationError,
  ValidationError,
  TokenExpiredError,
  TwoFactorRequiredError
} from '@client/lib/services/errors';
import { ServiceLifecycleInterface } from '@client/lib/services/factory';
import {
  AuthService as IAuthService,
  AuthCredentials,
  AuthSession,
  AuthTokens,
  AuthUser,
  RegisterData,
  UserPreferences,
  NotificationPreferences,
  PrivacySettings
} from '@client/lib/services/interfaces';
import { logger } from '@client/lib/utils/logger';

// ============================================================================
// AUTH SERVICE IMPLEMENTATION
// ============================================================================

export class AuthService implements IAuthService, ServiceLifecycleInterface {
  public readonly id = 'AuthService';
  public readonly config = {
    name: 'AuthService',
    version: '1.0.0',
    description: 'Handles user authentication and session management',
    dependencies: [],
    options: {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      refreshTokenThreshold: 0.8, // Refresh at 80% of token lifetime
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000 // 15 minutes
    }
  };

  public cache: CacheService;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private refreshTokenTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new CacheService({
      name: 'auth',
      defaultTTL: 60 * 60 * 1000, // 1 hour
      storageBackend: 'hybrid',
      compression: true,
      metrics: true
    });
  }

  async init(config?: unknown): Promise<void> {
    // CacheService doesn't have init method, just use it directly
    await this.cache.warmCache();

    // Restore session if exists
    await this.restoreSession();

    logger.info('AuthService initialized');
  }

  async dispose(): Promise<void> {
    await this.clearSession();
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
    await this.cache.clear();
    logger.info('AuthService disposed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if cache is available
      const cacheStats = await this.cache.getStatistics();
      return cacheStats.storageInfo.available;
    } catch (error) {
      logger.error('AuthService health check failed', { error });
      return false;
    }
  }

  getInfo() {
    return {
      ...this.config,
      activeSessions: this.getActiveSessionCount(),
      cacheSize: this.cache.getMetrics().size
    };
  }

  async getStatistics(): Promise<Record<string, unknown>> {
    return {
      activeSessions: this.getActiveSessionCount(),
      cacheMetrics: this.cache.getMetrics(),
      sessionTimeout: this.config.options?.sessionTimeout,
      maxLoginAttempts: this.config.options?.maxLoginAttempts
    };
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      this.validateCredentials(credentials);

      // Check for account lockout
      const lockoutKey = `lockout_${credentials.email}`;
      const lockoutData = await this.cache.get<{ attempts: number; lockedUntil: number }>(lockoutKey);

      if (lockoutData && Date.now() < lockoutData.lockedUntil) {
        throw new AuthenticationError(
          `Account temporarily locked. Try again in ${Math.ceil((lockoutData.lockedUntil - Date.now()) / 60000)} minutes.`,
          'login',
          { email: credentials.email, lockoutUntil: new Date(lockoutData.lockedUntil) }
        );
      }

      // Simulate API call to authentication service
      const session = await this.authenticateWithServer(credentials);

      // Store session
      await this.storeSession(session);

      // Schedule session timeout
      this.scheduleSessionTimeout(session.expiresAt);

      // Schedule token refresh
      this.scheduleTokenRefresh(session.tokens.expiresIn);

      logger.info('User logged in successfully', {
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.sessionId
      });

      return session;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof TwoFactorRequiredError) {
        throw error;
      }

      // Increment login attempts on failure
      await this.incrementLoginAttempts(credentials.email);

      throw ServiceErrorFactory.createAuthError(
        'Login failed. Please check your credentials.',
        'login',
        { originalError: error, email: credentials.email }
      );
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      this.validateRegistrationData(data);

      // Check if email already exists
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw new ValidationError(
          'Email address is already registered',
          'AuthService',
          'register',
          'email',
          data.email
        );
      }

      // Create user account
      const user = await this.createUserAccount(data);

      // Create initial session
      const session = await this.createSession(user);

      // Store session
      await this.storeSession(session);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email
      });

      return session;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Registration failed. Please try again.',
        'register',
        { originalError: error, email: data.email }
      );
    }
  }

  async logout(): Promise<void> {
    try {
      const session = await this.getCurrentSession();
      if (session) {
        await this.clearSession();

        logger.info('User logged out successfully', {
          userId: session.user.id,
          sessionId: session.sessionId
        });
      }
    } catch (error) {
      logger.warn('Logout failed (session may have already expired)', { error });
    }
  }

  async getCurrentUser(forceRefresh = false): Promise<AuthUser> {
    try {
      if (!forceRefresh) {
        const cachedUser = await this.cache.get<AuthUser>('currentUser');
        if (cachedUser) {
          return cachedUser;
        }
      }

      const session = await this.getCurrentSession();
      if (!session) {
        throw new AuthenticationError('No active session found', 'getCurrentUser');
      }

      // Refresh user data from server
      const user = await this.refreshUserData(session.user.id);

      // Cache user data
      await this.cache.set('currentUser', user, 5 * 60 * 1000); // 5 minutes

      return user;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Failed to get current user',
        'getCurrentUser',
        { originalError: error }
      );
    }
  }

  async refreshTokens(): Promise<AuthTokens> {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        throw new TokenExpiredError('No active session to refresh', 'refreshTokens');
      }

      // Simulate token refresh
      const newTokens = await this.refreshTokensWithServer(session.tokens.refreshToken);

      // Update session with new tokens
      session.tokens = newTokens;
      await this.storeSession(session);

      // Reschedule token refresh
      this.scheduleTokenRefresh(newTokens.expiresIn);

      logger.info('Tokens refreshed successfully', { sessionId: session.sessionId });

      return newTokens;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await this.clearSession();
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Failed to refresh tokens',
        'refreshTokens',
        { originalError: error }
      );
    }
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  async enableTwoFactor(): Promise<{ qrCode: string; secret: string }> {
    try {
      const user = await this.getCurrentUser();

      // Generate 2FA secret
      const { qrCode, secret } = await this.generateTwoFactorSecret(user.id);

      // Store pending 2FA setup
      await this.cache.set(`2fa_setup_${user.id}`, { secret, qrCode }, 10 * 60 * 1000); // 10 minutes

      return { qrCode, secret };
    } catch (error) {
      throw ServiceErrorFactory.createAuthError(
        'Failed to enable two-factor authentication',
        'enableTwoFactor',
        { originalError: error }
      );
    }
  }

  async verifyTwoFactorSetup(token: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const setupData = await this.cache.get<{ secret: string; qrCode: string }>(`2fa_setup_${user.id}`);

      if (!setupData) {
        throw new ValidationError('No pending 2FA setup found', 'AuthService', 'verifyTwoFactorSetup');
      }

      // Verify token
      const isValid = await this.verifyTwoFactorToken(setupData.secret, token);
      if (!isValid) {
        throw new ValidationError('Invalid 2FA token', 'AuthService', 'verifyTwoFactorSetup');
      }

      // Enable 2FA for user
      await this.enableUserTwoFactor(user.id, setupData.secret);

      // Clear setup data
      await this.cache.delete(`2fa_setup_${user.id}`);

      logger.info('Two-factor authentication enabled successfully', { userId: user.id });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Failed to verify two-factor authentication setup',
        'verifyTwoFactorSetup',
        { originalError: error }
      );
    }
  }

  async disableTwoFactor(password: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      // Verify password
      const isValidPassword = await this.verifyPassword(user.id, password);
      if (!isValidPassword) {
        throw new ValidationError('Invalid password', 'AuthService', 'disableTwoFactor');
      }

      // Disable 2FA
      await this.disableUserTwoFactor(user.id);

      logger.info('Two-factor authentication disabled successfully', { userId: user.id });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Failed to disable two-factor authentication',
        'disableTwoFactor',
        { originalError: error }
      );
    }
  }

  async validateTwoFactorToken(token: string): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        return false;
      }

      // Verify 2FA token
      return await this.verifyTwoFactorToken(session.user.id, token);
    } catch (error) {
      logger.warn('2FA token validation failed', { error });
      return false;
    }
  }

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  async requestPasswordReset(email: string): Promise<void> {
    try {
      this.validateEmail(email);

      const user = await this.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return;
      }

      // Generate reset token
      const resetToken = await this.generatePasswordResetToken(user.id);

      // Send reset email (simulated)
      await this.sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset requested', { email });
    } catch (error) {
      throw ServiceErrorFactory.createAuthError(
        'Failed to request password reset',
        'requestPasswordReset',
        { originalError: error, email }
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      this.validatePassword(newPassword);

      // Verify reset token
      const userId = await this.verifyPasswordResetToken(token);
      if (!userId) {
        throw new ValidationError('Invalid or expired reset token', 'AuthService', 'resetPassword');
      }

      // Update password
      await this.updateUserPassword(userId, newPassword);

      // Invalidate all sessions for security
      await this.invalidateUserSessions(userId);

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw ServiceErrorFactory.createAuthError(
        'Failed to reset password',
        'resetPassword',
        { originalError: error }
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private validateCredentials(credentials: AuthCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new ValidationError(
        'Email and password are required',
        'AuthService',
        'login',
        undefined,
        undefined,
        { email: credentials.email }
      );
    }

    this.validateEmail(credentials.email);
    this.validatePassword(credentials.password);
  }

  private validateRegistrationData(data: RegisterData): void {
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required', 'AuthService', 'register', 'name', data.name);
    }

    if (data.password !== data.confirmPassword) {
      throw new ValidationError('Passwords do not match', 'AuthService', 'register', 'confirmPassword', undefined);
    }

    if (!data.acceptTerms) {
      throw new ValidationError('You must accept the terms and conditions', 'AuthService', 'register', 'acceptTerms', false);
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'AuthService', 'validateEmail', 'email', email);
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long', 'AuthService', 'validatePassword', 'password', undefined);
    }
  }

  private async authenticateWithServer(credentials: AuthCredentials): Promise<AuthSession> {
    // Simulate API call - in real implementation, this would call the backend
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock authentication logic
        if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
          const user: AuthUser = {
            id: 'user_123',
            email: credentials.email,
            name: 'Test User',
            role: 'citizen',
            verified: true,
            twoFactorEnabled: false,
            preferences: {
              theme: 'light',
              language: 'en',
              timezone: 'UTC',
              email_frequency: 'immediate',
              notification_preferences: {
                email: true,
                push: true,
                sms: false,
                frequency: 'immediate',
                quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
              },
              privacy_settings: {
                profile_visibility: 'public',
                activity_visibility: 'public',
                data_sharing: true,
                analytics_tracking: true,
                marketing_emails: false
              },
              dashboard_layout: 'compact',
              default_bill_view: 'grid',
              auto_save_drafts: true,
              show_onboarding_tips: true
            },
            permissions: ['read:bills', 'comment:bills', 'save:bills'],
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          const session: AuthSession = {
            user,
            tokens: {
              accessToken: 'mock_access_token',
              refreshToken: 'mock_refresh_token',
              expiresIn: 3600,
              tokenType: 'Bearer'
            },
            sessionId: `session_${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          };

          resolve(session);
        } else if (credentials.twoFactorToken) {
          // Mock 2FA flow
          const user: AuthUser = {
            id: 'user_123',
            email: credentials.email,
            name: 'Test User',
            role: 'citizen',
            verified: true,
            twoFactorEnabled: true,
            preferences: {
              theme: 'light',
              language: 'en',
              timezone: 'UTC',
              email_frequency: 'immediate',
              notification_preferences: {
                email: true,
                push: true,
                sms: false,
                frequency: 'immediate',
                quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
              },
              privacy_settings: {
                profile_visibility: 'public',
                activity_visibility: 'public',
                data_sharing: true,
                analytics_tracking: true,
                marketing_emails: false
              },
              dashboard_layout: 'compact',
              default_bill_view: 'grid',
              auto_save_drafts: true,
              show_onboarding_tips: true
            },
            permissions: ['read:bills', 'comment:bills', 'save:bills'],
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          const session: AuthSession = {
            user,
            tokens: {
              accessToken: 'mock_access_token',
              refreshToken: 'mock_refresh_token',
              expiresIn: 3600,
              tokenType: 'Bearer'
            },
            sessionId: `session_${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          };

          resolve(session);
        } else {
          reject(new AuthenticationError('Invalid credentials', 'login', { email: credentials.email }));
        }
      }, 1000);
    });
  }

  private async createUserAccount(data: RegisterData): Promise<AuthUser> {
    // Simulate user creation
    return {
      id: `user_${Date.now()}`,
      email: data.email,
      name: data.name,
      role: 'citizen',
      verified: false,
      twoFactorEnabled: false,
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        email_frequency: 'immediate',
        notification_preferences: {
          email: true,
          push: true,
          sms: false,
          frequency: 'immediate',
          quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
        },
        privacy_settings: {
          profile_visibility: 'public',
          activity_visibility: 'public',
          data_sharing: true,
          analytics_tracking: true,
          marketing_emails: false
        },
        dashboard_layout: 'compact',
        default_bill_view: 'grid',
        auto_save_drafts: true,
        show_onboarding_tips: true
      },
      permissions: ['read:bills', 'comment:bills', 'save:bills'],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    return {
      user,
      tokens: {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      },
      sessionId: `session_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
  }

  private async storeSession(session: AuthSession): Promise<void> {
    await this.cache.set('currentSession', session, session.tokens.expiresIn * 1000);
    await this.cache.set('currentUser', session.user, 5 * 60 * 1000); // 5 minutes
  }

  private async getCurrentSession(): Promise<AuthSession | null> {
    return this.cache.get<AuthSession>('currentSession');
  }

  private async clearSession(): Promise<void> {
    await this.cache.delete('currentSession');
    await this.cache.delete('currentUser');
  }

  private async refreshUserData(userId: string): Promise<AuthUser> {
    // Simulate fetching updated user data
    return {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verified: true,
      twoFactorEnabled: false,
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        email_frequency: 'immediate',
        notification_preferences: {
          email: true,
          push: true,
          sms: false,
          frequency: 'immediate',
          quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
        },
        privacy_settings: {
          profile_visibility: 'public',
          activity_visibility: 'public',
          data_sharing: true,
          analytics_tracking: true,
          marketing_emails: false
        },
        dashboard_layout: 'compact',
        default_bill_view: 'grid',
        auto_save_drafts: true,
        show_onboarding_tips: true
      },
      permissions: ['read:bills', 'comment:bills', 'save:bills'],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  private async refreshTokensWithServer(refreshToken: string): Promise<AuthTokens> {
    // Simulate token refresh
    return {
      accessToken: 'new_mock_access_token',
      refreshToken: 'new_mock_refresh_token',
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
  }

  private scheduleSessionTimeout(expiresAt: string): void {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeout = expiryTime - now;

    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, Math.max(0, timeout));
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    const refreshTime = expiresIn * 1000 * 0.8; // Refresh at 80%

    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    this.refreshTokenTimeout = setTimeout(async () => {
      try {
        await this.refreshTokens();
      } catch (error) {
        logger.warn('Token refresh failed', { error });
      }
    }, refreshTime);
  }

  private async handleSessionTimeout(): Promise<void> {
    logger.warn('Session timed out');
    await this.clearSession();
  }

  private async incrementLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts_${email}`;
    const attempts = await this.cache.get<{ count: number; lastAttempt: number }>(key);

    const now = Date.now();
    const maxAttempts = this.config.options?.maxLoginAttempts as number || 5;
    const lockoutDuration = this.config.options?.lockoutDuration as number || 15 * 60 * 1000;

    if (attempts) {
      if (now - attempts.lastAttempt < 15 * 60 * 1000) { // Reset attempts after 15 minutes
        attempts.count++;
        attempts.lastAttempt = now;

        if (attempts.count >= maxAttempts) {
          // Lock account
          await this.cache.set(`lockout_${email}`, {
            attempts: attempts.count,
            lockedUntil: now + lockoutDuration
          }, lockoutDuration / 1000);
        }
      } else {
        // Reset attempts after 15 minutes
        attempts.count = 1;
        attempts.lastAttempt = now;
      }
    } else {
      const newAttempts = { count: 1, lastAttempt: now };
      await this.cache.set(key, newAttempts, 15 * 60);
    }

    await this.cache.set(key, attempts, 15 * 60); // Store for 15 minutes
  }

  private async restoreSession(): Promise<void> {
    const session = await this.getCurrentSession();
    if (session) {
      this.scheduleSessionTimeout(session.expiresAt);
      this.scheduleTokenRefresh(session.tokens.expiresIn);
    }
  }

  private getActiveSessionCount(): number {
    // In a real implementation, this would count active sessions
    return 1;
  }

  // Mock implementations for 2FA and password reset
  private async generateTwoFactorSecret(userId: string): Promise<{ qrCode: string; secret: string }> {
    return {
      qrCode: 'mock_qr_code_url',
      secret: 'mock_secret'
    };
  }

  private async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    // Mock 2FA verification
    return token === '123456';
  }

  private async enableUserTwoFactor(userId: string, secret: string): Promise<void> {
    // Mock 2FA enablement
  }

  private async disableUserTwoFactor(userId: string): Promise<void> {
    // Mock 2FA disablement
  }

  private async verifyPassword(userId: string, password: string): Promise<boolean> {
    // Mock password verification
    return password === 'password123';
  }

  private async generatePasswordResetToken(userId: string): Promise<string> {
    return `reset_token_${Date.now()}`;
  }

  private async verifyPasswordResetToken(token: string): Promise<string | null> {
    // Mock token verification
    return token.startsWith('reset_token_') ? 'user_123' : null;
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Mock email sending
    logger.info('Password reset email sent', { email });
  }

  private async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    // Mock password update
  }

  private async invalidateUserSessions(userId: string): Promise<void> {
    // Mock session invalidation
  }

  private async getUserByEmail(email: string): Promise<AuthUser | null> {
    // Mock user lookup
    if (email === 'test@example.com') {
      return {
        id: 'user_123',
        email,
        name: 'Test User',
        role: 'citizen',
        verified: true,
        twoFactorEnabled: false,
        preferences: {} as UserPreferences,
        permissions: [],
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    }
    return null;
  }

  // ============================================================================
  // PUBLIC METHODS FOR EXTERNAL USE
  // ============================================================================

  async verifyEmail(token: string): Promise<void> {
    // Mock email verification
    logger.info('Email verified', { token });
  }
}

// Export singleton instance
export const authService = new AuthService();
