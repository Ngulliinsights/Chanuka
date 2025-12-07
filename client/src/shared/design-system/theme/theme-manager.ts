/**
 * Dark Mode Configuration
 * 
 * Enables theme switching between light, dark, and high-contrast modes
 * Uses CSS custom properties that are swapped at the document root level
 */

import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

interface ThemeConfig {
  mode: ThemeMode;
  storageKey: string;
  prefersDark: boolean;
}

/**
 * Default theme configuration
 */
const defaultConfig: ThemeConfig = {
  mode: 'light',
  storageKey: 'chanuka-theme',
  prefersDark: false,
};

/**
 * Get the system preference for dark mode
 */
export function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initializeTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  // Check localStorage first
  const stored = localStorage.getItem(defaultConfig.storageKey) as ThemeMode | null;
  if (stored && ['light', 'dark', 'high-contrast'].includes(stored)) {
    return stored;
  }

  // Fall back to system preference
  return getSystemThemePreference();
}

/**
 * Apply theme to document
 * Sets the 'data-theme' attribute and updates CSS custom properties
 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  // Set attribute for CSS selectors
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.classList.remove('light', 'dark', 'high-contrast');
  document.documentElement.classList.add(mode);

  // Store preference
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(defaultConfig.storageKey, mode);
  }

  // Trigger custom event for listeners
  const event = new CustomEvent('themechange', { detail: { mode } });
  window.dispatchEvent(event);
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';

  const current = document.documentElement.getAttribute('data-theme') as ThemeMode || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  
  applyTheme(next);
  return next;
}

/**
 * Set theme to specific mode
 */
export function setTheme(mode: ThemeMode): void {
  applyTheme(mode);
}

/**
 * Get current theme
 */
export function getCurrentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  
  const theme = document.documentElement.getAttribute('data-theme') as ThemeMode;
  return ['light', 'dark', 'high-contrast'].includes(theme) ? theme : 'light';
}

/**
 * Hook for theme changes (client-side only)
 */
export function useTheme(): { theme: ThemeMode; toggleTheme: () => void; setTheme: (mode: ThemeMode) => void; } {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const currentTheme = getCurrentTheme();
    setThemeState(currentTheme);

    const handleThemeChange = (event: CustomEvent<{ mode: ThemeMode }>) => {
      setThemeState(event.detail.mode);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  return {
    theme,
    toggleTheme: () => {
      const newTheme = toggleTheme();
      setThemeState(newTheme);
    },
    setTheme: (mode: ThemeMode) => {
      setTheme(mode);
      setThemeState(mode);
    },
  };
}

export const themeConfig = defaultConfig;
