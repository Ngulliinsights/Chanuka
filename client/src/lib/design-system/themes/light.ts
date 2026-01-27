/**
 * Light Theme - Default Chanuka theme
 * Optimized for readability and brand consistency
 */

import { colorTokens } from '../tokens/colors';

export const lightTheme = {
  name: 'light',

  colors: {
    // Primary brand colors
    primary: colorTokens.primary[500],
    primaryForeground: '#ffffff',
    primaryHover: colorTokens.primary[600],

    // Secondary colors
    secondary: colorTokens.secondary[500],
    secondaryForeground: '#ffffff',
    secondaryHover: colorTokens.secondary[600],

    // Accent colors
    accent: colorTokens.accent[500],
    accentForeground: '#ffffff',
    accentHover: colorTokens.accent[600],

    // Surface colors
    background: colorTokens.surface.background.light,
    foreground: colorTokens.neutral[900],

    // Card colors
    card: colorTokens.surface.card.light,
    cardForeground: colorTokens.neutral[900],

    // Muted colors
    muted: colorTokens.neutral[100],
    mutedForeground: colorTokens.neutral[600],

    // Border colors
    border: colorTokens.border.light,
    borderSubtle: colorTokens.border.subtle,

    // Input colors
    input: colorTokens.border.light,
    inputForeground: colorTokens.neutral[900],

    // Ring/focus colors
    ring: colorTokens.accent[500],

    // Semantic colors
    success: colorTokens.semantic.success[500],
    successForeground: '#ffffff',
    warning: colorTokens.semantic.warning[500],
    warningForeground: colorTokens.neutral[900],
    error: colorTokens.semantic.error[500],
    errorForeground: '#ffffff',
    info: colorTokens.semantic.info[500],
    infoForeground: '#ffffff',
  },

  // CSS custom properties - Updated to Chanuka brand palette
  cssVariables: {
    '--background': '0 0% 100%',
    '--foreground': '0 0% 9%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 9%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 9%',
    // Primary: Deep Blue #0d3b66 (Chanuka brand - institutional authority)
    '--primary': '206 81% 26%',
    '--primary-foreground': '0 0% 100%',
    // Secondary: Teal #084c61 (transparency and clarity)
    '--secondary': '198 77% 20%',
    '--secondary-foreground': '0 0% 100%',
    // Muted: Neutral grays
    '--muted': '0 0% 96%',
    '--muted-foreground': '0 0% 45%',
    // Accent: Orange #f38a1f (energy and participation)
    '--accent': '32 93% 50%',
    '--accent-foreground': '0 0% 100%',
    // Destructive/error - now integrated with governance
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '214 32% 91%',
    '--input': '214 32% 91%',
    '--ring': '32 93% 50%',
    // Semantic colors
    '--success': '142 71% 45%',
    '--warning': '43 96% 56%',
    '--danger': '0 84% 60%',
    '--info': '206 81% 26%',
    // Governance colors for political neutrality
    '--governance-perspective1': '219 79% 46%', // Perspective A (blue)
    '--governance-perspective2': '261 80% 50%', // Perspective B (purple)
    '--governance-neutral': '142 71% 45%', // Neutral/informational (green)
    '--governance-amendment': '38 92% 50%', // Amendment (amber)
    '--governance-constitutional': '292 65% 47%', // Constitutional (deep purple)
  },
} as const;
