/**
 * Authentication Slice
 *
 * Manages user authentication state and session management with backend integration.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authRepository } from '../../repositories';
import { LoginCredentials, User } from '../../core/api';
import { logger } from '../../utils/logger';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;
}

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const session = await authBackendService.login(credentials);
      return {
        user: session.user,
        sessionExpiry: session.expiresAt
      };
    } catch (error) {
      logger.error('Login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

// Async thunk for registration
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const session = await authBackendService.register(data);
      return {
        user: session.user,
        sessionExpiry: session.expiresAt
      };
    } catch (error) {
      logger.error('Registration failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

// Async thunk for logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authBackendService.logout();
    } catch (error) {
      logger.warn('Logout request failed (continuing with local cleanup)', { error });
      // Don't reject, always clear local state
    }
  }
);

// Async thunk for session validation
export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { rejectWithValue }) => {
    try {
      const isValid = await authBackendService.validateSession();
      if (isValid) {
        const user = await authBackendService.getCurrentUser();
        return user;
      } else {
        throw new Error('Session invalid');
      }
    } catch (error) {
      logger.info('Session validation failed', { error });
      return rejectWithValue('Session expired');
    }
  }
);

// Async thunk for refreshing tokens
export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      await authBackendService.refreshTokens();
      const user = await authBackendService.getCurrentUser();
      return user;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

// Async thunk for updating profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<AuthUser>, { rejectWithValue }) => {
    try {
      const updatedUser = await authBackendService.updateProfile(updates);
      return updatedUser;
    } catch (error) {
      logger.error('Profile update failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'Profile update failed');
    }
  }
);

// Async thunk for OAuth login
export const oauthLogin = createAsyncThunk(
  'auth/oauthLogin',
  async ({ code, state }: { code: string; state?: string }, { rejectWithValue }) => {
    try {
      const session = await authBackendService.handleOAuthCallback(code, state);
      return {
        user: session.user,
        sessionExpiry: session.expiresAt
      };
    } catch (error) {
      logger.error('OAuth login failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : 'OAuth login failed');
    }
  }
);

// Async thunk for 2FA verification
export const verifyTwoFactor = createAsyncThunk(
  'auth/verifyTwoFactor',
  async (token: string, { rejectWithValue }) => {
    try {
      await authBackendService.verifyTwoFactor(token);
      const user = await authBackendService.getCurrentUser();
      return user;
    } catch (error) {
      logger.error('2FA verification failed', { error });
      return rejectWithValue(error instanceof Error ? error.message : '2FA verification failed');
    }
  }
);

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiry: null,
  isInitialized: false,
  twoFactorRequired: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.twoFactorRequired = false;
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
    updateUserPreferences: (state, action: PayloadAction<Partial<AuthUser['preferences']>>) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload };
      }
    },
    resetAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.sessionExpiry = null;
      state.error = null;
      state.twoFactorRequired = false;
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
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      
      // Registration
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.sessionExpiry = action.payload.sessionExpiry;
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
      
      // Session validation
      .addCase(validateSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(validateSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.isLoading = false;
        state.isInitialized = true;
        state.twoFactorRequired = false;
      })
      
      // Token refresh
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(refreshTokens.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.sessionExpiry = null;
        state.twoFactorRequired = false;
      })
      
      // Profile update
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      
      // OAuth login
      .addCase(oauthLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(oauthLogin.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.error = null;
      })
      .addCase(oauthLogin.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      
      // 2FA verification
      .addCase(verifyTwoFactor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactor.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.twoFactorRequired = false;
        state.error = null;
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
        state.twoFactorRequired = true;
      });
  },
});

// Export actions
export const { 
  setUser, 
  clearError, 
  setInitialized, 
  setTwoFactorRequired, 
  updateUserPreferences, 
  resetAuthState 
} = authSlice.actions;

// Export selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectSessionExpiry = (state: { auth: AuthState }) => state.auth.sessionExpiry;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
export const selectTwoFactorRequired = (state: { auth: AuthState }) => state.auth.twoFactorRequired;

// Zustand-compatible store for easier component integration
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: string | null;
  isInitialized: boolean;
  twoFactorRequired: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  oauthLogin: (code: string, state?: string) => Promise<void>;
  verifyTwoFactor: (token: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
  resetState: () => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      isInitialized: false,
      twoFactorRequired: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const session = await authBackendService.login(credentials);
          set({
            user: session.user,
            isAuthenticated: true,
            sessionExpiry: session.expiresAt,
            isLoading: false,
            twoFactorRequired: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const session = await authBackendService.register(data);
          set({
            user: session.user,
            isAuthenticated: true,
            sessionExpiry: session.expiresAt,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authBackendService.logout();
        } catch (error) {
          logger.warn('Logout request failed (continuing with local cleanup)', { error });
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null,
            error: null,
            isLoading: false,
            twoFactorRequired: false
          });
        }
      },

      validateSession: async () => {
        set({ isLoading: true });
        try {
          const isValid = await authBackendService.validateSession();
          if (isValid) {
            const user = await authBackendService.getCurrentUser();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null
            });
          } else {
            throw new Error('Session invalid');
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null,
            isLoading: false,
            isInitialized: true,
            twoFactorRequired: false
          });
        }
      },

      refreshTokens: async () => {
        try {
          await authBackendService.refreshTokens();
          const user = await authBackendService.getCurrentUser();
          set({ user, error: null });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null,
            twoFactorRequired: false
          });
          throw error;
        }
      },

      updateProfile: async (updates: Partial<AuthUser>) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authBackendService.updateProfile(updates);
          set({ user: updatedUser, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Profile update failed',
            isLoading: false
          });
          throw error;
        }
      },

      oauthLogin: async (code: string, state?: string) => {
        set({ isLoading: true, error: null });
        try {
          const session = await authBackendService.handleOAuthCallback(code, state);
          set({
            user: session.user,
            isAuthenticated: true,
            sessionExpiry: session.expiresAt,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'OAuth login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      verifyTwoFactor: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          await authBackendService.verifyTwoFactor(token);
          const user = await authBackendService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            twoFactorRequired: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '2FA verification failed',
            isLoading: false,
            twoFactorRequired: true
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: AuthUser) => set({ user, isAuthenticated: true, twoFactorRequired: false }),

      resetState: () => set({
        user: null,
        isAuthenticated: false,
        sessionExpiry: null,
        error: null,
        twoFactorRequired: false,
        isLoading: false
      })
    }),
    { name: 'AuthStore' }
  )
);

// Export reducer
export default authSlice.reducer;