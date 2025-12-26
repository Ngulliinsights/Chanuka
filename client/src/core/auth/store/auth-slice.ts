/**
 * Consolidated Authentication Redux Slice
 * 
 * Unified implementation that consolidates:
 * - Auth slice from store/slices/authSlice.ts
 * - All authentication state management
 * - Async thunks for auth operations
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import { logger } from '@client/utils/logger';

import { getAuthApiService } from '../services/auth-api-service';
import type { LoginCredentials, User, RegisterData, PrivacySettings } from '../types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;
}

// ============================================================================
// Async Thunks for Authentication Operations
// ============================================================================

// Login thunk
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      const result = await authService.login(credentials);
      return {
        user: result.userId, // AuthSession has userId, not user
        sessionExpiry: result.expiresAt.toISOString(), // Convert Date to string
        requires2FA: false // AuthSession doesn't have this field
      };
    } catch (error) {
      logger.error('Login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

// Registration thunk
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      const result = await authService.register(data);
      return {
        user: result.userId, // AuthSession has userId, not user
        sessionExpiry: result.expiresAt.toISOString() // Convert Date to string
      };
    } catch (error) {
      logger.error('Registration failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

// Logout thunk
export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      const authService = getAuthApiService();
      await authService.logout();
    } catch (error) {
      logger.warn('Logout request failed (continuing with local cleanup)', { error });
      // Don't reject, always clear local state
    }
  }
);

// Token refresh thunk
export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.refreshTokens();
    } catch (error) {
      logger.error('Token refresh failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

// Email verification thunk
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.verifyEmail(token);
    } catch (error) {
      logger.error('Email verification failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Email verification failed');
    }
  }
);

// Password reset request thunk
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.requestPasswordReset({ email });
    } catch (error) {
      logger.error('Password reset request failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password reset request failed');
    }
  }
);

// Password reset completion thunk
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password, confirmPassword }: { token: string; password: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.resetPassword({ token, password, confirmPassword });
    } catch (error) {
      logger.error('Password reset failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password reset failed');
    }
  }
);

// Password change thunk
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.changePassword(currentPassword, newPassword);
    } catch (error) {
      logger.error('Password change failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Password change failed');
    }
  }
);

// Two-factor setup thunk
export const setupTwoFactor = createAsyncThunk(
  'auth/setupTwoFactor',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.setupTwoFactor();
    } catch (error) {
      logger.error('Two-factor setup failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor setup failed');
    }
  }
);

// Two-factor enable thunk
export const enableTwoFactor = createAsyncThunk(
  'auth/enableTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.enableTwoFactor(token);
    } catch (error) {
      logger.error('Two-factor enable failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor enable failed');
    }
  }
);

// Two-factor disable thunk
export const disableTwoFactor = createAsyncThunk(
  'auth/disableTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.disableTwoFactor(token);
    } catch (error) {
      logger.error('Two-factor disable failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor disable failed');
    }
  }
);

// Two-factor verification thunk
export const verifyTwoFactor = createAsyncThunk(
  'auth/verifyTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.verifyTwoFactor(token);
    } catch (error) {
      logger.error('Two-factor verification failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Two-factor verification failed');
    }
  }
);

// Profile update thunk
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (updates: Partial<User>, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.updateUserProfile(updates);
    } catch (error) {
      logger.error('Profile update failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Profile update failed');
    }
  }
);

// OAuth login thunk
export const loginWithOAuth = createAsyncThunk(
  'auth/loginWithOAuth',
  async ({ code, state }: { code: string; state?: string }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.loginWithOAuth(code, state);
    } catch (error) {
      logger.error('OAuth login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'OAuth login failed');
    }
  }
);

// Session extension thunk
export const extendSession = createAsyncThunk(
  'auth/extendSession',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.extendSession();
    } catch (error) {
      logger.error('Session extension failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Session extension failed');
    }
  }
);

// Get active sessions thunk
export const getActiveSessions = createAsyncThunk(
  'auth/getActiveSessions',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.getActiveSessions();
    } catch (error) {
      logger.error('Get active sessions failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get active sessions failed');
    }
  }
);

// Terminate session thunk
export const terminateSession = createAsyncThunk(
  'auth/terminateSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.terminateSession(sessionId);
    } catch (error) {
      logger.error('Terminate session failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Terminate session failed');
    }
  }
);

// Terminate all sessions thunk
export const terminateAllSessions = createAsyncThunk(
  'auth/terminateAllSessions',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.terminateAllOtherSessions();
    } catch (error) {
      logger.error('Terminate all sessions failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Terminate all sessions failed');
    }
  }
);

// Update privacy settings thunk
export const updatePrivacySettings = createAsyncThunk(
  'auth/updatePrivacySettings',
  async (settings: Partial<PrivacySettings>, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      await authService.updatePrivacySettings(settings);
    } catch (error) {
      logger.error('Update privacy settings failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Update privacy settings failed');
    }
  }
);

// Request data export thunk
export const requestDataExport = createAsyncThunk(
  'auth/requestDataExport',
  async ({ format, includes }: { format: 'json' | 'csv' | 'xml'; includes: string[] }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.requestDataExport(format, includes);
    } catch (error) {
      logger.error('Request data export failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Request data export failed');
    }
  }
);

// Request data deletion thunk
export const requestDataDeletion = createAsyncThunk(
  'auth/requestDataDeletion',
  async ({ retentionPeriod, includes }: { retentionPeriod: string; includes: string[] }, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.requestDataDeletion(retentionPeriod, includes);
    } catch (error) {
      logger.error('Request data deletion failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Request data deletion failed');
    }
  }
);

// Get security events thunk
export const getSecurityEvents = createAsyncThunk(
  'auth/getSecurityEvents',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.getSecurityEvents(limit);
    } catch (error) {
      logger.error('Get security events failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get security events failed');
    }
  }
);

// Get suspicious activity thunk
export const getSuspiciousActivity = createAsyncThunk(
  'auth/getSuspiciousActivity',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      return await authService.getSuspiciousActivity();
    } catch (error) {
      logger.error('Get suspicious activity failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Get suspicious activity failed');
    }
  }
);

// Validate stored tokens thunk
export const validateStoredTokens = createAsyncThunk(
  'auth/validateStoredTokens',
  async (_, { rejectWithValue }) => {
    try {
      const authService = getAuthApiService();
      const result = await authService.validateStoredTokens();
      return result;
    } catch (error) {
      // In development mode, this is expected - don't log as error
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Token validation skipped in development mode');
      } else {
        logger.warn('Token validation failed, continuing with guest session', { error });
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Token validation failed');
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
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.twoFactorRequired = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setTwoFactorRequired: (state, action: PayloadAction<boolean>) => {
      state.twoFactorRequired = action.payload;
    },
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
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        // Since login returns AuthSession, we need to fetch user separately
        // For now, set a placeholder and mark as authenticated
        state.user = null; // Will be populated by getCurrentUser call
        state.isAuthenticated = true;
        state.isLoading = false;
        state.sessionExpiry = action.payload.sessionExpiry || null;
        state.twoFactorRequired = action.payload.requires2FA || false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.twoFactorRequired = false;
      })

      // Registration
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        // Since register returns AuthSession, we need to fetch user separately
        // For now, set a placeholder and mark as authenticated
        state.user = null; // Will be populated by getCurrentUser call
        state.isAuthenticated = true;
        state.isLoading = false;
        state.sessionExpiry = action.payload.sessionExpiry || null;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })

      // Logout
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

      // Token refresh
      .addCase(refreshTokens.fulfilled, (state) => {
        // Token refresh doesn't return user data, just tokens
        state.error = null;
      })
      .addCase(refreshTokens.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.twoFactorRequired = false;
      })

      // Email verification
      .addCase(verifyEmail.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password reset request
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password reset completion
      .addCase(resetPassword.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Password change
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Two-factor setup
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

      // Two-factor enable
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

      // Two-factor disable
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

      // Two-factor verification
      .addCase(verifyTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactor.fulfilled, (state, _action) => {
        // Since verifyTwoFactor returns AuthSession, we need to fetch user separately
        // For now, set a placeholder and mark as authenticated
        state.user = null; // Will be populated by getCurrentUser call
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

      // Profile update
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

      // OAuth login
      .addCase(loginWithOAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithOAuth.fulfilled, (state, _action) => {
        // Since loginWithOAuth returns AuthSession, we need to fetch user separately
        // For now, set a placeholder and mark as authenticated
        state.user = null; // Will be populated by getCurrentUser call
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

      // Validate stored tokens
      .addCase(validateStoredTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateStoredTokens.fulfilled, (state, _action) => {
        if (_action.payload) {
          // If tokens are valid, we should fetch current user
          // For now, just mark as initialized
          state.isAuthenticated = true;
        }
        state.isLoading = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(validateStoredTokens.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.isLoading = false;
        state.isInitialized = true;
        state.twoFactorRequired = false;
      });
  },
});

// ============================================================================
// Export Actions and Selectors
// ============================================================================

// Export actions
export const {
  setUser,
  updateUser,
  clearError,
  setInitialized,
  setTwoFactorRequired,
  resetAuthState
} = authSlice.actions;

// Base selectors
const selectAuthState = (state: { auth: AuthState }) => state.auth;

// Memoized selectors
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

// Composite selectors
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

// Export reducer
export default authSlice.reducer;
