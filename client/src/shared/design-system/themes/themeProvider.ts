/**
 * Theme Provider - Theme management and switching
 * Handles theme persistence and CSS variable updates
 */

import { lightTheme } from './light';
import { darkTheme } from './dark';
import { highContrastTheme } from './highContrast';

export type ThemeName = 'light' | 'dark' | 'highContrast';
export type Theme = typeof lightTheme | typeof darkTheme | typeof highContrastTheme;

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
} as const;

export class ThemeProvider {
  private currentTheme: ThemeName = 'light';
  private mediaQuery: MediaQueryList;
  private listeners: Set<(theme: ThemeName) => void> = new Set();

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    this.initializeTheme();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('chanuka-theme') as ThemeName;
    
    if (savedTheme && savedTheme in themes) {
      this.setTheme(savedTheme);
    } else {
      // Use system preference
      const systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
    }
  }

  /**
   * Handle system theme changes
   */
  private handleSystemThemeChange(e: MediaQueryListEvent): void {
    // Only auto-switch if user hasn't manually set a theme
    const savedTheme = localStorage.getItem('chanuka-theme');
    if (!savedTheme) {
      const systemTheme = e.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
    }
  }

  /**
   * Set the current theme
   */
  setTheme(themeName: ThemeName): void {
    if (!(themeName in themes)) {
      console.warn(`Theme "${themeName}" not found. Using light theme.`);
      themeName = 'light';
    }

    this.currentTheme = themeName;
    const theme = themes[themeName];

    // Update CSS custom properties
    this.updateCSSVariables(theme.cssVariables);

    // Update document class
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '')
      .trim();
    document.documentElement.classList.add(`theme-${themeName}`);

    // Save to localStorage
    localStorage.setItem('chanuka-theme', themeName);

    // Notify listeners
    this.listeners.forEach(listener => listener(themeName));
  }

  /**
   * Get the current theme
   */
  getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  /**
   * Get theme object
   */
  getTheme(themeName?: ThemeName): Theme {
    return themes[themeName || this.currentTheme];
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Check if system prefers dark mode
   */
  systemPrefersDark(): boolean {
    return this.mediaQuery.matches;
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: ThemeName) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update CSS custom properties
   */
  private updateCSSVariables(variables: Record<string, string>): void {
    const root = document.documentElement;
    
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  /**
   * Apply accessibility preferences
   */
  applyAccessibilityPreferences(): void {
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersHighContrast) {
      this.setTheme('highContrast');
    }

    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }
  }

  /**
   * Get color value from current theme
   */
  getColor(colorKey: string): string {
    const theme = this.getTheme();
    return theme.colors[colorKey as keyof typeof theme.colors] || '';
  }
}

// Singleton instance
export const themeProvider = new ThemeProvider();