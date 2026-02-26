/**
 * Authentication State Types
 * Discriminated unions for authentication state management
 */

import { User } from './user';

import { UserId, SessionId } from '../../core/branded';

/**
 * Authentication Status Types
 */
export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'error'
  | 'session_expired'
  | 'token_refreshing';

/**
 * Authentication Error Types
 */
export type AuthErrorType =
  | 'invalid_credentials'
  | 'session_expired'
  | 'token_invalid'
  | 'network_error'
  | 'server_error'
  | 'account_locked'
  | 'verification_required'
  | 'unknown_error';

/**
 * Authentication Error Interface
 */
export interface AuthError {
  readonly type: AuthErrorType;
  readonly message: string;
  readonly timestamp: number;
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Session Information
 */
export interface AuthSession {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly isActive: boolean;
}

/**
 * Authentication State Discriminated Union
 * Following the exemplary pattern from loading.ts
 */
export type AuthState =
  | {
      status: 'unauthenticated';
      user: null;
      session: null;
      error: null;
      lastAuthAttempt?: Date;
    }
  | {
      status: 'authenticating';
      user: null;
      session: null;
      error: null;
      isInitialAuth: boolean;
      startedAt: Date;
    }
  | {
      status: 'authenticated';
      user: User;
      session: AuthSession;
      error: null;
      lastAuthenticated: Date;
      tokenExpiresAt: Date;
    }
  | {
      status: 'error';
      user: null;
      session: null;
      error: AuthError;
      lastAuthAttempt: Date;
      canRetry: boolean;
    }
  | {
      status: 'session_expired';
      user: User | null; // May have partial user data
      session: null;
      error: AuthError;
      lastActiveSession?: Omit<AuthSession, 'isActive'>;
    }
  | {
      status: 'token_refreshing';
      user: User;
      session: Omit<AuthSession, 'token' | 'expiresAt'> & {
        token: string | null;
        expiresAt: Date | null;
      };
      error: null;
      refreshStartedAt: Date;
      originalToken: string;
    };

/**
 * Authentication Action Discriminated Union
 * Following the exemplary pattern from loading.ts
 */
export type AuthAction =
  | {
      type: 'LOGIN_START';
      payload: {
        email: string;
        password: string;
        rememberMe?: boolean;
        timestamp: number;
      };
    }
  | {
      type: 'LOGIN_SUCCESS';
      payload: {
        user: User;
        session: AuthSession;
        timestamp: number;
      };
    }
  | {
      type: 'LOGIN_FAILURE';
      payload: {
        error: AuthError;
        timestamp: number;
      };
    }
  | {
      type: 'LOGOUT';
      payload: {
        userId: UserId;
        sessionId: SessionId;
        timestamp: number;
      };
    }
  | {
      type: 'TOKEN_REFRESH_START';
      payload: {
        userId: UserId;
        sessionId: SessionId;
        currentToken: string;
        timestamp: number;
      };
    }
  | {
      type: 'TOKEN_REFRESH_SUCCESS';
      payload: {
        userId: UserId;
        sessionId: SessionId;
        newToken: string;
        newExpiresAt: Date;
        timestamp: number;
      };
    }
  | {
      type: 'TOKEN_REFRESH_FAILURE';
      payload: {
        userId: UserId;
        sessionId: SessionId;
        error: AuthError;
        timestamp: number;
      };
    }
  | {
      type: 'SESSION_EXPIRED';
      payload: {
        userId?: UserId;
        sessionId?: SessionId;
        timestamp: number;
      };
    }
  | {
      type: 'UPDATE_SESSION';
      payload: {
        session: Partial<AuthSession>;
        timestamp: number;
      };
    }
  | {
      type: 'CLEAR_ERROR';
      payload: {
        timestamp: number;
      };
    };

/**
 * Type guards for authentication state
 */
export function isAuthenticated(state: AuthState): state is Extract<AuthState, { status: 'authenticated' }> {
  return state.status === 'authenticated';
}

export function isAuthenticating(state: AuthState): state is Extract<AuthState, { status: 'authenticating' }> {
  return state.status === 'authenticating';
}

export function isAuthError(state: AuthState): state is Extract<AuthState, { status: 'error' }> {
  return state.status === 'error';
}

export function isSessionExpired(state: AuthState): state is Extract<AuthState, { status: 'session_expired' }> {
  return state.status === 'session_expired';
}