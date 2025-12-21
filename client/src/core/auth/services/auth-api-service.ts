/**
 * Consolidated Authentication API Service
 * 
 * Unified implementation that consolidates:
 * - AuthApiService from core/api/auth.ts
 * - authService from services/auth-service-init.ts
 * - All authentication-related API operations
 */

import { logger } from '@client/utils/logger';
 
import type { UnifiedApiClient } from '../../api/types';
import { createError } from '../../error';
import { ErrorDomain, ErrorSeverity } from '../../error/constants';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthSession,
  AuthTokens,
  TwoFactorSetup,
  PasswordResetRequest,
  PasswordReset,
  SessionInfo,
  SecurityEvent,
  SuspiciousActivityAlert,
  PrivacySettings,
  DataExportRequest,
  DataDeletionRequest,
} from '../types';

/**
 * Centralized service for all authentication-related API operations.
 * Provides consistent error handling, logging, and type safety across
 * the authentication layer.
 */
export class AuthApiService {
  private readonly authEndpoint: string;
  private readonly apiClient: UnifiedApiClient;

  constructor(apiClient: UnifiedApiClient, baseUrl: string = '/api') {
    this.apiClient = apiClient;
    this.authEndpoint = `${baseUrl}/auth`;
  }

  // ==========================================================================
  // Core Authentication Methods
  // ==========================================================================

  /**
   * Authenticate user with email and password credentials.
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await this.apiClient.post<AuthSession>(
        `${this.authEndpoint}/login`,
        credentials,
        { skipCache: true }
      );

      logger.info('User login successful', {
        email: credentials.email,
        rememberMe: credentials.rememberMe,
        hasTwoFactor: !!credentials.twoFactorToken
      });

      return response.data;
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw await this.handleAuthError(error, 'Login failed');
    }
  }

  /**
   * Register a new user account with validation and terms acceptance.
   */
  async register(data: RegisterData): Promise<AuthSession> {
    try {
      // Validate password confirmation matches before sending to server
      if (data.password !== data.confirmPassword) {
        throw createError(
          ErrorDomain.VALIDATION,
          ErrorSeverity.MEDIUM,
          'Passwords do not match',
          { context: { field: 'confirmPassword' } }
        );
      }

      if (!data.acceptTerms) {
        throw createError(
          ErrorDomain.VALIDATION,
          ErrorSeverity.MEDIUM,
          'Terms and conditions must be accepted',
          { context: { field: 'acceptTerms' } }
        );
      }

      const response = await this.apiClient.post<AuthSession>(
        `${this.authEndpoint}/register`,
        data,
        { skipCache: true }
      );

      logger.info('User registration successful', {
        email: data.email,
        name: data.name
      });

      return response.data;
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error });
      throw await this.handleAuthError(error, 'Registration failed');
    }
  }

  /**
   * Logout the current user and invalidate all active tokens.
   */
  async logout(): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/logout`,
        {},
        { skipCache: true }
      );

      logger.info('User logout successful');
    } catch (error) {
      // Log but don't throw - allow local cleanup to proceed even if server call fails
      logger.warn('Logout API call failed, continuing with local cleanup', { error });
    }
  }

  /**
   * Retrieve the currently authenticated user's profile information.
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.apiClient.get<User>(`${this.authEndpoint}/me`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch current user', { error });
      throw await this.handleAuthError(error, 'Failed to fetch user data');
    }
  }

  /**
   * Update the current user's profile with partial updates.
   */
  async updateUserProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await this.apiClient.patch<User>(
        `${this.authEndpoint}/profile`,
        updates,
        { skipCache: true }
      );

      logger.info('Profile updated successfully', {
        updatedFields: Object.keys(updates)
      });

      return response.data;
    } catch (error) {
      logger.error('Profile update failed', { updates, error });
      throw await this.handleAuthError(error, 'Failed to update profile');
    }
  }

  /**
   * Refresh expired or expiring authentication tokens.
   */
  async refreshTokens(): Promise<AuthTokens> {
    try {
      const response = await this.apiClient.post<AuthTokens>(
        `${this.authEndpoint}/refresh`,
        {},
        { skipCache: true }
      );

      logger.info('Tokens refreshed successfully');
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw await this.handleAuthError(error, 'Failed to refresh authentication tokens');
    }
  }

  /**
   * Validate stored authentication tokens.
   */
  async validateStoredTokens(): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{ valid: boolean }>(
        `${this.authEndpoint}/validate-tokens`,
        {},
        { skipCache: true }
      );

      return response.data?.valid ?? false;
    } catch (error) {
      logger.warn('Token validation failed', { error });
      return false;
    }
  }

  // ==========================================================================
  // Two-Factor Authentication Methods
  // ==========================================================================

  /**
   * Initialize two-factor authentication setup for the current user.
   */
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      const response = await this.apiClient.post<TwoFactorSetup>(
        `${this.authEndpoint}/2fa/setup`,
        {},
        { skipCache: true }
      );

      logger.info('2FA setup initiated successfully');
      return response.data;
    } catch (error) {
      logger.error('2FA setup failed', { error });
      throw await this.handleAuthError(error, 'Failed to setup two-factor authentication');
    }
  }

  /**
   * Enable two-factor authentication after verifying user has configured their app.
   */
  async enableTwoFactor(token: string): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>(
        `${this.authEndpoint}/2fa/enable`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA enabled successfully');
      return response.data;
    } catch (error) {
      logger.error('2FA enable failed', { error });
      throw await this.handleAuthError(error, 'Failed to enable two-factor authentication');
    }
  }

  /**
   * Disable two-factor authentication for the current user.
   */
  async disableTwoFactor(token: string): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/2fa/disable`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA disabled successfully');
    } catch (error) {
      logger.error('2FA disable failed', { error });
      throw await this.handleAuthError(error, 'Failed to disable two-factor authentication');
    }
  }

  /**
   * Verify two-factor token during login process.
   */
  async verifyTwoFactor(token: string): Promise<AuthSession> {
    try {
      const response = await this.apiClient.post<AuthSession>(
        `${this.authEndpoint}/2fa/verify`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA verification successful');
      return response.data;
    } catch (error) {
      logger.error('2FA verification failed', { error });
      throw await this.handleAuthError(error, 'Two-factor authentication failed');
    }
  }

  // ==========================================================================
  // Password Management Methods
  // ==========================================================================

  /**
   * Verify user email address with verification token.
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/verify-email`,
        { token },
        { skipCache: true }
      );

      logger.info('Email verification successful');
    } catch (error) {
      logger.error('Email verification failed', { error });
      throw await this.handleAuthError(error, 'Email verification failed');
    }
  }

  /**
   * Change the current user's password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/password/change`,
        { currentPassword, newPassword },
        { skipCache: true }
      );

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Password change failed', { error });
      throw await this.handleAuthError(error, 'Failed to change password');
    }
  }

  /**
   * Request a password reset email for a user account.
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/password/reset-request`,
        request,
        { skipCache: true }
      );

      logger.info('Password reset requested', { email: request.email });
    } catch (error) {
      // Don't expose whether email exists - log but show success to user
      logger.warn('Password reset request encountered error', { error });
    }
  }

  /**
   * Complete password reset using token from reset email.
   */
  async resetPassword(reset: PasswordReset): Promise<void> {
    try {
      if (reset.password !== reset.confirmPassword) {
        throw createError(
          ErrorDomain.VALIDATION,
          ErrorSeverity.MEDIUM,
          'Passwords do not match',
          { context: { field: 'confirmPassword' } }
        );
      }

      await this.apiClient.post(
        `${this.authEndpoint}/password/reset`,
        reset,
        { skipCache: true }
      );

      logger.info('Password reset completed successfully');
    } catch (error) {
      logger.error('Password reset failed', { error });
      throw await this.handleAuthError(error, 'Failed to reset password');
    }
  }

  // ==========================================================================
  // Session Management Methods
  // ==========================================================================

  /**
   * Extend the current session expiration time.
   */
  async extendSession(): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/session/extend`,
        {},
        { skipCache: true }
      );

      logger.debug('Session extended successfully');
    } catch (error) {
      logger.error('Session extension failed', { error });
      throw await this.handleAuthError(error, 'Failed to extend session');
    }
  }

  /**
   * Retrieve all active sessions for the current user across devices.
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await this.apiClient.get<SessionInfo[]>(
        `${this.authEndpoint}/sessions`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch active sessions', { error });
      throw await this.handleAuthError(error, 'Failed to retrieve active sessions');
    }
  }

  /**
   * Terminate a specific session by ID.
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      await this.apiClient.delete(
        `${this.authEndpoint}/sessions/${sessionId}`,
        { skipCache: true }
      );

      logger.info('Session revoked successfully', { sessionId });
    } catch (error) {
      logger.error('Session revocation failed', { sessionId, error });
      throw await this.handleAuthError(error, 'Failed to revoke session');
    }
  }

  /**
   * Terminate all sessions except the current one.
   */
  async terminateAllOtherSessions(): Promise<void> {
    try {
      await this.apiClient.delete(
        `${this.authEndpoint}/sessions/others`,
        { skipCache: true }
      );

      logger.info('All other sessions revoked successfully');
    } catch (error) {
      logger.error('Failed to revoke other sessions', { error });
      throw await this.handleAuthError(error, 'Failed to revoke other sessions');
    }
  }

  // ==========================================================================
  // OAuth Authentication Methods
  // ==========================================================================

  /**
   * Process OAuth login after user authorization.
   */
  async loginWithOAuth(code: string, state?: string): Promise<AuthSession> {
    try {
      const response = await this.apiClient.post<AuthSession>(
        `${this.authEndpoint}/oauth/callback`,
        { code, state },
        { skipCache: true }
      );

      logger.info('OAuth login processed successfully');
      return response.data;
    } catch (error) {
      logger.error('OAuth login failed', { error });
      throw await this.handleAuthError(error, 'OAuth authentication failed');
    }
  }

  /**
   * Get OAuth authorization URL.
   */
  getOAuthUrl(provider: string, state?: string): string {
    // This would typically be constructed based on provider configuration
    const params = new URLSearchParams({
      provider,
      ...(state && { state })
    });
    
    return `${this.authEndpoint}/oauth/authorize?${params.toString()}`;
  }

  // ==========================================================================
  // Privacy and Security Methods
  // ==========================================================================

  /**
   * Update the current user's privacy settings.
   */
  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.authEndpoint}/privacy-settings`,
        settings,
        { skipCache: true }
      );

      logger.info('Privacy settings updated successfully');
    } catch (error) {
      logger.error('Privacy settings update failed', { error });
      throw await this.handleAuthError(error, 'Failed to update privacy settings');
    }
  }

  /**
   * Request data export for the current user.
   */
  async requestDataExport(format: 'json' | 'csv' | 'xml' = 'json', includes: string[] = []): Promise<DataExportRequest> {
    try {
      const response = await this.apiClient.post<DataExportRequest>(
        `${this.authEndpoint}/data-export`,
        { format, includes },
        { skipCache: true }
      );

      logger.info('Data export requested successfully');
      return response.data;
    } catch (error) {
      logger.error('Data export request failed', { error });
      throw await this.handleAuthError(error, 'Failed to request data export');
    }
  }

  /**
   * Request data deletion for the current user.
   */
  async requestDataDeletion(retentionPeriod: string = '30days', includes: string[] = []): Promise<DataDeletionRequest> {
    try {
      const response = await this.apiClient.post<DataDeletionRequest>(
        `${this.authEndpoint}/data-deletion`,
        { retentionPeriod, includes },
        { skipCache: true }
      );

      logger.info('Data deletion requested successfully');
      return response.data;
    } catch (error) {
      logger.error('Data deletion request failed', { error });
      throw await this.handleAuthError(error, 'Failed to request data deletion');
    }
  }

  /**
   * Retrieve recent security events for the current user.
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const response = await this.apiClient.get<SecurityEvent[]>(
        `${this.authEndpoint}/security-events?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch security events', { limit, error });
      throw await this.handleAuthError(error, 'Failed to retrieve security events');
    }
  }

  /**
   * Retrieve any suspicious activity alerts for the current user.
   */
  async getSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    try {
      const response = await this.apiClient.get<SuspiciousActivityAlert[]>(
        `${this.authEndpoint}/suspicious-activity`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch suspicious activity', { error });
      throw await this.handleAuthError(error, 'Failed to retrieve suspicious activity');
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Standardized error handling for authentication operations
   */
  private async handleAuthError(error: unknown, defaultMessage: string): Promise<Error> {
    if (error instanceof Error) {
      return createError(
        ErrorDomain.AUTHENTICATION,
        ErrorSeverity.HIGH,
        error.message,
        { details: { originalError: error } }
      );
    }

    return createError(
      ErrorDomain.AUTHENTICATION,
      ErrorSeverity.HIGH,
      defaultMessage,
      { details: { originalError: error } }
    );
  }
}

// ==========================================================================
// Factory and Instance Creation
// ==========================================================================

/**
 * Creates a new AuthApiService instance with the provided API client
 */
export function createAuthApiService(apiClient: UnifiedApiClient, baseUrl?: string): AuthApiService {
  return new AuthApiService(apiClient, baseUrl);
}

/**
 * Default auth service instance (will be initialized by the auth module)
 */
let _authApiService: AuthApiService | null = null;

export function getAuthApiService(): AuthApiService {
  if (!_authApiService) {
    throw new Error('AuthApiService not initialized. Call initializeAuth() first.');
  }
  return _authApiService;
}

export function setAuthApiService(service: AuthApiService): void {
  _authApiService = service;
}

// Export the getter as the default service
export const authApiService = {
  get instance() {
    return getAuthApiService();
  }
};