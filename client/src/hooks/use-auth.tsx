import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
import { authBackendService } from '../services/authBackendService';
import { tokenManager } from '../utils/tokenManager';
import { sessionManager } from '../utils/sessionManager';
import { rbacManager } from '../utils/rbac';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const validationInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // Initialize session manager
    sessionManager.onWarning((warning) => {
      logger.warn('Session warning:', { component: 'AuthProvider', warning });
      // Handle session warnings (could show notifications)
    });

    // Check for existing tokens
    const tokens = tokenManager.getTokens();
    if (tokens && !validationInProgressRef.current) {
      validateStoredTokens();
    } else if (!tokens) {
      if (mountedRef.current) {
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateStoredTokens = async () => {
    // Prevent multiple simultaneous validation requests
    if (validationInProgressRef.current) {
      return;
    }

    validationInProgressRef.current = true;

    try {
      // Check if token metadata indicates expiration
      const validation = tokenManager.validateToken();

      if (!validation.isValid) {
        // Try to refresh token via API call (HttpOnly cookies will be sent automatically)
        const refreshResult = await authBackendService.refreshToken();

        if (refreshResult.success && refreshResult.tokens && refreshResult.user) {
          tokenManager.storeTokens(refreshResult.tokens, refreshResult.user);
          if (mountedRef.current) {
            setUser(refreshResult.user);
            sessionManager.startSession(refreshResult.user);
          }
        } else {
          // Refresh failed, clear token metadata
          tokenManager.clearTokens();
          if (mountedRef.current) {
            setUser(null);
          }
        }
      } else {
        // Token metadata indicates validity, verify with server
        // Server will check HttpOnly cookies automatically
        const response = await apiService.get('/api/auth/verify');

        if (response.success && response.data?.user) {
          if (mountedRef.current) {
            setUser(response.data.user);
            sessionManager.startSession(response.data.user);
          }
        } else {
          tokenManager.clearTokens();
          if (mountedRef.current) {
            setUser(null);
          }
        }
      }
    } catch (error) {
      logger.error('Token validation failed:', { component: 'AuthProvider' }, error);
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      validationInProgressRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (mountedRef.current) {
      setLoading(true);
    }

    const deviceFingerprint = securityMonitor.generateDeviceFingerprint();
    const currentIP = '0.0.0.0'; // Would be provided by server in production

    try {
      // Check for rate limiting
      if (securityMonitor.shouldLockAccount(currentIP)) {
        return { 
          success: false, 
          error: 'Account temporarily locked due to multiple failed attempts. Please try again later.' 
        };
      }

      const response = await apiService.post('/api/auth/login', {
        ...credentials,
        device_fingerprint: deviceFingerprint,
      });

      if (response.success && response.data) {
        // Record successful login
        const alerts = securityMonitor.recordLoginAttempt(
          currentIP,
          navigator.userAgent,
          true,
          response.data.user.id
        );

        // Analyze device fingerprint
        const deviceAlerts = securityMonitor.analyzeDeviceFingerprint(
          response.data.user.id,
          deviceFingerprint
        );

        // Store tokens securely using token manager
        const tokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000 || 24 * 60 * 60 * 1000), // Default 24h
          tokenType: 'Bearer' as const
        };

        tokenManager.storeTokens(tokens, response.data.user);

        // Create security event
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
          sessionManager.startSession(response.data.user);
          rbacManager.clearUserCache(response.data.user.id); // Clear any cached permissions
        }

        return {
          success: true,
          data: response.data,
          requires2FA: response.data.requires_2fa
        };
      } else {
        // Record failed login
        securityMonitor.recordLoginAttempt(
          currentIP,
          navigator.userAgent,
          false
        );

        return {
          success: false,
          error: (response as any).error?.message || 'Login failed'
        };
      }
    } catch (error) {
      // Record failed login
      securityMonitor.recordLoginAttempt(
        currentIP,
        navigator.userAgent,
        false
      );

      logger.error('Login failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const register = async (data: RegisterData): Promise<AuthResponse> => {
    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      // Validate password strength
      const passwordValidation = validatePassword(data.password, undefined, {
        email: data.email,
        name: `${data.first_name} ${data.last_name}`,
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password requirements not met: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Record consent if provided
      const consentRecords = data.consent_records?.map(consent =>
        privacyCompliance.recordConsent(
          'pending', // Will be updated with actual user ID after registration
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
        // Store tokens securely using token manager
        const tokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (response.data.expires_in * 1000 || 24 * 60 * 60 * 1000), // Default 24h
          tokenType: 'Bearer' as const
        };

        tokenManager.storeTokens(tokens, response.data.user);

        // Create security event for new registration
        const securityEvent = securityMonitor.createSecurityEvent(
          response.data.user.id,
          'login', // First login after registration
          {
            registration: true,
            device_fingerprint: deviceFingerprint
          }
        );
        securityMonitor.logSecurityEvent(securityEvent);

        if (mountedRef.current) {
          setUser(response.data.user);
          sessionManager.startSession(response.data.user);
        }

        return {
          success: true,
          requiresVerification: response.data.requiresVerification,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: (response as any).error?.message || 'Registration failed'
        };
      }
    } catch (error) {
      logger.error('Registration failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (user) {
        // Create security event for logout
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'logout'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        // End session
        await sessionManager.endSession();
        
        // Clear user permissions cache
        rbacManager.clearUserCache(user.id);

        // Notify backend
        await apiService.post('/api/auth/logout', {});
      }
    } catch (error) {
      logger.error('Logout request failed:', { component: 'AuthProvider' }, error);
    } finally {
      // Clear all tokens and session data
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
      }
    }
  };

  const refreshToken = async (): Promise<AuthResponse> => {
    try {
      const result = await authBackendService.refreshToken();
      
      if (result.success && result.tokens && result.user) {
        tokenManager.storeTokens(result.tokens, result.user);
        if (mountedRef.current) {
          setUser(result.user);
        }
        return { success: true, data: { user: result.user, tokens: result.tokens } };
      } else {
        tokenManager.clearTokens();
        if (mountedRef.current) {
          setUser(null);
        }
        return { 
          success: false, 
          error: result.error || 'Token refresh failed' 
        };
      }
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'AuthProvider' }, error);
      tokenManager.clearTokens();
      if (mountedRef.current) {
        setUser(null);
      }
      return { success: false, error: 'Network error during token refresh' };
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
        return {
          success: false,
          error: (response as any).error?.message || 'Email verification failed'
        };
      }
    } catch (error) {
      logger.error('Email verification failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    try {
      const response = await apiService.post('/api/auth/forgot-password', { email });

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Password reset request failed' 
        };
      }
    } catch (error) {
      logger.error('Password reset request failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
    try {
      // Validate new password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password requirements not met: ${passwordValidation.errors.join(', ')}`
        };
      }

      const response = await apiService.post('/api/auth/reset-password', { 
        token, 
        password 
      });

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Password reset failed' 
        };
      }
    } catch (error) {
      logger.error('Password reset failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // New enhanced authentication methods
  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate new password
      const passwordValidation = validatePassword(newPassword, undefined, {
        email: user.email,
        name: user.name,
        username: user.username,
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password requirements not met: ${passwordValidation.errors.join(', ')}`
        };
      }

      const response = await apiService.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        // Create security event
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'password_change'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Password change failed' 
        };
      }
    } catch (error) {
      logger.error('Password change failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
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

  const enableTwoFactor = async (code: string): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await apiService.post('/api/auth/2fa/enable', { code });

      if (response.success) {
        // Update user state
        if (mountedRef.current) {
          setUser({ ...user, two_factor_enabled: true });
        }

        // Create security event
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'two_factor_enabled'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Two-factor enable failed' 
        };
      }
    } catch (error) {
      logger.error('Two-factor enable failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const disableTwoFactor = async (password: string): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await apiService.post('/api/auth/2fa/disable', { password });

      if (response.success) {
        // Update user state
        if (mountedRef.current) {
          setUser({ ...user, two_factor_enabled: false });
        }

        // Create security event
        const securityEvent = securityMonitor.createSecurityEvent(
          user.id,
          'two_factor_disabled'
        );
        securityMonitor.logSecurityEvent(securityEvent);

        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Two-factor disable failed' 
        };
      }
    } catch (error) {
      logger.error('Two-factor disable failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate privacy settings
      const validation = privacyCompliance.validatePrivacySettings({
        ...user.privacy_settings,
        ...settings,
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: `Privacy settings validation failed: ${validation.errors.join(', ')}`
        };
      }

      const response = await apiService.put('/api/auth/privacy-settings', settings);

      if (response.success && response.data) {
        // Update user state
        if (mountedRef.current) {
          setUser({
            ...user,
            privacy_settings: { ...user.privacy_settings, ...settings }
          });
        }

        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: (response as any).error?.message || 'Privacy settings update failed'
        };
      }
    } catch (error) {
      logger.error('Privacy settings update failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const requestDataExport = async (format: 'json' | 'csv' | 'xml', includes: string[]): Promise<DataExportRequest> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Also send to server
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
      // Also send to server
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
      return { success: false, error: 'User not authenticated' };
    }

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
      logger.error('Session termination failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const terminateAllSessions = async (): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await apiService.delete('/api/auth/sessions');

      if (response.success) {
        // This will log out the current session too
        await logout();
        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Session termination failed' 
        };
      }
    } catch (error) {
      logger.error('All sessions termination failed:', { component: 'AuthProvider' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
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
    updateUser
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