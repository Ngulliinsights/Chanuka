/**
 * Navigation Persistence Middleware
 *
 * Handles persistence of navigation state to localStorage with debouncing
 * and migration support. Integrates with Redux navigation slice.
 */

import { Middleware } from '@reduxjs/toolkit';
import { NavigationState } from '../../types/navigation';
import { logger } from '../../utils/logger';

// Storage keys
const STORAGE_KEYS = {
  NAVIGATION_STATE: 'chanuka-navigation-state',
  SIDEBAR_STATE: 'chanuka-sidebar-collapsed',
} as const;

// Interface for persisted navigation state
interface PersistedNavigationState {
  preferences: NavigationState['preferences'];
  sidebarOpen: boolean;
  user_role: NavigationState['user_role'];
  lastSavedAt: string;
  version: string;
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
 */
function sanitizePreferences(preferences: any) {
  const defaultPreferences = {
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false,
  };

  if (!preferences || typeof preferences !== 'object') {
    return defaultPreferences;
  }

  return {
    defaultLandingPage: typeof preferences.defaultLandingPage === 'string'
      ? preferences.defaultLandingPage
      : defaultPreferences.defaultLandingPage,

    favoritePages: Array.isArray(preferences.favoritePages)
      ? preferences.favoritePages.filter((page: any) => typeof page === 'string')
      : defaultPreferences.favoritePages,

    recentlyVisited: Array.isArray(preferences.recentlyVisited)
      ? preferences.recentlyVisited
          .map((page: any) => sanitizeRecentPage(page))
          .filter(Boolean)
          .slice(0, CONFIG.MAX_RECENT_PAGES)
      : defaultPreferences.recentlyVisited,

    compactMode: typeof preferences.compactMode === 'boolean'
      ? preferences.compactMode
      : defaultPreferences.compactMode,

    showBreadcrumbs: typeof preferences.showBreadcrumbs === 'boolean'
      ? preferences.showBreadcrumbs
      : defaultPreferences.showBreadcrumbs,

    autoExpand: typeof preferences.autoExpand === 'boolean'
      ? preferences.autoExpand
      : defaultPreferences.autoExpand,
  };
}

/**
 * Sanitize and validate a recent page entry
 */
function sanitizeRecentPage(page: any): NavigationState['preferences']['recentlyVisited'][0] | null {
  if (!page || typeof page !== 'object') return null;

  try {
    return {
      path: typeof page.path === 'string' ? page.path : '',
      title: typeof page.title === 'string' ? page.title : '',
      visitedAt: page.visitedAt ? new Date(page.visitedAt) : new Date(),
      visitCount: typeof page.visitCount === 'number' ? page.visitCount : 1,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Save navigation state to localStorage with debouncing
 */
function saveNavigationState(state: NavigationState): void {
  if (typeof window === 'undefined') return;

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce the save operation
  saveTimeout = setTimeout(() => {
    try {
      const stateToSave: PersistedNavigationState = {
        preferences: sanitizePreferences(state.preferences),
        sidebarOpen: state.sidebarOpen,
        user_role: state.user_role,
        lastSavedAt: new Date().toISOString(),
        version: CONFIG.VERSION,
      };

      localStorage.setItem(
        STORAGE_KEYS.NAVIGATION_STATE,
        JSON.stringify(stateToSave)
      );

      logger.debug('Navigation state saved to localStorage', {
        component: 'navigationPersistenceMiddleware'
      });
    } catch (error) {
      logger.warn('Failed to save navigation state', {
        component: 'navigationPersistenceMiddleware'
      }, { error });
    }
    saveTimeout = null;
  }, CONFIG.DEBOUNCE_DELAY);
}

/**
 * Load persisted navigation state from localStorage
 */
function loadNavigationState(): Partial<NavigationState> | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
    if (!stored) return null;

    const parsed: PersistedNavigationState = JSON.parse(stored);

    // Validate version compatibility
    if (parsed.version !== CONFIG.VERSION) {
      logger.warn('Navigation state version mismatch, clearing stored state', {
        component: 'navigationPersistenceMiddleware'
      });
      clearNavigationState();
      return null;
    }

    // Validate and sanitize the loaded state
    const safeState: Partial<NavigationState> = {};

    if (parsed.preferences && typeof parsed.preferences === 'object') {
      safeState.preferences = sanitizePreferences(parsed.preferences);
    }

    if (typeof parsed.sidebarOpen === 'boolean') {
      safeState.sidebarOpen = parsed.sidebarOpen;
    }

    if (typeof parsed.user_role === 'string') {
      safeState.user_role = parsed.user_role;
    }

    return safeState;
  } catch (error) {
    logger.warn('Failed to load navigation state', {
      component: 'navigationPersistenceMiddleware'
    }, { error });
    clearNavigationState();
    return null;
  }
}

/**
 * Clear all persisted navigation state
 */
function clearNavigationState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.NAVIGATION_STATE);
    localStorage.removeItem(STORAGE_KEYS.SIDEBAR_STATE);
    logger.debug('Navigation state cleared from localStorage', {
      component: 'navigationPersistenceMiddleware'
    });
  } catch (error) {
    logger.warn('Failed to clear navigation state', {
      component: 'navigationPersistenceMiddleware'
    }, { error });
  }
}

/**
 * Navigation Persistence Middleware
 */
export const navigationPersistenceMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  // Handle persistence-related actions
  if (action.type) {
    const state = store.getState();

    switch (action.type) {
      case 'navigation/persistNavigationState':
        saveNavigationState(state.navigation);
        break;

      case 'navigation/clearPersistedState':
        clearNavigationState();
        break;

      // Auto-persist on preference changes
      case 'navigation/updatePreferences':
      case 'navigation/addToRecentPages':
      case 'navigation/addFavoritePage':
      case 'navigation/removeFavoritePage':
      case 'navigation/toggleSidebar':
      case 'navigation/setSidebarOpen':
      case 'navigation/setUserRole':
        // Trigger debounced persistence
        saveNavigationState(state.navigation);
        break;
    }
  }

  return result;
};

/**
 * Utility functions for external use
 */
export const navigationPersistenceUtils = {
  loadNavigationState,
  saveNavigationState,
  clearNavigationState,
  sanitizePreferences,
  sanitizeRecentPage,
};