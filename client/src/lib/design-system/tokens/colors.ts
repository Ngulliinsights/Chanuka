/**
 * Color Design Tokens
 * Centralized color system for consistent theming
 */

export const colorTokens = {
  // Primary brand colors - Chanuka Design System (from SVG brand assets)
  primary: {
    // Navy Blue (#1a2e49) - Primary institutional authority and trust
    50: '#f0f3f7',
    100: '#dce2ea',
    200: '#b9c5d5',
    300: '#96a8c0',
    400: '#738bab',
    500: '#506e96',
    600: '#1a2e49', // Brand primary from SVG
    700: '#152538',
    800: '#101c2a',
    900: '#0b131c',
  },

  // Secondary colors - Civic transparency
  secondary: {
    // Teal (#11505c) - Transparency and modern civic tech
    50: '#f0f7f8',
    100: '#dceef0',
    200: '#b9dde1',
    300: '#96ccd2',
    400: '#73bbc3',
    500: '#50aab4',
    600: '#11505c', // Brand secondary from SVG
    700: '#0e404a',
    800: '#0a3038',
    900: '#072026',
  },

  // Accent colors - Energy & Optimism
  accent: {
    // Orange (#f29b06) - Energy encouraging participation
    50: '#fff8ed',
    100: '#ffefd4',
    200: '#ffdfa9',
    300: '#ffcf7e',
    400: '#ffbf53',
    500: '#ffaf28',
    600: '#f29b06', // Brand accent from SVG
    700: '#c27c05',
    800: '#915d04',
    900: '#613e03',
  },

  // Neutral colors - Professional balance and readability
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

  // Governance colors - Political neutrality and perspective balance
  // Used for presenting multiple legislative perspectives without bias
  governance: {
    perspective1: {
      // Supporting perspective (cool blue)
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      700: '#1d4ed8',
    },
    perspective2: {
      // Opposing perspective (cool purple)
      50: '#f3e8ff',
      100: '#e9d5ff',
      500: '#a855f7',
      700: '#7e22ce',
    },
    neutral_info: {
      // Neutral/informational (gray-green)
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      700: '#15803d',
    },
    amendment: {
      // Amendment/modification (amber)
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      700: '#b45309',
    },
    constitutional: {
      // Constitutional significance (deep purple)
      50: '#faf5ff',
      100: '#f3e8ff',
      500: '#d946ef',
      700: '#a21caf',
    },
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

  // Gray colors (alias for compatibility)
  gray: {
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
