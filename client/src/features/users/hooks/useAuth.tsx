// ============================================================================
// File: src/hooks/useAuth.tsx
// Redux-based authentication hook for development
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';

import { authApiService as authService } from '../../../core/api';
import { LoginCredentials } from '../../../core/api/auth';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import * as authActions from '../../../store/slices/authSlice';
import { logger } from '../../../utils/logger';
import { sessionManager } from '../../../utils/storage';
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

/**
 * Comprehensive authentication context interface.
 * 
 * This interface defines the complete surface area of authentication functionality
 * available throughout your application. It includes not just the basic login and
 * logout operations, but also advanced features like two-factor authentication,
 * session management across multiple devices, privacy controls for GDPR compliance,
 * and fine-grained authorization checks. By centralizing all authentication concerns
 * in one interface, we ensure consistent access patterns and make it easier to
 * reason about security throughout the application.
 */
interface AuthContextType {
  // Core authentication state that components need to check
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;
  isAuthenticated: boolean;

  // Basic authentication operations
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthResponse>;

  // Email and password management
  verifyEmail: (token: string) => Promise<AuthResponse>;
  requestPasswordReset: (email: string, redirectUrl?: string) => Promise<AuthResponse>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<AuthResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;

  // Two-factor authentication flow
  setup2FA: () => Promise<TwoFactorSetup>;
  enable2FA: (token: string) => Promise<AuthResponse>;
  disable2FA: (token: string) => Promise<AuthResponse>;
  verifyTwoFactor: (token: string) => Promise<AuthResponse>;

  // Profile management
  updateUser: (userData: Partial<User>) => void;
  updateUserProfile: (updates: any) => Promise<AuthResponse>;

  // OAuth integration
  loginWithOAuth: (code: string, state?: string) => Promise<AuthResponse>;
  getOAuthUrl: (provider: string, state?: string) => string;

  // Session management across devices
  getSessions: () => Promise<SessionInfo[]>;
  revokeSession: (sessionId: string) => Promise<AuthResponse>;
  terminateAllSessions: () => Promise<AuthResponse>;
  extendSession: () => Promise<AuthResponse>;

  // Privacy and security features
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<AuthResponse>;
  requestDataExport: (format: 'json' | 'csv' | 'xml', includes: string[]) => Promise<DataExportRequest>;
  requestDataDeletion: (retentionPeriod: string, includes: string[]) => Promise<DataDeletionRequest>;
  getSecurityEvents: (limit?: number) => Promise<SecurityEvent[]>;
  getSuspiciousActivity: () => Promise<SuspiciousActivityAlert[]>;

  // Authorization helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  // Utility methods
  clearError: () => void;
  refreshTokens: () => Promise<void>;
  requestPushPermission: () => Promise<{ granted: boolean }>;
}

type UnifiedAuthContextType = AuthContextType;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MINIMUM_REFRESH_DELAY_MS = 60 * 1000;

/**
 * Redux-based authentication provider.
 * 
 * This provider implementation represents a modern approach to managing authentication
 * state in React applications. By leveraging Redux, we gain several significant advantages
 * that become especially valuable as your application scales. First, all authentication
 * state lives in a centralized store, which means any component can access the current
 * user or authentication status without prop drilling. Second, Redux DevTools integration
 * gives you time-travel debugging capabilities, letting you replay authentication flows
 * to diagnose issues. Third, the separation between state management logic in Redux and
 * presentation logic in components makes both easier to test independently.
 * 
 * The provider handles three critical responsibilities. When your app first loads, it
 * validates any stored authentication tokens to restore the user's session if they're
 * still valid. While the user is active, it automatically refreshes tokens before they
 * expire to keep the session alive seamlessly. And throughout the user's session, it
 * provides a clean API for all authentication operations through React context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  const user = useAppSelector(authActions.selectUser);
  const loading = useAppSelector(authActions.selectIsLoading);
  const error = useAppSelector(authActions.selectAuthError);
  const sessionExpiry = useAppSelector(authActions.selectSessionExpiry);
  const isInitialized = useAppSelector(authActions.selectIsInitialized);
  const twoFactorRequired = useAppSelector(authActions.selectTwoFactorRequired);
  const isAuthenticated = useAppSelector(authActions.selectIsAuthenticated);

  const mountedRef = useRef(true);

  /**
   * Initialize authentication state when the app loads.
   * 
   * When your application starts up, we need to determine whether the user has an
   * existing valid session. This initialization effect runs once on mount and attempts
   * to validate any tokens that might be stored from a previous session. If the tokens
   * are still valid, we restore the user's authenticated state automatically, providing
   * a seamless experience where they don't need to log in again. If the tokens have
   * expired or are invalid, the validation will fail gracefully, and the user will
   * see the login screen as expected.
   * 
   * We also configure the session manager here to log warnings about approaching session
   * expiration. These warnings can help you implement user-facing alerts about sessions
   * that are about to expire, giving users a chance to extend their session before being
   * logged out unexpectedly.
   */
  useEffect(() => {
    mountedRef.current = true;

    const unsubscribeWarning = sessionManager.onWarning((warning) => {
      logger.warn('Session warning:', { 
        component: 'AuthProvider', 
        warning 
      });
    });

    const initializeAuth = async () => {
      try {
        await dispatch(authActions.validateStoredTokens()).unwrap();
      } catch (err) {
        logger.error('Token validation failed:', { 
          component: 'AuthProvider', 
          error: err 
        });
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      unsubscribeWarning();
    };
  }, [dispatch]);

  /**
   * Automatic token refresh mechanism.
   * 
   * This effect implements one of the most important features of a production-ready
   * authentication system: seamless token refresh. Without this, users would be abruptly
   * logged out when their session expires, even if they're actively using your application.
   * 
   * The logic here calculates the optimal time to refresh tokens by considering when they
   * expire and building in a safety buffer. We refresh five minutes before expiration to
   * ensure we have time to complete the refresh operation before the token becomes invalid.
   * However, we also enforce a minimum delay of one minute to handle edge cases where a
   * token might be very close to expiration when this effect runs.
   * 
   * The setTimeout cleanup in the return function is crucial for preventing memory leaks.
   * If the user logs out or if the session expiry changes, we cancel the scheduled refresh
   * and recalculate based on the new state.
   */
  useEffect(() => {
    if (!user || !sessionExpiry || !mountedRef.current) return;

    const expiryTime = new Date(sessionExpiry).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    const refreshTime = Math.max(
      timeUntilExpiry - SESSION_REFRESH_BUFFER_MS,
      MINIMUM_REFRESH_DELAY_MS
    );

    if (refreshTime > 0 && refreshTime < 24 * 60 * 60 * 1000) { // Max 24 hours
      const timeoutId = setTimeout(() => {
        // Double-check component is still mounted before dispatching
        if (mountedRef.current && user && sessionExpiry) {
          dispatch(authActions.refreshTokens());
        }
      }, refreshTime);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [user, sessionExpiry, dispatch]);

  /**
   * Helper to convert Redux results to AuthResponse format.
   * 
   * This utility function standardizes how we transform Redux action results into the
   * AuthResponse format that our API contract expects. By centralizing this transformation,
   * we ensure consistent response shapes across all authentication operations. The function
   * handles the common case where Redux actions return user data and session information,
   * converting them into the optional fields that AuthResponse expects.
   */
  const toAuthResponse = useCallback(
    (result: any): AuthResponse => {
      return {
        success: true,
        data: {
          user: result.user ?? undefined,
          sessionExpiry: result.sessionExpiry ?? undefined,
        },
      };
    },
    []
  );

  /**
   * Helper to convert errors to AuthResponse format.
   * 
   * Error handling in asynchronous operations can be tricky because errors might come in
   * various forms: Error objects, string messages, or even unexpected types. This helper
   * normalizes all error cases into a consistent AuthResponse format. We check if the
   * error is an Error instance to extract its message property, falling back to a default
   * message if the error is in an unexpected format. This defensive approach ensures your
   * UI always has a meaningful error message to display to users.
   */
  const toAuthError = useCallback(
    (err: unknown, defaultMessage: string): AuthResponse => {
      const message = err instanceof Error ? err.message : defaultMessage;
      return { success: false, error: message };
    },
    []
  );

  /**
   * Authenticate user with credentials.
   * 
   * The login method orchestrates the complete authentication flow. When you call this
   * method with user credentials, it dispatches a Redux action that handles the API call,
   * token storage, and state updates atomically. We unwrap the Redux action result to get
   * the actual data rather than the action metadata, then transform it into our standard
   * response format. This layered approach separates concerns: Redux handles state
   * management, the API service handles network communication, and this method provides a
   * clean interface for components to use.
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.login(credentials)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Login failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  /**
   * Register a new user account.
   * 
   * Registration handles the creation of a new user account and typically logs the user
   * in automatically upon success. This provides a smooth onboarding experience where
   * users can start using your application immediately after signing up. The registration
   * flow validates the provided data on both client and server sides, creates the user
   * account, generates authentication tokens, and updates the Redux state to reflect the
   * authenticated session.
   */
  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.register(data)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Registration failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  /**
   * Log out the current user.
   * 
   * Logout is deceptively complex because it needs to clean up state in multiple places.
   * First, it notifies the server to invalidate the session and tokens, preventing them
   * from being used again. Then it clears all locally stored authentication data to ensure
   * no sensitive information remains on the device. Finally, it resets the Redux state so
   * the UI reflects the logged-out state. We pass the current user to the logout action
   * so the server can properly identify which session to terminate, which is important in
   * multi-device scenarios.
   */
  const logout = useCallback(async (): Promise<void> => {
    await dispatch(authActions.logout({ user: user ?? undefined }));
  }, [dispatch, user]);

  /**
   * Manually refresh authentication tokens.
   * 
   * While automatic token refresh handles most cases, there are scenarios where you might
   * want explicit control over when tokens refresh. For example, before making a critical
   * API request, you might refresh tokens to ensure you have the freshest credentials
   * possible. This method provides that explicit control while using the same underlying
   * refresh mechanism as the automatic system.
   */
  const refreshToken = useCallback(async (): Promise<AuthResponse> => {
    try {
      const result = await dispatch(authActions.refreshTokens()).unwrap();
      return toAuthResponse(result);
    } catch (err) {
      return toAuthError(err, 'Token refresh failed');
    }
  }, [dispatch, toAuthResponse, toAuthError]);

  /**
   * Verify user email address.
   * 
   * Email verification is a crucial security step that confirms users control the email
   * address they registered with. The verification token comes from an email sent during
   * registration. When users click the verification link in their email, your app extracts
   * the token and calls this method. Successful verification typically enables full account
   * functionality and marks the user's email as confirmed in your database.
   */
  const verifyEmail = useCallback(
    async (token: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.verifyEmail(token)).unwrap();
        return { success: true, data: { user: result.user ?? undefined } };
      } catch (err) {
        return toAuthError(err, 'Email verification failed');
      }
    },
    [dispatch, toAuthError]
  );

  /**
   * Request password reset email.
   * 
   * This initiates the password recovery flow when users forget their password. The method
   * sends a secure, time-limited token to the user's registered email address. The
   * redirectUrl parameter specifies where users should land after clicking the reset link,
   * typically your password reset form. For security, the token expires after a set period,
   * and users need to request a new one if they don't complete the reset process in time.
   */
  const requestPasswordReset = useCallback(
    async (email: string, redirectUrl?: string): Promise<AuthResponse> => {
      try {
        await dispatch(
          authActions.requestPasswordReset({ email, redirectUrl })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password reset request failed');
      }
    },
    [dispatch, toAuthError]
  );

  /**
   * Complete password reset with new password.
   * 
   * This finalizes the password recovery process using the token from the reset email.
   * We require both the new password and a confirmation to prevent typos that would lock
   * users out of their account. The token is single-use and expires after a short period
   * for security. Once the password is successfully reset, any existing sessions are
   * typically invalidated, requiring users to log in with their new password.
   */
  const resetPassword = useCallback(
    async (
      token: string,
      newPassword: string,
      confirmPassword: string
    ): Promise<AuthResponse> => {
      try {
        await dispatch(
          authActions.resetPassword({ token, newPassword, confirmPassword })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password reset failed');
      }
    },
    [dispatch, toAuthError]
  );

  /**
   * Change password for authenticated user.
   * 
   * This method differs from password reset because it requires knowledge of the current
   * password. This security measure ensures that even if someone gains temporary access
   * to an unlocked device, they cannot change the password without knowing it. The
   * operation requires an active authenticated session, and successful password changes
   * often trigger a notification email to alert users of the change.
   */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(
          authActions.changePassword({ user, currentPassword, newPassword })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Password change failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Initialize two-factor authentication setup.
   * 
   * Two-factor authentication adds a critical second layer of security beyond passwords.
   * This method returns the information needed to configure an authenticator app like
   * Google Authenticator or Authy. The QR code provides a convenient way for users to
   * scan and configure their app, while the secret key serves as a backup for manual
   * entry. Users must verify their setup is working correctly before 2FA is fully enabled.
   */
  const setup2FA = useCallback(async (): Promise<TwoFactorSetup> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.setupTwoFactor()).unwrap();
  }, [dispatch, user]);

  /**
   * Enable two-factor authentication.
   * 
   * After users configure their authenticator app, this method activates 2FA for their
   * account. The token verification step is critical because it confirms the authenticator
   * app is generating codes correctly. Without this verification, users might enable 2FA
   * with a misconfigured app and then be unable to log in. Once enabled, all future logins
   * will require both the password and a valid 2FA code.
   */
  const enable2FA = useCallback(
    async (token: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.enableTwoFactor({ user, token })).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Two-factor enable failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Disable two-factor authentication.
   * 
   * Disabling 2FA is a sensitive security operation that could weaken account protection.
   * Therefore, we require a valid 2FA token to proceed, ensuring that only someone with
   * access to the authenticator app can disable this feature. This prevents unauthorized
   * disabling even if someone gains access to an active session. Users typically need a
   * strong reason to disable 2FA, such as losing access to their authenticator device.
   */
  const disable2FA = useCallback(
    async (token: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.disableTwoFactor({ user, token })).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Two-factor disable failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Verify two-factor code during login.
   * 
   * This completes the second step of the 2FA login flow. After users provide valid
   * credentials, they must also provide a time-based code from their authenticator app.
   * The codes change every 30 seconds, providing strong protection against replay attacks
   * and unauthorized access. This verification happens after the initial login attempt and
   * grants full access to the account only when the code is valid.
   */
  const verifyTwoFactor = useCallback(
    async (token: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(authActions.verifyTwoFactor(token)).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'Two-factor verification failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  /**
   * Update user profile information.
   * 
   * This method provides a flexible way to update user profile data. Because it accepts
   * partial updates, you can change specific fields without needing to send the entire
   * user object. This is particularly useful for forms that update one section of the
   * profile at a time, such as separate forms for basic info, preferences, and settings.
   * The server merges your updates with the existing user data.
   */
  const updateUserProfile = useCallback(
    async (updates: any): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const result = await dispatch(
          authActions.updateUserProfile({ user, updates })
        ).unwrap();
        return { success: true, data: { user: result.user ?? undefined } };
      } catch (err) {
        return toAuthError(err, 'Profile update failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Complete OAuth authentication flow.
   * 
   * OAuth provides a secure way to authenticate using external providers like Google,
   * GitHub, or Facebook. After users authenticate with the provider and grant permissions,
   * the provider redirects back with an authorization code. This method exchanges that
   * code for access tokens and creates or links the user account. The state parameter
   * helps prevent CSRF attacks by verifying the request originated from your application.
   */
  const loginWithOAuth = useCallback(
    async (code: string, state?: string): Promise<AuthResponse> => {
      try {
        const result = await dispatch(
          authActions.loginWithOAuth({ code, state })
        ).unwrap();
        return toAuthResponse(result);
      } catch (err) {
        return toAuthError(err, 'OAuth login failed');
      }
    },
    [dispatch, toAuthResponse, toAuthError]
  );

  /**
   * Get OAuth authorization URL.
   * 
   * This generates the URL where you should redirect users to begin the OAuth flow. The
   * URL includes your application's credentials, the permissions you're requesting, and
   * a state parameter for security. When users visit this URL, they'll see the provider's
   * login page and a permission consent screen. After granting permission, they're
   * redirected back to your app with an authorization code.
   */
  const getOAuthUrl = useCallback(
    (provider: string, state?: string): string => {
      return authService.getOAuthUrl(provider, state);
    },
    []
  );

  /**
   * Extend current session.
   * 
   * This method prolongs the user's session without requiring them to log in again. It's
   * particularly useful for active users who shouldn't be logged out simply because time
   * has passed. You might call this periodically based on user activity, such as when they
   * interact with the UI or make API requests, ensuring engaged users stay logged in
   * seamlessly.
   */
  const extendSession = useCallback(async (): Promise<AuthResponse> => {
    try {
      await dispatch(authActions.extendSession()).unwrap();
      return { success: true };
    } catch (err) {
      return toAuthError(err, 'Session extension failed');
    }
  }, [dispatch, toAuthError]);

  /**
   * Get all active sessions for the user.
   * 
   * This retrieves information about all devices and locations where the user is currently
   * logged in. Each session includes details like IP address, device type, browser, and
   * last activity timestamp. This transparency is valuable for security, as it helps users
   * identify unauthorized access. Users can review this list and terminate any sessions
   * they don't recognize or no longer need.
   */
  const getSessions = useCallback(async (): Promise<SessionInfo[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.getActiveSessions()).unwrap();
  }, [dispatch, user]);

  /**
   * Terminate a specific session by ID.
   * 
   * This allows users to selectively log out from specific devices or locations. It's
   * particularly useful when users realize they forgot to log out from a public computer
   * or when they see a session they don't recognize in their session list. The current
   * session remains active, so users can safely terminate other sessions without losing
   * their own access.
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(authActions.terminateSession(sessionId)).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Terminate session failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Terminate all sessions except the current one.
   * 
   * This security feature provides a quick way to log out from all devices at once. It's
   * valuable when users suspect their account might be compromised or when they simply
   * want to ensure they're only logged in from their current device. The operation is safe
   * because it preserves the current session, so users don't lose their work or need to
   * log in again immediately.
   */
  const terminateAllSessions = useCallback(async (): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    try {
      await dispatch(authActions.terminateAllSessions()).unwrap();
      return { success: true };
    } catch (err) {
      return toAuthError(err, 'Terminate all sessions failed');
    }
  }, [dispatch, user, toAuthError]);

  /**
   * Update user privacy settings.
   * 
   * Privacy settings give users control over how their data and profile information are
   * used and displayed. These settings might include profile visibility preferences, data
   * sharing controls, marketing communication opt-ins, and other privacy-related choices.
   * By providing granular privacy controls, you give users confidence that they control
   * their personal information.
   */
  const updatePrivacySettings = useCallback(
    async (settings: Partial<PrivacySettings>): Promise<AuthResponse> => {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        await dispatch(
          authActions.updatePrivacySettings({ user, settings })
        ).unwrap();
        return { success: true };
      } catch (err) {
        return toAuthError(err, 'Update privacy settings failed');
      }
    },
    [dispatch, user, toAuthError]
  );

  /**
   * Request data export for GDPR compliance.
   * 
   * This feature allows users to download all their data in a portable format, fulfilling
   * GDPR data portability requirements. Users specify their preferred format (JSON, CSV,
   * or XML) and which data categories to include. The export typically happens
   * asynchronously because it might involve substantial data. Users receive a notification
   * or email when their export is ready for download.
   */
  const requestDataExport = useCallback(
    async (format: 'json' | 'csv' | 'xml', includes: string[]): Promise<DataExportRequest> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(
        authActions.requestDataExport({ format, includes })
      ).unwrap();
    },
    [dispatch, user]
  );

  /**
   * Request data deletion for GDPR compliance.
   * 
   * This implements the GDPR "right to be forgotten" by allowing users to request deletion
   * of their personal data. The retention period specifies a grace period before permanent
   * deletion, giving users time to recover their account if they change their mind. Note
   * that some data might need to be retained longer for legal compliance, such as financial
   * transaction records or data required for regulatory reporting.
   */
  const requestDataDeletion = useCallback(
    async (retentionPeriod: string, includes: string[]): Promise<DataDeletionRequest> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(
        authActions.requestDataDeletion({ retentionPeriod, includes })
      ).unwrap();
    },
    [dispatch, user]
  );

  /**
   * Get security event history for the user.
   * 
   * This provides an audit trail of authentication-related events such as successful logins,
   * failed login attempts, password changes, and 2FA modifications. The limit parameter
   * controls how many recent events to retrieve. Users can review this history to verify
   * expected activity and identify potential security issues. It's particularly useful for
   * investigating suspicious activity or confirming legitimate actions.
   */
  const getSecurityEvents = useCallback(
    async (limit: number = 50): Promise<SecurityEvent[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await dispatch(authActions.getSecurityEvents(limit)).unwrap();
    },
    [dispatch, user]
  );

  /**
   * Get suspicious activity alerts.
   * 
   * This retrieves detected anomalies in account activity that might indicate unauthorized
   * access or account compromise. The system might flag activities like logins from unusual
   * geographic locations, many failed login attempts in a short period, or patterns that
   * don't match the user's typical behavior. Users can review these alerts and take action
   * such as changing their password or enabling 2FA if they weren't responsible for the
   * flagged activity.
   */
  const getSuspiciousActivity = useCallback(async (): Promise<SuspiciousActivityAlert[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await dispatch(authActions.getSuspiciousActivity()).unwrap();
  }, [dispatch, user]);

  /**
   * Check if user has a specific permission.
   * 
   * This authorization helper checks whether the current user has been granted a specific
   * permission. Permissions provide fine-grained access control beyond simple role checking.
   * For example, you might have an editor role where some editors can publish content while
   * others can only draft it. Permission checks let you control access to specific features
   * or actions within your application with precision.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return (user as any).permissions?.includes(permission) || false;
    },
    [user]
  );

  /**
   * Check if user has a specific role.
   * 
   * This verifies whether the user's role matches the specified role exactly. Roles
   * typically represent broad categories of users with associated capabilities, such as
   * admin, moderator, editor, or user. Each role implies a set of permissions and access
   * levels. Role-based checks are simpler than permission checks but less granular, making
   * them ideal for coarse-grained authorization decisions.
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user]
  );

  /**
   * Check if user has any of the specified roles.
   * 
   * This is useful when multiple roles should have access to a feature. For example, you
   * might allow both admins and moderators to access certain management tools. Instead of
   * checking each role individually, you can pass an array of acceptable roles and get a
   * single boolean result. This makes your authorization logic more readable and
   * maintainable.
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  /**
   * Manually refresh authentication tokens.
   * 
   * This provides explicit control over token refresh timing. While automatic refresh
   * handles most cases, you might call this before making important API requests to ensure
   * you have the freshest tokens possible. It's also useful when resuming an application
   * from a suspended state where the automatic refresh might not have fired.
   */
  const refreshTokens = useCallback(async (): Promise<void> => {
    await dispatch(authActions.refreshTokens());
  }, [dispatch]);

  /**
   * Clear authentication error state.
   * 
   * This resets the error state, which is useful for dismissing error messages after users
   * acknowledge them or when they retry an operation. Without clearing errors, old error
   * messages might persist in the UI and confuse users during subsequent operations. It's
   * good practice to call this when unmounting components that display errors or when
   * starting a new authentication operation.
   */
  const clearError = useCallback(() => {
    dispatch(authActions.clearError());
  }, [dispatch]);

  /**
   * Update user data directly in the Redux store.
   * 
   * This convenience method allows immediate updates to user information in the Redux
   * state. It's particularly useful for optimistic updates where you want to update the UI
   * immediately before the server confirms the change. This provides a snappier user
   * experience, though you should handle the possibility that the server update might fail
   * and roll back the optimistic change if needed.
   */
  const updateUser = useCallback(
    (userData: Partial<User>) => {
      if (user) {
        dispatch(
          authActions.updateUserProfile({ user, updates: userData })
        );
      }
    },
    [dispatch, user]
  );

  /**
   * Request browser notification permission.
   * 
   * This asks users to grant permission for browser notifications, allowing you to alert
   * them about important events even when your app isn't in the foreground. The browser
   * displays a native permission prompt, and the user's choice is remembered for future
   * visits. You should request this permission contextually, explaining why notifications
   * would be valuable rather than asking immediately when the app loads.
   */
  const requestPushPermission = useCallback(async (): Promise<{ granted: boolean }> => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted' };
    }
    return { granted: false };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    sessionExpiry,
    isInitialized,
    twoFactorRequired,
    isAuthenticated,

    login,
    register,
    logout,
    refreshToken,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,

    setup2FA,
    enable2FA,
    disable2FA,
    verifyTwoFactor,

    updateUser,
    updateUserProfile,

    loginWithOAuth,
    getOAuthUrl,

    getSessions,
    revokeSession,
    terminateAllSessions,
    extendSession,

    updatePrivacySettings,
    requestDataExport,
    requestDataDeletion,
    getSecurityEvents,
    getSuspiciousActivity,

    hasPermission,
    hasRole,
    hasAnyRole,

    clearError,
    refreshTokens,
    requestPushPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access authentication context.
 * 
 * This hook provides access to all authentication functionality throughout your application.
 * It must be used within an AuthProvider component or it will throw an error with a helpful
 * message. This safety check prevents silent failures that would occur from attempting to
 * use authentication features outside the proper context boundary.
 * 
 * The hook returns the complete authentication context, giving you access to both state
 * (like the current user and loading status) and methods (like login and logout). By
 * centralizing access through this hook, we ensure consistent patterns throughout the
 * codebase and make it easy to refactor the underlying implementation without affecting
 * components that use authentication.
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { login, loading, error } = useAuth();
 *   
 *   const handleSubmit = async (credentials) => {
 *     const result = await login(credentials);
 *     if (result.success) {
 *       navigate('/dashboard');
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <Alert variant="error">{error}</Alert>}
 *       <button disabled={loading}>Login</button>
 *     </form>
 *   );
 * }
 * ```
 * 
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} Complete authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider> to use authentication features.'
    );
  }
  
  return context;
}

export default useAuth;

// ============================================================================
// USAGE EXAMPLES & BEST PRACTICES
// ============================================================================

/**
 * EXAMPLE 1: Basic Login Form
 * 
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * import { useState, FormEvent } from 'react';
 * 
 * function LoginPage() {
 *   const { login, loading, error, clearError } = useAuth();
 *   const [email, setEmail] = useState('');
 *   const [password, setPassword] = useState('');
 *   const navigate = useNavigate();
 *   
 *   useEffect(() => {
 *     // Clear errors when component unmounts
 *     return () => clearError();
 *   }, [clearError]);
 *   
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     
 *     const result = await login({ email, password });
 *     
 *     if (result.success) {
 *       navigate('/dashboard');
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <Alert variant="error">{error}</Alert>}
 *       
 *       <Input
 *         type="email"
 *         value={email}
 *         onChange={(e) => setEmail(e.target.value)}
 *         placeholder="Email"
 *         disabled={loading}
 *       />
 *       
 *       <Input
 *         type="password"
 *         value={password}
 *         onChange={(e) => setPassword(e.target.value)}
 *         placeholder="Password"
 *         disabled={loading}
 *       />
 *       
 *       <Button type="submit" disabled={loading}>
 *         {loading ? 'Logging in...' : 'Login'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */

/**
 * EXAMPLE 2: Protected Route Component
 * 
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * import { Navigate, Outlet } from 'react-router-dom';
 * 
 * interface ProtectedRouteProps {
 *   requiredRole?: string;
 *   requiredPermission?: string;
 * }
 * 
 * function ProtectedRoute({ requiredRole, requiredPermission }: ProtectedRouteProps) {
 *   const { isAuthenticated, isInitialized, hasRole, hasPermission } = useAuth();
 *   
 *   // Show loading state while initializing
 *   if (!isInitialized) {
 *     return <LoadingSpinner />;
 *   }
 *   
 *   // Redirect to login if not authenticated
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" replace />;
 *   }
 *   
 *   // Check role if required
 *   if (requiredRole && !hasRole(requiredRole)) {
 *     return <Navigate to="/unauthorized" replace />;
 *   }
 *   
 *   // Check permission if required
 *   if (requiredPermission && !hasPermission(requiredPermission)) {
 *     return <Navigate to="/unauthorized" replace />;
 *   }
 *   
 *   return <Outlet />;
 * }
 * 
 * // Usage in router
 * <Route element={<ProtectedRoute requiredRole="admin" />}>
 *   <Route path="/admin" element={<AdminDashboard />} />
 * </Route>
 * ```
 */

/**
 * EXAMPLE 3: Two-Factor Authentication Setup
 * 
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * import { useState } from 'react';
 * 
 * function TwoFactorSetup() {
 *   const { setup2FA, enable2FA } = useAuth();
 *   const [step, setStep] = useState<'setup' | 'verify'>('setup');
 *   const [qrCode, setQrCode] = useState('');
 *   const [secret, setSecret] = useState('');
 *   const [token, setToken] = useState('');
 *   const [error, setError] = useState('');
 *   
 *   const handleSetup = async () => {
 *     try {
 *       const result = await setup2FA();
 *       setQrCode(result.qrCode);
 *       setSecret(result.secret);
 *       setStep('verify');
 *     } catch (err) {
 *       setError('Failed to setup 2FA');
 *     }
 *   };
 *   
 *   const handleVerify = async () => {
 *     const result = await enable2FA(token);
 *     
 *     if (result.success) {
 *       alert('2FA enabled successfully!');
 *     } else {
 *       setError(result.error || 'Verification failed');
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       {error && <Alert variant="error">{error}</Alert>}
 *       
 *       {step === 'setup' ? (
 *         <div>
 *           <h2>Enable Two-Factor Authentication</h2>
 *           <p>Add an extra layer of security to your account</p>
 *           <Button onClick={handleSetup}>Setup 2FA</Button>
 *         </div>
 *       ) : (
 *         <div>
 *           <h2>Scan QR Code</h2>
 *           <img src={qrCode} alt="QR Code" />
 *           <p>Or enter this code manually: {secret}</p>
 *           
 *           <Input
 *             value={token}
 *             onChange={(e) => setToken(e.target.value)}
 *             placeholder="Enter 6-digit code"
 *             maxLength={6}
 *           />
 *           
 *           <Button onClick={handleVerify}>Verify & Enable</Button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * EXAMPLE 4: Session Management Dashboard
 * 
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * import { useEffect, useState } from 'react';
 * 
 * function SessionManager() {
 *   const { getSessions, revokeSession, terminateAllSessions } = useAuth();
 *   const [sessions, setSessions] = useState<SessionInfo[]>([]);
 *   const [loading, setLoading] = useState(true);
 *   
 *   useEffect(() => {
 *     loadSessions();
 *   }, []);
 *   
 *   const loadSessions = async () => {
 *     try {
 *       const data = await getSessions();
 *       setSessions(data);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *   
 *   const handleRevoke = async (sessionId: string) => {
 *     await revokeSession(sessionId);
 *     await loadSessions();
 *   };
 *   
 *   const handleRevokeAll = async () => {
 *     if (confirm('Log out all other devices?')) {
 *       await terminateAllSessions();
 *       await loadSessions();
 *     }
 *   };
 *   
 *   if (loading) return <LoadingSpinner />;
 *   
 *   return (
 *     <div>
 *       <h2>Active Sessions</h2>
 *       <Button onClick={handleRevokeAll} variant="danger">
 *         Log Out All Other Devices
 *       </Button>
 *       
 *       <div className="sessions-list">
 *         {sessions.map((session) => (
 *           <div key={session.id} className="session-card">
 *             <div>
 *               <strong>{session.device}</strong>
 *               <p>{session.browser}</p>
 *               <p>{session.location}</p>
 *               <p>Last active: {new Date(session.lastActive).toLocaleString()}</p>
 *             </div>
 *             {!session.current && (
 *               <Button onClick={() => handleRevoke(session.id)}>
 *                 Revoke
 *               </Button>
 *             )}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * EXAMPLE 5: User Profile with Privacy Settings
 * 
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 * import { useState, useEffect } from 'react';
 * 
 * function PrivacySettings() {
 *   const { user, updatePrivacySettings } = useAuth();
 *   const [settings, setSettings] = useState({
 *     profileVisibility: 'public',
 *     showEmail: false,
 *     allowDataSharing: false,
 *     marketingEmails: false,
 *   });
 *   const [saving, setSaving] = useState(false);
 *   
 *   useEffect(() => {
 *     if (user?.privacySettings) {
 *       setSettings(user.privacySettings);
 *     }
 *   }, [user]);
 *   
 *   const handleSave = async () => {
 *     setSaving(true);
 *     try {
 *       await updatePrivacySettings(settings);
 *       alert('Privacy settings updated');
 *     } finally {
 *       setSaving(false);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <h2>Privacy Settings</h2>
 *       
 *       <label>
 *         Profile Visibility
 *         <select
 *           value={settings.profileVisibility}
 *           onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value })}
 *         >
 *           <option value="public">Public</option>
 *           <option value="friends">Friends Only</option>
 *           <option value="private">Private</option>
 *         </select>
 *       </label>
 *       
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.showEmail}
 *           onChange={(e) => setSettings({ ...settings, showEmail: e.target.checked })}
 *         />
 *         Show email on profile
 *       </label>
 *       
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.allowDataSharing}
 *           onChange={(e) => setSettings({ ...settings, allowDataSharing: e.target.checked })}
 *         />
 *         Allow anonymous data sharing for product improvement
 *       </label>
 *       
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.marketingEmails}
 *           onChange={(e) => setSettings({ ...settings, marketingEmails: e.target.checked })}
 *         />
 *         Receive marketing emails
 *       </label>
 *       
 *       <Button onClick={handleSave} disabled={saving}>
 *         {saving ? 'Saving...' : 'Save Settings'}
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * BEST PRACTICES:
 * 
 * 1. ERROR HANDLING
 *    - Always check result.success before proceeding with operations
 *    - Display user-friendly error messages in the UI
 *    - Clear errors when appropriate (form resubmit, component unmount)
 *    - Use try-catch for operations that throw (like getSessions)
 * 
 * 2. LOADING STATES
 *    - Use the loading flag to disable buttons during async operations
 *    - Show loading indicators for better user experience
 *    - Prevent duplicate submissions by checking loading state
 *    - Consider local loading states for individual operations
 * 
 * 3. SESSION MANAGEMENT
 *    - Monitor sessionExpiry to warn users before automatic logout
 *    - Call extendSession for active users to keep them logged in
 *    - Implement proper cleanup in useEffect return functions
 *    - Handle session expiry gracefully with redirects to login
 * 
 * 4. SECURITY
 *    - Never store tokens in localStorage directly (handled by authService)
 *    - Validate permissions before rendering sensitive UI elements
 *    - Use hasPermission for fine-grained access control
 *    - Use hasRole/hasAnyRole for coarse-grained access control
 *    - Always require re-authentication for sensitive operations
 * 
 * 5. TYPE SAFETY
 *    - Always use proper TypeScript types for function parameters
 *    - Leverage the typed Redux hooks (useAppDispatch, useAppSelector)
 *    - Handle null/undefined cases for user and other optional fields
 *    - Use type guards when checking user properties
 * 
 * 6. PERFORMANCE
 *    - Use useCallback for event handlers passed as props
 *    - Memoize expensive computations with useMemo
 *    - Avoid unnecessary re-renders by selecting specific state slices
 *    - Clean up effects properly to prevent memory leaks
 * 
 * 7. USER EXPERIENCE
 *    - Provide clear feedback for all authentication operations
 *    - Show loading states during async operations
 *    - Clear sensitive form data after successful submission
 *    - Implement proper error recovery flows
 *    - Use optimistic updates where appropriate
 * 
 * 8. TESTING
 *    - Mock the useAuth hook in component tests
 *    - Test both success and error paths
 *    - Test loading states and disabled button behaviors
 *    - Verify proper cleanup in useEffect returns
 */