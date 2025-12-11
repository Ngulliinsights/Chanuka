/**
 * Navigation Preferences Module
 * 
 * Handles user navigation preferences and settings
 */

import { logger } from '../../utils/logger';

import { NavigationPreferences } from './types';

/**
 * Gets user navigation preferences from localStorage
 */
export function getNavigationPreferences(): NavigationPreferences {
  try {
    const stored = localStorage.getItem('navigation-preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.warn('Failed to load navigation preferences', { error });
  }

  // Default preferences
  return {
    sidebarCollapsed: false,
    recentPages: [],
    favoritePages: [],
    defaultLandingPage: '/',
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false
  };
}

/**
 * Saves user navigation preferences to localStorage
 */
export function saveNavigationPreferences(preferences: Partial<NavigationPreferences>): void {
  try {
    const current = getNavigationPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem('navigation-preferences', JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save navigation preferences', { error, preferences });
  }
}

/**
 * Adds a page to recent pages list
 */
export function addToRecentPages(path: string, title: string): void {
  try {
    const preferences = getNavigationPreferences();
    const recentPages = preferences.recentPages || [];
    
    // Remove if already exists
    const filtered = recentPages.filter(page => page !== path);
    
    // Add to beginning
    filtered.unshift(path);
    
    // Keep only last 10 pages
    const updated = filtered.slice(0, 10);
    
    saveNavigationPreferences({ recentPages: updated });
  } catch (error) {
    logger.error('Failed to add to recent pages', { error, path, title });
  }
}

/**
 * Adds a page to favorites
 */
export function addToFavorites(path: string): void {
  try {
    const preferences = getNavigationPreferences();
    const favoritePages = preferences.favoritePages || [];
    
    if (!favoritePages.includes(path)) {
      favoritePages.push(path);
      saveNavigationPreferences({ favoritePages });
    }
  } catch (error) {
    logger.error('Failed to add to favorites', { error, path });
  }
}

/**
 * Removes a page from favorites
 */
export function removeFromFavorites(path: string): void {
  try {
    const preferences = getNavigationPreferences();
    const favoritePages = (preferences.favoritePages || []).filter(page => page !== path);
    saveNavigationPreferences({ favoritePages });
  } catch (error) {
    logger.error('Failed to remove from favorites', { error, path });
  }
}

/**
 * Checks if a page is in favorites
 */
export function isPageFavorite(path: string): boolean {
  try {
    const preferences = getNavigationPreferences();
    return (preferences.favoritePages || []).includes(path);
  } catch (error) {
    logger.error('Failed to check if page is favorite', { error, path });
    return false;
  }
}