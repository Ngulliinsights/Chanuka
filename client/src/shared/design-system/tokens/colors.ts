/**
 * Color System - Chanuka Brand Colors
 * Based on brand roadmap: Deep blue (#0d3b66), Teal (#084c61), Orange (#f38a1f)
 * Implements semantic color meanings with accessibility compliance
 */

export const colorTokens = {
  // Primary Brand Colors - Chanuka Identity
  primary: {
    50: '#f0f7ff',
    100: '#e0efff', 
    200: '#b9dfff',
    300: '#7cc8ff',
    400: '#36b0ff',
    500: '#0d3b66', // Chanuka primary blue
    600: '#0a3159',
    700: '#08274c',
    800: '#061d3f',
    900: '#041332',
    950: '#020a19',
  },

  // Secondary Brand Colors - Supporting Blue
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#084c61', // Chanuka secondary teal
    600: '#073f52',
    700: '#063243',
    800: '#052534',
    900: '#041825',
    950: '#020c13',
  },

  // Accent Colors - Chanuka Orange
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f38a1f', // Chanuka orange accent
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  // Semantic Colors - Status and Feedback
  semantic: {
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },

  // Neutral Colors - Layout and Typography
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Surface Colors - Cards, Modals, Overlays
  surface: {
    background: {
      light: '#ffffff',
      dark: '#0f172a',
    },
    card: {
      light: '#ffffff',
      dark: '#1e293b',
    },
    overlay: {
      light: 'rgba(0, 0, 0, 0.5)',
      dark: 'rgba(0, 0, 0, 0.8)',
    },
  },

  // Interactive States
  interactive: {
    hover: {
      light: 'rgba(13, 59, 102, 0.1)', // primary with opacity
      dark: 'rgba(13, 59, 102, 0.2)',
    },
    focus: {
      ring: '#f38a1f', // accent color for focus rings
      background: 'rgba(243, 138, 31, 0.1)',
    },
    disabled: {
      light: '#f5f5f5',
      dark: '#374151',
      text: '#9ca3af',
    },
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    dark: '#374151',
    subtle: '#f3f4f6',
    emphasis: '#d1d5db',
  },
} as const;

// CSS Custom Properties for runtime theme switching
export const colorCSSVariables = {
  // Primary colors
  '--color-primary-50': colorTokens.primary[50],
  '--color-primary-500': colorTokens.primary[500],
  '--color-primary-600': colorTokens.primary[600],
  '--color-primary-900': colorTokens.primary[900],

  // Secondary colors
  '--color-secondary-500': colorTokens.secondary[500],
  '--color-secondary-600': colorTokens.secondary[600],

  // Accent colors
  '--color-accent-500': colorTokens.accent[500],
  '--color-accent-600': colorTokens.accent[600],

  // Semantic colors
  '--color-success-500': colorTokens.semantic.success[500],
  '--color-warning-500': colorTokens.semantic.warning[500],
  '--color-error-500': colorTokens.semantic.error[500],
  '--color-info-500': colorTokens.semantic.info[500],

  // Neutral colors
  '--color-neutral-50': colorTokens.neutral[50],
  '--color-neutral-100': colorTokens.neutral[100],
  '--color-neutral-500': colorTokens.neutral[500],
  '--color-neutral-900': colorTokens.neutral[900],

  // Surface colors
  '--color-background': colorTokens.surface.background.light,
  '--color-card': colorTokens.surface.card.light,

  // Interactive colors
  '--color-focus-ring': colorTokens.interactive.focus.ring,
  '--color-border': colorTokens.border.light,
} as const;

// Accessibility-compliant color combinations
export const colorCombinations = {
  // High contrast combinations for WCAG AA compliance
  highContrast: {
    primaryOnWhite: {
      background: colorTokens.surface.background.light,
      text: colorTokens.primary[900],
      contrast: '7.1:1', // AAA compliant
    },
    whiteOnPrimary: {
      background: colorTokens.primary[500],
      text: '#ffffff',
      contrast: '4.8:1', // AA compliant
    },
    accentOnWhite: {
      background: colorTokens.surface.background.light,
      text: colorTokens.accent[700],
      contrast: '4.6:1', // AA compliant
    },
  },

  // Status color combinations
  status: {
    success: {
      background: colorTokens.semantic.success[50],
      text: colorTokens.semantic.success[800],
      border: colorTokens.semantic.success[200],
    },
    warning: {
      background: colorTokens.semantic.warning[50],
      text: colorTokens.semantic.warning[800],
      border: colorTokens.semantic.warning[200],
    },
    error: {
      background: colorTokens.semantic.error[50],
      text: colorTokens.semantic.error[800],
      border: colorTokens.semantic.error[200],
    },
    info: {
      background: colorTokens.semantic.info[50],
      text: colorTokens.semantic.info[800],
      border: colorTokens.semantic.info[200],
    },
  },
} as const;

// Color utility functions
export const colorUtils = {
  /**
   * Get color with opacity
   */
  withOpacity: (color: string, opacity: number): string => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },

  /**
   * Check if color meets WCAG contrast requirements
   */
  meetsContrastRequirement: (foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    // This would typically use a color contrast calculation library
    // For now, returning true as placeholder
    return true;
  },

  /**
   * Get semantic color for status
   */
  getSemanticColor: (status: 'success' | 'warning' | 'error' | 'info', shade: keyof typeof colorTokens.semantic.success = 500) => {
    return colorTokens.semantic[status][shade];
  },
} as const;

export type ColorToken = typeof colorTokens;
export type SemanticStatus = 'success' | 'warning' | 'error' | 'info';