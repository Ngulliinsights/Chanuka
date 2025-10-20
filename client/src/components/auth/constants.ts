/**
 * Auth component constants
 */

export const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register'
} as const;

export const AUTH_FIELD_NAMES = {
  EMAIL: 'email',
  PASSWORD: 'password',
  CONFIRM_PASSWORD: 'confirmPassword',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName'
} as const;

export const AUTH_VALIDATION_RULES = {
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
    STRONG_MIN_LENGTH: 12,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z'-]+$/
  }
} as const;

export const AUTH_ERROR_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_TOO_WEAK: 'Password must contain uppercase, lowercase, number, and special character',
  PASSWORDS_DONT_MATCH: "Passwords don't match",
  NAME_INVALID: 'Name can only contain letters, hyphens, and apostrophes',
  NAME_TOO_SHORT: 'Name must be at least 2 characters',
  NAME_TOO_LONG: 'Name must be less than 50 characters'
} as const;

export const AUTH_SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  REGISTER: 'Account created successfully!',
  PASSWORD_RESET: 'Password reset email sent!',
  EMAIL_VERIFIED: 'Email verified successfully!'
} as const;

export const AUTH_CONFIG_DEFAULTS = {
  validation: {
    enabled: true,
    strict: true,
    realTimeValidation: true
  },
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  ui: {
    showPasswordRequirements: true,
    enablePasswordToggle: true,
    autoFocusFirstField: true
  },
  security: {
    sanitizeInput: true,
    maxAttempts: 5,
    lockoutDuration: 300 // 5 minutes
  }
} as const;

export const AUTH_RATE_LIMITS = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 300, // 5 minutes in seconds
  RETRY_DELAYS: [1000, 2000, 4000, 8000, 16000] // Exponential backoff in ms
} as const;

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  ATTEMPT_COUNT: 'auth_attempt_count',
  LAST_ATTEMPT: 'auth_last_attempt'
} as const;

export const AUTH_API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  RESET_PASSWORD: '/api/auth/reset-password',
  VERIFY_EMAIL: '/api/auth/verify-email'
} as const;

export const AUTH_REDIRECT_PATHS = {
  LOGIN_SUCCESS: '/dashboard',
  REGISTER_SUCCESS: '/welcome',
  LOGOUT: '/auth/login',
  UNAUTHORIZED: '/auth/login'
} as const;

export const AUTH_TEST_IDS = {
  PAGE: 'auth-page',
  CARD: 'auth-card',
  HEADER: 'auth-header',
  TITLE: 'auth-title',
  DESCRIPTION: 'auth-description',
  CONTENT: 'auth-content',
  FORM: 'auth-form',
  SUCCESS_ALERT: 'auth-success-alert',
  ERROR_ALERT: 'auth-error-alert',
  SUBMIT_BUTTON: 'auth-submit-button',
  TOGGLE_BUTTON: 'auth-toggle-button',
  NAME_FIELDS: 'auth-name-fields',
  PASSWORD_REQUIREMENTS: 'auth-password-requirements',
  MODE_TOGGLE: 'auth-mode-toggle'
} as const;

export const AUTH_FIELD_TEST_IDS = {
  FIELD: (name: string) => `auth-${name}-field`,
  INPUT: (name: string) => `auth-${name}-input`,
  ERROR: (name: string) => `auth-${name}-error`,
  TOGGLE: (name: string) => `auth-${name}-toggle`
} as const;

export const AUTH_ACCESSIBILITY = {
  LABELS: {
    EMAIL: 'Email Address',
    PASSWORD: 'Password',
    CONFIRM_PASSWORD: 'Confirm Password',
    FIRST_NAME: 'First Name',
    LAST_NAME: 'Last Name',
    SHOW_PASSWORD: 'Show password',
    HIDE_PASSWORD: 'Hide password',
    SUBMIT_LOGIN: 'Sign in to your account',
    SUBMIT_REGISTER: 'Create new account',
    TOGGLE_MODE: 'Switch between login and registration'
  },
  DESCRIPTIONS: {
    PASSWORD_REQUIREMENTS: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
    FORM_ERRORS: 'Please correct the errors below',
    LOADING: 'Processing your request, please wait'
  }
} as const;