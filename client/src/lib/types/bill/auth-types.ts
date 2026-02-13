/**
 * Authentication and User Types
 *
 * Types for user management, authentication, authorization,
 * and role-based access control.
 *
 * @module shared/types/bill
 */

import { UserRole as SharedUserRole } from '../../../shared/types/core/enums';

// ============================================================================
// User Role Types
// ============================================================================

/**
 * User role type - imported from shared enums
 * @deprecated Use UserRole from shared/types/core/enums instead
 */
export type UserRole = `${SharedUserRole}`;

/**
 * User role enum - re-exported from shared layer
 * @deprecated Import UserRole directly from shared/types/core/enums
 */
export const UserRoleEnum = SharedUserRole;

/**
 * User permission type
 */
export type UserPermission =
  | 'create:comment'
  | 'edit:comment'
  | 'delete:comment'
  | 'create:analysis'
  | 'edit:analysis'
  | 'moderate:content'
  | 'view:analytics'
  | 'manage:users'
  | 'manage:system'
  | 'track:bills'
  | 'view:draft'
  | 'submit:insight';

// ============================================================================
// User Types
// ============================================================================

/**
 * Basic user information
 *
 * @example
 * const user: User = {
 *   id: '12345',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   role: 'citizen',
 *   avatar: 'https://...',
 *   createdAt: '2024-01-01T00:00:00Z'
 * };
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatar?: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly lastLogin?: string;
  readonly isActive?: boolean;
  readonly verifiedAt?: string;
}

/**
 * Extended user profile
 */
export interface ExtendedUser extends User {
  readonly bio?: string;
  readonly location?: string;
  readonly affiliation?: string;
  readonly expertise?: readonly string[];
  readonly website?: string;
  readonly socialLinks?: SocialLinks;
  readonly preferences?: UserPreferences;
  readonly stats?: UserStats;
}

/**
 * Social links for user profile
 */
export interface SocialLinks {
  readonly twitter?: string;
  readonly linkedIn?: string;
  readonly github?: string;
  readonly website?: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  readonly emailNotifications: boolean;
  readonly pushNotifications: boolean;
  readonly billUpdates: boolean;
  readonly analyticsEmails: boolean;
  readonly digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  readonly language?: string;
  readonly theme?: 'light' | 'dark' | 'auto';
  readonly defaultView?: 'list' | 'grid' | 'map';
}

/**
 * User statistics
 */
export interface UserStats {
  readonly commentsCount: number;
  readonly billsTracked: number;
  readonly analysesRead: number;
  readonly engagementScore: number;
  readonly followersCount?: number;
  readonly followingCount?: number;
  readonly achievementsCount?: number;
}

/**
 * Expert user profile
 */
export interface ExpertUser extends ExtendedUser {
  readonly expertDomain: string;
  readonly credentials: readonly string[];
  readonly verificationLevel: 'pending' | 'verified' | 'approved';
  readonly verificationDate?: string;
  readonly insightCount?: number;
  readonly reviewCount?: number;
  readonly expertRating?: number;
}

/**
 * Legislator user profile
 */
export interface LegislatorUser extends ExtendedUser {
  readonly chamber: 'House' | 'Senate';
  readonly district?: string;
  readonly state: string;
  readonly party?: string;
  readonly officialTitle?: string;
  readonly officePhone?: string;
  readonly sponsoredBills?: readonly number[];
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  readonly success: boolean;
  readonly user?: User;
  readonly token?: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly error?: string;
}

/**
 * Token payload
 */
export interface TokenPayload {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions?: readonly UserPermission[];
  readonly iat: number;
  readonly exp: number;
}

/**
 * Session information
 */
export interface SessionInfo {
  readonly sessionId: string;
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly permissions: readonly UserPermission[];
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastActivity: string;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly clientId?: string;
  readonly scope?: string[];
}

// ============================================================================
// Authorization Types
// ============================================================================

/**
 * Role-based access control
 */
export interface RolePermissions {
  readonly role: UserRole;
  readonly permissions: readonly UserPermission[];
  readonly description?: string;
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  readonly resourceId: string;
  readonly resourceType: 'bill' | 'comment' | 'analysis' | 'user' | 'system';
  readonly userId: string;
  readonly action: string;
  readonly allowed: boolean;
}

/**
 * Resource access level
 */
export enum ResourceAccessLevel {
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
  INTERNAL = 'internal',
  PUBLIC = 'public',
}

/**
 * Resource permission
 */
export interface ResourcePermission {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly owner: string;
  readonly accessLevel: ResourceAccessLevel;
  readonly sharedWith?: readonly string[];
}

// ============================================================================
// User Management Types
// ============================================================================

/**
 * User account
 */
export interface UserAccount {
  readonly id: string;
  readonly user: User;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly passwordHash: string;
  readonly lastPasswordChange?: string;
  readonly twoFactorEnabled: boolean;
  readonly accountLocked: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

/**
 * User registration form
 */
export interface UserRegistration {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly userType: 'citizen' | 'expert' | 'legislator';
  readonly acceptTerms: boolean;
  readonly acceptNewsletter?: boolean;
}

/**
 * User update request
 */
export interface UserUpdateRequest {
  readonly name?: string;
  readonly avatar?: string;
  readonly bio?: string;
  readonly location?: string;
  readonly preferences?: Partial<UserPreferences>;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly newPasswordConfirm: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  readonly email: string;
  readonly resetToken: string;
  readonly newPassword: string;
  readonly newPasswordConfirm: string;
}

/**
 * Two-factor authentication setup
 */
export interface TwoFactorSetup {
  readonly userId: string;
  readonly method: 'totp' | 'sms' | 'email';
  readonly secret?: string;
  readonly qrCode?: string;
  readonly backupCodes?: readonly string[];
}

/**
 * Two-factor verification
 */
export interface TwoFactorVerification {
  readonly userId: string;
  readonly code: string;
  readonly method: 'totp' | 'sms' | 'email';
}

// ============================================================================
// Audit and Compliance Types
// ============================================================================

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  readonly id: string;
  readonly userId?: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly changes?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: string;
}

/**
 * Activity log
 */
export interface ActivityLog {
  readonly userId: string;
  readonly activityType: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for User
 */
export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string'
  );
}

/**
 * Type guard for ExtendedUser
 */
export function isExtendedUser(value: unknown): value is ExtendedUser {
  return isUser(value);
}

/**
 * Type guard for ExpertUser
 */
export function isExpertUser(value: unknown): value is ExpertUser {
  if (!isUser(value)) return false;
  const obj = value as unknown as Record<string, unknown>;
  return typeof obj.expertDomain === 'string' && Array.isArray(obj.credentials);
}

/**
 * Type guard for LegislatorUser
 */
export function isLegislatorUser(value: unknown): value is LegislatorUser {
  if (!isUser(value)) return false;
  const obj = value as unknown as Record<string, unknown>;
  return typeof obj.chamber === 'string' && typeof obj.state === 'string';
}
