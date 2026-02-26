/**
 * User Entity Types - CANONICAL SOURCE OF TRUTH
 * 
 * This is the single source of truth for User types across the entire application.
 * All other User types should import from here or derive from this definition.
 * 
 * Includes authentication, authorization, profiles, and preferences.
 * 
 * @module shared/types/domains/authentication/user
 * @canonical
 */

import type { Request } from 'express';
import { UserId } from '../../core/branded';
import { 
  UserRole, 
  UserStatus, 
  VerificationStatus, 
  AnonymityLevel 
} from '../../core/enums';

// Re-export enums for convenience
export { UserRole, UserStatus, VerificationStatus, AnonymityLevel };

// ============================================================================
// Core User Types
// ============================================================================

/**
 * Core User interface - CANONICAL DEFINITION
 * Supports both branded types (UserId) and string IDs for flexibility.
 * 
 * All entity IDs across the system use string (UUID) format.
 */
export interface User {
  readonly id: UserId | string;
  readonly email: string;
  readonly username?: string | null;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly display_name?: string | null;
  readonly role: UserRole;
  readonly status?: UserStatus;
  readonly avatar_url?: string | null;
  readonly expertise?: string[] | null;
  readonly is_active: boolean;
  readonly verification?: VerificationStatus;
  readonly verification_status?: 'pending' | 'verified' | 'rejected';
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly last_login_at?: Date | string | null;
  readonly password?: string; // Only for server-side operations
  readonly preferences?: UserPreferences;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * User profile with extended information
 */
export interface UserProfile extends User {
  readonly bio?: string | null;
  readonly interests?: string[] | null;
  readonly reputation_score?: number;
  readonly county?: string;
  readonly constituency?: string;
  readonly ward?: string;
  readonly phone_number?: string;
  readonly phone_verified?: boolean;
  readonly anonymity_level?: AnonymityLevel;
  readonly completeness_score?: number;
  readonly is_public?: boolean;
}

// ============================================================================
// Authentication & Session Types
// ============================================================================

/**
 * Authenticated user data attached to requests.
 * This is a subset of User with only fields populated by auth middleware.
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
 * Enhanced session interface with proper typing
 */
export interface CustomSession {
  user_id?: string;
  lastActivity?: string;
  destroy: (callback: (err?: unknown) => void) => void;
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

// ============================================================================
// User Payloads & Operations
// ============================================================================

/**
 * User Preferences
 * Supports both branded UserId and string for flexibility
 */
export interface UserPreferences {
  readonly userId?: UserId | string;
  readonly theme?: 'light' | 'dark' | 'system' | 'auto';
  readonly language?: string;
  readonly timezone?: string;
  readonly notificationsEnabled?: boolean;
  readonly emailNotifications?: boolean;
  readonly pushNotifications?: boolean;
  readonly smsNotifications?: boolean;
  readonly accessibility?: {
    readonly reducedMotion?: boolean;
    readonly highContrast?: boolean;
  };
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * User Creation Payload (without audit fields)
 */
export interface CreateUserPayload {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
  profile?: Partial<Omit<UserProfile, 'userId'>>;
  preferences?: Partial<UserPreferences>;
  verification?: VerificationStatus;
  isActive?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * User Update Payload (partial updates)
 */
export interface UpdateUserPayload {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<Omit<UserProfile, 'userId'>>;
  preferences?: Partial<UserPreferences>;
  verification?: VerificationStatus;
  isActive?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Type guard for User entity
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'username' in value &&
    'role' in value &&
    'preferences' in value &&
    'verification' in value
  );
}

/**
 * Payload for updating a user
 */
export interface UpdateUserPayload {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<Omit<UserProfile, 'userId'>>;
  preferences?: Partial<UserPreferences>;
  verification?: VerificationStatus;
  isActive?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}