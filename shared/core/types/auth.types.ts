/**
 * Authentication Types - Single Source of Truth
 * 
 * Canonical type definitions for authentication, authorization, and user identity.
 * All other files should import from here rather than defining their own versions.
 * 
 * IMPORTANT: This is the canonical location for auth-related types.
 * Do not redefine User, UserRole, or AuthenticatedRequest in other files.
 */

import type { Request } from 'express';
import { UserRole } from '@shared/types/core/enums';

// Re-export UserRole so consumers can import everything from one place
export { UserRole };

// ============================================================================
// User Types
// ============================================================================

/**
 * Core User interface - standardized with string IDs (UUIDs)
 * 
 * All entity IDs across the system use string (UUID) format.
 */
export interface User {
  id: string;
  email: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  expertise?: string[] | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date | null;
  password?: string;
}

/**
 * User profile with extended information
 */
export interface UserProfile extends User {
  bio?: string | null;
  interests?: string[] | null;
  verification_status?: 'pending' | 'verified' | 'rejected';
  reputation_score?: number;
  preferences?: UserPreferences;
}

/**
 * User preferences for UI and notifications
 */
export interface UserPreferences {
  emailNotifications?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Enhanced session interface with proper typing
 */
export interface CustomSession {
  user_id?: string;
  lastActivity?: string;
  destroy: (callback: (err?: unknown) => void) => void;
}

// ============================================================================
// Authenticated Request
// ============================================================================

/**
 * Authenticated user data attached to requests.
 * Matches the shape returned by auth-service.verifyToken().
 * This is intentionally a subset of User — only the fields
 * that the auth middleware populates on req.user.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole | string;
  readonly name?: string;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly username?: string | null;
  readonly display_name?: string | null;
  readonly avatar_url?: string | null;
  readonly verification_status?: string;
  readonly is_active?: boolean | null;
}

/**
 * Type-safe authenticated request interface.
 * Canonical definition — do not redefine in middleware or feature files.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: CustomSession;
  requestId?: string;
  startTime?: number;
}

// ============================================================================
// Auth Result Types
// ============================================================================

/**
 * Authentication result returned from login/register
 */
export interface AuthResult {
  user: AuthenticatedUser;
  token?: string;
  expires_at?: Date;
}

/**
 * Login request credentials
 */
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

/**
 * Registration request data
 */
export interface RegisterRequest {
  username?: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
}

/**
 * Auth response with token and user profile
 */
export interface AuthResponse {
  token: string;
  refresh_token?: string;
  user: UserProfile;
  expiresIn: number;
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  user_id?: string;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Authorization context for permission checks
 */
export interface AuthorizationContext {
  resource: string;
  action: string;
  ownerId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Permission check result interface
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

/**
 * Session configuration interface
 */
export interface SessionConfig {
  maxAge?: number;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  domain?: string;
  path?: string;
}

// ============================================================================
// OAuth and Social Profile Types
// ============================================================================

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

// ============================================================================
// Role Hierarchy
// ============================================================================

/**
 * Role hierarchy for permission checks.
 * Higher number = more privileges.
 */
export const ROLE_HIERARCHY: Partial<Record<UserRole, number>> = {
  [UserRole.Public]: 1,
  [UserRole.Citizen]: 2,
  [UserRole.VerifiedCitizen]: 3,
  [UserRole.Expert]: 4,
  [UserRole.Ambassador]: 5,
  [UserRole.Journalist]: 5,
  [UserRole.MpStaff]: 6,
  [UserRole.Clerk]: 6,
  [UserRole.Moderator]: 7,
  [UserRole.ExpertVerifier]: 7,
  [UserRole.Auditor]: 8,
  [UserRole.Admin]: 10,
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a request has an authenticated user
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

/**
 * Type guard to check if a request has a user with a specific role
 */
export function hasRole(req: Request, role: UserRole): boolean {
  if (!isAuthenticated(req)) {
    return false;
  }
  return (req as AuthenticatedRequest).user?.role === role;
}

/**
 * Get user ID from authenticated request
 * Returns null if request is not authenticated
 */
export function getUserId(req: Request): string | null {
  if (!isAuthenticated(req)) {
    return null;
  }
  return (req as AuthenticatedRequest).user?.id || null;
}
