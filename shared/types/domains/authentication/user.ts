/**
 * User Entity Types
 * Standardized user types following BaseEntity pattern with proper type safety
 */

import { BaseEntity, UserTrackableEntity } from '../../core/base';
import { UserId } from '../../core/branded';
import { 
  UserRole, 
  UserStatus, 
  VerificationStatus, 
  AnonymityLevel 
} from '../../core/enums';

// Re-export enums for convenience
export { UserRole, UserStatus, VerificationStatus, AnonymityLevel };

/**
 * Geographic Location Type
 */
export interface GeographicLocation {
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly timezone?: string;
}

/**
 * User Preferences
 * Includes userId and audit timestamps for proper data tracking
 */
export interface UserPreferences {
  readonly userId: UserId;
  readonly theme?: 'light' | 'dark' | 'system';
  readonly language?: string;
  readonly notificationsEnabled?: boolean;
  readonly emailNotifications?: boolean;
  readonly pushNotifications?: boolean;
  readonly accessibility?: {
    readonly reducedMotion?: boolean;
    readonly highContrast?: boolean;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;
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