/**
 * Auth Service - Core Business Logic
 *
 * Migrated from client/src/services/auth-service.ts
 * Comprehensive authentication service with security monitoring,
 * session management, and business logic orchestration.
 */


import { authApiService } from '@client/core/api/auth';
import type { AuthUser } from '@client/core/api/auth';
import { tokenManager } from '@client/core/auth';
import type { AuthTokens as JWTTokens } from '@client/core/auth';
import { rbacManager } from '@client/core/auth/rbac';
import { getStore } from '@client/lib/infrastructure/store';
import type { SessionInfo } from '@client/lib/infrastructure/store/slices/sessionSlice';
import { setCurrentSession } from '@client/lib/infrastructure/store/slices/sessionSlice';
import { logger } from '@client/lib/utils/logger';
import { securityMonitor, validatePassword } from '@client/lib/utils/security';

import type { AuthResponse, RegisterData, User } from './types';

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
 * Extended LoginCredentials to include rememberMe option
 */
interface ExtendedLoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

/**
 * Converts the API's AuthUser format to our internal User type
 */
const convertAuthUserToUser = (authUser: AuthUser): User => {
  return {
    id: authUser.id,
    email: authUser.email,
    
    // Map to Shared User Profile
    profile: {
      displayName: authUser.name,
      avatarUrl: authUser.avatar_url,
      bio: '',
      preferences: {
         theme: 'light',
         language: 'en',
         newsletter: true,
         marketing: false
      }, // Minimal default preferences
      privacySettings: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        showLastSeen: true
      }
    },
    verification: authUser.verified ? 'verified' : 'unverified',
    
    // Valid audit fields
    createdAt: authUser.createdAt,
    lastLogin: authUser.lastLogin,
    
    // Legacy mapping (maintained for compatibility)
    name: authUser.name,
    verified: authUser.verified,
    role: authUser.role as any, // Cast if necessary, or ensure 'citizen' matches
    
    // Other fields
    twoFactorEnabled: authUser.twoFactorEnabled,
    avatar_url: authUser.avatar_url,
    preferences: {
      notifications: true,
      emailAlerts: true,
      theme: 'light',
      language: 'en',
    },
    permissions: [],
  };
};

/**
 * AuthService class handles all authentication business logic, validation,
 * session management, security monitoring, and orchestration of API calls.
 */
export class AuthService {
  private config: AuthServiceConfig;
  private currentUser: User | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(
    config: AuthServiceConfig = {
      tokenRefresh: {
        bufferMinutes: 5,
        maxRetries: 3,
      },
    }
  ) {
    this.config = config;
  }

  /**
   * Authenticates a user with email/password credentials
   */
  async login(
    credentials: ExtendedLoginCredentials
  ): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    const currentIP = '0.0.0.0'; // In production, obtain from request headers

    try {
      // Prepare login request with proper typing
      const session = await authApiService.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
        twoFactorToken: credentials.twoFactorToken,
      });

      // Store tokens with proper structure
      const tokens: JWTTokens = {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresIn: session.tokens.expiresIn,
        tokenType: session.tokens.tokenType,
      };

      tokenManager.storeTokens(tokens);

      // Convert and cache user
      const user = convertAuthUserToUser(session.user);
      this.currentUser = user;
      const expiresAt = new Date(Date.now() + session.tokens.expiresIn * 1000);
      this.scheduleTokenRefresh(
        session.expiresAt ? new Date(session.expiresAt).getTime() : expiresAt.getTime()
      );

      const sessionExpiry = session.expiresAt
        ? new Date(session.expiresAt).toISOString()
        : expiresAt.toISOString();

      // Create properly typed session info
      const sessionInfo: SessionInfo = {
        id: crypto.randomUUID(),
        userId: session.user.id,
        deviceInfo: navigator.userAgent,
        ipAddress: currentIP,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        current: true,
      };

      getStore().dispatch(setCurrentSession(sessionInfo));
      rbacManager.clearCache();

      return {
        success: true,
        data: session,
        requires2FA: session.requiresTwoFactor,
        user,
        sessionExpiry,
      };
    } catch (error) {
      logger.error('Login failed:', { component: 'AuthService' }, error);
      const errorMsg = 'Invalid credentials or network error. Please try again.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Registers a new user with comprehensive password validation
   */
  async register(
    data: RegisterData
  ): Promise<AuthResponse & { user?: User; sessionExpiry?: string | undefined }> {
    try {
      // Validate password strength
      const passwordValidation = validatePassword(data.password);

      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.feedback.join(', ')}`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Prepare registration data
      const registerData = {
        email: data.email,
        password: data.password,
        name: data.name,
        confirmPassword: data.confirmPassword,
        acceptTerms: data.acceptTerms,
      };

      const session = await authApiService.register(registerData);

      // Store tokens with proper structure
      const tokens: JWTTokens = {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresIn: session.tokens.expiresIn,
        tokenType: session.tokens.tokenType,
      };

      tokenManager.storeTokens(tokens);

      // Convert and cache user
      const user = convertAuthUserToUser(session.user);
      this.currentUser = user;
      const expiresAt = new Date(Date.now() + session.tokens.expiresIn * 1000);
      this.scheduleTokenRefresh(
        session.expiresAt ? new Date(session.expiresAt).getTime() : expiresAt.getTime()
      );

      const sessionExpiry = session.expiresAt
        ? new Date(session.expiresAt).toISOString()
        : expiresAt.toISOString();

      // Create session info for Redux store
      const sessionInfo: SessionInfo = {
        id: crypto.randomUUID(),
        userId: session.user.id,
        deviceInfo: navigator.userAgent,
        ipAddress: '0.0.0.0', // Would be provided by server in production
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        current: true,
      };
      getStore().dispatch(setCurrentSession(sessionInfo));

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
        // Clear session from store
        const { resetSessionState } = await import(
          '@client/lib/infrastructure/store/slices/sessionSlice'
        );
        getStore().dispatch(resetSessionState());
        rbacManager.clearCache();

        // Call API logout endpoint
        await authApiService.logout();
      }
    } catch (error) {
      logger.error('Logout request failed:', { component: 'AuthService' }, error);
    } finally {
      // Always clean up local state
      this.clearTokenRefreshTimer();
      this.currentUser = null;
      tokenManager.clearTokens();
    }
  }

  /**
   * Manually refreshes authentication tokens
   */
  async refreshTokens(): Promise<
    AuthResponse & { user?: User; sessionExpiry?: string | undefined }
  > {
    try {
      // Request new tokens from API
      const tokens = await authApiService.refreshTokens();
      const user = await authApiService.getCurrentUser();

      // Structure tokens properly
      const jwtTokens: JWTTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      };

      tokenManager.storeTokens(jwtTokens);

      // Update cached user and schedule next refresh
      const convertedUser = convertAuthUserToUser(user);
      this.currentUser = convertedUser;
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      this.scheduleTokenRefresh(expiresAt.getTime());

      const sessionExpiry = expiresAt.toISOString();

      return {
        success: true,
        data: { user: convertedUser, tokens: jwtTokens },
        user: convertedUser,
        sessionExpiry,
      };
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'AuthService' }, error);

      // Clean up on refresh failure
      this.clearTokenRefreshTimer();
      this.currentUser = null;
      tokenManager.clearTokens();

      const errorMsg = 'Session expired. Please log in again.';
      return { success: false, error: errorMsg };
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
   * Schedule automatic token refresh before expiration
   * @param expiresAt - Token expiration timestamp in milliseconds
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    this.clearTokenRefreshTimer();

    // Calculate when to refresh (buffer time before actual expiration)
    const bufferMs = this.config.tokenRefresh.bufferMinutes * 60 * 1000;
    const refreshAt = expiresAt - bufferMs;
    const delay = refreshAt - Date.now();

    // Only schedule if the refresh time is in the future
    if (delay > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshTokens().catch(error => {
          logger.error('Automatic token refresh failed:', { component: 'AuthService' }, error);
        });
      }, delay);
    }
  }

  /**
   * Clear any existing token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
}

// Export singleton instance for easy consumption
export const authService = new AuthService();

// Export default for compatibility
export default authService;
