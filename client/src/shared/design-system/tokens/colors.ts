/**
 * Color Design Tokens
 * Centralized color system for consistent theming
 */

export const colorTokens = {
  // Primary brand colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Accent colors
  accent: {
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
  },

  // Neutral colors
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
    light: '#e5e5e5',
    medium: '#d4d4d4',
    dark: '#a3a3a3',
    emphasis: '#737373',
    subtle: '#f5f5f5',
  },

  // Semantic colors
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
    },
  },

  // Border colors
  border: {
    light: '#e5e5e5',
    medium: '#d4d4d4',
    dark: '#a3a3a3',
    emphasis: '#737373',
    subtle: '#f5f5f5',
  },

  // Surface colors
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    elevated: '#ffffff',
    background: {
      light: '#ffffff',
      dark: '#0f172a',
    },
    card: {
      light: '#ffffff',
      dark: '#1e293b',
    },
  },

  // Interactive colors
  interactive: {
    primary: '#0ea5e9',
    secondary: '#64748b',
    hover: {
      primary: '#0284c7',
      light: '#f1f5f9',
    },
    pressed: '#0369a1',
    focus: {
      ring: '#0ea5e9',
      background: '#eff6ff',
    },
    disabled: {
      light: '#f5f5f5',
      text: '#a3a3a3',
    },
  },

  // Secondary colors (alias for compatibility)
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Color combinations for complex components
  colorCombinations: {
    error: {
      background: '#fef2f2',
      foreground: '#dc2626',
      border: '#fecaca',
    },
    warning: {
      background: '#fffbeb',
      foreground: '#d97706',
      border: '#fed7aa',
    },
    success: {
      background: '#f0fdf4',
      foreground: '#16a34a',
      border: '#bbf7d0',
    },
    status: {
      error: {
        background: '#fef2f2',
        foreground: '#dc2626',
        border: '#fecaca',
        text: '#dc2626',
      },
      warning: {
        background: '#fffbeb',
        foreground: '#d97706',
        border: '#fed7aa',
        text: '#d97706',
      },
      success: {
        background: '#f0fdf4',
        foreground: '#16a34a',
        border: '#bbf7d0',
        text: '#16a34a',
      },
      info: {
        background: '#eff6ff',
        foreground: '#2563eb',
        border: '#bfdbfe',
        text: '#2563eb',
      },
    },
  },
} as const;

