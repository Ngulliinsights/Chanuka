import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  User,
  AuthContextType,
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
import { securityMonitor } from '../utils/security-monitoring';
import { privacyCompliance } from '../utils/privacy-compliance';
import { validatePassword } from '../utils/password-validation';
import { apiService } from '../services/apiService';
import { authApiService } from '../core/api/auth';
import { tokenManager } from '../utils/tokenManager';
import { sessionManager } from '../utils/sessionManager';
import { rbacManager } from '../utils/rbac';

interface UnifiedAuthContextType extends Omit<AuthContextType, 'resetPassword' | 'enableTwoFactor' | 'disableTwoFactor' | 'loading'> {
  // Override incompatible methods
  resetPassword: (token: string, password: string) => Promise<AuthResponse>;
  enableTwoFactor: (code: string) => Promise<AuthResponse>;
  disableTwoFactor: (password: string) => Promise<AuthResponse>;
  loading: boolean;

  // Additional state
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;

  // Additional methods from useAuth.ts
  updateUserProfile: (updates: any) => Promise<AuthResponse>;
  loginWithOAuth: (code: string, state?: string) => Promise<AuthResponse>;
  verifyTwoFactor: (token: string) => Promise<AuthResponse>;
  getOAuthUrl: (provider: string, state?: string) => string;
  requestPushPermission: () => Promise<any>;
  extendSession: () => Promise<AuthResponse>;
  terminateAllSessions: () => Promise<AuthResponse>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  clearError: () => void;
  refreshTokens: () => Promise<void>;
}

const AuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const mountedRef = useRef(true);
  const validationInProgressRef = useRef(false);

  // Initialize authentication
  useEffect(() => {
    mountedRef.current = true;

    // Initialize session manager
    sessionManager.onWarning((warning) => {
      logger.warn('Session warning:', { component: 'AuthProvider', warning });
    });

    // Check for existing tokens
    const tokens = tokenManager.getTokens();
    if (tokens && !validationInProgressRef.current) {
      validateStoredTokens();
    } else if (!tokens) {
      if (mountedRef.current) {
        setLoading(false);
        setIsInitialized(true);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Automatic token refresh
  useEffect(() => {
    if (user && sessionExpiry) {
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
  }, [user, sessionExpiry]);

  const validateStoredTokens = async () => {
    if (validationInProgressRef.current) {
      return;
    }

    validationInProgressRef.current = true;

    try {
      const validation = tokenManager.validateToken();

      if (!validation.isValid) {
        try {
          const tokens = await authApiService.refreshTokens();
          const user = await authApiService.getCurrentUser();
          tokenManager.storeTokens(tokens, user);
          if (mountedRef.current) {
            setUser(user as User);
            setSessionExpiry(new Date(tokens.expiresIn * 1000 + Date.now()).toISOString());
            sessionManager.startSession(user as User);
          }
        } catch (error) {
          tokenManager.clearTokens();
          if (mountedRef.current) {
            setUser(null);
            setSessionExpiry(null);
          }
        }
      } else {
        const response = await apiService.get('/api/auth/verify');

        if (response.success && response.data?.user) {
          if (mountedRef.current) {
            setUser(response.data.user);
            setSessionExpiry(response.data.sessionExpiry || null);
            sessionManager.startSession(response.data.user);
          }
        } else {
          tokenManager.clearTokens();
          if (mountedRef.current) {
            setUser(null);
            setSessionExpiry(null);
          }
        }
      }
    } catch (error) {
      logger.error('Token validation failed:', { component: 'AuthProvider' }, error);
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
        setSessionExpiry(null);
      }
    } finally {
      validationInProgressRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setIsInitialized(true);
      }
    }
  };

  const handleTokenRefresh = async () => {
    try {
      const tokens = await authApiService.refreshTokens();
      const user = await authApiService.getCurrentUser();
      tokenManager.storeTokens(tokens, user);
      if (mountedRef.current) {
        setUser(user as unknown as User);
        setSessionExpiry(new Date(tokens.expiresIn * 1000 + Date.now()).toISOString());
      }
      logger.info('Tokens refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed', error);
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
        setSessionExpiry(null);
      }
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Authentication methods
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const deviceFingerprint = securityMonitor.generateDeviceFingerprint();
    const currentIP = '0.0.0.0';

    try {
      if (securityMonitor.shouldLockAccount(currentIP)) {
        const errorMsg = 'Account temporarily locked due to multiple failed attempts. Please try again later.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const response = await apiService.post('/api/auth/login', {
        ...credentials,
        device_fingerprint: deviceFingerprint,
      });

      if (response.success && response.data) {
        const alerts = securityMonitor.recordLoginAttempt(
          currentIP,
          navigator.userAgent,
          true,
          response.data.user.id
        );

        const deviceAlerts = securityMonitor.analyzeDeviceFingerprint(
          response.data.user.id,
          deviceFingerprint
        );

        const tokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000 || 24 * 60 * 60 * 1000),
          tokenType: 'Bearer' as const
        };

        tokenManager.storeTokens(tokens, response.data.user);

        const securityEvent = securityMonitor.createSecurityEvent(
          response.data.user.id,
          'login',
          {
            device_fingerprint: deviceFingerprint,
            suspicious_alerts: [...alerts, ...deviceAlerts].length
          }
        );
        securityMonitor.logSecurityEvent(securityEvent);

        if (mountedRef.current) {
          setUser(response.data.user);
          setSessionExpiry(new Date(tokens.expiresAt).toISOString());
          sessionManager.startSession(response.data.user);
          rbacManager.clearUserCache(response.data.user.id);
        }

        return {
          success: true,
          data: response.data,
          requires2FA: response.data.requires_2fa
        };
      } else {
        securityMonitor.recordLoginAttempt(
          currentIP,
          navigator.userAgent,
          false
        );

        const errorMsg = (response as any).error?.message || 'Login failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      securityMonitor.recordLoginAttempt(
        currentIP,
        navigator.userAgent,
        false
      );

      logger.error('Login failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const passwordValidation = validatePassword(data.password, undefined, {
        email: data.email,
        name: `${data.first_name} ${data.last_name}`,
      });

      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      const consentRecords = data.consent_records?.map(consent =>
        privacyCompliance.recordConsent(
          'pending',
          consent.consent_type,
          consent.granted,
          consent.version
        )
      ) || [];

      const deviceFingerprint = securityMonitor.generateDeviceFingerprint();

      const response = await apiService.post('/api/auth/register', {
        ...data,
        device_fingerprint: deviceFingerprint,
        consent_records: consentRecords,
      });

      if (response.success && response.data) {
        const tokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000 || 24 * 60 * 60 * 1000),
          tokenType: 'Bearer' as const
        };

        tokenManager.storeTokens(tokens, response.data.user);

        const securityEvent = securityMonitor.createSecurityEvent(
          response.data.user.id,
          'login',
          {
            registration: true,
            device_fingerprint: deviceFingerprint
          }
        );
        securityMonitor.logSecurityEvent(securityEvent);

        if (mountedRef.current) {
          setUser(response.data.user);
          setSessionExpiry(new Date(tokens.expiresAt).toISOString());
          sessionManager.startSession(response.data.user);
        }

        return {
          success: true,
          requiresVerification: response.data.requiresVerification,
          data: response.data
        };
      } else {
        const errorMsg = (response as any).error?.message || 'Registration failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Registration failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (user) {
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'logout'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        await sessionManager.endSession();
        rbacManager.clearUserCache(user.id);
        await apiService.post('/api/auth/logout', {});
      }
    } catch (error) {
      logger.error('Logout request failed:', { component: 'AuthProvider' }, error);
    } finally {
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
        setSessionExpiry(null);
        setTwoFactorRequired(false);
      }
    }
  };

  const refreshToken = async (): Promise<AuthResponse> => {
    try {
      const tokens = await authApiService.refreshTokens();
      const user = await authApiService.getCurrentUser();
      tokenManager.storeTokens(tokens, user);
      if (mountedRef.current) {
        setUser(user as unknown as User);
        setSessionExpiry(new Date(tokens.expiresIn * 1000 + Date.now()).toISOString());
      }
      return { success: true, data: { user, tokens } };
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'AuthProvider' }, error);
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
        setSessionExpiry(null);
      }
      const errorMsg = 'Network error during token refresh';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyEmail = async (token: string): Promise<AuthResponse> => {
    try {
      const response = await apiService.post('/api/auth/verify-email', { token });

      if (response.success && response.data?.user) {
        if (mountedRef.current) {
          setUser(response.data.user);
        }
        return { success: true, data: response.data };
      } else {
        const errorMsg = (response as any).error?.message || 'Email verification failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Email verification failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const requestPasswordReset = async (email: string, redirectUrl?: string): Promise<AuthResponse> => {
    try {
      const response = await apiService.post('/api/auth/forgot-password', { email, redirectUrl });

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Password reset request failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Password reset request failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
    try {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      await authApiService.resetPassword({ token, newPassword: password, confirmPassword: password });

      return { success: true };
    } catch (error) {
      logger.error('Password reset failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const passwordValidation = validatePassword(newPassword, undefined, {
        email: user.email,
        name: user.name,
        username: user.username,
      });

      if (!passwordValidation.isValid) {
        const errorMsg = `Password requirements not met: ${passwordValidation.errors.join(', ')}`;
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      const response = await apiService.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'password_change'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Password change failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Password change failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const setupTwoFactor = async (): Promise<TwoFactorSetup> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/api/auth/2fa/setup', {});

      if (response.success && response.data) {
        return response.data as TwoFactorSetup;
      } else {
        throw new Error((response as any).error?.message || 'Two-factor setup failed');
      }
    } catch (error) {
      logger.error('Two-factor setup failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const enableTwoFactor = async (token: string): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const response = await apiService.post('/api/auth/2fa/enable', { code: token });

      if (response.success) {
        if (mountedRef.current) {
          setUser({ ...user, two_factor_enabled: true });
        }

        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'two_factor_enabled'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Two-factor enable failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Two-factor enable failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const disableTwoFactor = async (token: string): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const response = await apiService.post('/api/auth/2fa/disable', { password: token });

      if (response.success) {
        if (mountedRef.current) {
          setUser({ ...user, two_factor_enabled: false });
        }

        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'two_factor_disabled'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Two-factor disable failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Two-factor disable failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const verifyTwoFactor = async (token: string): Promise<AuthResponse> => {
    try {
      const session = await authApiService.verifyTwoFactor(token);

      if (mountedRef.current) {
        setUser(session.user as unknown as User);
        setSessionExpiry(session.expiresAt ? new Date(session.expiresAt).toISOString() : null);
        setTwoFactorRequired(false);
        sessionManager.startSession(session.user as unknown as User);
      }
      return { success: true, data: session };
    } catch (error) {
      logger.error('Two-factor verification failed', error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateUserProfile = async (updates: any): Promise<AuthResponse> => {
    try {
      const updatedUser = await authApiService.updateProfile(updates);

      if (mountedRef.current) {
        setUser({ ...user!, ...updatedUser });
      }
      logger.info('User profile updated successfully');
      return { success: true, data: updatedUser };
    } catch (error) {
      logger.error('Profile update failed', error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const loginWithOAuth = async (code: string, state?: string): Promise<AuthResponse> => {
    try {
      const session = await authApiService.handleOAuthCallback('google', code, state || '');

      if (mountedRef.current) {
        setUser(session.user as unknown as User);
        setSessionExpiry(session.expiresAt ? new Date(session.expiresAt).toISOString() : null);
        sessionManager.startSession(session.user as unknown as User);
      }
      logger.info('OAuth login successful');
      return { success: true, data: session };
    } catch (error) {
      logger.error('OAuth login failed', error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const getOAuthUrl = (provider: string, state?: string): string => {
    // Simple implementation - in real app, this would be more complex
    const baseUrl = `https://accounts.google.com/o/oauth2/v2/auth`; // example for google
    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
      redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
      scope: 'openid profile email',
      response_type: 'code',
      state: state || ''
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const requestPushPermission = async (): Promise<any> => {
    // Implement push permission request
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted' };
    }
    return { granted: false };
  };

  const extendSession = async (): Promise<AuthResponse> => {
    try {
      await authApiService.extendSession();

      logger.info('Session extended successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to extend session', error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const getActiveSessions = async (): Promise<SessionInfo[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.get('/api/auth/sessions');

      if (response.success && response.data) {
        return response.data as SessionInfo[];
      } else {
        throw new Error((response as any).error?.message || 'Failed to fetch active sessions');
      }
    } catch (error) {
      logger.error('Active sessions fetch failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const terminateSession = async (sessionId: string): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const response = await apiService.delete(`/api/auth/sessions/${sessionId}`);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Session termination failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Session termination failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const terminateAllSessions = async (): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const response = await apiService.delete('/api/auth/sessions');

      if (response.success) {
        await logout();
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Session termination failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('All sessions termination failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<AuthResponse> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      const validation = privacyCompliance.validatePrivacySettings({
        ...user.privacy_settings,
        ...settings,
      });

      if (!validation.isValid) {
        const errorMsg = `Privacy settings validation failed: ${validation.errors.join(', ')}`;
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }

      const response = await apiService.put('/api/auth/privacy-settings', settings);

      if (response.success && response.data) {
        if (mountedRef.current) {
          setUser({
            ...user,
            privacy_settings: { ...user.privacy_settings, ...settings }
          });
        }

        return { success: true, data: response.data };
      } else {
        const errorMsg = (response as any).error?.message || 'Privacy settings update failed';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      logger.error('Privacy settings update failed:', { component: 'AuthProvider' }, error);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const requestDataExport = async (format: 'json' | 'csv' | 'xml', includes: string[]): Promise<DataExportRequest> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/api/privacy/export', {
        format,
        includes,
      });

      if (response.success) {
        return response.data as DataExportRequest;
      } else {
        throw new Error(response.error?.message || 'Data export request failed');
      }
    } catch (error) {
      logger.error('Data export request failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const requestDataDeletion = async (retentionPeriod: string, includes: string[]): Promise<DataDeletionRequest> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.post('/api/privacy/delete', {
        retention_period: retentionPeriod,
        includes,
      });

      if (response.success) {
        return response.data as DataDeletionRequest;
      } else {
        throw new Error(response.error?.message || 'Data deletion request failed');
      }
    } catch (error) {
      logger.error('Data deletion request failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const getSecurityEvents = async (limit: number = 50): Promise<SecurityEvent[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.get(`/api/auth/security-events?limit=${limit}`);

      if (response.success && response.data) {
        return response.data as SecurityEvent[];
      } else {
        throw new Error((response as any).error?.message || 'Failed to fetch security events');
      }
    } catch (error) {
      logger.error('Security events fetch failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const getSuspiciousActivity = async (): Promise<SuspiciousActivityAlert[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await apiService.get('/api/auth/suspicious-activity');

      if (response.success && response.data) {
        return response.data as SuspiciousActivityAlert[];
      } else {
        throw new Error((response as any).error?.message || 'Failed to fetch suspicious activity');
      }
    } catch (error) {
      logger.error('Suspicious activity fetch failed:', { component: 'AuthProvider' }, error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return (user as any).permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const refreshTokens = async (): Promise<void> => {
    await handleTokenRefresh();
  };

  const value: UnifiedAuthContextType = {
    user,
    login,
    register,
    logout,
    refreshToken,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    updatePrivacySettings,
    requestDataExport,
    requestDataDeletion,
    getSecurityEvents,
    getSuspiciousActivity,
    getActiveSessions,
    terminateSession,
    terminateAllSessions,
    loading,
    isAuthenticated: !!user,
    updateUser: (userData: Partial<User>) => {
      if (user) {
        setUser({ ...user, ...userData });
      }
    },
    // Additional
    error,
    sessionExpiry,
    isInitialized,
    twoFactorRequired,
    updateUserProfile,
    loginWithOAuth,
    verifyTwoFactor,
    getOAuthUrl,
    requestPushPermission,
    extendSession,
    clearError,
    hasPermission,
    hasRole,
    hasAnyRole,
    refreshTokens
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;