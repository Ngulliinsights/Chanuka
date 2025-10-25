import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { NavigationStatePersistence } from '../state-persistence';
import { NavigationState, NavigationPreferences } from '@/components/navigation';
import { logger } from '@shared/core';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('NavigationStatePersistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Navigation State Persistence', () => {
    const mockNavigationState: NavigationState = {
      currentPath: '/bills',
      previousPath: '/',
      breadcrumbs: [],
      relatedPages: [],
      currentSection: 'legislative',
      sidebarOpen: true,
      mobileMenuOpen: false,
      userRole: 'citizen',
      preferences: {
        defaultLandingPage: '/dashboard',
        favoritePages: ['/bills', '/representatives'],
        recentlyVisited: [
          {
            path: '/bills/123',
            title: 'Test Bill',
            visitedAt: new Date('2024-01-01'),
            visitCount: 3,
          },
        ],
        compactMode: true,
      },
    };

    it('should save navigation state to localStorage', () => {
      NavigationStatePersistence.saveNavigationState(mockNavigationState);

      // Wait for debounced save
      vi.advanceTimersByTime(600);

      const stored = localStorageMock.getItem('chanuka-navigation-state');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.preferences).toEqual(mockNavigationState.preferences);
      expect(parsed.sidebarOpen).toBe(true);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.lastSavedAt).toBeTruthy();
    });

    it('should load navigation state from localStorage', () => {
      const stateToSave = {
        preferences: mockNavigationState.preferences,
        sidebarOpen: true,
        lastSavedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(stateToSave));

      const loaded = NavigationStatePersistence.loadNavigationState();

      expect(loaded).toBeTruthy();
      expect(loaded!.preferences).toEqual(mockNavigationState.preferences);
      expect(loaded!.sidebarOpen).toBe(true);
    });

    it('should handle corrupted navigation state gracefully', () => {
      localStorageMock.setItem('chanuka-navigation-state', 'invalid-json');

      const loaded = NavigationStatePersistence.loadNavigationState();
      expect(loaded).toBeNull();

      // Should clear corrupted data
      expect(localStorageMock.getItem('chanuka-navigation-state')).toBeNull();
    });

    it('should handle version mismatch', () => {
      const oldVersionState = {
        preferences: mockNavigationState.preferences,
        sidebarOpen: true,
        version: '0.9.0', // Old version
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(oldVersionState));

      const loaded = NavigationStatePersistence.loadNavigationState();
      expect(loaded).toBeNull();

      // Should clear old version data
      expect(localStorageMock.getItem('chanuka-navigation-state')).toBeNull();
    });

    it('should sanitize preferences on load', () => {
      const corruptedState = {
        preferences: {
          defaultLandingPage: 123, // Invalid type
          favoritePages: 'not-an-array', // Invalid type
          recentlyVisited: [
            {
              path: '/valid',
              title: 'Valid Page',
              visitedAt: '2024-01-01',
              visitCount: 1,
            },
            'invalid-page', // Invalid entry
          ],
          compactMode: 'true', // Invalid type
        },
        sidebarOpen: true,
        version: '1.0.0',
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(corruptedState));

      const loaded = NavigationStatePersistence.loadNavigationState();

      expect(loaded).toBeTruthy();
      expect(loaded!.preferences!.defaultLandingPage).toBe('/');
      expect(loaded!.preferences!.favoritePages).toEqual([]);
      expect(loaded!.preferences!.recentlyVisited).toHaveLength(1);
      expect(loaded!.preferences!.compactMode).toBe(false);
    });
  });

  describe('Sidebar State Persistence', () => {
    it('should save sidebar state', () => {
      NavigationStatePersistence.saveSidebarState(true);

      const stored = localStorageMock.getItem('chanuka-sidebar-collapsed');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.collapsed).toBe(true);
      expect(parsed.lastToggleAt).toBeTruthy();
    });

    it('should load sidebar state', () => {
      const sidebarState = {
        collapsed: true,
        lastToggleAt: new Date().toISOString(),
      };

      localStorageMock.setItem('chanuka-sidebar-collapsed', JSON.stringify(sidebarState));

      const loaded = NavigationStatePersistence.loadSidebarState();
      expect(loaded).toBe(true);
    });

    it('should handle corrupted sidebar state', () => {
      localStorageMock.setItem('chanuka-sidebar-collapsed', 'invalid-json');

      const loaded = NavigationStatePersistence.loadSidebarState();
      expect(loaded).toBeNull();

      // Should clear corrupted data
      expect(localStorageMock.getItem('chanuka-sidebar-collapsed')).toBeNull();
    });
  });

  describe('State Clearing', () => {
    beforeEach(() => {
      // Set up some stored data
      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify({ test: 'data' }));
      localStorageMock.setItem('chanuka-sidebar-collapsed', JSON.stringify({ collapsed: true }));
      localStorageMock.setItem('chanuka-user-preferences', JSON.stringify({ test: 'prefs' }));
    });

    it('should clear all navigation state', () => {
      NavigationStatePersistence.clearNavigationState();

      expect(localStorageMock.getItem('chanuka-navigation-state')).toBeNull();
      expect(localStorageMock.getItem('chanuka-sidebar-collapsed')).toBeNull();
      expect(localStorageMock.getItem('chanuka-user-preferences')).toBeNull();
    });

    it('should clear only user-specific state', () => {
      const navigationState = {
        preferences: {
          defaultLandingPage: '/dashboard',
          favoritePages: ['/bills'],
          recentlyVisited: [{ path: '/test', title: 'Test' }],
          compactMode: true,
        },
        sidebarOpen: true,
        version: '1.0.0',
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(navigationState));

      NavigationStatePersistence.clearUserSpecificState();

      // Should keep navigation state but clear user preferences
      const stored = localStorageMock.getItem('chanuka-navigation-state');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.preferences.favoritePages).toEqual([]);
      expect(parsed.preferences.recentlyVisited).toEqual([]);
      expect(parsed.sidebarOpen).toBe(true); // Should keep sidebar state

      // Should clear user preferences
      expect(localStorageMock.getItem('chanuka-user-preferences')).toBeNull();
    });
  });

  describe('Preference Sanitization', () => {
    it('should sanitize recent pages correctly', () => {
      const stateWithInvalidRecentPages = {
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          recentlyVisited: [
            {
              path: '/valid',
              title: 'Valid Page',
              visitedAt: '2024-01-01',
              visitCount: 1,
            },
            {
              path: '/invalid-date',
              title: 'Invalid Date Page',
              visitedAt: 'invalid-date',
              visitCount: 'not-a-number',
            },
            'completely-invalid',
            null,
            undefined,
          ],
          compactMode: false,
        },
        sidebarOpen: false,
        version: '1.0.0',
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(stateWithInvalidRecentPages));

      const loaded = NavigationStatePersistence.loadNavigationState();

      expect(loaded).toBeTruthy();
      expect(loaded!.preferences!.recentlyVisited).toHaveLength(1);
      expect(loaded!.preferences!.recentlyVisited[0].path).toBe('/valid');
    });

    it('should limit recent pages to maximum count', () => {
      const manyRecentPages = Array.from({ length: 15 }, (_, i) => ({
        path: `/page-${i}`,
        title: `Page ${i}`,
        visitedAt: new Date().toISOString(),
        visitCount: 1,
      }));

      const stateWithManyPages = {
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          recentlyVisited: manyRecentPages,
          compactMode: false,
        },
        sidebarOpen: false,
        version: '1.0.0',
      };

      localStorageMock.setItem('chanuka-navigation-state', JSON.stringify(stateWithManyPages));

      const loaded = NavigationStatePersistence.loadNavigationState();

      expect(loaded).toBeTruthy();
      expect(loaded!.preferences!.recentlyVisited).toHaveLength(10); // Should be limited to 10
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded error', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw error
      expect(() => {
        NavigationStatePersistence.saveNavigationState({} as NavigationState);
      }).not.toThrow();

      localStorageMock.setItem = originalSetItem;
    });

    it('should handle localStorage access denied error', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error('Access denied');
      });

      const loaded = NavigationStatePersistence.loadNavigationState();
      expect(loaded).toBeNull();

      localStorageMock.getItem = originalGetItem;
    });
  });
});











































