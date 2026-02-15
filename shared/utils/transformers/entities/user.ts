/**
 * User Entity Transformers
 * Transformations between database, domain, and API representations of User entity
 * 
 * Requirements: 4.2, 4.3
 */

import type { Transformer } from '../types';
import type { User, UserProfile, UserPreferences } from '../../../types/domains/authentication/user';
import type { UserTable, UserProfileTable, UserPreferencesTable } from '../../../types/database/tables';
import type { UserId } from '../../../types/core/branded';
import { UserRole, UserStatus, VerificationStatus, AnonymityLevel } from '../../../types/core/enums';
import {
  dateToStringTransformer,
  optionalDateToStringTransformer,
  createOptionalTransformer,
} from '../base';

// ============================================================================
// Database to Domain Transformers
// ============================================================================

/**
 * Transform UserTable (database) to User (domain)
 */
export const userDbToDomain: Transformer<UserTable, User> = {
  transform(dbUser: UserTable): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role as UserRole,
      status: dbUser.status as UserStatus,
      profile: null, // Profile is loaded separately
      preferences: {}, // Preferences are loaded separately
      verification: dbUser.verification_status as VerificationStatus,
      lastLogin: dbUser.last_login ?? undefined,
      isActive: dbUser.is_active,
      metadata: dbUser.metadata ?? undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      createdBy: dbUser.created_by ?? undefined,
      updatedBy: dbUser.updated_by ?? undefined,
      passwordHash: dbUser.password_hash, // Preserve for round-trip
    };
  },

  reverse(user: User): UserTable {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash ?? '', // Restore from domain model
      role: user.role,
      status: user.status,
      verification_status: user.verification,
      last_login: user.lastLogin ?? null,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      created_by: (user.createdBy ?? null) as UserId | null,
      updated_by: (user.updatedBy ?? null) as UserId | null,
      metadata: user.metadata ?? null,
    };
  },
};

/**
 * Transform UserProfileTable (database) to UserProfile (domain)
 */
export const userProfileDbToDomain: Transformer<UserProfileTable, UserProfile> = {
  transform(dbProfile: UserProfileTable): UserProfile {
    return {
      userId: dbProfile.user_id,
      displayName: dbProfile.display_name,
      firstName: dbProfile.first_name ?? undefined,
      lastName: dbProfile.last_name ?? undefined,
      bio: dbProfile.bio ?? undefined,
      avatarUrl: dbProfile.avatar_url ?? undefined,
      anonymityLevel: dbProfile.anonymity_level as AnonymityLevel,
      isPublic: dbProfile.is_public,
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
    };
  },

  reverse(profile: UserProfile): UserProfileTable {
    return {
      user_id: profile.userId,
      display_name: profile.displayName,
      first_name: profile.firstName ?? null,
      last_name: profile.lastName ?? null,
      bio: profile.bio ?? null,
      avatar_url: profile.avatarUrl ?? null,
      anonymity_level: profile.anonymityLevel,
      is_public: profile.isPublic,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  },
};

/**
 * Transform UserPreferencesTable (database) to UserPreferences (domain)
 */
export const userPreferencesDbToDomain: Transformer<UserPreferencesTable, UserPreferences> = {
  transform(dbPreferences: UserPreferencesTable): UserPreferences {
    return {
      userId: dbPreferences.user_id,
      theme: (dbPreferences.theme as 'light' | 'dark' | 'system') ?? undefined,
      language: dbPreferences.language ?? undefined,
      notificationsEnabled: dbPreferences.notifications_enabled,
      emailNotifications: dbPreferences.email_notifications,
      pushNotifications: dbPreferences.push_notifications,
      createdAt: dbPreferences.created_at,
      updatedAt: dbPreferences.updated_at,
    };
  },

  reverse(preferences: UserPreferences): UserPreferencesTable {
    return {
      user_id: preferences.userId,
      theme: preferences.theme ?? null,
      language: preferences.language ?? null,
      notifications_enabled: preferences.notificationsEnabled ?? false,
      email_notifications: preferences.emailNotifications ?? false,
      push_notifications: preferences.pushNotifications ?? false,
      created_at: preferences.createdAt,
      updated_at: preferences.updatedAt,
    };
  },
};

// ============================================================================
// Domain to API Transformers
// ============================================================================

/**
 * API representation of User (serialized for wire transfer)
 */
export interface ApiUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly role: string;
  readonly status: string;
  readonly profile: ApiUserProfile | null;
  readonly preferences: ApiUserPreferences | Record<string, never>; // Can be empty object when not loaded
  readonly verification: string;
  readonly lastLogin?: string;
  readonly isActive: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

/**
 * API representation of UserProfile
 */
export interface ApiUserProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly bio?: string;
  readonly avatarUrl?: string;
  readonly anonymityLevel: string;
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * API representation of UserPreferences
 */
export interface ApiUserPreferences {
  readonly userId: string;
  readonly theme?: 'light' | 'dark' | 'system';
  readonly language?: string;
  readonly notificationsEnabled?: boolean;
  readonly emailNotifications?: boolean;
  readonly pushNotifications?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Transform User (domain) to ApiUser (API)
 */
export const userDomainToApi: Transformer<User, ApiUser> = {
  transform(user: User): ApiUser {
    // Check if preferences is a proper UserPreferences object or an empty object
    const hasPreferences = 'userId' in user.preferences && 'createdAt' in user.preferences;
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      profile: user.profile ? userProfileDomainToApi.transform(user.profile) : null,
      preferences: hasPreferences 
        ? userPreferencesDomainToApi.transform(user.preferences as UserPreferences)
        : {} as ApiUserPreferences,
      verification: user.verification,
      lastLogin: user.lastLogin ? dateToStringTransformer.transform(user.lastLogin) : undefined,
      isActive: user.isActive,
      metadata: user.metadata,
      createdAt: dateToStringTransformer.transform(user.createdAt),
      updatedAt: dateToStringTransformer.transform(user.updatedAt),
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      // passwordHash is intentionally NOT included in API representation for security
    };
  },

  reverse(apiUser: ApiUser): User {
    // Check if preferences is a proper ApiUserPreferences object or an empty object
    const hasPreferences = 'userId' in apiUser.preferences && 'createdAt' in apiUser.preferences;
    
    return {
      id: apiUser.id as UserId,
      email: apiUser.email,
      username: apiUser.username,
      role: apiUser.role as UserRole,
      status: apiUser.status as UserStatus,
      profile: apiUser.profile ? userProfileDomainToApi.reverse(apiUser.profile) : null,
      preferences: hasPreferences
        ? userPreferencesDomainToApi.reverse(apiUser.preferences as ApiUserPreferences)
        : {},
      verification: apiUser.verification as VerificationStatus,
      lastLogin: apiUser.lastLogin ? dateToStringTransformer.reverse(apiUser.lastLogin) : undefined,
      isActive: apiUser.isActive,
      metadata: apiUser.metadata,
      createdAt: dateToStringTransformer.reverse(apiUser.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiUser.updatedAt),
      createdBy: apiUser.createdBy as UserId | undefined,
      updatedBy: apiUser.updatedBy as UserId | undefined,
      // passwordHash is not in API, so it will be undefined here (lost in API round-trip)
    };
  },
};

/**
 * Transform UserProfile (domain) to ApiUserProfile (API)
 */
export const userProfileDomainToApi: Transformer<UserProfile, ApiUserProfile> = {
  transform(profile: UserProfile): ApiUserProfile {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      anonymityLevel: profile.anonymityLevel,
      isPublic: profile.isPublic,
      createdAt: dateToStringTransformer.transform(profile.createdAt),
      updatedAt: dateToStringTransformer.transform(profile.updatedAt),
    };
  },

  reverse(apiProfile: ApiUserProfile): UserProfile {
    return {
      userId: apiProfile.userId as UserId,
      displayName: apiProfile.displayName,
      firstName: apiProfile.firstName,
      lastName: apiProfile.lastName,
      bio: apiProfile.bio,
      avatarUrl: apiProfile.avatarUrl,
      anonymityLevel: apiProfile.anonymityLevel as AnonymityLevel,
      isPublic: apiProfile.isPublic,
      createdAt: dateToStringTransformer.reverse(apiProfile.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiProfile.updatedAt),
    };
  },
};

/**
 * Transform UserPreferences (domain) to ApiUserPreferences (API)
 */
export const userPreferencesDomainToApi: Transformer<UserPreferences, ApiUserPreferences> = {
  transform(preferences: UserPreferences): ApiUserPreferences {
    return {
      userId: preferences.userId,
      theme: preferences.theme,
      language: preferences.language,
      notificationsEnabled: preferences.notificationsEnabled,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      createdAt: dateToStringTransformer.transform(preferences.createdAt),
      updatedAt: dateToStringTransformer.transform(preferences.updatedAt),
    };
  },

  reverse(apiPreferences: ApiUserPreferences): UserPreferences {
    return {
      userId: apiPreferences.userId as UserId,
      theme: apiPreferences.theme,
      language: apiPreferences.language,
      notificationsEnabled: apiPreferences.notificationsEnabled,
      emailNotifications: apiPreferences.emailNotifications,
      pushNotifications: apiPreferences.pushNotifications,
      createdAt: dateToStringTransformer.reverse(apiPreferences.createdAt),
      updatedAt: dateToStringTransformer.reverse(apiPreferences.updatedAt),
    };
  },
};

// ============================================================================
// Composite Transformers (Database → Domain → API)
// ============================================================================

/**
 * Transform UserTable directly to ApiUser (bypassing domain)
 * Useful for performance-critical paths
 */
export const userDbToApi: Transformer<UserTable, ApiUser> = {
  transform(dbUser: UserTable): ApiUser {
    const domainUser = userDbToDomain.transform(dbUser);
    return userDomainToApi.transform(domainUser);
  },

  reverse(apiUser: ApiUser): UserTable {
    const domainUser = userDomainToApi.reverse(apiUser);
    return userDbToDomain.reverse(domainUser);
  },
};
