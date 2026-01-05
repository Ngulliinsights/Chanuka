/**
 * Navigation Slice Hook
 *
 * Provides easy access to navigation slice state and actions.
 * This hook abstracts the Redux complexity and provides a clean API.
 */

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  // Actions
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
  setUserRole,
  updatePreferences,
  addToRecentPages,
  addFavoritePage,
  removeFavoritePage,

  // Selectors
  selectCurrentPath,
  selectPreviousPath,
  selectBreadcrumbs,
  selectRelatedPages,
  selectCurrentSection,
  selectSidebarOpen,
  selectMobileMenuOpen,
  selectIsMobile,
  selectSidebarCollapsed,
  selectUserRole,
  selectNavigationPreferences,
  selectIsCurrentPageFavorited,
  selectMostVisitedPages,
  selectIsAnyMenuOpen,
  selectNavigationUIState,
} from '../infrastructure/store/slices/navigationSlice';

import type {
  BreadcrumbItem,
  RelatedPage,
  NavigationSection,
  UserRole,
  NavigationPreferences
} from '../types/navigation';

/**
 * Hook for accessing navigation slice state and actions
 */
export function useNavigationSlice() {
  const dispatch = useDispatch();

  // State selectors
  const currentPath = useSelector(selectCurrentPath);
  const previousPath = useSelector(selectPreviousPath);
  const breadcrumbs = useSelector(selectBreadcrumbs);
  const relatedPages = useSelector(selectRelatedPages);
  const currentSection = useSelector(selectCurrentSection);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const mobileMenuOpen = useSelector(selectMobileMenuOpen);
  const isMobile = useSelector(selectIsMobile);
  const sidebarCollapsed = useSelector(selectSidebarCollapsed);
  const userRole = useSelector(selectUserRole);
  const preferences = useSelector(selectNavigationPreferences);
  const isCurrentPageFavorited = useSelector(selectIsCurrentPageFavorited);
  const mostVisitedPages = useSelector(selectMostVisitedPages);
  const isAnyMenuOpen = useSelector(selectIsAnyMenuOpen);
  const navigationUIState = useSelector(selectNavigationUIState);

  // Action creators
  const actions = {
    setCurrentPath: useCallback((path: string) => {
      dispatch(setCurrentPath(path));
    }, [dispatch]),

    updateBreadcrumbs: useCallback((breadcrumbs: BreadcrumbItem[]) => {
      dispatch(updateBreadcrumbs(breadcrumbs));
    }, [dispatch]),

    updateRelatedPages: useCallback((pages: RelatedPage[]) => {
      dispatch(updateRelatedPages(pages));
    }, [dispatch]),

    setCurrentSection: useCallback((section: NavigationSection) => {
      dispatch(setCurrentSection(section));
    }, [dispatch]),

    toggleSidebar: useCallback(() => {
      dispatch(toggleSidebar());
    }, [dispatch]),

    setSidebarOpen: useCallback((open: boolean) => {
      dispatch(setSidebarOpen(open));
    }, [dispatch]),

    toggleMobileMenu: useCallback(() => {
      dispatch(toggleMobileMenu());
    }, [dispatch]),

    setMobileMenuOpen: useCallback((open: boolean) => {
      dispatch(setMobileMenuOpen(open));
    }, [dispatch]),

    setMobile: useCallback((mobile: boolean) => {
      dispatch(setMobile(mobile));
    }, [dispatch]),

    setSidebarCollapsed: useCallback((collapsed: boolean) => {
      dispatch(setSidebarCollapsed(collapsed));
    }, [dispatch]),

    setUserRole: useCallback((role: UserRole) => {
      dispatch(setUserRole(role));
    }, [dispatch]),

    updatePreferences: useCallback((preferences: Partial<NavigationPreferences>) => {
      dispatch(updatePreferences(preferences));
    }, [dispatch]),

    addToRecentPages: useCallback((page: { path: string; title: string }) => {
      dispatch(addToRecentPages(page));
    }, [dispatch]),

    addFavoritePage: useCallback((path: string) => {
      dispatch(addFavoritePage(path));
    }, [dispatch]),

    removeFavoritePage: useCallback((path: string) => {
      dispatch(removeFavoritePage(path));
    }, [dispatch]),
  };

  return {
    // State
    currentPath,
    previousPath,
    breadcrumbs,
    relatedPages,
    currentSection,
    sidebarOpen,
    mobileMenuOpen,
    isMobile,
    sidebarCollapsed,
    userRole,
    preferences,
    isCurrentPageFavorited,
    mostVisitedPages,
    isAnyMenuOpen,
    navigationUIState,

    // Actions
    ...actions,
  };
}

/**
 * Hook for sidebar-specific functionality
 */
export function useSidebar() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector(selectSidebarOpen);
  const sidebarCollapsed = useSelector(selectSidebarCollapsed);
  const isMobile = useSelector(selectIsMobile);

  return {
    sidebarOpen,
    sidebarCollapsed,
    isMobile,
    toggleSidebar: useCallback(() => dispatch(toggleSidebar()), [dispatch]),
    setSidebarOpen: useCallback((open: boolean) => dispatch(setSidebarOpen(open)), [dispatch]),
    setSidebarCollapsed: useCallback((collapsed: boolean) => dispatch(setSidebarCollapsed(collapsed)), [dispatch]),
  };
}

/**
 * Hook for mobile menu functionality
 */
export function useMobileMenu() {
  const dispatch = useDispatch();
  const mobileMenuOpen = useSelector(selectMobileMenuOpen);
  const isMobile = useSelector(selectIsMobile);

  return {
    mobileMenuOpen,
    isMobile,
    toggleMobileMenu: useCallback(() => dispatch(toggleMobileMenu()), [dispatch]),
    setMobileMenuOpen: useCallback((open: boolean) => dispatch(setMobileMenuOpen(open)), [dispatch]),
  };
}

/**
 * Hook for navigation preferences
 */
export function useNavigationPreferences() {
  const dispatch = useDispatch();
  const preferences = useSelector(selectNavigationPreferences);
  const isCurrentPageFavorited = useSelector(selectIsCurrentPageFavorited);
  const mostVisitedPages = useSelector(selectMostVisitedPages);

  return {
    preferences,
    isCurrentPageFavorited,
    mostVisitedPages,
    updatePreferences: useCallback((prefs: Partial<NavigationPreferences>) =>
      dispatch(updatePreferences(prefs)), [dispatch]),
    addFavoritePage: useCallback((path: string) =>
      dispatch(addFavoritePage(path)), [dispatch]),
    removeFavoritePage: useCallback((path: string) =>
      dispatch(removeFavoritePage(path)), [dispatch]),
  };
}
