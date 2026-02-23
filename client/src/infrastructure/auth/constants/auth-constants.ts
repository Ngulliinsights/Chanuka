/**
 * Authentication Constants
 *
 * Centralized constants for authentication system
 */

// ==========================================================================
// Validation Rules
// ==========================================================================

export const AUTH_VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    STRONG_MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },
  EMAIL: {
    MAX_LENGTH: 254,
    MIN_LENGTH: 5,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
  },
} as const;

// ==========================================================================
// Error Messages
// ==========================================================================

export const AUTH_ERROR_MESSAGES = {
  // General
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',

  // Email
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_TOO_LONG: 'Email address is too long',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  EMAIL_NOT_FOUND: 'No account found with this email address',

  // Password
  WEAK_PASSWORD: 'Password does not meet security requirements',
  PASSWORD_TOO_SHORT: 'Password is too short',
  PASSWORD_TOO_LONG: 'Password is too long',
  PASSWORD_MISSING_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_MISSING_LOWERCASE: 'Password must contain at least one lowercase letter',
  PASSWORD_MISSING_NUMBER: 'Password must contain at least one number',
  PASSWORD_MISSING_SPECIAL: 'Password must contain at least one special character',
  PASSWORD_COMMON: 'Password is too common, please choose a more unique password',
  PASSWORD_SEQUENTIAL: 'Password contains sequential characters',
  PASSWORD_REPEATED: 'Password contains too many repeated characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',

  // Name
  INVALID_NAME: 'Please enter a valid name',
  NAME_TOO_SHORT: 'Name is too short',
  NAME_TOO_LONG: 'Name is too long',

  // Authentication
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  REGISTRATION_FAILED: 'Registration failed. Please try again.',
  LOGOUT_FAILED: 'Logout failed. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Invalid authentication token',
  TOKEN_REFRESH_FAILED: 'Failed to refresh authentication token',

  // Two-Factor Authentication
  TWO_FACTOR_REQUIRED: 'Two-factor authentication is required',
  TWO_FACTOR_INVALID: 'Invalid two-factor authentication code',
  TWO_FACTOR_SETUP_FAILED: 'Failed to set up two-factor authentication',
  TWO_FACTOR_ENABLE_FAILED: 'Failed to enable two-factor authentication',
  TWO_FACTOR_DISABLE_FAILED: 'Failed to disable two-factor authentication',

  // Session
  SESSION_EXPIRED: 'Your session has expired',
  SESSION_INVALID: 'Invalid session',
  SESSION_NOT_FOUND: 'No active session found',

  // Permissions
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  ACCESS_DENIED: 'Access denied',

  // Account
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed attempts',
  ACCOUNT_DISABLED: 'Account has been disabled',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email address before continuing',

  // OAuth
  OAUTH_FAILED: 'OAuth authentication failed',
  OAUTH_CANCELLED: 'OAuth authentication was cancelled',
  OAUTH_STATE_MISMATCH: 'OAuth state parameter mismatch',

  // Network
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
} as const;

// ==========================================================================
// Session and Token Constants
// ==========================================================================

export const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
export const MINIMUM_REFRESH_DELAY_MS = 60 * 1000; // 1 minute
export const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
export const SESSION_MONITORING_INTERVAL_MS = 60 * 1000; // 1 minute

export const TOKEN_REFRESH_THRESHOLD_MINUTES = 5;
export const MAX_TOKEN_REFRESH_ATTEMPTS = 3;
export const TOKEN_STORAGE_NAMESPACE = 'auth';
export const SESSION_STORAGE_NAMESPACE = 'session';
export const TOKEN_KEY = 'auth_tokens';
export const SESSION_KEY = 'current_session';

// ==========================================================================
// Security Constants
// ==========================================================================

export const SECURITY_SETTINGS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  PASSWORD_HISTORY_COUNT: 5,
  SESSION_TIMEOUT_WARNING_MINUTES: 5,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
} as const;

// ==========================================================================
// OAuth Providers
// ==========================================================================

export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  MICROSOFT: 'microsoft',
} as const;

export const OAUTH_SCOPES = {
  [OAUTH_PROVIDERS.GOOGLE]: ['openid', 'email', 'profile'],
  [OAUTH_PROVIDERS.GITHUB]: ['user:email'],
  [OAUTH_PROVIDERS.FACEBOOK]: ['email'],
  [OAUTH_PROVIDERS.TWITTER]: ['users.read'],
  [OAUTH_PROVIDERS.MICROSOFT]: ['openid', 'email', 'profile'],
} as const;

// ==========================================================================
// User Roles and Permissions
// ==========================================================================

export const USER_ROLES = {
  CITIZEN: 'citizen',
  EXPERT: 'expert',
  OFFICIAL: 'official',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

export const PERMISSIONS = {
  // Bill permissions
  VIEW_BILLS: 'bills:view',
  CREATE_BILLS: 'bills:create',
  EDIT_BILLS: 'bills:edit',
  DELETE_BILLS: 'bills:delete',

  // Comment permissions
  VIEW_COMMENTS: 'comments:view',
  CREATE_COMMENTS: 'comments:create',
  EDIT_COMMENTS: 'comments:edit',
  DELETE_COMMENTS: 'comments:delete',
  MODERATE_COMMENTS: 'comments:moderate',

  // User permissions
  VIEW_USERS: 'users:view',
  EDIT_USERS: 'users:edit',
  DELETE_USERS: 'users:delete',
  MANAGE_ROLES: 'users:manage_roles',

  // Admin permissions
  ADMIN_PANEL: 'admin:panel',
  SYSTEM_CONFIG: 'admin:config',
  VIEW_ANALYTICS: 'admin:analytics',
  MANAGE_CONTENT: 'admin:content',
} as const;

// ==========================================================================
// API Endpoints
// ==========================================================================

export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  VERIFY_EMAIL: '/auth/verify-email',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',

  // Profile
  PROFILE: '/auth/profile',
  UPDATE_PROFILE: '/auth/profile',

  // Two-Factor Auth
  SETUP_2FA: '/auth/2fa/setup',
  ENABLE_2FA: '/auth/2fa/enable',
  DISABLE_2FA: '/auth/2fa/disable',
  VERIFY_2FA: '/auth/2fa/verify',

  // Sessions
  SESSIONS: '/auth/sessions',
  TERMINATE_SESSION: '/auth/sessions/:id',
  TERMINATE_ALL_SESSIONS: '/auth/sessions/all',

  // OAuth
  OAUTH_AUTHORIZE: '/auth/oauth/:provider',
  OAUTH_CALLBACK: '/auth/oauth/callback',

  // Privacy
  PRIVACY_SETTINGS: '/auth/privacy',
  DATA_EXPORT: '/auth/data-export',
  DATA_DELETION: '/auth/data-deletion',

  // Security
  SECURITY_EVENTS: '/auth/security-events',
  SUSPICIOUS_ACTIVITY: '/auth/suspicious-activity',
} as const;

// ==========================================================================
// Event Types
// ==========================================================================

export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'auth:login:success',
  LOGIN_FAILURE: 'auth:login:failure',
  LOGOUT: 'auth:logout',
  TOKEN_REFRESH: 'auth:token:refresh',
  TOKEN_EXPIRED: 'auth:token:expired',
  SESSION_EXPIRED: 'auth:session:expired',
  SESSION_WARNING: 'auth:session:warning',
  TWO_FACTOR_REQUIRED: 'auth:2fa:required',
  TWO_FACTOR_SUCCESS: 'auth:2fa:success',
  PERMISSION_DENIED: 'auth:permission:denied',
  ACCOUNT_LOCKED: 'auth:account:locked',
} as const;

// ==========================================================================
// Storage Keys
// ==========================================================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  SESSION_DATA: 'session_data',
  PREFERENCES: 'user_preferences',
  LAST_LOGIN: 'last_login',
  FAILED_ATTEMPTS: 'failed_attempts',
  LOCKOUT_UNTIL: 'lockout_until',
} as const;

// ==========================================================================
// Regular Expressions
// ==========================================================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_UPPERCASE: /[A-Z]/,
  PASSWORD_LOWERCASE: /[a-z]/,
  PASSWORD_NUMBER: /\d/,
  PASSWORD_SPECIAL: /[@$!%*?&]/,
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  NAME: /^[a-zA-Z\s'-]+$/,
} as const;

// ==========================================================================
// Default Values
// ==========================================================================

export const DEFAULT_VALUES = {
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in milliseconds
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_STRONG_MIN_LENGTH: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
} as const;

export default {
  AUTH_VALIDATION_RULES,
  AUTH_ERROR_MESSAGES,
  SESSION_REFRESH_BUFFER_MS,
  MINIMUM_REFRESH_DELAY_MS,
  DEFAULT_SESSION_DURATION_MS,
  SESSION_WARNING_THRESHOLD_MS,
  SESSION_MONITORING_INTERVAL_MS,
  TOKEN_REFRESH_THRESHOLD_MINUTES,
  MAX_TOKEN_REFRESH_ATTEMPTS,
  TOKEN_STORAGE_NAMESPACE,
  SESSION_STORAGE_NAMESPACE,
  TOKEN_KEY,
  SESSION_KEY,
  SECURITY_SETTINGS,
  OAUTH_PROVIDERS,
  OAUTH_SCOPES,
  USER_ROLES,
  PERMISSIONS,
  AUTH_ENDPOINTS,
  AUTH_EVENTS,
  STORAGE_KEYS,
  REGEX_PATTERNS,
  DEFAULT_VALUES,
};
