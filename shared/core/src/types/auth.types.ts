import type { Request } from 'express';
import { logger } from '../observability/logging';

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  trustScore: number;
  password?: string;
}

// User role type for authorization
export type UserRole = 'user' | 'agent' | 'admin';

// Enhanced session interface with proper typing
export interface CustomSession {
  userId?: number;
  lastActivity?: string;
  destroy: (callback: (err?: any) => void) => void;
}

// Type-safe authenticated request interface
export interface AuthenticatedRequest extends Omit<Request, 'session'> {
  session?: CustomSession;
  user?: Omit<User, 'password'>;
}

// Authentication result types
export interface AuthResult {
  user: Omit<User, 'password'>;
  token?: string;
  expiresAt?: Date;
}

// Login request interface
export interface LoginRequest {
  username: string;
  password: string;
}

// Registration request interface
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Session validation result
export interface SessionValidationResult {
  valid: boolean;
  userId?: number;
  user?: Omit<User, 'password'>;
  error?: string;
}

// Authorization context for permission checks
export interface AuthorizationContext {
  resource: string;
  action: string;
  ownerId?: number;
  metadata?: Record<string, any>;
}

// Permission check result interface
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

// Session configuration interface
export interface SessionConfig {
  maxAge?: number;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  domain?: string;
  path?: string;
}

// OAuth and Social Profile Types (migrated from shared/types/auth.ts)
export interface UserProfile {
  id: string;
  username?: string | null;
  email: string;
  role: 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
  displayName?: string | null;
  avatarUrl?: string | null;
  expertise?: string[] | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface SocialProfile {
  id: string;
  userId: string;
  provider: string;
  profileId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'user': 1,
  'agent': 2,
  'admin': 3
};













































