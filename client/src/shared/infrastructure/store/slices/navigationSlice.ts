/**
 * Navigation Slice - Optimized Version
 *
 * This slice manages all navigation-related state including path tracking, breadcrumbs,
 * sidebar state, and user preferences. It's designed with performance and type safety in mind,
 * using Redux Toolkit's Immer integration for safe state mutations.
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

import {
  NavigationState,
  BreadcrumbItem,
  RelatedPage,
  NavigationSection,
  UserRole,
  NavigationPreferences,
  RecentPage
} from '@client/types/navigation';
import { logger } from '@client/utils/logger';

// Constants for better maintainability
const MAX_RECENT_PAGES = 10;
const DEFAULT_SECTION: NavigationSection = 'legislative';
const DEFAULT_PATH = '/';

/**
 * Initial state with sensible defaults. All boolean flags start as false,
 * and arrays start empty to minimize initial payload size.
 */
const initialState: NavigationState = {
  currentPath: DEFAULT_PATH,
  previousPath: DEFAULT_PATH,
  breadcrumbs: [],
  relatedPages: [],
  currentSection: DEFAULT_SECTION,
  sidebarOpen: false,
  mobileMenuOpen: false,
  isMobile: false,
  sidebarCollapsed: false,
  mounted: false,
  user_role: 'public',
  preferences: {
    defaultLandingPage: DEFAULT_PATH,
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false,
  },
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    /**
     * Updates the current navigation path while preserving the previous path.
     * This enables back navigation and path history tracking.
     */
    setCurrentPath: (state, action: PayloadAction<string>) => {
      // Only update if the path actually changed to avoid unnecessary re-renders
      if (state.currentPath !== action.payload) {
        state.previousPath = state.currentPath;
        state.currentPath = action.payload;
        logger.debug('Navigation path updated', {
          from: state.previousPath,
          to: action.payload
        });
      }
    },

    /**
     * Replaces the entire breadcrumb trail. Breadcrumbs are calculated
     * externally based on the current route and then dispatched here.
     */
    updateBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload;
    },

    /**
     * Updates the list of pages related to the current view.
     * Related pages help users discover connected content.
     */
    updateRelatedPages: (state, action: PayloadAction<RelatedPage[]>) => {
      state.relatedPages = action.payload;
    },

    /**
     * Sets the current navigation section, which determines which
     * part of the application is active (e.g., legislative, executive).
     */
    setCurrentSection: (state, action: PayloadAction<NavigationSection>) => {
      if (state.currentSection !== action.payload) {
        state.currentSection = action.payload;
        logger.debug('Navigation section changed', { section: action.payload });
      }
    },

    /**
     * Toggles sidebar visibility. Useful for hamburger menu buttons.
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    /**
     * Directly sets sidebar state. Preferred when you know the exact
     * state you want rather than toggling.
     */
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    /**
     * Toggles mobile menu visibility. Mobile menu is separate from sidebar
     * to handle different responsive behaviors.
     */
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },

    /**
     * Sets mobile menu state directly.
     */
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },

    /**
     * Updates the mobile flag based on viewport size. This should be
     * dispatched by a resize listener or media query observer.
     */
    setMobile: (state, action: PayloadAction<boolean>) => {
      const wasMobile = state.isMobile;
      state.isMobile = action.payload;

      // Auto-close menus when transitioning to desktop
      if (wasMobile && !action.payload) {
        state.mobileMenuOpen = false;
      }
    },

    /**
     * Controls whether the sidebar is in collapsed (icon-only) mode.
     * This provides a middle ground between fully open and fully closed.
     */
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    /**
     * Tracks whether the navigation component has mounted. Useful for
     * preventing SSR hydration mismatches and controlling initial animations.
     */
    setMounted: (state, action: PayloadAction<boolean>) => {
      state.mounted = action.payload;
    },

    /**
     * Updates the user's role, which controls navigation permissions
     * and available menu items.
     */
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      if (state.user_role !== action.payload) {
        state.user_role = action.payload;
        logger.debug('User role updated', { role: action.payload });
      }
    },

    /**
     * Partially updates user preferences. Uses spreading to merge with
     * existing preferences rather than replacing them entirely.
     */
    updatePreferences: (state, action: PayloadAction<Partial<NavigationPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      logger.debug('Navigation preferences updated', {
        updated: Object.keys(action.payload)
      });
    },

    /**
     * Adds or updates a page in the recently visited list. If the page
     * already exists, it moves to the front and increments its visit count.
     * The list is capped at MAX_RECENT_PAGES to prevent unbounded growth.
     */
    addToRecentPages: (state, action: PayloadAction<{ path: string; title: string }>) => {
      const { path, title } = action.payload;
      const recentPages = state.preferences.recentlyVisited;
      const existingIndex = recentPages.findIndex(page => page.path === path);

      if (existingIndex >= 0) {
        // Move existing page to front and update metadata
        const [existingPage] = recentPages.splice(existingIndex, 1);
        recentPages.unshift({
          ...existingPage,
          title, // Update title in case it changed
          visitedAt: new Date().toISOString(),
          visitCount: existingPage.visitCount + 1,
        });
      } else {
        // Add new page at the front
        recentPages.unshift({
          path,
          title,
          visitedAt: new Date().toISOString(),
          visitCount: 1,
        });
      }

      // Trim to maximum size using slice for efficiency
      if (recentPages.length > MAX_RECENT_PAGES) {
        recentPages.length = MAX_RECENT_PAGES;
      }
    },

    /**
     * Adds a page to favorites if it's not already there.
     * Uses Set-like behavior to prevent duplicates.
     */
    addFavoritePage: (state, action: PayloadAction<string>) => {
      const path = action.payload;
      if (!state.preferences.favoritePages.includes(path)) {
        state.preferences.favoritePages.push(path);
        logger.debug('Page added to favorites', { path });
      }
    },

    /**
     * Removes a page from favorites using filter for immutability.
     */
    removeFavoritePage: (state, action: PayloadAction<string>) => {
      const initialLength = state.preferences.favoritePages.length;
      state.preferences.favoritePages = state.preferences.favoritePages.filter(
        path => path !== action.payload
      );

      if (state.preferences.favoritePages.length < initialLength) {
        logger.debug('Page removed from favorites', { path: action.payload });
      }
    },

    /**
     * Resets navigation state to initial values while preserving
     * device-specific flags that should persist.
     */
    resetNavigationState: (state) => {
      const { isMobile, mounted } = state;

      Object.assign(state, {
        ...initialState,
        isMobile,
        mounted,
      });

      logger.debug('Navigation state reset');
    },

    /**
     * Loads previously persisted state from storage. This is called
     * during app initialization to restore user preferences.
     */
    loadPersistedState: (state, action: PayloadAction<Partial<NavigationState>>) => {
      const persistedState = action.payload;

      // Merge preferences deeply to avoid losing default values
      if (persistedState.preferences) {
        state.preferences = {
          ...state.preferences,
          ...persistedState.preferences,
        };
      }

      // Restore UI state if it was persisted
      if (typeof persistedState.sidebarOpen === 'boolean') {
        state.sidebarOpen = persistedState.sidebarOpen;
      }

      if (typeof persistedState.sidebarCollapsed === 'boolean') {
        state.sidebarCollapsed = persistedState.sidebarCollapsed;
      }

      // Restore user role
      if (persistedState.user_role) {
        state.user_role = persistedState.user_role;
      }

      logger.debug('Navigation state loaded from persistence', {
        hasPreferences: !!persistedState.preferences,
        hasSidebarState: typeof persistedState.sidebarOpen === 'boolean',
      });
    },

    /**
     * Signals middleware to persist current state. The actual storage
     * operation is handled by middleware to keep the slice pure.
     */
    persistNavigationState: () => {
      logger.debug('Navigation state persistence triggered');
      // Middleware will handle the actual persistence
    },

    /**
     * Clears all persisted state and resets to defaults. This is useful
     * for "reset preferences" features or when logging out.
     */
    clearPersistedState: (state) => {
      state.preferences = { ...initialState.preferences };
      state.sidebarOpen = false;
      state.sidebarCollapsed = false;
      state.user_role = 'public';

      logger.debug('Navigation persisted state cleared');
    },

    /**
     * Replaces the entire recent pages array. This is more efficient than
     * individual updates when bulk changes are needed.
     */
    updateRecentPages: (state, action: PayloadAction<RecentPage[]>) => {
      state.preferences.recentlyVisited = action.payload.slice(0, MAX_RECENT_PAGES);
    },
  },
});

// Export all actions for use in components and thunks
export const {
  setCurrentPath,
  updateBreadcrumbs,
  updateRelatedPages,
  setCurrentSection,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  setMobile,
  setSidebarCollapsed,
  setMounted,
  setUserRole,
  updatePreferences,
  addToRecentPages,
  addFavoritePage,
  removeFavoritePage,
  resetNavigationState,
  loadPersistedState,
  persistNavigationState,
  clearPersistedState,
  updateRecentPages,
} = navigationSlice.actions;

// Basic selectors - these extract specific pieces of state
export const selectCurrentPath = (state: { navigation: NavigationState }) =>
  state.navigation.currentPath;

export const selectPreviousPath = (state: { navigation: NavigationState }) =>
  state.navigation.previousPath;

export const selectBreadcrumbs = (state: { navigation: NavigationState }) =>
  state.navigation.breadcrumbs;

export const selectRelatedPages = (state: { navigation: NavigationState }) =>
  state.navigation.relatedPages;

export const selectCurrentSection = (state: { navigation: NavigationState }) =>
  state.navigation.currentSection;

export const selectSidebarOpen = (state: { navigation: NavigationState }) =>
  state.navigation.sidebarOpen;

export const selectMobileMenuOpen = (state: { navigation: NavigationState }) =>
  state.navigation.mobileMenuOpen;

export const selectIsMobile = (state: { navigation: NavigationState }) =>
  state.navigation.isMobile;

export const selectSidebarCollapsed = (state: { navigation: NavigationState }) =>
  state.navigation.sidebarCollapsed;

export const selectMounted = (state: { navigation: NavigationState }) =>
  state.navigation.mounted;

export const selectUserRole = (state: { navigation: NavigationState }) =>
  state.navigation.user_role;

export const selectNavigationPreferences = (state: { navigation: NavigationState }) =>
  state.navigation.preferences;

/**
 * Memoized selectors using createSelector for performance optimization.
 * These only recalculate when their input selectors change.
 */

// Checks if the current page is in favorites
export const selectIsCurrentPageFavorited = createSelector(
  [selectCurrentPath, selectNavigationPreferences],
  (currentPath, preferences) => preferences.favoritePages.includes(currentPath)
);

// Gets recent pages sorted by visit count for "most visited" features
export const selectMostVisitedPages = createSelector(
  [selectNavigationPreferences],
  (preferences) => [...preferences.recentlyVisited]
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 5)
);

// Checks if any menu is open (useful for overlay logic)
export const selectIsAnyMenuOpen = createSelector(
  [selectSidebarOpen, selectMobileMenuOpen],
  (sidebarOpen, mobileMenuOpen) => sidebarOpen || mobileMenuOpen
);

// Combines mobile state with menu states for responsive behavior
export const selectNavigationUIState = createSelector(
  [selectIsMobile, selectSidebarOpen, selectSidebarCollapsed, selectMobileMenuOpen],
  (isMobile, sidebarOpen, sidebarCollapsed, mobileMenuOpen) => ({
    isMobile,
    sidebarOpen,
    sidebarCollapsed,
    mobileMenuOpen,
    showOverlay: isMobile && (sidebarOpen || mobileMenuOpen),
  })
);

// Export the reducer as default for store configuration
export default navigationSlice.reducer;
