/**
 * Theme Provider Component
 * 
 * Wraps application with theme context and initialization
 * Provides useTheme hook for accessing/changing theme
 */

// eslint-disable-next-line react-refresh/only-export-components
import { useEffect, useState, ReactNode } from 'react';

import { ThemeContext, ThemeContextType } from './theme-hooks';
import {
  initializeTheme,
  applyTheme,
  toggleTheme as toggleThemeUtil,
  setTheme as setThemeUtil,
  type ThemeMode,
} from './theme-manager';

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
  storageKey?: string;
}

/**
 * Theme Provider Component
 * Initialize theme and provide context to children
 */
export function ThemeProvider({
  children,
  initialTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme on mount
    const resolvedTheme = initialTheme || initializeTheme();
    applyTheme(resolvedTheme);
    setThemeState(resolvedTheme);
    setMounted(true);
  }, [initialTheme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: ThemeMode }>;
      setThemeState(customEvent.detail.mode);
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = toggleThemeUtil();
    setThemeState(newTheme);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeUtil(mode);
    setThemeState(mode);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
  };

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { useTheme, useThemeContext } from './theme-hooks';
