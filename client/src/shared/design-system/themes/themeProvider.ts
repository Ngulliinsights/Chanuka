/**
 * Theme Provider - Theme management and switching
 * Handles theme persistence and CSS variable updates
 */

import { validateThemeContrast, generateContrastCSS } from '@client/utils/contrast';

import { darkTheme } from './dark';
import { highContrastTheme, darkHighContrastTheme } from './high-contrast';
import { lightTheme } from './light';


export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'dark-high-contrast';
export type Theme = typeof lightTheme | typeof darkTheme | typeof highContrastTheme | typeof darkHighContrastTheme;
export type ContrastPreference = 'normal' | 'high';

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
  'dark-high-contrast': darkHighContrastTheme,
} as const;

export class ThemeProvider {
  private currentTheme: ThemeName = 'light';
  private contrastPreference: ContrastPreference = 'normal';
  private mediaQuery: MediaQueryList;
  private contrastQuery: MediaQueryList;
  private listeners: Set<(theme: ThemeName, contrast: ContrastPreference) => void> = new Set();

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    this.contrastQuery.addEventListener('change', this.handleContrastChange.bind(this));
    
    this.initializeTheme();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('chanuka-theme') as ThemeName;
    const savedContrast = localStorage.getItem('chanuka-contrast') as ContrastPreference;
    
    // Set contrast preference
    this.contrastPreference = savedContrast || (this.contrastQuery.matches ? 'high' : 'normal');
    
    if (savedTheme && savedTheme in themes) {
      this.setTheme(savedTheme);
    } else {
      // Use system preference with contrast consideration
      const isDark = this.mediaQuery.matches;
      const isHighContrast = this.contrastPreference === 'high';
      
      let systemTheme: ThemeName;
      if (isHighContrast) {
        systemTheme = isDark ? 'dark-high-contrast' : 'high-contrast';
      } else {
        systemTheme = isDark ? 'dark' : 'light';
      }
      
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
      const isDark = e.matches;
      const isHighContrast = this.contrastPreference === 'high';
      
      let systemTheme: ThemeName;
      if (isHighContrast) {
        systemTheme = isDark ? 'dark-high-contrast' : 'high-contrast';
      } else {
        systemTheme = isDark ? 'dark' : 'light';
      }
      
      this.setTheme(systemTheme);
    }
  }

  /**
   * Handle system contrast changes
   */
  private handleContrastChange(e: MediaQueryListEvent): void {
    const savedContrast = localStorage.getItem('chanuka-contrast');
    if (!savedContrast) {
      this.contrastPreference = e.matches ? 'high' : 'normal';
      
      // Update theme to match contrast preference
      const isDark = this.currentTheme.includes('dark');
      let newTheme: ThemeName;
      
      if (this.contrastPreference === 'high') {
        newTheme = isDark ? 'dark-high-contrast' : 'high-contrast';
      } else {
        newTheme = isDark ? 'dark' : 'light';
      }
      
      this.setTheme(newTheme);
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
    this.contrastPreference = themeName.includes('high-contrast') ? 'high' : 'normal';
    
    const theme = themes[themeName];

    // Validate theme contrast
    const validation = validateThemeContrast(theme);
    if (!validation.isValid) {
      console.warn('Theme contrast validation failed:', validation.issues);
    }

    // Update CSS custom properties
    this.updateCSSVariables(theme.cssVariables);

    // Update document classes
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '')
      .replace(/contrast-\w+/g, '')
      .trim();
    
    document.documentElement.classList.add(`theme-${themeName}`);
    document.documentElement.classList.add(`contrast-${this.contrastPreference}`);

    // Apply contrast-specific CSS
    this.applyContrastCSS(theme);

    // Save to localStorage
    localStorage.setItem('chanuka-theme', themeName);
    localStorage.setItem('chanuka-contrast', this.contrastPreference);

    // Notify listeners
    this.listeners.forEach(listener => listener(themeName, this.contrastPreference));
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
    const isHighContrast = this.contrastPreference === 'high';
    
    if (this.currentTheme.includes('dark')) {
      this.setTheme(isHighContrast ? 'high-contrast' : 'light');
    } else {
      this.setTheme(isHighContrast ? 'dark-high-contrast' : 'dark');
    }
  }

  /**
   * Toggle contrast level
   */
  toggleContrast(): void {
    const isDark = this.currentTheme.includes('dark');
    
    if (this.contrastPreference === 'high') {
      this.setTheme(isDark ? 'dark' : 'light');
    } else {
      this.setTheme(isDark ? 'dark-high-contrast' : 'high-contrast');
    }
  }

  /**
   * Get current contrast preference
   */
  getContrastPreference(): ContrastPreference {
    return this.contrastPreference;
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
  subscribe(listener: (theme: ThemeName, contrast: ContrastPreference) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Apply contrast-specific CSS
   */
  private applyContrastCSS(theme: Theme): void {
    const contrastCSS = generateContrastCSS(theme);
    let styleElement = document.getElementById('chanuka-contrast-styles');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'chanuka-contrast-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = contrastCSS;
  }

  /**
   * Validate current theme contrast
   */
  validateCurrentTheme() {
    const theme = this.getTheme();
    return validateThemeContrast(theme);
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

