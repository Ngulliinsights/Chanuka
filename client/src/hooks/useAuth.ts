/**
 * Authentication Hook
 * 
 * Provides authentication functionality with backend integration,
 * session management, and automatic token refresh.
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/slices/authSlice';
import { authBackendService, type LoginCredentials, type RegisterData } from '../services/authBackendService';
import { logger } from '../utils/logger';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    sessionExpiry,
    isInitialized,
    twoFactorRequired,
    login: loginAction,
    register: registerAction,
    logout: logoutAction,
    validateSession,
    refreshTokens,
    updateProfile,
    oauthLogin,
    verifyTwoFactor,
    clearError,
    setUser,
    resetState
  } = useAuthStore();

  // Initialize authentication on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized]);

  // Set up automatic token refresh
  useEffect(() => {
    if (isAuthenticated && sessionExpiry) {
      const expiryTime = new Date(sessionExpiry).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000);
      
      if (refreshTime > 0) {
        const timeoutId = setTimeout(() => {
          handleTokenRefresh();
        }, refreshTime);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isAuthenticated, sessionExpiry]);

  const initializeAuth = async () => {
    try {
      await validateSession();
    } catch (error) {
      logger.info('No valid session found during initialization');
    }
  };

  const handleTokenRefresh = async () => {
    try {
      await refreshTokens();
      logger.info('Tokens refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed, logging out', { error });
      await logoutAction();
    }
  };

  // Authentication methods
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await loginAction(credentials);
      logger.info('User logged in successfully', { email: credentials.email });
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw error;
    }
  }, [loginAction]);

  const register = useCallback(async (data: RegisterData) => {
    try {
      await registerAction(data);
      logger.info('User registered successfully', { email: data.email });
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error });
      throw error;
    }
  }, [registerAction]);

  const logout = useCallback(async () => {
    try {
      await logoutAction();
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', { error });
      // Still reset local state even if server logout fails
      resetState();
    }
  }, [logoutAction, resetState]);

  const updateUserProfile = useCallback(async (updates: any) => {
    try {
      await updateProfile(updates);
      logger.info('User profile updated successfully');
    } catch (error) {
      logger.error('Profile update failed', { error });
      throw error;
    }
  }, [updateProfile]);

  const loginWithOAuth = useCallback(async (code: string, state?: string) => {
    try {
      await oauthLogin(code, state);
      logger.info('OAuth login successful');
    } catch (error) {
      logger.error('OAuth login failed', { error });
      throw error;
    }
  }, [oauthLogin]);

  const verify2FA = useCallback(async (token: string) => {
    try {
      await verifyTwoFactor(token);
      logger.info('2FA verification successful');
    } catch (error) {
      logger.error('2FA verification failed', { error });
      throw error;
    }
  }, [verifyTwoFactor]);

  // OAuth helpers
  const getOAuthUrl = useCallback((provider: string, state?: string) => {
    return authBackendService.getOAuthUrl(provider, state);
  }, []);

  const requestPushPermission = useCallback(async () => {
    return await authBackendService.requestPushPermission();
  }, []);

  // Session management
  const extendSession = useCallback(async () => {
    try {
      await authBackendService.extendSession();
      logger.info('Session extended successfully');
    } catch (error) {
      logger.error('Failed to extend session', { error });
      throw error;
    }
  }, []);

  const getSessions = useCallback(async () => {
    try {
      return await authBackendService.getSessions();
    } catch (error) {
      logger.error('Failed to get sessions', { error });
      throw error;
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      await authBackendService.revokeSession(sessionId);
      logger.info('Session revoked successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });
      throw error;
    }
  }, []);

  // Password management
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await authBackendService.changePassword(currentPassword, newPassword);
      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password', { error });
      throw error;
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string, redirectUrl?: string) => {
    try {
      await authBackendService.requestPasswordReset({ email, redirectUrl });
      logger.info('Password reset requested', { email });
    } catch (error) {
      logger.error('Failed to request password reset', { email, error });
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      await authBackendService.resetPassword({ token, newPassword, confirmPassword });
      logger.info('Password reset successful');
    } catch (error) {
      logger.error('Failed to reset password', { error });
      throw error;
    }
  }, []);

  // Two-factor authentication
  const setup2FA = useCallback(async () => {
    try {
      return await authBackendService.setupTwoFactor();
    } catch (error) {
      logger.error('Failed to setup 2FA', { error });
      throw error;
    }
  }, []);

  const enable2FA = useCallback(async (token: string) => {
    try {
      return await authBackendService.enableTwoFactor(token);
    } catch (error) {
      logger.error('Failed to enable 2FA', { error });
      throw error;
    }
  }, []);

  const disable2FA = useCallback(async (token: string) => {
    try {
      await authBackendService.disableTwoFactor(token);
      logger.info('2FA disabled successfully');
    } catch (error) {
      logger.error('Failed to disable 2FA', { error });
      throw error;
    }
  }, []);

  // Role-based access control
  const hasPermission = useCallback((permission: string) => {
    return authBackendService.hasPermission(permission);
  }, []);

  const hasRole = useCallback((role: string) => {
    return authBackendService.hasRole(role);
  }, []);

  const hasAnyRole = useCallback((roles: string[]) => {
    return authBackendService.hasAnyRole(roles);
  }, []);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    sessionExpiry,
    isInitialized,
    twoFactorRequired,

    // Authentication methods
    login,
    register,
    logout,
    updateUserProfile,
    loginWithOAuth,
    verify2FA,
    clearError,

    // OAuth helpers
    getOAuthUrl,
    requestPushPermission,

    // Session management
    extendSession,
    getSessions,
    revokeSession,

    // Password management
    changePassword,
    requestPasswordReset,
    resetPassword,

    // Two-factor authentication
    setup2FA,
    enable2FA,
    disable2FA,

    // Role-based access control
    hasPermission,
    hasRole,
    hasAnyRole,

    // Utility methods
    refreshTokens: handleTokenRefresh
  };
}

export default useAuth;