/**
 * Application constants
 * Centralized configuration values and constants
 */

// API Configuration
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const WS_BASE_URL = process.env.VITE_WS_URL || 'ws://localhost:3001';

// Authentication
export const AUTH_TOKEN_KEY = 'chanuka_auth_token';
export const REFRESH_TOKEN_KEY = 'chanuka_refresh_token';
export const USER_PREFERENCES_KEY = 'chanuka_user_preferences';

// Password Requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
} as const;

// Password Strength Constants
export const PASSWORD_STRENGTH_LEVELS = {
  VERY_WEAK: 0,
  WEAK: 1,
  FAIR: 2,
  GOOD: 3,
  STRONG: 4,
} as const;

export const PASSWORD_STRENGTH_LABELS = {
  [PASSWORD_STRENGTH_LEVELS.VERY_WEAK]: 'Very Weak',
  [PASSWORD_STRENGTH_LEVELS.WEAK]: 'Weak',
  [PASSWORD_STRENGTH_LEVELS.FAIR]: 'Fair',
  [PASSWORD_STRENGTH_LEVELS.GOOD]: 'Good',
  [PASSWORD_STRENGTH_LEVELS.STRONG]: 'Strong',
} as const;

export const PASSWORD_STRENGTH_COLORS = {
  [PASSWORD_STRENGTH_LEVELS.VERY_WEAK]: '#ef4444', // red-500
  [PASSWORD_STRENGTH_LEVELS.WEAK]: '#f97316', // orange-500
  [PASSWORD_STRENGTH_LEVELS.FAIR]: '#eab308', // yellow-500
  [PASSWORD_STRENGTH_LEVELS.GOOD]: '#22c55e', // green-500
  [PASSWORD_STRENGTH_LEVELS.STRONG]: '#16a34a', // green-600
} as const;

// UI Constants
export const SIDEBAR_WIDTH = {
  COLLAPSED: 64,
  EXPANDED: 256,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Animation Durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
} as const;

// Cache Keys
export const CACHE_KEYS = {
  BILLS: 'bills',
  USER_PROFILE: 'user_profile',
  NAVIGATION_PREFERENCES: 'nav_preferences',
  SEARCH_HISTORY: 'search_history',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  DELETED: 'Item deleted successfully.',
  CREATED: 'Item created successfully.',
  UPDATED: 'Item updated successfully.',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_WEBSOCKETS: process.env.VITE_ENABLE_WEBSOCKETS === 'true',
  ENABLE_OFFLINE_MODE: process.env.VITE_ENABLE_OFFLINE_MODE === 'true',
  ENABLE_DARK_MODE: true,
} as const;

// Application Metadata
export const APP_INFO = {
  NAME: 'Chanuka Platform',
  VERSION: process.env.VITE_APP_VERSION || '1.0.0',
  DESCRIPTION: 'Legislative Transparency Platform',
  AUTHOR: 'Chanuka Team',
} as const;

// Navigation Constants
export const DEFAULT_NAVIGATION_MAP = {
  dashboard: {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    requiresAuth: true,
  },
  bills: {
    path: '/bills',
    label: 'Bills',
    icon: 'document',
    requiresAuth: false,
  },
  search: {
    path: '/search',
    label: 'Search',
    icon: 'search',
    requiresAuth: false,
  },
  community: {
    path: '/community',
    label: 'Community',
    icon: 'users',
    requiresAuth: false,
  },
  profile: {
    path: '/profile',
    label: 'Profile',
    icon: 'user',
    requiresAuth: true,
  },
  admin: {
    path: '/admin',
    label: 'Admin',
    icon: 'settings',
    requiresAuth: true,
    roles: ['admin'],
  },
} as const;

export const SECTION_TITLES = {
  main: 'Main Navigation',
  bills: 'Bills & Legislation',
  community: 'Community',
  tools: 'Tools & Resources',
  account: 'Account',
  admin: 'Administration',
} as const;

export const SECTION_ORDER = ['main', 'bills', 'community', 'tools', 'account', 'admin'] as const;

export default {
  API_BASE_URL,
  WS_BASE_URL,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_PREFERENCES_KEY,
  PASSWORD_REQUIREMENTS,
  SIDEBAR_WIDTH,
  BREAKPOINTS,
  ANIMATION_DURATION,
  CACHE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
  APP_INFO,
};