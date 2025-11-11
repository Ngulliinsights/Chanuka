/**
 * Authentication Slice
 * 
 * Manages user authentication state and session management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'expert' | 'official' | 'admin';
  verified: boolean;
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: string | null;
}

interface AuthActions {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionExpiry: null,

        // Actions
        login: async (credentials) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // API call would go here
            // const response = await authAPI.login(credentials);
            // For now, mock success
            const mockUser: User = {
              id: '1',
              email: credentials.email,
              name: 'Test User',
              role: 'citizen',
              verified: true,
              preferences: {
                notifications: true,
                emailAlerts: false,
                theme: 'system'
              }
            };

            set((state) => {
              state.user = mockUser;
              state.isAuthenticated = true;
              state.isLoading = false;
              state.sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Login failed';
              state.isLoading = false;
            });
          }
        },

        logout: () =>
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.sessionExpiry = null;
            state.error = null;
          }),

        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
          }),

        clearError: () =>
          set((state) => {
            state.error = null;
          }),

        updatePreferences: (preferences) =>
          set((state) => {
            if (state.user) {
              state.user.preferences = { ...state.user.preferences, ...preferences };
            }
          })
      })),
      {
        name: 'chanuka-auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          sessionExpiry: state.sessionExpiry
        })
      }
    ),
    { name: 'AuthStore' }
  )
);

// Export Redux-compatible slice
export const authSlice = {
  name: 'auth',
  reducer: (state = {}, action: any) => state
};