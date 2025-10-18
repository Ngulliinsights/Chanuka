import { NavigationState, NavigationPreferences, RecentPage } from '@/types/navigation';
import { logger } from '../../shared/core/src/utils/logger';

// Keys for localStorage
const STORAGE_KEYS = {
  NAVIGATION_STATE: 'chanuka-navigation-state',
  SIDEBAR_STATE: 'chanuka-sidebar-collapsed',
  USER_PREFERENCES: 'chanuka-user-preferences',
} as const;

// Interface for persisted navigation state
interface PersistedNavigationState {
  preferences: NavigationPreferences;
  sidebarOpen: boolean;
  lastSavedAt: string;
  version: string; // For future migration support
}

// Interface for persisted sidebar state (separate for responsive context)
interface PersistedSidebarState {
  collapsed: boolean;
  lastToggleAt: string;
}

/**
 * Utility class for managing navigation state persistence
 */
export class NavigationStatePersistence {
  private static readonly VERSION = '1.0.0';
  private static readonly MAX_RECENT_PAGES = 10;
  private static readonly DEBOUNCE_DELAY = 500;

  /**
   * Load persisted navigation state from localStorage
   */
  static loadNavigationState(): Partial<NavigationState> | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
      if (!stored) return null;

      const parsed: PersistedNavigationState = JSON.parse(stored);
      
      // Validate version compatibility
      if (parsed.version !== this.VERSION) {
        console.warn('Navigation state version mismatch, clearing stored state');
        this.clearNavigationState();
        return null;
      }

      // Validate and sanitize the loaded state
      const safeState: Partial<NavigationState> = {};

      if (parsed.preferences && typeof parsed.preferences === 'object') {
        safeState.preferences = this.sanitizePreferences(parsed.preferences);
      }

      if (typeof parsed.sidebarOpen === 'boolean') {
        safeState.sidebarOpen = parsed.sidebarOpen;
      }

      return safeState;
    } catch (error) {
      console.warn('Failed to load navigation state:', error);
      this.clearNavigationState();
      return null;
    }
  }

  /**
   * Save navigation state to localStorage with debouncing
   */
  static saveNavigationState(state: NavigationState): void {
    if (typeof window === 'undefined') return;

    // Clear any existing timeout
    if ((window as any).navigationSaveTimeout) {
      clearTimeout((window as any).navigationSaveTimeout);
    }

    // Debounce the save operation
    (window as any).navigationSaveTimeout = setTimeout(() => {
      try {
        const stateToSave: PersistedNavigationState = {
          preferences: this.sanitizePreferences(state.preferences),
          sidebarOpen: state.sidebarOpen,
          lastSavedAt: new Date().toISOString(),
          version: this.VERSION,
        };

        localStorage.setItem(
          STORAGE_KEYS.NAVIGATION_STATE, 
          JSON.stringify(stateToSave)
        );
      } catch (error) {
        console.warn('Failed to save navigation state:', error);
      }
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Load persisted sidebar state (for responsive context)
   * Returns null if no saved state exists (so we can use default behavior)
   */
  static loadSidebarState(): boolean | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE);
      if (!stored) return null; // No saved state - let context decide default

      const parsed: PersistedSidebarState = JSON.parse(stored);
      return typeof parsed.collapsed === 'boolean' ? parsed.collapsed : null;
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
      this.clearSidebarState();
      return null; // On error, let context decide default
    }
  }

  /**
   * Save sidebar state (for responsive context)
   */
  static saveSidebarState(collapsed: boolean): void {
    if (typeof window === 'undefined') return;

    try {
      const stateToSave: PersistedSidebarState = {
        collapsed,
        lastToggleAt: new Date().toISOString(),
      };

      localStorage.setItem(
        STORAGE_KEYS.SIDEBAR_STATE,
        JSON.stringify(stateToSave)
      );
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  /**
   * Clear sidebar state only
   */
  static clearSidebarState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEYS.SIDEBAR_STATE);
    } catch (error) {
      console.warn('Failed to clear sidebar state:', error);
    }
  }

  /**
   * Clear all persisted navigation state
   */
  static clearNavigationState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEYS.NAVIGATION_STATE);
      localStorage.removeItem(STORAGE_KEYS.SIDEBAR_STATE);
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    } catch (error) {
      console.warn('Failed to clear navigation state:', error);
    }
  }

  /**
   * Clear user-specific state (called on logout)
   */
  static clearUserSpecificState(): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep sidebar state but clear user preferences
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
      
      // Update navigation state to remove user-specific data
      const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
      if (stored) {
        const parsed: PersistedNavigationState = JSON.parse(stored);
        const cleanedState: PersistedNavigationState = {
          ...parsed,
          preferences: {
            defaultLandingPage: '/',
            favoritePages: [],
            recentlyVisited: [],
            compactMode: false,
          },
        };
        localStorage.setItem(
          STORAGE_KEYS.NAVIGATION_STATE,
          JSON.stringify(cleanedState)
        );
      }
    } catch (error) {
      console.warn('Failed to clear user-specific state:', error);
    }
  }

  /**
   * Sanitize and validate navigation preferences
   */
  private static sanitizePreferences(preferences: any): NavigationPreferences {
    const defaultPreferences: NavigationPreferences = {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
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
            .map((page: any) => this.sanitizeRecentPage(page))
            .filter(Boolean)
            .slice(0, this.MAX_RECENT_PAGES)
        : defaultPreferences.recentlyVisited,
      
      compactMode: typeof preferences.compactMode === 'boolean'
        ? preferences.compactMode
        : defaultPreferences.compactMode,
    };
  }

  /**
   * Sanitize and validate a recent page entry
   */
  private static sanitizeRecentPage(page: any): RecentPage | null {
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
   * Migrate old state format to new format (for future use)
   */
  static migrateState(): void {
    // This method can be used in the future to migrate between state versions
    // For now, it's a placeholder
  }
}






