/**
 * Authentication API Service
 * Core API communication layer for authentication functionality
 * Provides type-safe, consistent interface for all auth operations
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// ============================================================================
// Core Authentication Types
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'expert' | 'official' | 'admin';
  verified: boolean;
  twoFactorEnabled: boolean;
  avatar_url?: string;
  preferences: UserPreferences;
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface UserPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  expiresAt: string;
  requiresTwoFactor?: boolean;
}

// ============================================================================
// Response & Request Types
// ============================================================================

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

// ============================================================================
// OAuth & Security Types
// ============================================================================

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

// ============================================================================
// Session & Permission Types
// ============================================================================

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: number;
}

export interface PermissionCheckContext {
  user_id: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

// ============================================================================
// Security & Monitoring Types
// ============================================================================

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'permission_change' | 'suspicious_activity';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SuspiciousActivityAlert {
  id: string;
  type: string;
  description: string;
  detectedAt: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface SecurityIncidentReport {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// ============================================================================
// Authentication API Service Class
// ============================================================================

/**
 * Centralized service for all authentication-related API operations.
 * Provides consistent error handling, logging, and type safety across
 * the authentication layer.
 */
export class AuthApiService {
  private readonly baseUrl: string;
  private readonly authEndpoint: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.authEndpoint = `${baseUrl}/auth`;
  }

  // ==========================================================================
  // Core Authentication Methods
  // ==========================================================================

  /**
   * Authenticate user with email and password credentials.
   * Supports optional remember-me functionality and two-factor authentication.
   * 
   * @param credentials - User login credentials including optional 2FA token
   * @returns Authentication session with user data and tokens
   * @throws Error if authentication fails or credentials are invalid
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await globalApiClient.post<AuthSession>(
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
      throw this.handleAuthError(error, 'Login failed');
    }
  }

  /**
   * Register a new user account with validation and terms acceptance.
   * 
   * @param data - Registration data including credentials and user info
   * @returns New authentication session for the registered user
   * @throws Error if registration fails or validation errors occur
   */
  async register(data: RegisterData): Promise<AuthSession> {
    try {
      // Validate password confirmation matches before sending to server
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!data.acceptTerms) {
        throw new Error('Terms and conditions must be accepted');
      }

      const response = await globalApiClient.post<AuthSession>(
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
      throw this.handleAuthError(error, 'Registration failed');
    }
  }

  /**
   * Logout the current user and invalidate all active tokens.
   * Gracefully handles logout failures to ensure local cleanup occurs.
   */
  async logout(): Promise<void> {
    try {
      await globalApiClient.post(
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
   * 
   * @returns Current user data with preferences and permissions
   * @throws Error if user is not authenticated or request fails
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await globalApiClient.get<AuthUser>(`${this.authEndpoint}/me`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch current user', { error });
      throw this.handleAuthError(error, 'Failed to fetch user data');
    }
  }

  /**
   * Update the current user's profile with partial updates.
   * Only provided fields will be updated.
   * 
   * @param updates - Partial user data to update
   * @returns Updated user profile
   * @throws Error if update fails or validation errors occur
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await globalApiClient.patch<AuthUser>(
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
      throw this.handleAuthError(error, 'Failed to update profile');
    }
  }

  /**
   * Refresh expired or expiring authentication tokens.
   * Uses the refresh token to obtain new access and refresh tokens.
   * 
   * @returns New token set with updated expiration
   * @throws Error if refresh token is invalid or expired
   */
  async refreshTokens(): Promise<AuthTokens> {
    try {
      const response = await globalApiClient.post<AuthTokens>(
        `${this.authEndpoint}/refresh`,
        {},
        { skipCache: true }
      );

      logger.info('Tokens refreshed successfully');
      return response.data;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw this.handleAuthError(error, 'Failed to refresh authentication tokens');
    }
  }

  // ==========================================================================
  // OAuth Authentication Methods
  // ==========================================================================

  /**
   * Process OAuth callback after user authorization.
   * Exchanges authorization code for authentication session.
   * 
   * @param providerId - OAuth provider identifier (e.g., 'google', 'github')
   * @param code - Authorization code from OAuth provider
   * @param state - CSRF protection state parameter
   * @returns Authentication session from OAuth login
   * @throws Error if OAuth exchange fails or state is invalid
   */
  async handleOAuthCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<AuthSession> {
    try {
      const response = await globalApiClient.post<AuthSession>(
        `${this.authEndpoint}/oauth/callback`,
        { provider: providerId, code, state },
        { skipCache: true }
      );

      logger.info('OAuth callback processed successfully', { provider: providerId });
      return response.data;
    } catch (error) {
      logger.error('OAuth callback failed', { provider: providerId, error });
      throw this.handleAuthError(error, `OAuth authentication with ${providerId} failed`);
    }
  }

  // ==========================================================================
  // Two-Factor Authentication Methods
  // ==========================================================================

  /**
   * Initialize two-factor authentication setup for the current user.
   * Generates QR code and backup codes for authenticator app configuration.
   * 
   * @returns Setup data including secret, QR code, and backup codes
   * @throws Error if 2FA is already enabled or setup fails
   */
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      const response = await globalApiClient.post<TwoFactorSetup>(
        `${this.authEndpoint}/2fa/setup`,
        {},
        { skipCache: true }
      );

      logger.info('2FA setup initiated successfully');
      return response.data;
    } catch (error) {
      logger.error('2FA setup failed', { error });
      throw this.handleAuthError(error, 'Failed to setup two-factor authentication');
    }
  }

  /**
   * Enable two-factor authentication after verifying user has configured their app.
   * 
   * @param token - Verification token from authenticator app
   * @returns Confirmation of 2FA activation
   * @throws Error if token is invalid or 2FA cannot be enabled
   */
  async enableTwoFactor(token: string): Promise<AuthResponse> {
    try {
      const response = await globalApiClient.post<AuthResponse>(
        `${this.authEndpoint}/2fa/enable`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA enabled successfully');
      return response.data;
    } catch (error) {
      logger.error('2FA enable failed', { error });
      throw this.handleAuthError(error, 'Failed to enable two-factor authentication');
    }
  }

  /**
   * Disable two-factor authentication for the current user.
   * Requires current 2FA token for security verification.
   * 
   * @param token - Current 2FA token for verification
   * @throws Error if token is invalid or 2FA cannot be disabled
   */
  async disableTwoFactor(token: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.authEndpoint}/2fa/disable`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA disabled successfully');
    } catch (error) {
      logger.error('2FA disable failed', { error });
      throw this.handleAuthError(error, 'Failed to disable two-factor authentication');
    }
  }

  /**
   * Verify two-factor token during login process.
   * 
   * @param token - 6-digit token from authenticator app
   * @returns Complete authentication session after 2FA verification
   * @throws Error if token is invalid or verification fails
   */
  async verifyTwoFactor(token: string): Promise<AuthSession> {
    try {
      const response = await globalApiClient.post<AuthSession>(
        `${this.authEndpoint}/2fa/verify`,
        { token },
        { skipCache: true }
      );

      logger.info('2FA verification successful');
      return response.data;
    } catch (error) {
      logger.error('2FA verification failed', { error });
      throw this.handleAuthError(error, 'Two-factor authentication failed');
    }
  }

  // ==========================================================================
  // Password Management Methods
  // ==========================================================================

  /**
   * Change the current user's password.
   * Requires current password for security verification.
   * 
   * @param currentPassword - User's current password
   * @param newPassword - New password to set
   * @throws Error if current password is incorrect or new password is invalid
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.authEndpoint}/password/change`,
        { currentPassword, newPassword },
        { skipCache: true }
      );

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Password change failed', { error });
      throw this.handleAuthError(error, 'Failed to change password');
    }
  }

  /**
   * Request a password reset email for a user account.
   * Safe to call with any email - does not reveal if account exists.
   * 
   * @param request - Email and optional redirect URL for reset flow
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      await globalApiClient.post(
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
   * 
   * @param reset - Reset token and new password
   * @throws Error if token is invalid, expired, or passwords don't match
   */
  async resetPassword(reset: PasswordReset): Promise<void> {
    try {
      if (reset.newPassword !== reset.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      await globalApiClient.post(
        `${this.authEndpoint}/password/reset`,
        reset,
        { skipCache: true }
      );

      logger.info('Password reset completed successfully');
    } catch (error) {
      logger.error('Password reset failed', { error });
      throw this.handleAuthError(error, 'Failed to reset password');
    }
  }

  // ==========================================================================
  // Session Management Methods
  // ==========================================================================

  /**
   * Extend the current session expiration time.
   * Useful for keeping users logged in during active usage.
   */
  async extendSession(): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.authEndpoint}/session/extend`,
        {},
        { skipCache: true }
      );

      logger.debug('Session extended successfully');
    } catch (error) {
      logger.error('Session extension failed', { error });
      throw this.handleAuthError(error, 'Failed to extend session');
    }
  }

  /**
   * Retrieve all active sessions for the current user across devices.
   * 
   * @returns List of active sessions with device and location info
   * @throws Error if unable to fetch sessions
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await globalApiClient.get<SessionInfo[]>(
        `${this.authEndpoint}/sessions`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch active sessions', { error });
      throw this.handleAuthError(error, 'Failed to retrieve active sessions');
    }
  }

  /**
   * Revoke a specific session by ID.
   * Useful for logging out specific devices.
   * 
   * @param sessionId - Unique identifier of the session to revoke
   * @throws Error if session cannot be revoked
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.authEndpoint}/sessions/${sessionId}`,
        { skipCache: true }
      );

      logger.info('Session revoked successfully', { sessionId });
    } catch (error) {
      logger.error('Session revocation failed', { sessionId, error });
      throw this.handleAuthError(error, 'Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions except the current one.
   * Security feature to log out all other devices.
   */
  async revokeAllOtherSessions(): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.authEndpoint}/sessions/others`,
        { skipCache: true }
      );

      logger.info('All other sessions revoked successfully');
    } catch (error) {
      logger.error('Failed to revoke other sessions', { error });
      throw this.handleAuthError(error, 'Failed to revoke other sessions');
    }
  }

  // ==========================================================================
  // Permission & Role Management Methods
  // ==========================================================================

  /**
   * Fetch all roles assigned to a specific user.
   * 
   * @param userId - User ID to query roles for
   * @returns Array of user roles with permissions
   * @throws Error if unable to fetch roles
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const response = await globalApiClient.get<UserRole[]>(
        `${this.baseUrl}/users/${userId}/roles`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user roles', { userId, error });
      throw this.handleAuthError(error, 'Failed to retrieve user roles');
    }
  }

  /**
   * Check if a user has permission to perform an action on a resource.
   * Supports context-based permission checks with custom conditions.
   * 
   * @param context - Permission check context with user, resource, action
   * @returns Boolean indicating if permission is granted
   */
  async checkPermission(context: PermissionCheckContext): Promise<boolean> {
    try {
      const response = await globalApiClient.post<PermissionCheckResult>(
        `${this.authEndpoint}/check-permission`,
        context,
        { skipCache: true }
      );

      return response.data?.granted ?? false;
    } catch (error) {
      logger.error('Permission check failed', { context, error });
      // Default to denying permission on error for security
      return false;
    }
  }

  /**
   * Get all permissions a user has for a specific resource.
   * 
   * @param userId - User ID to check permissions for
   * @param resource - Resource identifier to check
   * @returns Array of permission strings (e.g., ['read', 'write'])
   */
  async getResourcePermissions(userId: string, resource: string): Promise<string[]> {
    try {
      const response = await globalApiClient.get<{ permissions: string[] }>(
        `${this.baseUrl}/users/${userId}/permissions/${resource}`
      );
      return response.data?.permissions ?? [];
    } catch (error) {
      logger.error('Failed to fetch resource permissions', { userId, resource, error });
      // Return empty array on error - no permissions granted
      return [];
    }
  }

  // ==========================================================================
  // Security Monitoring Methods
  // ==========================================================================

  /**
   * Retrieve recent security events for the current user.
   * Includes login attempts, permission changes, and suspicious activity.
   * 
   * @param limit - Maximum number of events to retrieve (default: 50)
   * @returns Array of security events ordered by timestamp
   * @throws Error if unable to fetch events
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const response = await globalApiClient.get<SecurityEvent[]>(
        `${this.authEndpoint}/security-events?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch security events', { limit, error });
      throw this.handleAuthError(error, 'Failed to retrieve security events');
    }
  }

  /**
   * Retrieve any suspicious activity alerts for the current user.
   * 
   * @returns Array of unresolved suspicious activity alerts
   * @throws Error if unable to fetch alerts
   */
  async getSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    try {
      const response = await globalApiClient.get<SuspiciousActivityAlert[]>(
        `${this.authEndpoint}/suspicious-activity`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch suspicious activity', { error });
      throw this.handleAuthError(error, 'Failed to retrieve suspicious activity');
    }
  }

  /**
   * Report a security incident for investigation.
   * Use this to flag unusual behavior or potential security threats.
   * 
   * @param incident - Details of the security incident
   * @returns Response indicating if report was successful
   */
  async reportSecurityIncident(incident: SecurityIncidentReport): Promise<AuthResponse> {
    try {
      const response = await globalApiClient.post<any>(
        `${this.authEndpoint}/security-incidents`,
        incident,
        { skipCache: true }
      );

      logger.info('Security incident reported successfully', {
        type: incident.type,
        severity: incident.severity
      });

      return {
        success: true,
        data: response.data,
        message: 'Security incident reported successfully'
      };
    } catch (error) {
      logger.error('Failed to report security incident', { incident, error });
      return {
        success: false,
        error: 'Failed to report security incident'
      };
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling for authentication operations.
   * Extracts meaningful error messages and provides consistent error responses.
   * 
   * @param error - Error object from API call
   * @param defaultMessage - Default message if error details unavailable
   * @returns Error object with user-friendly message
   */
  private handleAuthError(error: any, defaultMessage: string): Error {
    // Extract error message from various possible error structures
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      defaultMessage;

    return new Error(errorMessage);
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global instance of the authentication API service.
 * Use this throughout the application for consistency.
 */
export const authApiService = new AuthApiService();