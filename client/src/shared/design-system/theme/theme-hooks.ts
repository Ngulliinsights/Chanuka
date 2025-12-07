import { createContext, useContext } from 'react';

import { type ThemeMode } from './theme-manager';

export interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to access theme context
 * Must be used within ThemeProvider
 */
export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }

  return context;
}

/**
 * Alias for useThemeContext
 */
export const useTheme = useThemeContext;

export { ThemeContext };