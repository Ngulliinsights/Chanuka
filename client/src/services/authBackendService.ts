/**
 * Authentication Backend Service
 * Comprehensive backend integration for authentication system
 */

import { apiService } from './apiService';
import { logger } from '../utils/logger';
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  TwoFactorSetup,
  PrivacySettings,
  SecurityEvent,
  SuspiciousActivityAlert,
  SessionInfo,
  DataExportRequest,
  DataDeletionRequest
} from '../types/auth';

// JWT Token Management
export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface TokenRefreshResponse {
  success: boolean;
  tokens?: JWTTokens;
  user?: User;
  error?: string;
}

// OAuth Provider Configuration
export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

// Role-Based Access Control
export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: number;
}

export interface RBACContext {
  user: User;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

class AuthBackendService {
  private tokenRefreshPromise: Promise<TokenRefreshResponse> | null = null;
  private refreshTokenTimeout: NodeJS.Timeout | null = null;

  // ============================================================================
  // JWT Token Management
  // ============================================================================

  /**
   * Get stored JWT tokens from secure storage
   */
  getStoredTokens(): JWTTokens | null {
    try {
      const accessToken = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const expiresAt = localStorage.getItem('token_expires_at');

      if (!accessToken || !refreshToken || !expiresAt) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to get stored tokens:', { component: 'AuthBackendService' }, error);
      return null;
    }
  }

  /**
   * Store JWT tokens securely
   */
  storeTokens(tokens: JWTTokens): void {
    try {
      localStorage.setItem('auth_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      localStorage.setItem('token_expires_at', tokens.expiresAt.toString());
      
      // Set up automatic token refresh
      this.scheduleTokenRefresh(tokens.expiresAt);
      
      logger.info('Tokens stored successfully', { 
        component: 'AuthBackendService',
        expiresAt: new Date(tokens.expiresAt).toISOString()
      });
    } catch (error) {
      logger.error('Failed to store tokens:', { component: 'AuthBackendService' }, error);
    }
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      
      if (this.refreshTokenTimeout) {
        clearTimeout(this.refreshTokenTimeout);
        this.refreshTokenTimeout = null;
      }
      
      logger.info('Tokens cleared successfully', { component: 'AuthBackendService' });
    } catch (error) {
      logger.error('Failed to clear tokens:', { component: 'AuthBackendService' }, error);
    }
  }

  /**
   * Check if current token is expired or about to expire
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    const tokens = this.getStoredTokens();
    if (!tokens) return true;

    const now = Date.now();
    const bufferMs = bufferMinutes * 60 * 1000;
    return now >= (tokens.expiresAt - bufferMs);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshTokenSilently();
      }, refreshTime);
    }
  }

  /**
   * Refresh token silently in the background
   */
  private async refreshTokenSilently(): Promise<void> {
    try {
      const result = await this.refreshToken();
      if (result.success && result.tokens) {
        this.storeTokens(result.tokens);
        logger.info('Token refreshed silently', { component: 'AuthBackendService' });
      }
    } catch (error) {
      logger.error('Silent token refresh failed:', { component: 'AuthBackendService' }, error);
    }
  }

  /**
   * Refresh JWT token with rotation
   */
  async refreshToken(): Promise<TokenRefreshResponse> {
    // Prevent multiple simultaneous refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenRefreshResponse> {
    try {
      const tokens = this.getStoredTokens();
      if (!tokens) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await apiService.post('/api/auth/refresh', {
        refresh_token: tokens.refreshToken,
      });

      if (response.success && response.data) {
        const newTokens: JWTTokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000), // Convert seconds to ms
          tokenType: 'Bearer'
        };

        return {
          success: true,
          tokens: newTokens,
          user: response.data.user
        };
      } else {
        this.clearTokens();
        return { 
          success: false, 
          error: response.error?.message || 'Token refresh failed' 
        };
      }
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'AuthBackendService' }, error);
      this.clearTokens();
      return { success: false, error: 'Network error during token refresh' };
    }
  }

  // ============================================================================
  // OAuth Integration
  // ============================================================================

  /**
   * Get OAuth provider configuration
   */
  getOAuthProviders(): OAuthProvider[] {
    return [
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
      }
    ];
  }

  /**
   * Initiate OAuth login flow
   */
  initiateOAuthLogin(providerId: string, state?: string): void {
    const provider = this.getOAuthProviders().find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`OAuth provider ${providerId} not configured`);
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: provider.scope.join(' '),
      response_type: 'code',
      state: state || this.generateState()
    });

    const authUrl = `${provider.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(providerId: string, code: string, state?: string): Promise<AuthResponse> {
    try {
      const response = await apiService.post('/api/auth/oauth/callback', {
        provider: providerId,
        code,
        state
      });

      if (response.success && response.data) {
        const tokens: JWTTokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000),
          tokenType: 'Bearer'
        };

        this.storeTokens(tokens);

        return {
          success: true,
          data: {
            user: response.data.user,
            tokens
          }
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'OAuth authentication failed'
        };
      }
    } catch (error) {
      logger.error('OAuth callback failed:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during OAuth authentication' };
    }
  }

  /**
   * Generate secure state parameter for OAuth
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================================
  // User Profile Synchronization
  // ============================================================================

  /**
   * Sync user profile with backend
   */
  async syncUserProfile(userId: string): Promise<AuthResponse> {
    try {
      const response = await apiService.get(`/api/users/${userId}/profile`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Profile sync failed'
        };
      }
    } catch (error) {
      logger.error('Profile sync failed:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during profile sync' };
    }
  }

  /**
   * Update user profile on backend
   */
  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await apiService.put(`/api/users/${userId}/profile`, profileData);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Profile update failed'
        };
      }
    } catch (error) {
      logger.error('Profile update failed:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during profile update' };
    }
  }

  // ============================================================================
  // Role-Based Access Control (RBAC)
  // ============================================================================

  /**
   * Get user roles and permissions
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const response = await apiService.get(`/api/users/${userId}/roles`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch user roles');
      }
    } catch (error) {
      logger.error('Failed to get user roles:', { component: 'AuthBackendService' }, error);
      throw error;
    }
  }

  /**
   * Check if user has permission for specific action
   */
  async checkPermission(context: RBACContext): Promise<boolean> {
    try {
      const response = await apiService.post('/api/auth/check-permission', {
        user_id: context.user.id,
        resource: context.resource,
        action: context.action,
        conditions: context.conditions
      });

      if (response.success && response.data) {
        return response.data.granted;
      } else {
        return false;
      }
    } catch (error) {
      logger.error('Permission check failed:', { component: 'AuthBackendService' }, error);
      return false;
    }
  }

  /**
   * Get user permissions for a resource
   */
  async getResourcePermissions(userId: string, resource: string): Promise<string[]> {
    try {
      const response = await apiService.get(`/api/users/${userId}/permissions/${resource}`);

      if (response.success && response.data) {
        return response.data.permissions;
      } else {
        return [];
      }
    } catch (error) {
      logger.error('Failed to get resource permissions:', { component: 'AuthBackendService' }, error);
      return [];
    }
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get active user sessions
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiService.get('/api/auth/sessions');

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch sessions');
      }
    } catch (error) {
      logger.error('Failed to get active sessions:', { component: 'AuthBackendService' }, error);
      throw error;
    }
  }

  /**
   * Terminate specific session
   */
  async terminateSession(sessionId: string): Promise<AuthResponse> {
    try {
      const response = await apiService.delete(`/api/auth/sessions/${sessionId}`);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Session termination failed'
        };
      }
    } catch (error) {
      logger.error('Session termination failed:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during session termination' };
    }
  }

  /**
   * Terminate all sessions except current
   */
  async terminateAllOtherSessions(): Promise<AuthResponse> {
    try {
      const response = await apiService.delete('/api/auth/sessions/others');

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Session termination failed'
        };
      }
    } catch (error) {
      logger.error('All sessions termination failed:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during session termination' };
    }
  }

  // ============================================================================
  // Security Features
  // ============================================================================

  /**
   * Get security events for user
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const response = await apiService.get(`/api/auth/security-events?limit=${limit}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch security events');
      }
    } catch (error) {
      logger.error('Failed to get security events:', { component: 'AuthBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get suspicious activity alerts
   */
  async getSuspiciousActivity(): Promise<SuspiciousActivityAlert[]> {
    try {
      const response = await apiService.get('/api/auth/suspicious-activity');

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch suspicious activity');
      }
    } catch (error) {
      logger.error('Failed to get suspicious activity:', { component: 'AuthBackendService' }, error);
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
      const response = await apiService.post('/api/auth/security-incidents', incident);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Failed to report security incident'
        };
      }
    } catch (error) {
      logger.error('Failed to report security incident:', { component: 'AuthBackendService' }, error);
      return { success: false, error: 'Network error during incident reporting' };
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
    this.tokenRefreshPromise = null;
  }
}

// Export singleton instance
export const authBackendService = new AuthBackendService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authBackendService.cleanup();
  });
}