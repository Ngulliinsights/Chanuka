/**
 * Navigation State Persistence - Handles localStorage operations
 */

import { NavigationState, RecentPage } from './types';

export class NavigationStatePersistence {
  private static STORAGE_KEY = 'navigation-state';
  private static SIDEBAR_KEY = 'sidebar-state';

  static saveNavigationState(state: NavigationState): void {
    try {
      const persistableState = {
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        user_role: state.user_role,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }

  static loadNavigationState(): Partial<NavigationState> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load navigation state:', error);
      return null;
    }
  }

  static saveSidebarState(collapsed: boolean): void {
    try {
      localStorage.setItem(this.SIDEBAR_KEY, JSON.stringify(collapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  static loadSidebarState(): boolean | null {
    try {
      const stored = localStorage.getItem(this.SIDEBAR_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
      return null;
    }
  }

  static clearUserSpecificState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SIDEBAR_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation state:', error);
    }
  }

  static updateRecentPages(
    recentlyVisited: RecentPage[],
    newPage: { path: string; title: string }
  ): RecentPage[] {
    // Ensure path and title are defined
    if (!newPage.path || !newPage.title) {
      return recentlyVisited;
    }

    const existingPageIndex = recentlyVisited.findIndex(page => page.path === newPage.path);

    if (existingPageIndex >= 0) {
      // Update existing page by moving it to the front and incrementing count
      const updatedRecentPages = [...recentlyVisited];
      const existingPage = updatedRecentPages[existingPageIndex];
      if (!existingPage) {
        return recentlyVisited;
      }

      updatedRecentPages.splice(existingPageIndex, 1);
      updatedRecentPages.unshift({
        ...existingPage,
        visitedAt: new Date(),
        visitCount: existingPage.visitCount + 1,
      });
      return updatedRecentPages;
    } else {
      // Add new page at the front and limit to 10 items
      const newRecentPage: RecentPage = {
        path: newPage.path,
        title: newPage.title,
        visitedAt: new Date(),
        visitCount: 1,
      };
      return [newRecentPage, ...recentlyVisited].slice(0, 10);
    }
  }
}
