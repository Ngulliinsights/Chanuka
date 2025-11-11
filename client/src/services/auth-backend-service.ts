/**
 * Authentication Backend Service
 * 
 * Handles JWT token management, OAuth integration, session management,
 * and role-based access control for the Chanuka platform.
 */

import { globalConfig } from '../core/api/config';
import { logger } from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
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
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  expiresAt: string;
}

export interface OAuthProvider {
  name: 'google' | 'github' | 'facebook' | 'twitter';
  clientId: string;
  redirectUri: string;
  scope: string[];
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

class AuthBackendService {
  private baseUrl: string;
  private timeout: number;
  private tokenRefreshPromise: Promise<AuthTokens> | null = null;

  constructor() {
    this.baseUrl = globalConfig.get('api').baseUrl;
    this.timeout = globalConfig.get('api').timeout;
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      const session: AuthSession = response.data;
      
      // Store tokens securely
      this.storeTokens(session.tokens, credentials.rememberMe);
      
      logger.info('User logged in successfully', { 
        userId: session.user.id, 
        email: session.user.email 
      });

      return session;
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw new Error('Invalid email or password');
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      const session: AuthSession = response.data;
      
      // Store tokens securely
      this.storeTokens(session.tokens, false);
      
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

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (refreshToken) {
        await this.makeRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (error) {
      logger.warn('Logout request failed (continuing with local cleanup)', { error });
    } finally {
      // Always clear local tokens
      this.clearTokens();
      logger.info('User logged out');
    }
  }

  async refreshTokens(): Promise<AuthTokens> {
    // Prevent multiple simultaneous refresh requests
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();
    
    try {
      const tokens = await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;
      return tokens;
    } catch (error) {
      this.tokenRefreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.makeRequest('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      const tokens: AuthTokens = response.data;
      
      // Update stored tokens
      this.storeTokens(tokens, this.isRememberMeEnabled());
      
      logger.info('Tokens refreshed successfully');
      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      this.clearTokens();
      throw new Error('Session expired. Please log in again.');
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await this.makeRequest('/api/auth/me');
      return response.data;
    } catch (error) {
      logger.error('Failed to get current user', { error });
      throw new Error('Failed to get user information');
    }
  }

  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await this.makeRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      logger.info('Profile updated successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to update profile', { error });
      throw new Error('Failed to update profile');
    }
  }

  // OAuth Methods
  async getOAuthProviders(): Promise<OAuthProvider[]> {
    try {
      const response = await this.makeRequest('/api/auth/oauth/providers');
      return response.data;
    } catch (error) {
      logger.error('Failed to get OAuth providers', { error });
      return [];
    }
  }

  getOAuthUrl(provider: string, state?: string): string {
    const params = new URLSearchParams({
      provider,
      redirect_uri: `${window.location.origin}/auth/callback`,
      ...(state && { state })
    });

    return `${this.baseUrl}/api/auth/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state?: string): Promise<AuthSession> {
    try {
      const response = await this.makeRequest('/api/auth/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state })
      });

      const session: AuthSession = response.data;
      
      // Store tokens securely
      this.storeTokens(session.tokens, false);
      
      logger.info('OAuth login successful', { 
        userId: session.user.id, 
        email: session.user.email 
      });

      return session;
    } catch (error) {
      logger.error('OAuth callback failed', { error });
      throw new Error('OAuth authentication failed');
    }
  }

  // Two-Factor Authentication
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/setup', {
        method: 'POST'
      });

      logger.info('2FA setup initiated');
      return response.data;
    } catch (error) {
      logger.error('Failed to setup 2FA', { error });
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  async enableTwoFactor(token: string): Promise<{ backupCodes: string[] }> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      logger.info('2FA enabled successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to enable 2FA', { error });
      throw new Error('Invalid verification code');
    }
  }

  async disableTwoFactor(token: string): Promise<void> {
    try {
      await this.makeRequest('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      logger.info('2FA disabled successfully');
    } catch (error) {
      logger.error('Failed to disable 2FA', { error });
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  async verifyTwoFactor(token: string): Promise<AuthTokens> {
    try {
      const response = await this.makeRequest('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      const tokens: AuthTokens = response.data;
      this.storeTokens(tokens, this.isRememberMeEnabled());

      logger.info('2FA verification successful');
      return tokens;
    } catch (error) {
      logger.error('2FA verification failed', { error });
      throw new Error('Invalid verification code');
    }
  }

  // Password Management
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.makeRequest('/api/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password', { error });
      throw new Error('Failed to change password');
    }
  }

  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
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

  async resetPassword(reset: PasswordReset): Promise<void> {
    try {
      await this.makeRequest('/api/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(reset)
      });

      logger.info('Password reset successful');
    } catch (error) {
      logger.error('Failed to reset password', { error });
      throw new Error('Failed to reset password');
    }
  }

  // Session Management
  async validateSession(): Promise<boolean> {
    try {
      // Since tokens are in HttpOnly cookies, we validate by making an API call
      // that will automatically include the cookies. If the call succeeds, the session is valid.
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.warn('Session validation failed', { error });

      // Try to refresh tokens if validation failed
      try {
        await this.refreshTokens();
        // If refresh succeeds, validate again
        await this.getCurrentUser();
        return true;
      } catch (refreshError) {
        logger.warn('Token refresh failed during session validation', { refreshError });
        return false;
      }
    }
  }

  async extendSession(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/session/extend', {
        method: 'POST'
      });

      logger.info('Session extended');
    } catch (error) {
      logger.error('Failed to extend session', { error });
      throw new Error('Failed to extend session');
    }
  }

  async getSessions(): Promise<Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    lastActive: string;
    current: boolean;
  }>> {
    try {
      const response = await this.makeRequest('/api/auth/sessions');
      return response.data;
    } catch (error) {
      logger.error('Failed to get sessions', { error });
      throw new Error('Failed to get active sessions');
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      logger.info('Session revoked', { sessionId });
    } catch (error) {
      logger.error('Failed to revoke session', { error });
      throw new Error('Failed to revoke session');
    }
  }

  // Token Management - HttpOnly cookies handled by server
  getAccessToken(): string | null {
    // Tokens are now stored in HttpOnly cookies, not accessible to client
    // Return null to indicate tokens are not directly accessible
    return null;
  }

  getRefreshToken(): string | null {
    // Tokens are now stored in HttpOnly cookies, not accessible to client
    // Return null to indicate tokens are not directly accessible
    return null;
  }

  private storeTokens(tokens: AuthTokens, persistent: boolean = false): void {
    // Tokens are now stored in HttpOnly cookies by the server
    // No client-side storage needed
    logger.info('Tokens stored in HttpOnly cookies by server', {
      persistent,
      expiresIn: tokens.expiresIn
    });
  }

  private clearTokens(): void {
    // Tokens are cleared by server when cookies expire or are invalidated
    // Client doesn't need to do anything special
    logger.info('Tokens cleared from HttpOnly cookies');
  }

  private isRememberMeEnabled(): boolean {
    // This information is now managed server-side with cookie settings
    // Default to false for client-side logic
    return false;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  // Role-Based Access Control
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUserFromToken();
    return user?.permissions?.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUserFromToken();
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUserFromToken();
    return roles.includes(user?.role || '');
  }

  private getCurrentUserFromToken(): AuthUser | null {
    try {
      const token = this.getAccessToken();
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user || null;
    } catch {
      return null;
    }
  }

  // Utility Methods
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // HttpOnly cookies are sent automatically by browser, no need to add Authorization header
    // The server will read tokens from HttpOnly cookies

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle token expiration
        if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
          try {
            await this.refreshTokens();
            // Retry the request with new token
            return this.makeRequest(endpoint, options);
          } catch {
            this.clearTokens();
            throw new Error('Session expired. Please log in again.');
          }
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }
}

// Export singleton instance
export const authBackendService = new AuthBackendService();
export default authBackendService;