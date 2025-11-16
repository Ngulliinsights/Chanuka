import { logger } from '../utils/logger';
import {
  User,
  RegisterData,
  AuthResponse,
  TwoFactorSetup,
  PrivacySettings,
  SecurityEvent,
  SuspiciousActivityAlert,
  SessionInfo,
  DataExportRequest,
  DataDeletionRequest,
} from '../types/auth';
import { LoginCredentials } from '../core/api/auth';
import { securityMonitor } from '../utils/security-monitoring';
import { privacyCompliance } from '../utils/privacy-compliance';
import { validatePassword } from '../utils/password-validation';
import { authApiService } from '../core/api/auth';
import { globalApiClient } from '../core/api/client';
import { tokenManager, JWTTokens } from '../utils/tokenManager';
import { sessionManager } from '../utils/session-manager';
import { setCurrentSession, recordActivity } from '../store/slices/sessionSlice';
import { getStore } from '../store';
import { rbacManager } from '../utils/rbac';
import { AuthUser } from '../core/api/auth';

/**
 * Configuration for AuthService token refresh behavior
 */
interface AuthServiceConfig {
  tokenRefresh: {
    bufferMinutes: number;
    maxRetries: number;
  };
}

/**
 * Converts the API's AuthUser format to our internal User type
 * This handles the transformation between backend and frontend user representations
 */
const convertAuthUserToUser = (authUser: AuthUser): User => {
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.name,
    role: authUser.role,
    verified: authUser.verified,
    twoFactorEnabled: authUser.twoFactorEnabled,
    avatar_url: undefined,
    preferences: {
      notifications: true,
      emailAlerts: true,
      theme: 'light',
      language: 'en',
    },
    permissions: [],
    lastLogin: authUser.lastLogin,
    createdAt: authUser.createdAt,
  };
};

/**
 * AuthService class handles all authentication business logic, validation,
 * session management, security monitoring, and orchestration of API calls.
 * This consolidates functionality from both the original AuthService and AuthRepository.
 */
export class AuthService {
  private config: AuthServiceConfig;
  private currentUser: User | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(config: AuthServiceConfig = {
    tokenRefresh: {
      bufferMinutes: 5,
      maxRetries: 3
    }
  }) {
    this.config = config;
  }

  /**
   * Authenticates a user with email/password credentials
   * Includes security monitoring for suspicious login attempts and account lockout
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    const deviceFingerprint = securityMonitor.generateDeviceFingerprint();
    const currentIP = '0.0.0.0'; // In production, obtain from request headers

    // Check if account should be locked due to failed attempts
    if (securityMonitor.shouldLockAccount(currentIP)) {
      const errorMsg = 'Account temporarily locked due to multiple failed attempts. Please try again later.';
      return { success: false, error: errorMsg };
    }

    try {
      const session = await authApiService.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: (credentials as any).remember_me,
        twoFactorToken: credentials.twoFactorToken,
      });

      // Record successful login and analyze for suspicious activity
      const alerts = securityMonitor.recordLoginAttempt(
        currentIP,
        navigator.userAgent,
        true,
        session.user.id
      );

      const deviceAlerts = securityMonitor.analyzeDeviceFingerprint(
        session.user.id,
        deviceFingerprint
      );

      const tokens = {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresAt: Date.now() + session.tokens.expiresIn * 1000,
        tokenType: session.tokens.tokenType,
      };

      tokenManager.storeTokens(tokens, session.user);

      // Log security event for audit trail
      const securityEvent = securityMonitor.createSecurityEvent(session.user.id, 'login', {
        device_fingerprint: deviceFingerprint,
        suspicious_alerts: [...alerts, ...deviceAlerts].length,
      });
      securityMonitor.logSecurityEvent(securityEvent);

      const user = convertAuthUserToUser(session.user);
      this.currentUser = user; // Cache current user
      this.scheduleTokenRefresh(session.expiresAt ? new Date(session.expiresAt).getTime() : tokens.expiresAt);

      const sessionExpiry = session.expiresAt
        ? new Date(session.expiresAt).toISOString()
        : new Date(tokens.expiresAt).toISOString();

      const sessionInfo = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        ipAddress: '',
        deviceInfo: navigator.userAgent,
        current: true
      };
      getStore().dispatch(setCurrentSession(sessionInfo));
      rbacManager.clearUserCache(session.user.id);

      return {
        success: true,
        data: session,
        requires2FA: session.requiresTwoFactor,
        user,
        sessionExpiry,
      };
    } catch (error) {
      // Record failed login attempt
      securityMonitor.recordLoginAttempt(currentIP, navigator.userAgent, false);

      logger.error('Login failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Invalid credentials or network error. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Registers a new user with comprehensive password validation
   * and privacy consent tracking
   */
  async register(data: RegisterData): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    try {
      // Validate password strength and ensure it doesn't contain personal info
      const passwordValidation = validatePassword(data.password, undefined, {
        email: data.email,
        name: data.name,
      });

      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      const deviceFingerprint = securityMonitor.generateDeviceFingerprint();

      const registerData = {
        email: data.email,
        password: data.password,
        name: data.name,
        confirmPassword: data.confirmPassword,
        acceptTerms: data.acceptTerms,
      };

      const session = await authApiService.register(registerData);

      const tokens: JWTTokens = {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresAt: Date.now() + session.tokens.expiresIn * 1000,
        tokenType: session.tokens.tokenType,
      };

      tokenManager.storeTokens(tokens, session.user);

      // Log registration as a security event
      const securityEvent = securityMonitor.createSecurityEvent(session.user.id, 'login', {
        registration: true,
        device_fingerprint: deviceFingerprint,
      });
      securityMonitor.logSecurityEvent(securityEvent);

      const user = convertAuthUserToUser(session.user);
      this.currentUser = user; // Cache current user
      this.scheduleTokenRefresh(session.expiresAt ? new Date(session.expiresAt).getTime() : tokens.expiresAt);

      const sessionExpiry = session.expiresAt
        ? new Date(session.expiresAt).toISOString()
        : new Date(tokens.expiresAt).toISOString();

      sessionManager.startSession(user);

      return {
        success: true,
        requiresVerification: false,
        data: session,
        user,
        sessionExpiry,
      };
    } catch (error) {
      logger.error('Registration failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Registration failed. Please check your information and try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Logs out the current user and cleans up all session data
   */
  async logout(user?: User): Promise<void> {
    try {
      if (user) {
        // Log security event before clearing data
        const securityEvent = securityMonitor.createSecurityEvent(user.id, 'logout');
        securityMonitor.logSecurityEvent(securityEvent);

        getStore().dispatch(setCurrentSession(null));
        rbacManager.clearUserCache(user.id);
        await authApiService.logout();
      }
    } catch (error) {
      logger.error('Logout request failed:', { component: 'AuthService' }, error);
    } finally {
      this.clearTokenRefreshTimer();
      this.currentUser = null;
      tokenManager.clearTokens();
    }
  }

  /**
   * Manually refreshes authentication tokens
   */
  async refreshTokens(): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    try {
      const tokens = await authApiService.refreshTokens();
      const user = await authApiService.getCurrentUser();

      const jwtTokens: JWTTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        tokenType: tokens.tokenType,
      };

      tokenManager.storeTokens(jwtTokens, user);

      const convertedUser = convertAuthUserToUser(user);
      this.currentUser = convertedUser; // Update cache
      this.scheduleTokenRefresh(jwtTokens.expiresAt);

      const sessionExpiry = new Date(jwtTokens.expiresAt).toISOString();

      return { success: true, data: { user: convertedUser, tokens: jwtTokens }, user: convertedUser, sessionExpiry };
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'AuthService' }, error);
      this.clearTokenRefreshTimer();
      this.currentUser = null;
      tokenManager.clearTokens();

      const errorMsg = 'Session expired. Please log in again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Verifies a user's email address using a verification token
   */
  async verifyEmail(token: string): Promise<AuthResponse & { user?: User }> {
    try {
      const response = await globalApiClient.post('/api/auth/verify-email', { token });

      if (response.status === 200 && (response.data as any)?.user) {
        const user = convertAuthUserToUser((response.data as any).user);
        this.currentUser = user; // Update cache
        return { success: true, data: response.data, user };
      } else {
        const errorMsg = response.message || 'Email verification failed';
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      logger.error('Email verification failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Verification failed. The link may be invalid or expired.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Initiates the password reset process by sending a reset email
   */
  async requestPasswordReset(email: string, redirectUrl?: string): Promise<AuthResponse> {
    try {
      await authApiService.requestPasswordReset({ email, redirectUrl });
      return { success: true, data: {} };
    } catch (error) {
      logger.error('Password reset request failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Unable to process request. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Completes the password reset process with a new password
   * Validates password strength before submission
   */
  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<AuthResponse> {
    try {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      await authApiService.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      return { success: true };
    } catch (error) {
      logger.error('Password reset failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Reset failed. The link may be invalid or expired.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Changes the password for an authenticated user
   * Validates new password and logs security event
   */
  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const passwordValidation = validatePassword(newPassword, undefined, {
        email: user.email,
        name: user.name,
      });

      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      await authApiService.changePassword(currentPassword, newPassword);

      // Log password change for security audit
      const securityEvent = securityMonitor.createSecurityEvent(user.id, 'password_change');
      securityMonitor.logSecurityEvent(securityEvent);

      return { success: true, data: {} };
    } catch (error) {
      logger.error('Password change failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Password change failed. Please verify your current password.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Initiates two-factor authentication setup
   * Returns QR code and backup codes for the user
   */
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      const setup = await authApiService.setupTwoFactor();
      return {
        secret: setup.secret,
        qrCode: setup.qrCode,
        backupCodes: setup.backupCodes,
      };
    } catch (error) {
      logger.error('Two-factor setup failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Enables two-factor authentication after verifying the setup code
   */
  async enableTwoFactor(user: User, token: string): Promise<AuthResponse> {
    try {
      const response = await authApiService.enableTwoFactor(token);

      if (response.success) {
        // Log 2FA enablement for security audit
        const securityEvent = securityMonitor.createSecurityEvent(user.id, 'two_factor_enabled');
        securityMonitor.logSecurityEvent(securityEvent);

        // Update cached user
        if (this.currentUser) {
          this.currentUser.twoFactorEnabled = true;
        }

        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error || 'Invalid verification code';
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      logger.error('Two-factor enable failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Failed to enable two-factor authentication.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Disables two-factor authentication after password verification
   */
  async disableTwoFactor(user: User, token: string): Promise<AuthResponse> {
    try {
      await authApiService.disableTwoFactor(token);

      // Log 2FA disablement for security audit
      const securityEvent = securityMonitor.createSecurityEvent(user.id, 'two_factor_disabled');
      securityMonitor.logSecurityEvent(securityEvent);

      // Update cached user
      if (this.currentUser) {
        this.currentUser.twoFactorEnabled = false;
      }

      return { success: true, data: {} };
    } catch (error) {
      logger.error('Two-factor disable failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Failed to disable two-factor authentication.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Verifies a two-factor authentication code during login
   */
  async verifyTwoFactor(token: string): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    try {
      const session = await authApiService.verifyTwoFactor(token);

      const user = convertAuthUserToUser(session.user);
      this.currentUser = user; // Cache user
      this.scheduleTokenRefresh(session.expiresAt ? new Date(session.expiresAt).getTime() : Date.now() + 3600000);

      const sessionExpiry = session.expiresAt ? new Date(session.expiresAt).toISOString() : undefined;

      const sessionInfo = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        ipAddress: '',
        deviceInfo: navigator.userAgent,
        current: true
      };
      getStore().dispatch(setCurrentSession(sessionInfo));

      return { success: true, data: session, user, sessionExpiry };
    } catch (error) {
      logger.error('Two-factor verification failed', { error });
      const errorMsg = 'Invalid verification code. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Updates user profile information
   */
  async updateUserProfile(user: User, updates: any): Promise<AuthResponse & { user?: User }> {
    try {
      const updatedUser = await authApiService.updateUserProfile(updates);
      const mergedUser = { ...user, ...updatedUser };
      this.currentUser = mergedUser; // Update cache

      logger.info('User profile updated successfully');
      return { success: true, data: updatedUser, user: mergedUser };
    } catch (error) {
      logger.error('Profile update failed', { error });
      const errorMsg = 'Failed to update profile. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Handles OAuth callback after successful authentication with external provider
   */
  async loginWithOAuth(code: string, state?: string): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    try {
      const session = await authApiService.loginWithOAuth(code, state || '');

      const user = convertAuthUserToUser(session.user);
      this.currentUser = user; // Cache user
      this.scheduleTokenRefresh(session.expiresAt ? new Date(session.expiresAt).getTime() : Date.now() + 3600000);

      const sessionExpiry = session.expiresAt ? new Date(session.expiresAt).toISOString() : undefined;

      sessionManager.startSession(user);

      logger.info('OAuth login successful');
      return { success: true, data: session, user, sessionExpiry };
    } catch (error) {
      logger.error('OAuth login failed', { error });
      const errorMsg = 'OAuth authentication failed. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Generates OAuth authorization URL for external provider login
   */
  getOAuthUrl(provider: string, state?: string): string {
    const baseUrl = `https://accounts.google.com/o/oauth2/v2/auth`;
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
      scope: 'openid profile email',
      response_type: 'code',
      state: state || '',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Extends the current user session
   */
  async extendSession(): Promise<AuthResponse> {
    try {
      await authApiService.extendSession();
      logger.info('Session extended successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to extend session', { error });
      const errorMsg = 'Failed to extend session. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Retrieves all active sessions for the current user
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const sessions = await authApiService.getActiveSessions();
      return sessions as unknown as SessionInfo[];
    } catch (error) {
      logger.error('Active sessions fetch failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Terminates a specific session
   */
  async terminateSession(sessionId: string): Promise<AuthResponse> {
    try {
      await authApiService.revokeSession(sessionId);
      return { success: true, data: {} };
    } catch (error) {
      logger.error('Session termination failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Failed to terminate session. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Terminates all sessions except the current one
   */
  async terminateAllOtherSessions(): Promise<AuthResponse> {
    try {
      await authApiService.revokeAllOtherSessions();
      return { success: true, data: {} };
    } catch (error) {
      logger.error('All sessions termination failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Failed to terminate sessions. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Updates user privacy settings with validation
   */
  async updatePrivacySettings(user: User, settings: Partial<PrivacySettings>): Promise<AuthResponse> {
    try {
      const defaultSettings: PrivacySettings = {
        profile_visibility: 'public',
        email_visibility: 'private',
        activity_tracking: true,
        analytics_consent: true,
        marketing_consent: false,
        data_sharing_consent: false,
        location_tracking: false,
        personalized_content: true,
        third_party_integrations: false,
        notification_preferences: {
          email_notifications: true,
          push_notifications: false,
          sms_notifications: false,
          bill_updates: true,
          comment_replies: true,
          expert_insights: false,
          security_alerts: true,
          privacy_updates: true,
        },
      };

      const validation = privacyCompliance.validatePrivacySettings({
        ...defaultSettings,
        ...settings,
      });

      if (!validation.isValid) {
        const errorMsg = `Privacy settings validation failed: ${validation.errors.join(', ')}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      const response = await globalApiClient.put('/api/auth/privacy-settings', settings);

      if (response.status === 200 && response.data) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = 'Privacy settings update failed';
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      logger.error('Privacy settings update failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Failed to update privacy settings. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Requests a data export in the specified format
   */
  async requestDataExport(format: 'json' | 'csv' | 'xml', includes: string[]): Promise<DataExportRequest> {
    try {
      const response = await globalApiClient.post('/api/privacy/export', {
        format,
        includes,
      });

      if (response.status === 200) {
        return response.data as DataExportRequest;
      } else {
        throw new Error('Data export request failed');
      }
    } catch (error) {
      logger.error('Data export request failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Requests deletion of user data
   */
  async requestDataDeletion(retentionPeriod: string, includes: string[]): Promise<DataDeletionRequest> {
    try {
      const response = await globalApiClient.post('/api/privacy/delete', {
        retention_period: retentionPeriod,
        includes,
      });

      if (response.status === 200) {
        return response.data as DataDeletionRequest;
      } else {
        throw new Error('Data deletion request failed');
      }
    } catch (error) {
      logger.error('Data deletion request failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Retrieves security events for audit trail
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const events = await authApiService.getSecurityEvents(limit);
      return events as unknown as SecurityEvent[];
    } catch (error) {
      logger.error('Security events fetch failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Retrieves suspicious activity alerts for the user
   */
  async getSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    try {
      const alerts = await authApiService.getSuspiciousActivity();
      return alerts as unknown as SuspiciousActivityAlert[];
    } catch (error) {
      logger.error('Suspicious activity fetch failed:', { component: 'AuthService' }, error);
      throw error;
    }
  }

  /**
   * Validates stored tokens on app initialization
   */
  async validateStoredTokens(): Promise<{ user?: User; sessionExpiry?: string } | null> {
    try {
      const tokens = tokenManager.getTokens();

      if (!tokens) {
        return null;
      }

      const validation = tokenManager.validateToken();

      if (!validation.isValid) {
        // Token is invalid or expired, try to refresh
        try {
          const refreshedTokens = await authApiService.refreshTokens();
          const user = await authApiService.getCurrentUser();

          const jwtTokens: JWTTokens = {
            accessToken: refreshedTokens.accessToken,
            refreshToken: refreshedTokens.refreshToken,
            expiresAt: Date.now() + refreshedTokens.expiresIn * 1000,
            tokenType: refreshedTokens.tokenType,
          };

          tokenManager.storeTokens(jwtTokens, user);

          const convertedUser = convertAuthUserToUser(user);
          this.currentUser = convertedUser; // Cache user
          this.scheduleTokenRefresh(refreshedTokens.expiresIn * 1000 + Date.now());

          const sessionExpiry = new Date(refreshedTokens.expiresIn * 1000 + Date.now()).toISOString();

          const sessionInfo = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            ipAddress: '',
            deviceInfo: navigator.userAgent,
            current: true
          };
          getStore().dispatch(setCurrentSession(sessionInfo));

          return { user: convertedUser, sessionExpiry };
        } catch (error) {
          // Refresh failed, clear everything
          this.clearTokenRefreshTimer();
          this.currentUser = null;
          tokenManager.clearTokens();
          return null;
        }
      } else {
        // Token is valid, fetch current user
        try {
          const user = await authApiService.getCurrentUser();
          const convertedUser = convertAuthUserToUser(user);
          this.currentUser = convertedUser; // Cache user
          this.scheduleTokenRefresh(tokens.expiresAt);
          sessionManager.startSession(convertedUser);
          return { user: convertedUser };
        } catch (error) {
          // Failed to get user, clear tokens
          this.clearTokenRefreshTimer();
          this.currentUser = null;
          tokenManager.clearTokens();
          return null;
        }
      }
    } catch (error) {
      logger.error('Token validation failed:', { component: 'AuthService' }, error);
      this.clearTokenRefreshTimer();
      this.currentUser = null;
      tokenManager.clearTokens();
      return null;
    }
  }

  /**
   * Get current authenticated user (from cache if available)
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const user = await authApiService.getCurrentUser();
      this.currentUser = convertAuthUserToUser(user);
      return this.currentUser;
    } catch (error) {
      logger.error('Failed to get current user', { error });
      return null;
    }
  }

  /**
   * Get current user synchronously (from cache only)
   */
  getCurrentUserSync(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(resource: string, action: string): Promise<boolean> {
    try {
      return await authApiService.checkPermission({
        user_id: this.currentUser?.id || '',
        resource,
        action
      });
    } catch (error) {
      logger.error('Permission check failed', { resource, action, error });
      return false;
    }
  }

  /**
   * Get user roles and permissions
   */
  async getUserRoles(userId?: string): Promise<any[]> {
    try {
      return await authApiService.getUserRoles(userId || this.currentUser?.id || '');
    } catch (error) {
      logger.error('Failed to fetch user roles', { userId, error });
      return [];
    }
  }

  /**
   * Get all permissions a user has for a specific resource
   */
  async getResourcePermissions(userId: string, resource: string): Promise<string[]> {
    try {
      return await authApiService.getResourcePermissions(userId, resource);
    } catch (error) {
      logger.error('Failed to fetch resource permissions', { userId, resource, error });
      return [];
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    this.clearTokenRefreshTimer();

    const refreshTime = expiresAt - Date.now() - (this.config.tokenRefresh.bufferMinutes * 60 * 1000);

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        try {
          await this.refreshTokens();
        } catch (error) {
          logger.error('Automatic token refresh failed', { error });
        }
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.clearTokenRefreshTimer();
    this.currentUser = null;
  }
}

// Re-export from initialization module to avoid circular dependencies
export { authService } from './auth-service-init';

// Create and export a default instance of the AuthService class
export const authServiceInstance = new AuthService();