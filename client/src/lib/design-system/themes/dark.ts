/**
 * Dark Theme - Chanuka dark mode
 * Maintains brand identity with improved contrast
 */

import { colorTokens } from '../tokens/colors';

export const darkTheme = {
  name: 'dark',

  colors: {
    // Primary brand colors (adjusted for dark mode)
    primary: colorTokens.primary[400],
    primaryForeground: colorTokens.neutral[900],
    primaryHover: colorTokens.primary[300],

    // Secondary colors
    secondary: colorTokens.secondary[400],
    secondaryForeground: colorTokens.neutral[900],
    secondaryHover: colorTokens.secondary[300],

    // Accent colors
    accent: colorTokens.accent[500],
    accentForeground: colorTokens.neutral[900],
    accentHover: colorTokens.accent[400],

    // Surface colors
    background: colorTokens.surface.background.dark,
    foreground: colorTokens.neutral[50],

    // Card colors
    card: colorTokens.surface.card.dark,
    cardForeground: colorTokens.neutral[50],

    // Muted colors
    muted: colorTokens.neutral[800],
    mutedForeground: colorTokens.neutral[400],

    // Border colors
    border: colorTokens.neutral[700],
    borderSubtle: colorTokens.neutral[800],

    // Input colors
    input: colorTokens.neutral[700],
    inputForeground: colorTokens.neutral[50],

    // Ring/focus colors
    ring: colorTokens.accent[500],

    // Semantic colors (adjusted for dark mode)
    success: colorTokens.semantic.success[400],
    successForeground: colorTokens.neutral[900],
    warning: colorTokens.semantic.warning[400],
    warningForeground: colorTokens.neutral[900],
    error: colorTokens.semantic.error[400],
    errorForeground: colorTokens.neutral[900],
    info: colorTokens.semantic.info[400],
    infoForeground: colorTokens.neutral[900],
  },

  // CSS custom properties for dark theme - Updated to Chanuka brand palette
  cssVariables: {
    '--background': '240 10% 3.9%',
    '--foreground': '0 0% 98%',
    '--card': '240 9% 6%',
    '--card-foreground': '0 0% 98%',
    '--popover': '240 9% 6%',
    '--popover-foreground': '0 0% 98%',
    // Primary: Deep Blue adjusted for dark mode
    '--primary': '206 81% 60%',
    '--primary-foreground': '0 0% 9%',
    // Secondary: Teal adjusted for dark mode
    '--secondary': '198 77% 55%',
    '--secondary-foreground': '0 0% 9%',
    // Muted: Neutral grays
    '--muted': '240 8% 9%',
    '--muted-foreground': '240 5% 65%',
    // Accent: Orange (maintains consistency)
    '--accent': '32 93% 50%',
    '--accent-foreground': '0 0% 9%',
    // Destructive/error
    '--destructive': '0 84% 70%',
    '--destructive-foreground': '0 0% 9%',
    '--border': '240 6% 18%',
    '--input': '240 6% 18%',
    '--ring': '32 93% 50%',
    // Semantic colors (adjusted for dark mode)
    '--success': '142 76% 60%',
    '--warning': '43 96% 66%',
    '--danger': '0 84% 70%',
    '--info': '206 81% 60%',
    // Governance colors for political neutrality (dark mode)
    '--governance-perspective1': '219 79% 65%', // Perspective A (bright blue)
    '--governance-perspective2': '261 80% 65%', // Perspective B (bright purple)
    '--governance-neutral': '142 76% 60%', // Neutral/informational (bright green)
    '--governance-amendment': '38 92% 65%', // Amendment (bright amber)
    '--governance-constitutional': '292 65% 65%', // Constitutional (bright purple)
  },
} as const;
