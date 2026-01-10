/**
 * Navigation Persistence Middleware
 *
 * Handles persistence of navigation state to localStorage with debouncing
 * and migration support. Integrates with Redux navigation slice.
 */

import { Middleware } from '@reduxjs/toolkit';

import { NavigationState, UserRole } from '@client/shared/types/navigation';

import { logger } from '@client/shared/utils/logger';

// Storage keys
const STORAGE_KEYS = {
  NAVIGATION_STATE: 'client-navigation-state',
  SIDEBAR_STATE: 'client-sidebar-collapsed',
} as const;

// Interface for persisted navigation state
interface PersistedNavigationState {
  preferences: NavigationState['preferences'];
  sidebarOpen: boolean;
  user_role: NavigationState['user_role'];
  lastSavedAt: string;
  version: string;
}

// Type guard helper for checking if value is a record
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Configuration
const CONFIG = {
  VERSION: '1.0.0',
  DEBOUNCE_DELAY: 500,
  MAX_RECENT_PAGES: 10,
} as const;

// Debounce timer reference
let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Sanitize and validate navigation preferences
 * This function takes unknown data from localStorage and safely converts it
 * into a valid preferences object, providing defaults for any missing or invalid fields
 */
function sanitizePreferences(preferences: unknown): NavigationState['preferences'] {
  const defaultPreferences: NavigationState['preferences'] = {
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false,
  };

  // Early return if preferences is not a valid object
  if (!isRecord(preferences)) {
    return defaultPreferences;
  }

  // Now TypeScript knows preferences is Record<string, unknown>
  // and we can safely access its properties
  return {
    defaultLandingPage:
      typeof preferences.defaultLandingPage === 'string'
        ? preferences.defaultLandingPage
        : defaultPreferences.defaultLandingPage,

    favoritePages: Array.isArray(preferences.favoritePages)
      ? (preferences.favoritePages as unknown[]).filter(
          (page): page is string => typeof page === 'string'
        )
      : defaultPreferences.favoritePages,

    recentlyVisited: Array.isArray(preferences.recentlyVisited)
      ? (preferences.recentlyVisited as unknown[])
          .map(page => sanitizeRecentPage(page))
          .filter((page): page is NonNullable<typeof page> => page !== null)
          .slice(0, CONFIG.MAX_RECENT_PAGES)
      : defaultPreferences.recentlyVisited,

    compactMode:
      typeof preferences.compactMode === 'boolean'
        ? preferences.compactMode
        : defaultPreferences.compactMode,

    showBreadcrumbs:
      typeof preferences.showBreadcrumbs === 'boolean'
        ? preferences.showBreadcrumbs
        : defaultPreferences.showBreadcrumbs,

    autoExpand:
      typeof preferences.autoExpand === 'boolean'
        ? preferences.autoExpand
        : defaultPreferences.autoExpand,
  };
}

/**
 * Sanitize and validate a recent page entry
 * Ensures that page objects from localStorage have all required fields
 * with the correct types before adding them to state
 */
function sanitizeRecentPage(
  page: unknown
): NavigationState['preferences']['recentlyVisited'][0] | null {
  // Validate that page is a record object
  if (!isRecord(page)) return null;

  try {
    // Construct a valid recent page object with type checking for each field
    return {
      path: typeof page.path === 'string' ? page.path : '',
      title: typeof page.title === 'string' ? page.title : '',
      visitedAt: typeof page.visitedAt === 'string' ? page.visitedAt : new Date().toISOString(),
      visitCount: typeof page.visitCount === 'number' ? page.visitCount : 1,
    };
  } catch (error) {
    // If any error occurs during sanitization, return null to filter this entry out
    return null;
  }
}

/**
 * Save navigation state to localStorage with debouncing
 * Debouncing prevents excessive writes when preferences change rapidly
 */
function saveNavigationState(state: NavigationState): void {
  if (typeof window === 'undefined') return;

  // Clear existing timeout to reset the debounce timer
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce the save operation to avoid excessive localStorage writes
  saveTimeout = setTimeout(() => {
    try {
      const stateToSave: PersistedNavigationState = {
        preferences: sanitizePreferences(state.preferences),
        sidebarOpen: state.sidebarOpen,
        user_role: state.user_role,
        lastSavedAt: new Date().toISOString(),
        version: CONFIG.VERSION,
      };

      localStorage.setItem(STORAGE_KEYS.NAVIGATION_STATE, JSON.stringify(stateToSave));

      logger.debug('Navigation state saved to localStorage', {
        component: 'navigationPersistenceMiddleware',
      });
    } catch (error) {
      logger.warn(
        'Failed to save navigation state',
        {
          component: 'navigationPersistenceMiddleware',
        },
        { error }
      );
    }
    saveTimeout = null;
  }, CONFIG.DEBOUNCE_DELAY);
}

/**
 * Load persisted navigation state from localStorage
 * Returns null if no state exists or if the stored state is invalid
 */
function loadNavigationState(): Partial<NavigationState> | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as unknown;

    // Validate that parsed data is an object before accessing properties
    if (!isRecord(parsed)) {
      clearNavigationState();
      return null;
    }

    // Validate version compatibility to handle migrations
    if (parsed.version !== CONFIG.VERSION) {
      logger.warn('Navigation state version mismatch, clearing stored state', {
        component: 'navigationPersistenceMiddleware',
      });
      clearNavigationState();
      return null;
    }

    // Build the safe state object incrementally, validating each field
    const safeState: Partial<NavigationState> = {};

    // Sanitize and assign preferences if they exist
    if (parsed.preferences !== undefined) {
      safeState.preferences = sanitizePreferences(parsed.preferences);
    }

    // Validate and assign sidebar state
    if (typeof parsed.sidebarOpen === 'boolean') {
      safeState.sidebarOpen = parsed.sidebarOpen;
    }

    // Validate and assign user role
    if (typeof parsed.user_role === 'string') {
      const validRoles: UserRole[] = [
        'public',
        'citizen',
        'user',
        'expert',
        'admin',
        'journalist',
        'advocate',
      ];
      if (validRoles.includes(parsed.user_role as UserRole)) {
        safeState.user_role = parsed.user_role as UserRole;
      }
    }

    return safeState;
  } catch (error) {
    logger.warn(
      'Failed to load navigation state',
      {
        component: 'navigationPersistenceMiddleware',
      },
      { error }
    );
    clearNavigationState();
    return null;
  }
}

/**
 * Clear all persisted navigation state
 * Used for cleanup or when stored state becomes invalid
 */
function clearNavigationState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.NAVIGATION_STATE);
    localStorage.removeItem(STORAGE_KEYS.SIDEBAR_STATE);
    logger.debug('Navigation state cleared from localStorage', {
      component: 'navigationPersistenceMiddleware',
    });
  } catch (error) {
    logger.warn(
      'Failed to clear navigation state',
      {
        component: 'navigationPersistenceMiddleware',
      },
      { error }
    );
  }
}

/**
 * Type for Redux actions that this middleware handles
 */
interface ReduxAction {
  type: string;
  payload?: unknown;
}

/**
 * Type guard to check if an action matches our expected shape
 */
function isReduxAction(action: unknown): action is ReduxAction {
  return isRecord(action) && typeof action.type === 'string';
}

/**
 * Navigation Persistence Middleware
 * Intercepts navigation-related actions and persists state changes to localStorage
 */
export const navigationPersistenceMiddleware: Middleware = store => next => (action: unknown) => {
  // Pass the action through to the next middleware/reducer
  const result = next(action);

  // Only process actions that match our expected shape
  if (!isReduxAction(action)) {
    return result;
  }

  // Get the updated state after the action has been processed
  const state = store.getState();

  // Handle specific navigation actions that should trigger persistence
  switch (action.type) {
    case 'navigation/persistNavigationState':
      // Explicit request to persist state immediately
      saveNavigationState(state.navigation);
      break;

    case 'navigation/clearPersistedState':
      // Clear stored state when user logs out or resets preferences
      clearNavigationState();
      break;

    // Auto-persist on any preference or navigation state changes
    case 'navigation/updatePreferences':
    case 'navigation/addToRecentPages':
    case 'navigation/addFavoritePage':
    case 'navigation/removeFavoritePage':
    case 'navigation/toggleSidebar':
    case 'navigation/setSidebarOpen':
    case 'navigation/setUserRole':
      // Trigger debounced persistence for these actions
      saveNavigationState(state.navigation);
      break;
  }

  return result;
};

/**
 * Utility functions for external use
 * Export these for testing or manual state management
 */
export const navigationPersistenceUtils = {
  loadNavigationState,
  saveNavigationState,
  clearNavigationState,
  sanitizePreferences,
  sanitizeRecentPage,
};
