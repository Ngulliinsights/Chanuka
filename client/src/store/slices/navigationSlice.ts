/**
 * Navigation Slice
 *
 * Manages navigation state and persistence for user navigation preferences.
 * Enhanced with full navigation logic from state-persistence utility.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NavigationState, BreadcrumbItem, RelatedPage, NavigationSection, UserRole, NavigationPreferences, RecentPage } from '../../types/navigation';
import { logger } from '../../utils/logger';

const initialState: NavigationState = {
  currentPath: '/',
  previousPath: '/',
  breadcrumbs: [],
  relatedPages: [],
  currentSection: 'legislative',
  sidebarOpen: false,
  mobileMenuOpen: false,
  isMobile: false,
  sidebarCollapsed: false,
  mounted: false,
  user_role: 'public',
  preferences: {
    defaultLandingPage: '/',
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
    setCurrentPath: (state, action: PayloadAction<string>) => {
      state.previousPath = state.currentPath;
      state.currentPath = action.payload;
      logger.debug('Navigation path updated', { from: state.previousPath, to: action.payload });
    },
    updateBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload;
    },
    updateRelatedPages: (state, action: PayloadAction<RelatedPage[]>) => {
      state.relatedPages = action.payload;
    },
    setCurrentSection: (state, action: PayloadAction<NavigationSection>) => {
      state.currentSection = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setMounted: (state, action: PayloadAction<boolean>) => {
      state.mounted = action.payload;
    },
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      state.user_role = action.payload;
    },
    updatePreferences: (state, action: PayloadAction<Partial<NavigationPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    addToRecentPages: (state, action: PayloadAction<{ path: string; title: string }>) => {
      const { path, title } = action.payload;
      const existingIndex = state.preferences.recentlyVisited.findIndex(page => page.path === path);

      if (existingIndex >= 0) {
        // Update existing entry
        state.preferences.recentlyVisited[existingIndex] = {
          ...state.preferences.recentlyVisited[existingIndex],
          visitedAt: new Date(),
          visitCount: state.preferences.recentlyVisited[existingIndex].visitCount + 1,
        };
      } else {
        // Add new entry
        state.preferences.recentlyVisited.unshift({
          path,
          title,
          visitedAt: new Date(),
          visitCount: 1,
        });
      }

      // Keep only the most recent 10 pages
      state.preferences.recentlyVisited = state.preferences.recentlyVisited.slice(0, 10);
    },
    addFavoritePage: (state, action: PayloadAction<string>) => {
      if (!state.preferences.favoritePages.includes(action.payload)) {
        state.preferences.favoritePages.push(action.payload);
      }
    },
    removeFavoritePage: (state, action: PayloadAction<string>) => {
      state.preferences.favoritePages = state.preferences.favoritePages.filter(path => path !== action.payload);
    },
    resetNavigationState: (state) => {
      state.currentPath = '/';
      state.previousPath = '/';
      state.breadcrumbs = [];
      state.relatedPages = [];
      state.currentSection = 'legislative';
      state.sidebarOpen = false;
      state.mobileMenuOpen = false;
      state.user_role = 'public';
    },
    // Persistence actions
    loadPersistedState: (state, action: PayloadAction<Partial<NavigationState>>) => {
      const persistedState = action.payload;
      if (persistedState.preferences) {
        state.preferences = { ...state.preferences, ...persistedState.preferences };
      }
      if (typeof persistedState.sidebarOpen === 'boolean') {
        state.sidebarOpen = persistedState.sidebarOpen;
      }
      if (typeof persistedState.user_role === 'string') {
        state.user_role = persistedState.user_role as UserRole;
      }
      logger.debug('Navigation state loaded from persistence', { component: 'navigationSlice' });
    },
    persistNavigationState: (state) => {
      // This action triggers persistence middleware
      // The actual persistence logic will be handled by middleware
      logger.debug('Navigation state persistence triggered', { component: 'navigationSlice' });
    },
    clearPersistedState: (state) => {
      // Reset to default preferences but keep current navigation state
      state.preferences = {
        defaultLandingPage: '/',
        favoritePages: [],
        recentlyVisited: [],
        compactMode: false,
        showBreadcrumbs: true,
        autoExpand: false,
      };
      state.sidebarOpen = false;
      state.user_role = 'public';
      logger.debug('Navigation persisted state cleared', { component: 'navigationSlice' });
    },
    // Enhanced recent pages management with validation
    updateRecentPages: (state, action: PayloadAction<RecentPage[]>) => {
      state.preferences.recentlyVisited = action.payload.slice(0, 10); // Keep only 10 most recent
    },
  },
});

// Export actions
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

// Export selectors
export const selectCurrentPath = (state: { navigation: NavigationState }) => state.navigation.currentPath;
export const selectPreviousPath = (state: { navigation: NavigationState }) => state.navigation.previousPath;
export const selectBreadcrumbs = (state: { navigation: NavigationState }) => state.navigation.breadcrumbs;
export const selectRelatedPages = (state: { navigation: NavigationState }) => state.navigation.relatedPages;
export const selectCurrentSection = (state: { navigation: NavigationState }) => state.navigation.currentSection;
export const selectSidebarOpen = (state: { navigation: NavigationState }) => state.navigation.sidebarOpen;
export const selectMobileMenuOpen = (state: { navigation: NavigationState }) => state.navigation.mobileMenuOpen;
export const selectUserRole = (state: { navigation: NavigationState }) => state.navigation.user_role;
export const selectNavigationPreferences = (state: { navigation: NavigationState }) => state.navigation.preferences;

export default navigationSlice.reducer;