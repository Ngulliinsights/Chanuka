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
 */
export interface UserPreferences {
  readonly theme?: 'light' | 'dark' | 'system';
  readonly language?: string;
  readonly notificationsEnabled?: boolean;
  readonly emailNotifications?: boolean;
  readonly pushNotifications?: boolean;
  readonly accessibility?: {
    readonly reducedMotion?: boolean;
    readonly highContrast?: boolean;
  };
}

/**
 * User Profile with Anonymity Controls
 * Follows the design document specification for proper anonymity controls
 */
export interface UserProfile {
  readonly userId: UserId;
  readonly displayName: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly bio?: string;
  readonly location?: GeographicLocation;
  readonly avatarUrl?: string;
  readonly anonymityLevel: AnonymityLevel;
  readonly socialLinks?: Readonly<Record<string, string>>;
  readonly isPublic: boolean;
}

/**
 * User Entity following BaseEntity pattern
 * Extends UserTrackableEntity for full audit trail
 */
export interface User extends UserTrackableEntity {
  readonly id: UserId;
  readonly email: string;
  readonly username: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly profile: UserProfile | null;
  readonly preferences: UserPreferences;
  readonly verification: VerificationStatus;
  readonly lastLogin?: Date;
  readonly isActive: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
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