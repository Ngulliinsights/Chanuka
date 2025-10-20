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
  
  // CSS custom properties for dark theme
  cssVariables: {
    '--background': '240 10% 3.9%',
    '--foreground': '0 0% 98%',
    '--card': '240 9% 6%',
    '--card-foreground': '0 0% 98%',
    '--popover': '240 9% 6%',
    '--popover-foreground': '0 0% 98%',
    '--primary': '213 94% 68%',
    '--primary-foreground': '0 0% 9%',
    '--secondary': '196 100% 68%',
    '--secondary-foreground': '0 0% 9%',
    '--muted': '240 8% 9%',
    '--muted-foreground': '240 5% 65%',
    '--accent': '28 94% 54%',
    '--accent-foreground': '0 0% 9%',
    '--destructive': '0 84% 70%',
    '--destructive-foreground': '0 0% 9%',
    '--border': '240 6% 18%',
    '--input': '240 6% 18%',
    '--ring': '28 94% 54%',
    '--success': '142 76% 60%',
    '--warning': '43 96% 66%',
    '--danger': '0 84% 70%',
    '--info': '213 94% 78%',
  },
} as const;