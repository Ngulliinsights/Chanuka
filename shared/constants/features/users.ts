/**
 * Users Feature - Constants
 * 
 * Shared constants for users feature
 * Used by both client and server
 */

// ============================================================================
// User Roles
// ============================================================================

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  EXPERT: 'expert',
  VERIFIED_CITIZEN: 'verified_citizen',
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLES.USER]: 'User',
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MODERATOR]: 'Moderator',
  [USER_ROLES.EXPERT]: 'Expert',
  [USER_ROLES.VERIFIED_CITIZEN]: 'Verified Citizen',
} as const;

export const USER_ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: ['read', 'comment', 'vote'],
  [USER_ROLES.ADMIN]: ['read', 'write', 'delete', 'moderate', 'manage_users'],
  [USER_ROLES.MODERATOR]: ['read', 'comment', 'vote', 'moderate'],
  [USER_ROLES.EXPERT]: ['read', 'comment', 'vote', 'verify_content'],
  [USER_ROLES.VERIFIED_CITIZEN]: ['read', 'comment', 'vote', 'create_campaigns'],
} as const;

// ============================================================================
// Verification Status
// ============================================================================

export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export const VERIFICATION_STATUS_LABELS = {
  [VERIFICATION_STATUS.UNVERIFIED]: 'Unverified',
  [VERIFICATION_STATUS.PENDING]: 'Pending Verification',
  [VERIFICATION_STATUS.VERIFIED]: 'Verified',
  [VERIFICATION_STATUS.REJECTED]: 'Verification Rejected',
} as const;

export const VERIFICATION_STATUS_COLORS = {
  [VERIFICATION_STATUS.UNVERIFIED]: 'gray',
  [VERIFICATION_STATUS.PENDING]: 'yellow',
  [VERIFICATION_STATUS.VERIFIED]: 'green',
  [VERIFICATION_STATUS.REJECTED]: 'red',
} as const;

// ============================================================================
// Expertise Levels
// ============================================================================

export const EXPERTISE_LEVELS = {
  NOVICE: 'novice',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;

export const EXPERTISE_LEVEL_LABELS = {
  [EXPERTISE_LEVELS.NOVICE]: 'Novice',
  [EXPERTISE_LEVELS.INTERMEDIATE]: 'Intermediate',
  [EXPERTISE_LEVELS.ADVANCED]: 'Advanced',
  [EXPERTISE_LEVELS.EXPERT]: 'Expert',
} as const;

// ============================================================================
// User Status
// ============================================================================

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted',
} as const;

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.INACTIVE]: 'Inactive',
  [USER_STATUS.SUSPENDED]: 'Suspended',
  [USER_STATUS.BANNED]: 'Banned',
  [USER_STATUS.DELETED]: 'Deleted',
} as const;

// ============================================================================
// User Preferences
// ============================================================================

export const NOTIFICATION_PREFERENCES = {
  ALL: 'all',
  IMPORTANT: 'important',
  NONE: 'none',
} as const;

export const NOTIFICATION_PREFERENCE_LABELS = {
  [NOTIFICATION_PREFERENCES.ALL]: 'All Notifications',
  [NOTIFICATION_PREFERENCES.IMPORTANT]: 'Important Only',
  [NOTIFICATION_PREFERENCES.NONE]: 'None',
} as const;

export const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
} as const;

export const PRIVACY_LEVEL_LABELS = {
  [PRIVACY_LEVELS.PUBLIC]: 'Public',
  [PRIVACY_LEVELS.FRIENDS]: 'Friends Only',
  [PRIVACY_LEVELS.PRIVATE]: 'Private',
} as const;

// ============================================================================
// User Limits
// ============================================================================

export const USER_LIMITS = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_BIO_LENGTH: 0,
  MAX_BIO_LENGTH: 500,
  MAX_EXPERTISE_AREAS: 10,
  MAX_EXPERTISE_AREA_LENGTH: 100,
  MAX_AVATAR_SIZE_MB: 5,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// User Defaults
// ============================================================================

export const USER_DEFAULTS = {
  ROLE: USER_ROLES.USER,
  VERIFICATION_STATUS: VERIFICATION_STATUS.UNVERIFIED,
  EXPERTISE_LEVEL: EXPERTISE_LEVELS.NOVICE,
  STATUS: USER_STATUS.ACTIVE,
  NOTIFICATION_PREFERENCE: NOTIFICATION_PREFERENCES.ALL,
  PRIVACY_LEVEL: PRIVACY_LEVELS.PUBLIC,
  PAGE: 1,
  LIMIT: 20,
} as const;

// ============================================================================
// Password Requirements
// ============================================================================

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

// ============================================================================
// User Activity Types
// ============================================================================

export const USER_ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  COMMENT: 'comment',
  VOTE: 'vote',
  BILL_VIEW: 'bill_view',
  PROFILE_UPDATE: 'profile_update',
  SETTINGS_CHANGE: 'settings_change',
} as const;

export const USER_ACTIVITY_TYPE_LABELS = {
  [USER_ACTIVITY_TYPES.LOGIN]: 'Login',
  [USER_ACTIVITY_TYPES.LOGOUT]: 'Logout',
  [USER_ACTIVITY_TYPES.COMMENT]: 'Comment',
  [USER_ACTIVITY_TYPES.VOTE]: 'Vote',
  [USER_ACTIVITY_TYPES.BILL_VIEW]: 'Bill View',
  [USER_ACTIVITY_TYPES.PROFILE_UPDATE]: 'Profile Update',
  [USER_ACTIVITY_TYPES.SETTINGS_CHANGE]: 'Settings Change',
} as const;
