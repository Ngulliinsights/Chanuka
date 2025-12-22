/**
 * Color Design Tokens
 * Centralized color system for consistent theming
 */

export const colorTokens = {
  // Primary brand colors - Chanuka Design System
  // Updated per brand roadmap for institutional authority and trust
  primary: {
    // Deep Blue (#0d3b66) - Primary institutional authority
    50: '#f0f5fb',
    100: '#d9e5f0',
    200: '#b3cce1',
    300: '#8cb3d2',
    400: '#6699c3',
    500: '#4080b4',  // Brand primary
    600: '#0d3b66',  // Deepest - matches roadmap
    700: '#0a2f54',
    800: '#072642',
    900: '#051c30',
  },

  // Secondary colors - Transparency & Clarity
  secondary: {
    // Teal (#084c61) - Transparency and clarity
    50: '#f0fafb',
    100: '#d9eef2',
    200: '#b3dde5',
    300: '#8cccd8',
    400: '#66bbcb',
    500: '#40aabe',
    600: '#084c61',  // Matches roadmap
    700: '#06414f',
    800: '#04363d',
    900: '#022b2b',
  },

  // Accent colors - Energy & Optimism
  accent: {
    // Orange (#f38a1f) - Energy encouraging participation
    50: '#fff8f0',
    100: '#ffebd9',
    200: '#ffd7b3',
    300: '#ffc38c',
    400: '#ffaf66',
    500: '#ff9b40',
    600: '#f38a1f',  // Matches roadmap
    700: '#e67a0f',
    800: '#d96a00',
    900: '#cc5a00',
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

