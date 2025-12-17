/**
 * Authentication Slice
 *
 * Manages user authentication state and session management with backend integration.
 * Enhanced with full authentication logic from useAuth hook for Redux migration.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

import { authApiService as authService } from '@client/core/api';
import { LoginCredentials } from '@client/core/api/auth';
import { User, RegisterData, AuthSession } from '@client/core/auth/types';
import { logger } from '@client/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;
}

// Type definition for privacy settings - adjust based on your actual API requirements
interface PrivacySettingsUpdate {
  dataSharing?: boolean;
  marketingEmails?: boolean;
  analyticsTracking?: boolean;
  publicProfile?: boolean;
}

// ============================================================================
// Async Thunks for Authentication Operations
// ============================================================================

// Login thunk - handles the authentication flow and extracts user data from the session
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // The API returns an AuthSession object which may have a different structure
      // than we initially expected. We'll work with whatever it provides.
      const session: AuthSession = await authService.instance.login(credentials);

      // Extract data from the session object based on its actual structure
      // If AuthSession doesn't contain user data directly, we may need to fetch it separately
      return {
        session,
        // Note: You may need to add a separate API call here to fetch user data
        // if the session doesn't include it, like: await authService.instance.getCurrentUser()
      };
    } catch (error) {
      logger.error('Login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

// Registration thunk - creates a new user account
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const session: AuthSession = await authService.instance.register(data);
      return {
        session,
        // Similarly, may need to fetch user data separately after registration
      };
    } catch (error) {
      logger.error('Registration failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

// Logout thunk - terminates the current session
export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await authService.instance.logout();
    } catch (error) {
      logger.warn('Logout request failed (continuing with local cleanup)', { error });
      // Don't reject, always clear local state
    }
  }
);

// Token refresh thunk - extends the current session by refreshing authentication tokens
export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.refreshTokens();
    } catch (error) {
      logger.error('Token refresh failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

// Email verification thunk - confirms a user's email address
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      await authService.instance.verifyEmail(token);
    } catch (error) {
      logger.error('Email verification failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Email verification failed');
    }
  }
);

// Password reset request thunk - initiates the password reset flow
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }: { email: string; redirectUrl?: string }, { rejectWithValue }) => {
    try {
      // The API expects only an email, not a redirectUrl parameter
      // If you need to pass redirectUrl, you'll need to update your API type definition
      await authService.instance.requestPasswordReset({ email });
    } catch (error) {
      logger.error('Password reset request failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password reset request failed');
    }
  }
);

// Password reset completion thunk - completes the password reset with a new password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword, confirmPassword }: { token: string; newPassword: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      // The API expects 'password' and 'confirmPassword' based on the type definition
      await authService.instance.resetPassword({
        token,
        password: newPassword,
        confirmPassword: confirmPassword
      });
    } catch (error) {
      logger.error('Password reset failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password reset failed');
    }
  }
);

// Password change thunk - allows authenticated users to change their password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await authService.instance.changePassword(currentPassword, newPassword);
    } catch (error) {
      logger.error('Password change failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password change failed');
    }
  }
);

// Two-factor setup thunk - initiates 2FA setup and returns QR code or secret
export const setupTwoFactor = createAsyncThunk(
  'auth/setupTwoFactor',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.setupTwoFactor();
    } catch (error) {
      logger.error('Two-factor setup failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor setup failed');
    }
  }
);

// Two-factor enable thunk - confirms and enables 2FA for the user's account
export const enableTwoFactor = createAsyncThunk(
  'auth/enableTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      return await authService.instance.enableTwoFactor(token);
    } catch (error) {
      logger.error('Two-factor enable failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor enable failed');
    }
  }
);

// Two-factor disable thunk - disables 2FA for the user's account
export const disableTwoFactor = createAsyncThunk(
  'auth/disableTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      await authService.instance.disableTwoFactor(token);
    } catch (error) {
      logger.error('Two-factor disable failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor disable failed');
    }
  }
);

// Two-factor verification thunk - verifies a 2FA token during login
export const verifyTwoFactor = createAsyncThunk(
  'auth/verifyTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      const session: AuthSession = await authService.instance.verifyTwoFactor(token);
      return { session };
    } catch (error) {
      logger.error('Two-factor verification failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor verification failed');
    }
  }
);

// Profile update thunk - updates the current user's profile information
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (updates: Partial<User>, { rejectWithValue }) => {
    try {
      return await authService.instance.updateUserProfile(updates);
    } catch (error) {
      logger.error('Profile update failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Profile update failed');
    }
  }
);

// OAuth login thunk - handles authentication via OAuth providers
export const loginWithOAuth = createAsyncThunk(
  'auth/loginWithOAuth',
  async ({ code, state }: { code: string; state?: string }, { rejectWithValue }) => {
    try {
      const session: AuthSession = await authService.instance.loginWithOAuth(code, state);
      return { session };
    } catch (error) {
      logger.error('OAuth login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'OAuth login failed');
    }
  }
);

// Session extension thunk - extends the current session timeout
export const extendSession = createAsyncThunk(
  'auth/extendSession',
  async (_, { rejectWithValue }) => {
    try {
      await authService.instance.extendSession();
    } catch (error) {
      logger.error('Session extension failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Session extension failed');
    }
  }
);

// Get active sessions thunk - retrieves all active sessions for the current user
export const getActiveSessions = createAsyncThunk(
  'auth/getActiveSessions',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.getActiveSessions();
    } catch (error) {
      logger.error('Get active sessions failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get active sessions failed');
    }
  }
);

// Terminate session thunk - ends a specific session by ID
export const terminateSession = createAsyncThunk(
  'auth/terminateSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      await authService.instance.terminateSession(sessionId);
    } catch (error) {
      logger.error('Terminate session failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Terminate session failed');
    }
  }
);

// Terminate all sessions thunk - ends all sessions except the current one
export const terminateAllSessions = createAsyncThunk(
  'auth/terminateAllSessions',
  async (_, { rejectWithValue }) => {
    try {
      await authService.instance.terminateAllOtherSessions();
    } catch (error) {
      logger.error('Terminate all sessions failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Terminate all sessions failed');
    }
  }
);

// Update privacy settings thunk - modifies user's privacy preferences
export const updatePrivacySettings = createAsyncThunk(
  'auth/updatePrivacySettings',
  async (settings: PrivacySettingsUpdate, { rejectWithValue }) => {
    try {
      // Cast to Partial<PrivacySettings> to match the API's expected type
      // This assumes your API's PrivacySettings type accepts these fields
      await authService.instance.updatePrivacySettings(settings as Record<string, unknown>);
    } catch (error) {
      logger.error('Update privacy settings failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Update privacy settings failed');
    }
  }
);

// Request data export thunk - initiates a GDPR-compliant data export
export const requestDataExport = createAsyncThunk(
  'auth/requestDataExport',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.requestDataExport();
    } catch (error) {
      logger.error('Request data export failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Request data export failed');
    }
  }
);

// Request data deletion thunk - initiates account deletion process
export const requestDataDeletion = createAsyncThunk(
  'auth/requestDataDeletion',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.requestDataDeletion();
    } catch (error) {
      logger.error('Request data deletion failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Request data deletion failed');
    }
  }
);

// Get security events thunk - retrieves security-related events for the user's account
export const getSecurityEvents = createAsyncThunk(
  'auth/getSecurityEvents',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      return await authService.instance.getSecurityEvents(limit);
    } catch (error) {
      logger.error('Get security events failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get security events failed');
    }
  }
);

// Get suspicious activity thunk - retrieves potentially suspicious account activity
export const getSuspiciousActivity = createAsyncThunk(
  'auth/getSuspiciousActivity',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.instance.getSuspiciousActivity();
    } catch (error) {
      logger.error('Get suspicious activity failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get suspicious activity failed');
    }
  }
);

// Validate stored tokens thunk - checks if locally stored tokens are still valid
export const validateStoredTokens = createAsyncThunk(
  'auth/validateStoredTokens',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authService.instance.validateStoredTokens();
      return result;
    } catch (error) {
      logger.error('Validate stored tokens failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Validate stored tokens failed');
    }
  }
);

// Fetch current user thunk - retrieves the complete user profile for the authenticated user
// This is essential because AuthSession may not include complete user data
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      // You'll need to ensure your authService has a getCurrentUser or similar method
      // If not available, you may need to add it to your API service
      const user = await authService.instance.getCurrentUser?.();
      return user;
    } catch (error) {
      logger.error('Fetch current user failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Fetch current user failed');
    }
  }
);

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiry: null,
  isInitialized: false,
  twoFactorRequired: false,
};

// ============================================================================
// Auth Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set the authenticated user directly
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.twoFactorRequired = false;
    },
    // Update specific user fields without replacing entire user object
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    // Clear any authentication errors
    clearError: (state) => {
      state.error = null;
    },
    // Mark the auth system as initialized (useful for app startup)
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    // Set whether two-factor authentication is required
    setTwoFactorRequired: (state, action: PayloadAction<boolean>) => {
      state.twoFactorRequired = action.payload;
    },
    // Reset all authentication state to initial values
    resetAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.sessionExpiry = null;
      state.error = null;
      state.twoFactorRequired = false;
      state.isInitialized = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login handlers - after successful login, we need to fetch user data separately
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, _action) => {
        // The session object doesn't contain user data directly
        // We mark as authenticated and should trigger a separate user fetch
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        // Extract any available data from the session
        // You may need to adjust this based on what AuthSession actually contains
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.twoFactorRequired = false;
      })

      // Registration handlers
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, _action) => {
        // Similar to login, session may not contain complete user data
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })

      // Logout handlers - always clear local state even if server request fails
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.error = null;
        state.isLoading = false;
        state.twoFactorRequired = false;
      })
      .addCase(logout.rejected, (state) => {
        // Even if logout fails on server, clear local state
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.error = null;
        state.isLoading = false;
        state.twoFactorRequired = false;
      })

      // Token refresh handlers - doesn't return user data, just refreshes tokens
      .addCase(refreshTokens.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(refreshTokens.rejected, (state) => {
        // If token refresh fails, user needs to re-authenticate
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.twoFactorRequired = false;
      })

      // Email verification handlers
      .addCase(verifyEmail.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password reset request handlers
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password reset completion handlers
      .addCase(resetPassword.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password change handlers
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Two-factor setup handlers
      .addCase(setupTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setupTwoFactor.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(setupTwoFactor.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Two-factor enable handlers
      .addCase(enableTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(enableTwoFactor.fulfilled, (state) => {
        if (state.user) {
          state.user.twoFactorEnabled = true;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(enableTwoFactor.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Two-factor disable handlers
      .addCase(disableTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disableTwoFactor.fulfilled, (state) => {
        if (state.user) {
          state.user.twoFactorEnabled = false;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(disableTwoFactor.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // Two-factor verification handlers
      .addCase(verifyTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactor.fulfilled, (state) => {
        // After 2FA verification, the user is fully authenticated
        state.isAuthenticated = true;
        state.isLoading = false;
        state.twoFactorRequired = false;
        state.error = null;
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.twoFactorRequired = true;
      })

      // Profile update handlers
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload || null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })

      // OAuth login handlers
      .addCase(loginWithOAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithOAuth.fulfilled, (state) => {
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginWithOAuth.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })

      // Validate stored tokens handlers
      .addCase(validateStoredTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateStoredTokens.fulfilled, (state, action) => {
        if (action.payload) {
          // If tokens are valid, mark as authenticated
          // You should immediately follow this with fetchCurrentUser
          state.isAuthenticated = true;
        }
        state.isLoading = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(validateStoredTokens.rejected, (state, action) => {
        // If token validation fails, clear auth state
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.isLoading = false;
        state.isInitialized = true;
        state.twoFactorRequired = false;
        
        // In development mode, don't set error to avoid noise
        if (process.env.NODE_ENV !== 'development') {
          state.error = action.payload as string;
        }
      })

      // Fetch current user handlers - this completes the authentication process
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload || null;
        state.isLoading = false;
        state.error = null;
        // Only set authenticated if we successfully got user data
        if (action.payload) {
          state.isAuthenticated = true;
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        // If we can't fetch user data, the session might be invalid
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

// ============================================================================
// Export Actions and Selectors
// ============================================================================

// Export all synchronous actions
export const {
  setUser,
  updateUser,
  clearError,
  setInitialized,
  setTwoFactorRequired,
  resetAuthState
} = authSlice.actions;

// Base selector to access the auth state
const selectAuthState = (state: { auth: AuthState }) => state.auth;

// Memoized selectors for efficient state access
export const selectUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectIsLoading = createSelector(
  [selectAuthState],
  (auth) => auth.isLoading
);

export const selectAuthError = createSelector(
  [selectAuthState],
  (auth) => auth.error
);

export const selectSessionExpiry = createSelector(
  [selectAuthState],
  (auth) => auth.sessionExpiry
);

export const selectIsInitialized = createSelector(
  [selectAuthState],
  (auth) => auth.isInitialized
);

export const selectTwoFactorRequired = createSelector(
  [selectAuthState],
  (auth) => auth.twoFactorRequired
);

// Composite selectors that combine multiple pieces of state
export const selectAuthStatus = createSelector(
  [selectIsAuthenticated, selectIsLoading, selectTwoFactorRequired],
  (isAuthenticated, isLoading, twoFactorRequired) => ({
    isAuthenticated,
    isLoading,
    twoFactorRequired,
    needsTwoFactor: isAuthenticated && twoFactorRequired
  })
);

export const selectUserProfile = createSelector(
  [selectUser],
  (user) => user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled
  } : null
);

// Export the reducer as default
export default authSlice.reducer;

// Hook shim to support legacy imports expecting a zustand-style auth store
// This provides backward compatibility during migration
export function useAuthStore() {
  const user = useSelector(selectUser);
  return { user } as const;
}