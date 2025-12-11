import { useCallback, useEffect, useState } from 'react';

import { logger } from '@client/utils/logger';

const PREFERENCES_STORAGE_KEY = 'navigation-preferences';

interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: string[];
  recentlyVisited: string[];
  compactMode: boolean;
  showBreadcrumbs: boolean;
  autoExpand: boolean;
}

// Deep equality check for navigation preferences to avoid JSON.stringify issues
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) return false;
  }
  
  return true;
}

export function useNavigationPreferences() {
  const [preferences, setPreferences] = useState<NavigationPreferences>({
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const updatePreferences = useCallback((updates: Partial<NavigationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Load preferences from localStorage on mount only
  // This runs once when the component mounts to hydrate preferences from storage
  useEffect(() => {
    let mounted = true;
    
    const loadPreferences = async () => {
      try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored && mounted) {
          const parsedPreferences = JSON.parse(stored);
          // Use deep equality check instead of JSON.stringify to prevent property order issues
          const hasChanged = !deepEqual(preferences, parsedPreferences);
          if (hasChanged) {
            updatePreferences(parsedPreferences);
          }
        }
      } catch (error) {
        logger.error('Failed to load navigation preferences:', { component: 'NavigationPreferences' }, error);
      } finally {
        // Mark loading as complete regardless of success or failure
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Only load on initial mount when preferences are still default
    if (isLoading) {
      loadPreferences();
    }
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save preferences to localStorage whenever they change
  // This effect acts as a persistent sync mechanism
  useEffect(() => {
    // Skip saving during initial load to avoid overwriting with default values
    if (!isLoading) {
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        logger.error('Failed to save navigation preferences:', { component: 'NavigationPreferences' }, error);
      }
    }
  }, [preferences, isLoading]);

  // Add a page to favorites with duplicate prevention
  const addToFavorites = useCallback((path: string) => {
    updatePreferences({
      favoritePages: [...new Set([...preferences.favoritePages, path])]
    });
  }, [preferences.favoritePages, updatePreferences]);

  // Remove a page from favorites
  const removeFromFavorites = useCallback((path: string) => {
    updatePreferences({
      favoritePages: preferences.favoritePages.filter((p: string) => p !== path)
    });
  }, [preferences.favoritePages, updatePreferences]);

  // Check if a page is in favorites
  const isFavorite = useCallback((path: string) => {
    return preferences.favoritePages.includes(path);
  }, [preferences.favoritePages]);

  // Toggle favorite status for a page
  const toggleFavorite = useCallback((path: string) => {
    if (isFavorite(path)) {
      removeFromFavorites(path);
    } else {
      addToFavorites(path);
    }
  }, [isFavorite, addToFavorites, removeFromFavorites]);

  // Clear all recently visited pages
  const clearRecentPages = useCallback(() => {
    updatePreferences({
      recentlyVisited: []
    });
  }, [updatePreferences]);

  // Clear all favorite pages
  const clearFavorites = useCallback(() => {
    updatePreferences({
      favoritePages: []
    });
  }, [updatePreferences]);

  // Set the default landing page for the application
  const setDefaultLandingPage = useCallback((path: string) => {
    updatePreferences({
      defaultLandingPage: path
    });
  }, [updatePreferences]);

  // Toggle compact mode display preference
  const toggleCompactMode = useCallback(() => {
    updatePreferences({
      compactMode: !preferences.compactMode
    });
  }, [preferences.compactMode, updatePreferences]);

  // Reset all preferences to default values and clear storage
  const resetPreferences = useCallback(() => {
    const defaultPreferences: NavigationPreferences = {
      defaultLandingPage: '/',
      favoritePages: [],
      recentlyVisited: [],
      compactMode: false,
      showBreadcrumbs: true,
      autoExpand: false,
    };
  updatePreferences(defaultPreferences);
    try {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to remove preferences from storage:', { component: 'NavigationPreferences' }, error);
    }
  }, [updatePreferences]);

  // Export preferences as a downloadable JSON file
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'navigation-preferences.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [preferences]);

  // Import preferences from a JSON file with validation
  const importPreferences = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedPreferences = JSON.parse(content);
          
          // Validate the imported data structure before applying
          if (typeof importedPreferences === 'object' && importedPreferences !== null) {
            updatePreferences(importedPreferences);
            resolve();
          } else {
            reject(new Error('Invalid preferences file format'));
          }
        } catch (error) {
          reject(new Error('Failed to parse preferences file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [updatePreferences]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    clearRecentPages,
    clearFavorites,
    setDefaultLandingPage,
    toggleCompactMode,
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
}

