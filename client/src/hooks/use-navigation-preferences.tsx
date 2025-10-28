import { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/browser-logger';
import { useNavigation } from '../contexts/NavigationContext';
import { NavigationPreferences } from '../types/navigation';

const PREFERENCES_STORAGE_KEY = 'navigation-preferences';

export function useNavigationPreferences() {
  const { preferences, updatePreferences } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount only
  // This runs once when the component mounts to hydrate preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
          const parsedPreferences = JSON.parse(stored);
          // Only update if preferences are different to prevent infinite loops
          if (JSON.stringify(parsedPreferences) !== JSON.stringify(preferences)) {
            updatePreferences(parsedPreferences);
          }
        }
      } catch (error) {
        logger.error('Failed to load navigation preferences:', { component: 'NavigationPreferences' }, error);
      } finally {
        // Mark loading as complete regardless of success or failure
        setIsLoading(false);
      }
    };

    loadPreferences();
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
      favoritePages: preferences.favoritePages.filter(p => p !== path)
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

