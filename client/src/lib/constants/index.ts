/**
 * Application constants
 * Centralized configuration values and constants
 */

// API Configuration
// Use relative path to leverage Vite proxy in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
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

export const // UI Constants
  SIDEBAR_WIDTH = {
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
