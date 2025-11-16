/**
 * Authentication Backend Service
 * 
 * Enterprise-grade authentication service with JWT token management (HttpOnly cookies),
 * OAuth integration, session management, and role-based access control.
 * 
 * Security Features:
 * - HttpOnly cookies for secure token storage
 * - Automatic token refresh with race condition prevention
 * - Session management and monitoring
 * - Role-based access control (RBAC)
 * - Two-factor authentication support
 * - Security event tracking
 * - Request retry logic with exponential backoff
 */

import { apiService } from './apiService';
import { globalConfig } from '../core/api/config';
import { logger } from '../utils/logger';

// ============================================================================
// Type Definitions
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
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  expiresAt: string;
  requiresTwoFactor?: boolean;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// OAuth Configuration
export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

// Two-Factor Authentication
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// Password Management
export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Session Information
export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

// Role-Based Access Control
export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: number;
}

export interface RBACContext {
  user: AuthUser;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Security Events
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

// Internal cache structure for user data
interface UserCache {
  user: AuthUser | null;
  lastFetched: number;
  expiresAt: number;
}

// ============================================================================
// Authentication Backend Service Implementation
// ============================================================================

class AuthBackendService {
  private baseUrl: string;
  private timeout: number;
  private tokenRefreshPromise: Promise<AuthTokens> | null = null;
  private refreshTokenTimeout: NodeJS.Timeout | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  
  // Cache current user data to reduce API calls
  private userCache: UserCache = {
    user: null,
    lastFetched: 0,
    expiresAt: 0
  };
  
  // Constants for configuration
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in ms
  private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms
  private readonly USER_CACHE_DURATION = 60 * 1000; // 1 minute in ms
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff

  constructor() {
    this.baseUrl = globalConfig.get('api').baseUrl;
    this.timeout = globalConfig.get('api').timeout;
    
    // Initialize session monitoring
    this.initializeSessionMonitoring();
    
    // Listen for online/offline events to pause/resume monitoring
    this.setupNetworkListeners();
  }

  // ============================================================================
  // Core Authentication Methods
  // ============================================================================

  /**
   * Authenticate user with email and password
   * Tokens are stored in HttpOnly cookies by the server for security
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      // Validate input before sending to server
      this.validateEmail(credentials.email);
      
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      const session: AuthSession = response.data;
      
      // If 2FA is required, return session with flag without setting up refresh
      if (session.requiresTwoFactor) {
        logger.info('2FA verification required', { email: credentials.email });
        return session;
      }

      // Cache user data and schedule automatic token refresh
      this.updateUserCache(session.user);
      this.scheduleTokenRefresh(session.tokens.expiresIn);
      
      logger.info('User logged in successfully', { 
        userId: session.user.id, 
        email: session.user.email 
      });

      return session;
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw new Error(this.extractErrorMessage(error, 'Invalid email or password'));
    }
  }

  /**
   * Register new user account
   */
  async register(data: RegisterData): Promise<AuthSession> {
    try {
      // Client-side validation before API call
      this.validateRegistrationData(data);

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const session: AuthSession = response.data;
      
      // Cache user data and schedule automatic token refresh
      this.updateUserCache(session.user);
      this.scheduleTokenRefresh(session.tokens.expiresIn);
      
      logger.info('User registered successfully', { 
        userId: session.user.id, 
        email: session.user.email 
      });

      return session;
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Logout user and invalidate all tokens
   */
  async logout(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      logger.info('User logged out successfully');
    } catch (error) {
      logger.warn('Logout request failed (continuing with cleanup)', { error });
    } finally {
      // Always perform local cleanup regardless of API success
      this.cleanup();
      this.clearUserCache();
    }
  }

  /**
   * Get current authenticated user information
   * Uses caching to reduce API calls
   */
  async getCurrentUser(forceRefresh: boolean = false): Promise<AuthUser> {
    try {
      // Return cached user if available and not expired
      if (!forceRefresh && this.isUserCacheValid()) {
        logger.debug('Returning cached user data');
        return this.userCache.user!;
      }
      
      const response = await this.makeRequest('/api/auth/me', {
        credentials: 'include'
      });
      
      const user: AuthUser = response.data;
      this.updateUserCache(user);
      
      return user;
    } catch (error) {
      logger.error('Failed to get current user', { error });
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await this.makeRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        credentials: 'include'
      });

      const updatedUser: AuthUser = response.data;
      
      // Update cache with new user data
      this.updateUserCache(updatedUser);
      
      logger.info('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update profile', { error });
      throw new Error('Failed to update profile');
    }
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Refresh authentication tokens
   * Prevents race conditions with multiple simultaneous refresh requests
   */
  async refreshTokens(): Promise<AuthTokens> {
    // Prevent multiple simultaneous refresh requests by reusing existing promise
    if (this.tokenRefreshPromise) {
      logger.debug('Reusing existing token refresh promise');
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();
    
    try {
      const tokens = await this.tokenRefreshPromise;
      return tokens;
    } finally {
      // Clear the promise after completion (success or failure)
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh operation
   */
  private async performTokenRefresh(): Promise<AuthTokens> {
    try {
      const response = await this.makeRequest('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      const tokens: AuthTokens = response.data;
      
      // Schedule next refresh based on new token expiration
      this.scheduleTokenRefresh(tokens.expiresIn);
      
      logger.info('Tokens refreshed successfully');
      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      this.cleanup();
      this.clearUserCache();
      
      // Dispatch event for UI to handle session expiration
      this.dispatchSessionExpiredEvent();
      
      throw new Error('Session expired. Please log in again.');
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   * Refreshes with buffer time before token expires to maintain seamless session
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing refresh timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    // Convert seconds to milliseconds and subtract buffer time
    const refreshTime = (expiresIn * 1000) - this.TOKEN_REFRESH_BUFFER;
    
    // Only schedule if refresh time is positive
    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshTokenSilently();
      }, refreshTime);
      
      logger.debug('Token refresh scheduled', { 
        expiresIn, 
        refreshIn: Math.round(refreshTime / 1000),
        bufferSeconds: this.TOKEN_REFRESH_BUFFER / 1000
      });
    } else {
      // If token expires too soon, refresh immediately
      logger.warn('Token expiration too soon, refreshing immediately', { expiresIn });
      this.refreshTokenSilently();
    }
  }

  /**
   * Refresh token silently in the background
   */
  private async refreshTokenSilently(): Promise<void> {
    try {
      await this.refreshTokens();
      logger.info('Token refreshed silently');
    } catch (error) {
      logger.error('Silent token refresh failed', { error });
      // Error is already handled in performTokenRefresh
    }
  }

  // ============================================================================
  // OAuth Integration
  // ============================================================================

  /**
   * Get available OAuth providers configuration
   * Memoized to avoid repeated object creation
   */
  private oAuthProvidersCache: OAuthProvider[] | null = null;
  
  getOAuthProviders(): OAuthProvider[] {
    // Return cached providers if available
    if (this.oAuthProvidersCache) {
      return this.oAuthProvidersCache;
    }
    
    this.oAuthProvidersCache = [
      {
        id: 'google',
        name: 'Google',
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/callback/google`,
        scope: ['openid', 'profile', 'email'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
      },
      {
        id: 'github',
        name: 'GitHub',
        clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/callback/github`,
        scope: ['user:email', 'read:user'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token'
      },
      {
        id: 'facebook',
        name: 'Facebook',
        clientId: process.env.REACT_APP_FACEBOOK_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/callback/facebook`,
        scope: ['email', 'public_profile'],
        authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token'
      }
    ];
    
    return this.oAuthProvidersCache;
  }

  /**
   * Initiate OAuth login flow with specified provider
   */
  initiateOAuthLogin(providerId: string, state?: string): void {
    const provider = this.getOAuthProviders().find(p => p.id === providerId);
    
    if (!provider) {
      throw new Error(`OAuth provider ${providerId} not configured`);
    }
    
    if (!provider.clientId) {
      throw new Error(`OAuth provider ${providerId} client ID not configured`);
    }

    const secureState = state || this.generateSecureState();
    
    // Store state with timestamp for additional security
    const stateData = {
      state: secureState,
      timestamp: Date.now(),
      provider: providerId
    };
    sessionStorage.setItem('oauth_state', JSON.stringify(stateData));
    
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: provider.scope.join(' '),
      response_type: 'code',
      state: secureState
    });

    const authUrl = `${provider.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback after provider authentication
   */
  async handleOAuthCallback(providerId: string, code: string, state: string): Promise<AuthSession> {
    try {
      // Verify state to prevent CSRF attacks
      const storedStateJson = sessionStorage.getItem('oauth_state');
      if (!storedStateJson) {
        throw new Error('No stored OAuth state found');
      }
      
      const storedStateData = JSON.parse(storedStateJson);
      
      // Verify state matches
      if (storedStateData.state !== state) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }
      
      // Verify provider matches
      if (storedStateData.provider !== providerId) {
        throw new Error('Provider mismatch in OAuth callback');
      }
      
      // Check if state is not too old (15 minutes max)
      const maxAge = 15 * 60 * 1000;
      if (Date.now() - storedStateData.timestamp > maxAge) {
        throw new Error('OAuth state expired');
      }

      const response = await this.makeRequest('/api/auth/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({ provider: providerId, code, state }),
        credentials: 'include'
      });

      const session: AuthSession = response.data;
      
      // Clean up stored state
      sessionStorage.removeItem('oauth_state');
      
      // Cache user and schedule token refresh
      this.updateUserCache(session.user);
      this.scheduleTokenRefresh(session.tokens.expiresIn);
      
      logger.info('OAuth login successful', { 
        provider: providerId,
        userId: session.user.id 
      });

      return session;
    } catch (error) {
      // Clean up state on error
      sessionStorage.removeItem('oauth_state');
      
      logger.error('OAuth callback failed', { provider: providerId, error });
      throw new Error(this.extractErrorMessage(error, 'OAuth authentication failed'));
    }
  }

  /**
   * Generate cryptographically secure state parameter for OAuth
   */
  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================================
  // Two-Factor Authentication
  // ============================================================================

  /**
   * Initiate 2FA setup process
   */
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include'
      });

      logger.info('2FA setup initiated');
      return response.data;
    } catch (error) {
      logger.error('Failed to setup 2FA', { error });
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Enable 2FA after verifying setup token
   */
  async enableTwoFactor(token: string): Promise<{ backupCodes: string[] }> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token }),
        credentials: 'include'
      });

      // Update cached user to reflect 2FA is now enabled
      if (this.userCache.user) {
        this.userCache.user.twoFactorEnabled = true;
      }

      logger.info('2FA enabled successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to enable 2FA', { error });
      throw new Error('Invalid verification code');
    }
  }

  /**
   * Disable 2FA with verification
   */
  async disableTwoFactor(token: string): Promise<void> {
    try {
      await this.makeRequest('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token }),
        credentials: 'include'
      });

      // Update cached user to reflect 2FA is now disabled
      if (this.userCache.user) {
        this.userCache.user.twoFactorEnabled = false;
      }

      logger.info('2FA disabled successfully');
    } catch (error) {
      logger.error('Failed to disable 2FA', { error });
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  /**
   * Verify 2FA token during login
   */
  async verifyTwoFactor(token: string): Promise<AuthSession> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
        credentials: 'include'
      });

      const session: AuthSession = response.data;
      
      // Cache user and schedule token refresh
      this.updateUserCache(session.user);
      this.scheduleTokenRefresh(session.tokens.expiresIn);

      logger.info('2FA verification successful');
      return session;
    } catch (error) {
      logger.error('2FA verification failed', { error });
      throw new Error('Invalid verification code');
    }
  }

  // ============================================================================
  // Password Management
  // ============================================================================

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Basic validation before sending to server
      if (!currentPassword || !newPassword) {
        throw new Error('Current and new passwords are required');
      }
      
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }
      
      await this.makeRequest('/api/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include'
      });

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password', { error });
      throw new Error(this.extractErrorMessage(error, 'Failed to change password'));
    }
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      this.validateEmail(request.email);
      
      await this.makeRequest('/api/auth/password/reset-request', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      logger.info('Password reset requested', { email: request.email });
    } catch (error) {
      logger.error('Failed to request password reset', { error });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Reset password with token from email
   */
  async resetPassword(reset: PasswordReset): Promise<void> {
    try {
      if (!reset.newPassword || !reset.confirmPassword) {
        throw new Error('Password fields are required');
      }
      
      if (reset.newPassword !== reset.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      if (reset.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      await this.makeRequest('/api/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(reset)
      });

      logger.info('Password reset successful');
    } catch (error) {
      logger.error('Failed to reset password', { error });
      throw new Error(this.extractErrorMessage(error, 'Failed to reset password'));
    }
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Validate current session
   * Returns true if session is valid, attempts refresh if expired
   */
  async validateSession(): Promise<boolean> {
    try {
      // Try to get current user - this validates the session
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.warn('Session validation failed, attempting refresh', { error });

      // Try to refresh tokens if validation failed
      try {
        await this.refreshTokens();
        await this.getCurrentUser();
        return true;
      } catch (refreshError) {
        logger.warn('Token refresh failed during session validation', { refreshError });
        return false;
      }
    }
  }

  /**
   * Extend current session
   */
  async extendSession(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/session/extend', {
        method: 'POST',
        credentials: 'include'
      });

      logger.info('Session extended');
    } catch (error) {
      logger.error('Failed to extend session', { error });
      throw new Error('Failed to extend session');
    }
  }

  /**
   * Get all active sessions for current user
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await this.makeRequest('/api/auth/sessions', {
        credentials: 'include'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get active sessions', { error });
      throw new Error('Failed to get active sessions');
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      logger.info('Session revoked', { sessionId });
    } catch (error) {
      logger.error('Failed to revoke session', { error });
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/sessions/others', {
        method: 'DELETE',
        credentials: 'include'
      });

      logger.info('All other sessions revoked');
    } catch (error) {
      logger.error('Failed to revoke all sessions', { error });
      throw new Error('Failed to revoke sessions');
    }
  }

  /**
   * Initialize automatic session monitoring
   * Checks session validity at regular intervals
   */
  private initializeSessionMonitoring(): void {
    this.sessionCheckInterval = setInterval(async () => {
      const isValid = await this.validateSession();
      if (!isValid) {
        logger.warn('Session invalidated during monitoring');
        this.cleanup();
        this.clearUserCache();
        this.dispatchSessionExpiredEvent();
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  // ============================================================================
  // Role-Based Access Control (RBAC)
  // ============================================================================

  /**
   * Get roles for specific user
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/roles`, {
        credentials: 'include'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get user roles', { userId, error });
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(context: RBACContext): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/auth/check-permission', {
        method: 'POST',
        body: JSON.stringify({
          user_id: context.user.id,
          resource: context.resource,
          action: context.action,
          conditions: context.conditions
        }),
        credentials: 'include'
      });

      return response.data?.granted || false;
    } catch (error) {
      logger.error('Permission check failed', { 
        userId: context.user.id,
        resource: context.resource,
        action: context.action,
        error 
      });
      return false;
    }
  }

  /**
   * Get user permissions for specific resource
   */
  async getResourcePermissions(userId: string, resource: string): Promise<string[]> {
    try {
      const response = await this.makeRequest(
        `/api/users/${userId}/permissions/${resource}`,
        { credentials: 'include' }
      );

      return response.data?.permissions || [];
    } catch (error) {
      logger.error('Failed to get resource permissions', { userId, resource, error });
      return [];
    }
  }

  /**
   * Check if current user has specific permission (client-side)
   * Note: This reads from cached user data - always verify server-side for security
   */
  hasPermission(permission: string): boolean {
    if (!this.userCache.user || !this.isUserCacheValid()) {
      logger.warn('Cannot check permission - no cached user or cache expired');
      return false;
    }
    
    return this.userCache.user.permissions.includes(permission);
  }

  /**
   * Check if current user has specific role (client-side)
   * Note: This reads from cached user data - always verify server-side for security
   */
  hasRole(role: string): boolean {
    if (!this.userCache.user || !this.isUserCacheValid()) {
      logger.warn('Cannot check role - no cached user or cache expired');
      return false;
    }
    
    return this.userCache.user.role === role;
  }

  // ============================================================================
  // Security Features
  // ============================================================================

  /**
   * Get security events for current user
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const response = await this.makeRequest(
        `/api/auth/security-events?limit=${limit}`,
        { credentials: 'include' }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get security events', { error });
      throw error;
    }
  }

  /**
   * Get suspicious activity alerts
   */
  async getSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    try {
      const response = await this.makeRequest('/api/auth/suspicious-activity', {
        credentials: 'include'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get suspicious activity', { error });
      throw error;
    }
  }

  /**
   * Report security incident
   */
  async reportSecurityIncident(incident: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/api/auth/security-incidents', {
        method: 'POST',
        body: JSON.stringify(incident),
        credentials: 'include'
      });

      logger.info('Security incident reported', { type: incident.type });
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Failed to report security incident', { error });
      return { 
        success: false, 
        error: this.extractErrorMessage(error, 'Failed to report incident')
      };
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Update user cache with fresh data
   */
  private updateUserCache(user: AuthUser): void {
    const now = Date.now();
    this.userCache = {
      user,
      lastFetched: now,
      expiresAt: now + this.USER_CACHE_DURATION
    };
    logger.debug('User cache updated', { userId: user.id });
  }

  /**
   * Check if cached user data is still valid
   */
  private isUserCacheValid(): boolean {
    return (
      this.userCache.user !== null &&
      Date.now() < this.userCache.expiresAt
    );
  }

  /**
   * Clear user cache
   */
  private clearUserCache(): void {
    this.userCache = {
      user: null,
      lastFetched: 0,
      expiresAt: 0
    };
    logger.debug('User cache cleared');
  }

  /**
   * Get cached user (returns null if cache invalid)
   */
  getCachedUser(): AuthUser | null {
    return this.isUserCacheValid() ? this.userCache.user : null;
  }

  // ============================================================================
  // Validation Utilities
  // ============================================================================

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegisterData): void {
    this.validateEmail(data.email);
    
    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    
    if (!data.acceptTerms) {
      throw new Error('You must accept the terms and conditions');
    }
  }

  // ============================================================================
  // Network and Event Handling
  // ============================================================================

  /**
   * Setup listeners for network status changes
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      logger.info('Network connection restored');
      // Validate session when coming back online
      this.validateSession();
    });

    window.addEventListener('offline', () => {
      logger.warn('Network connection lost');
    });
  }

  /**
   * Dispatch session expired event for UI components
   */
  private dispatchSessionExpiredEvent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { timestamp: Date.now() }
      }));
    }
  }

  // ============================================================================
  // HTTP Request Utilities
  // ============================================================================

  /**
   * Make authenticated API request with automatic token handling and retry logic
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      credentials: options.credentials || 'include',
      signal: AbortSignal.timeout(this.timeout)
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle token expiration - try to refresh and retry once
        if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
          logger.info('401 response, attempting token refresh');
          
          try {
            await this.refreshTokens();
            // Retry the original request with refreshed token
            return this.makeRequest(endpoint, options, retryCount);
          } catch (refreshError) {
            this.cleanup();
            this.clearUserCache();
            this.dispatchSessionExpiredEvent();
            throw new Error('Session expired. Please log in again.');
          }
        }
        
        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < this.MAX_RETRY_ATTEMPTS) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
          const delay = retryAfter * 1000;
          
          logger.warn('Rate limited, retrying', { retryCount, retryAfter });
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        // Handle server errors with exponential backoff
        if (response.status >= 500 && retryCount < this.MAX_RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, retryCount);
          
          logger.warn('Server error, retrying with exponential backoff', { 
            retryCount, 
            delay,
            status: response.status 
          });
          
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse and return response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { data: await response.text() };
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        // Network errors with retry
        if (error.message.includes('fetch') && retryCount < this.MAX_RETRY_ATTEMPTS) {
          const delay = this.RETRY_DELAY_BASE * Math.pow(2, retryCount);
          
          logger.warn('Network error, retrying', { retryCount, delay });
          await this.sleep(delay);
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Extract meaningful error message from error object
   */
  private extractErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return defaultMessage;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Cleanup and Lifecycle
  // ============================================================================

  /**
   * Clean up all resources and timers
   */
  cleanup(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    this.tokenRefreshPromise = null;
    
    logger.info('Auth service cleaned up');
  }

  /**
   * Destroy service instance and perform complete cleanup
   */
  destroy(): void {
    this.cleanup();
    this.clearUserCache();
    this.oAuthProvidersCache = null;
    
    logger.info('Auth service destroyed');
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const authBackendService = new AuthBackendService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authBackendService.cleanup();
  });
  
  // Handle visibility change to pause/resume monitoring
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logger.debug('Page hidden, auth monitoring continues in background');
    } else {
      logger.debug('Page visible, validating session');
      authBackendService.validateSession();
    }
  });
}

export default authBackendService;