import type { Request } from 'express';
import { logger } from '../observability/logging';

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  trustScore: number;
  password?: string;
}

// User role type for authorization
export type UserRole = 'user' | 'agent' | 'admin';

// Enhanced session interface with proper typing
export interface CustomSession { user_id?: number;
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
  expires_at?: Date;
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
  first_name: string;
  last_name: string;
}

// Session validation result
export interface SessionValidationResult { valid: boolean;
  user_id?: number;
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
  display_name?: string | null;
  avatar_url?: string | null;
  expertise?: string[] | null;
  created_at: Date;
  last_login_at?: Date | null;
}

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface SocialProfile { id: string;
  user_id: string;
  provider: string;
  profile_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  access_token?: string;
  refresh_token?: string;
  tokenExpiresAt?: Date;
  created_at: Date;
  updated_at: Date;
 }

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'user': 1,
  'agent': 2,
  'admin': 3
};
















































