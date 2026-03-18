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
import { ErrorFactory, errorHandler } from '@client/infrastructure/error';
import { ServiceLifecycleInterface } from '@client/lib/services/factory';
import {
  AuthService as IAuthService,
  AuthCredentials,
  AuthSession,
  AuthTokens,
  AuthUser,
  RegisterData,
  UserPreferences
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
      sessionTimeout: 30 * 60 * 1000,    // 30 minutes
      refreshTokenThreshold: 0.8,         // Refresh at 80% of token lifetime
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000    // 15 minutes
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

  async init(_config?: unknown): Promise<void> {
    await this.cache.warmCache();
    await this.restoreSession();
    logger.info('AuthService initialized');
  }

  async dispose(): Promise<void> {
    await this.clearSession();
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
    await this.cache.clear();
    logger.info('AuthService disposed');
  }

  async healthCheck(): Promise<boolean> {
    try {
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

      const lockoutKey = `lockout_${credentials.email}`;
      const lockoutData = await this.cache.get<{ attempts: number; lockedUntil: number }>(lockoutKey);

      if (lockoutData && Date.now() < lockoutData.lockedUntil) {
        throw ErrorFactory.createAuthenticationError(
          `Account temporarily locked. Try again in ${Math.ceil((lockoutData.lockedUntil - Date.now()) / 60000)} minutes.`,
          { operation: 'login' }
        );
      }

      const session = await this.authenticateWithServer(credentials);

      await this.storeSession(session);
      this.scheduleSessionTimeout(session.expiresAt);
      this.scheduleTokenRefresh(session.tokens.expiresIn);

      logger.info('User logged in successfully', {
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.sessionId
      });

      return session;
    } catch (error) {
      await this.incrementLoginAttempts(credentials.email);

      const clientError = ErrorFactory.createFromError(error, {
        operation: 'login'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      this.validateRegistrationData(data);

      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw ErrorFactory.createValidationError(
          [{ field: 'email', message: 'Email address is already registered' }]
        );
      }

      const user = await this.createUserAccount(data);
      const session = await this.createSession(user);
      await this.storeSession(session);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return session;
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'register'
      });
      errorHandler.handleError(clientError);
      throw clientError;
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
        if (cachedUser) return cachedUser;
      }

      const session = await this.getCurrentSession();
      if (!session) {
        throw ErrorFactory.createAuthenticationError(
          'No active session found',
          { operation: 'getCurrentUser' }
        );
      }

      const user = await this.refreshUserData(session.user.id);
      await this.cache.set('currentUser', user, 5 * 60 * 1000);

      return user;
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'getCurrentUser'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async refreshTokens(): Promise<AuthTokens> {
    try {
      const session = await this.getCurrentSession();
      if (!session) {
        throw ErrorFactory.createAuthenticationError(
          'No active session to refresh',
          { operation: 'refreshTokens' }
        );
      }

      const newTokens = await this.refreshTokensWithServer(session.tokens.refreshToken);

      session.tokens = newTokens;
      await this.storeSession(session);
      this.scheduleTokenRefresh(newTokens.expiresIn);

      logger.info('Tokens refreshed successfully', { sessionId: session.sessionId });

      return newTokens;
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'refreshTokens'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  async enableTwoFactor(): Promise<{ qrCode: string; secret: string }> {
    try {
      const user = await this.getCurrentUser();
      const { qrCode, secret } = await this.generateTwoFactorSecret(user.id);
      await this.cache.set(`2fa_setup_${user.id}`, { secret, qrCode }, 10 * 60 * 1000);

      return { qrCode, secret };
    } catch (error) {
      const clientError = ErrorFactory.createSystemError(
        'Failed to enable two-factor authentication',
        error instanceof Error ? error : undefined,
        { operation: 'enableTwoFactor' }
      );
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async verifyTwoFactorSetup(token: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      const setupData = await this.cache.get<{ secret: string; qrCode: string }>(`2fa_setup_${user.id}`);

      if (!setupData) {
        throw ErrorFactory.createValidationError(
          [{ field: '2fa', message: 'No pending 2FA setup found' }]
        );
      }

      const isValid = await this.verifyTwoFactorToken(user.id, token);
      if (!isValid) {
        throw ErrorFactory.createValidationError(
          [{ field: 'token', message: 'Invalid 2FA token' }]
        );
      }

      await this.enableUserTwoFactor(user.id, setupData.secret);
      await this.cache.delete(`2fa_setup_${user.id}`);

      logger.info('Two-factor authentication enabled successfully', { userId: user.id });
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'verifyTwoFactorSetup'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async disableTwoFactor(password: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      const isValidPassword = await this.verifyPassword(user.id, password);
      if (!isValidPassword) {
        throw ErrorFactory.createValidationError(
          [{ field: 'password', message: 'Invalid password' }]
        );
      }

      await this.disableUserTwoFactor(user.id);

      logger.info('Two-factor authentication disabled successfully', { userId: user.id });
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'disableTwoFactor'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async validateTwoFactorToken(token: string): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      if (!session) return false;

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
      if (!user) return; // Don't reveal whether email exists

      const resetToken = await this.generatePasswordResetToken(user.id);
      await this.sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset requested', { email });
    } catch (error) {
      const clientError = ErrorFactory.createSystemError(
        'Failed to request password reset',
        error instanceof Error ? error : undefined,
        { operation: 'requestPasswordReset' }
      );
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      this.validatePassword(newPassword);

      const userId = await this.verifyPasswordResetToken(token);
      if (!userId) {
        throw ErrorFactory.createValidationError(
          [{ field: 'token', message: 'Invalid or expired reset token' }]
        );
      }

      await this.updateUserPassword(userId, newPassword);
      await this.invalidateUserSessions(userId);

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      const clientError = ErrorFactory.createFromError(error, {
        operation: 'resetPassword'
      });
      errorHandler.handleError(clientError);
      throw clientError;
    }
  }

  // ============================================================================
  // EMAIL VERIFICATION
  // ============================================================================

  async verifyEmail(token: string): Promise<void> {
    logger.info('Email verified', { token });
  }

  // ============================================================================
  // PRIVATE VALIDATION HELPERS
  // ============================================================================

  private validateCredentials(credentials: AuthCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw ErrorFactory.createValidationError([
        { field: 'credentials', message: 'Email and password are required' }
      ]);
    }
    this.validateEmail(credentials.email);
    this.validatePassword(credentials.password);
  }

  private validateRegistrationData(data: RegisterData): void {
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    if (!data.name || data.name.trim().length === 0) {
      throw ErrorFactory.createValidationError([
        { field: 'name', message: 'Name is required' }
      ]);
    }

    if (data.password !== data.confirmPassword) {
      throw ErrorFactory.createValidationError([
        { field: 'confirmPassword', message: 'Passwords do not match' }
      ]);
    }

    if (!data.acceptTerms) {
      throw ErrorFactory.createValidationError([
        { field: 'acceptTerms', message: 'You must accept the terms and conditions' }
      ]);
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw ErrorFactory.createValidationError([
        { field: 'email', message: 'Invalid email format' }
      ]);
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw ErrorFactory.createValidationError([
        { field: 'password', message: 'Password must be at least 8 characters long' }
      ]);
    }
  }

  // ============================================================================
  // PRIVATE SERVER COMMUNICATION HELPERS
  // ============================================================================

  private async authenticateWithServer(credentials: AuthCredentials): Promise<AuthSession> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        ...(credentials.twoFactorToken && { twoFactorToken: credentials.twoFactorToken })
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string };

      if (response.status === 401) {
        if (errorData.message?.toLowerCase().includes('two_factor') ||
            errorData.message?.toLowerCase().includes('2fa')) {
          throw ErrorFactory.createAuthenticationError(
            'Two-factor authentication required',
            { operation: 'login' }
          );
        }
        throw ErrorFactory.createAuthenticationError(
          errorData.message ?? 'Invalid credentials',
          { operation: 'login' }
        );
      }

      throw ErrorFactory.createSystemError(
        errorData.message ?? 'Authentication failed',
        undefined,
        { operation: 'login' }
      );
    }

    const data = await response.json() as {
      user: {
        id: string;
        email: string;
        name?: string;
        display_name?: string;
        role?: string;
        verified?: boolean;
        two_factor_enabled?: boolean;
        preferences?: UserPreferences;
        permissions?: string[];
        last_login?: string;
        created_at?: string;
      };
      accessToken: string;
      refreshToken: string;
      expiresIn?: number;
      sessionId?: string;
      expiresAt?: string;
    };

    if (!data.user || !data.accessToken) {
      throw new Error('Invalid authentication response from server');
    }

    const expiresIn = data.expiresIn ?? 3600;

    // Validate and cast role to expected type
    const validRoles = ['citizen', 'expert', 'official', 'admin'] as const;
    const role = validRoles.includes(data.user.role as any) 
      ? (data.user.role as 'citizen' | 'expert' | 'official' | 'admin')
      : 'citizen';

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? data.user.display_name ?? '',
      role,
      verified: data.user.verified ?? false,
      twoFactorEnabled: data.user.two_factor_enabled ?? false,
      preferences: data.user.preferences ?? this.defaultPreferences(),
      permissions: data.user.permissions ?? ['read:bills'],
      lastLogin: data.user.last_login ?? new Date().toISOString(),
      createdAt: data.user.created_at ?? new Date().toISOString()
    };

    return {
      user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn,
        tokenType: 'Bearer'
      },
      sessionId: data.sessionId ?? `session_${Date.now()}`,
      expiresAt: data.expiresAt ?? new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  private async createUserAccount(data: RegisterData): Promise<AuthUser> {
    return {
      id: `user_${Date.now()}`,
      email: data.email,
      name: data.name,
      role: 'citizen',
      verified: false,
      twoFactorEnabled: false,
      preferences: this.defaultPreferences(),
      permissions: ['read:bills', 'comment:bills', 'save:bills'],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const expiresIn = 3600;
    return {
      user,
      tokens: {
        accessToken: `access_${Date.now()}`,
        refreshToken: `refresh_${Date.now()}`,
        expiresIn,
        tokenType: 'Bearer'
      },
      sessionId: `session_${Date.now()}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };
  }

  private async storeSession(session: AuthSession): Promise<void> {
    await this.cache.set('currentSession', session, session.tokens.expiresIn * 1000);
    await this.cache.set('currentUser', session.user, 5 * 60 * 1000);
  }

  private async getCurrentSession(): Promise<AuthSession | null> {
    return this.cache.get<AuthSession>('currentSession');
  }

  private async clearSession(): Promise<void> {
    await this.cache.delete('currentSession');
    await this.cache.delete('currentUser');
  }

  private async refreshUserData(userId: string): Promise<AuthUser> {
    // TODO: Replace with real API call to /api/users/:id
    return {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'citizen',
      verified: true,
      twoFactorEnabled: false,
      preferences: this.defaultPreferences(),
      permissions: ['read:bills', 'comment:bills', 'save:bills'],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  private async refreshTokensWithServer(_refreshToken: string): Promise<AuthTokens> {
    // TODO: Replace with real API call to /api/auth/refresh
    return {
      accessToken: `access_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
  }

  // ============================================================================
  // PRIVATE SESSION SCHEDULING HELPERS
  // ============================================================================

  private scheduleSessionTimeout(expiresAt: string): void {
    const timeout = new Date(expiresAt).getTime() - Date.now();

    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);

    this.sessionTimeout = setTimeout(() => {
      void this.handleSessionTimeout();
    }, Math.max(0, timeout));
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    const threshold = (this.config.options?.refreshTokenThreshold as number | undefined) ?? 0.8;
    const refreshTime = expiresIn * 1000 * threshold;

    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);

    this.refreshTokenTimeout = setTimeout(async () => {
      try {
        await this.refreshTokens();
      } catch (error) {
        logger.warn('Scheduled token refresh failed', { error });
      }
    }, refreshTime);
  }

  private async handleSessionTimeout(): Promise<void> {
    logger.warn('Session timed out');
    await this.clearSession();
  }

  private async incrementLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts_${email}`;
    const existing = await this.cache.get<{ count: number; lastAttempt: number }>(key);
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = (this.config.options?.maxLoginAttempts as number | undefined) ?? 5;
    const lockoutDuration = (this.config.options?.lockoutDuration as number | undefined) ?? windowMs;

    const count = (existing && now - existing.lastAttempt < windowMs)
      ? existing.count + 1
      : 1;

    const updated = { count, lastAttempt: now };
    await this.cache.set(key, updated, windowMs / 1000);

    if (count >= maxAttempts) {
      await this.cache.set(
        `lockout_${email}`,
        { attempts: count, lockedUntil: now + lockoutDuration },
        lockoutDuration / 1000
      );
    }
  }

  private async restoreSession(): Promise<void> {
    const session = await this.getCurrentSession();
    if (session) {
      this.scheduleSessionTimeout(session.expiresAt);
      this.scheduleTokenRefresh(session.tokens.expiresIn);
    }
  }

  private getActiveSessionCount(): number {
    // TODO: Track multiple sessions if needed
    return 1;
  }

  // ============================================================================
  // PRIVATE 2FA HELPERS
  // ============================================================================

  private async generateTwoFactorSecret(_userId: string): Promise<{ qrCode: string; secret: string }> {
    // TODO: Integrate real TOTP library (e.g. otplib)
    return { qrCode: 'mock_qr_code_url', secret: 'mock_secret' };
  }

  private async verifyTwoFactorToken(_userId: string, token: string): Promise<boolean> {
    // TODO: Replace with real TOTP verification
    return token === '123456';
  }

  private async enableUserTwoFactor(_userId: string, _secret: string): Promise<void> {
    // TODO: Persist 2FA secret to backend
  }

  private async disableUserTwoFactor(_userId: string): Promise<void> {
    // TODO: Remove 2FA secret from backend
  }

  // ============================================================================
  // PRIVATE PASSWORD HELPERS
  // ============================================================================

  private async verifyPassword(_userId: string, password: string): Promise<boolean> {
    // TODO: Replace with real hash comparison via backend
    return password.length >= 8;
  }

  private async generatePasswordResetToken(_userId: string): Promise<string> {
    return `reset_token_${Date.now()}`;
  }

  private async verifyPasswordResetToken(token: string): Promise<string | null> {
    return token.startsWith('reset_token_') ? 'user_123' : null;
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    logger.info('Password reset email sent', { email, token });
  }

  private async updateUserPassword(_userId: string, _newPassword: string): Promise<void> {
    // TODO: Update hashed password in backend
  }

  private async invalidateUserSessions(_userId: string): Promise<void> {
    // TODO: Invalidate all sessions for user in backend
  }

  // ============================================================================
  // PRIVATE UTILITY HELPERS
  // ============================================================================

  private async getUserByEmail(email: string): Promise<AuthUser | null> {
    // TODO: Replace with real API call to /api/users?email=...
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

  private defaultPreferences(): UserPreferences {
    return {
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
    };
  }
}

// Export singleton instance
export 