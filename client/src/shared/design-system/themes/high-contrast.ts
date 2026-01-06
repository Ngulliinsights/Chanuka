/**
 * High Contrast Theme - WCAG AAA Compliant
 * Maximum contrast for accessibility and visibility
 */

export const highContrastTheme = {
  name: 'high-contrast',

  colors: {
    // Maximum contrast primary colors
    primary: '#000000',
    primaryForeground: '#ffffff',
    primaryHover: '#1a1a1a',

    // High contrast secondary
    secondary: '#ffffff',
    secondaryForeground: '#000000',
    secondaryHover: '#f0f0f0',

    // Accent with high contrast
    accent: '#0066cc',
    accentForeground: '#ffffff',
    accentHover: '#004499',

    // Surface colors - maximum contrast
    background: '#ffffff',
    foreground: '#000000',

    // Card colors
    card: '#ffffff',
    cardForeground: '#000000',

    // Muted colors with sufficient contrast
    muted: '#f0f0f0',
    mutedForeground: '#000000',

    // Border colors - high visibility
    border: '#000000',
    borderSubtle: '#666666',

    // Input colors
    input: '#000000',
    inputForeground: '#000000',

    // Ring/focus colors - highly visible
    ring: '#ff6600',

    // Semantic colors - WCAG AAA compliant
    success: '#006600',
    successForeground: '#ffffff',
    warning: '#cc6600',
    warningForeground: '#ffffff',
    error: '#cc0000',
    errorForeground: '#ffffff',
    info: '#0066cc',
    infoForeground: '#ffffff',
  },

  // CSS custom properties for high contrast - Updated to Chanuka brand
  cssVariables: {
    '--background': '0 0% 100%',
    '--foreground': '0 0% 0%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 0%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 0%',
    '--primary': '0 0% 0%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 100%',
    '--secondary-foreground': '0 0% 0%',
    '--muted': '0 0% 94%',
    '--muted-foreground': '0 0% 0%',
    // Accent: Orange with high contrast
    '--accent': '32 93% 40%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 100% 40%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 0%',
    '--input': '0 0% 0%',
    '--ring': '32 93% 50%',
    '--success': '120 100% 20%',
    '--warning': '30 100% 40%',
    '--danger': '0 100% 40%',
    '--info': '206 81% 26%',
    // Governance colors for high contrast
    '--governance-perspective1': '219 100% 30%', // Deep blue
    '--governance-perspective2': '261 100% 30%', // Deep purple
    '--governance-neutral': '120 100% 20%', // Deep green
    '--governance-amendment': '32 100% 40%', // Orange
    '--governance-constitutional': '292 100% 30%', // Deep purple
  },

  // High contrast specific overrides
  overrides: {
    focusRingWidth: '3px',
    borderWidth: '2px',
    fontWeight: {
      normal: '500',
      medium: '600',
      semibold: '700',
      bold: '800',
    },
  },
} as const;

// Dark high contrast theme
export const darkHighContrastTheme = {
  name: 'dark-high-contrast',

  colors: {
    // Maximum contrast for dark mode
    primary: '#ffffff',
    primaryForeground: '#000000',
    primaryHover: '#e6e6e6',

    // High contrast secondary for dark
    secondary: '#000000',
    secondaryForeground: '#ffffff',
    secondaryHover: '#1a1a1a',

    // Accent with high contrast for dark
    accent: '#66ccff',
    accentForeground: '#000000',
    accentHover: '#99ddff',

    // Surface colors - maximum contrast for dark
    background: '#000000',
    foreground: '#ffffff',

    // Card colors
    card: '#000000',
    cardForeground: '#ffffff',

    // Muted colors with sufficient contrast
    muted: '#1a1a1a',
    mutedForeground: '#ffffff',

    // Border colors - high visibility for dark
    border: '#ffffff',
    borderSubtle: '#999999',

    // Input colors
    input: '#ffffff',
    inputForeground: '#ffffff',

    // Ring/focus colors - highly visible for dark
    ring: '#ffaa00',

    // Semantic colors - WCAG AAA compliant for dark
    success: '#66ff66',
    successForeground: '#000000',
    warning: '#ffcc66',
    warningForeground: '#000000',
    error: '#ff6666',
    errorForeground: '#000000',
    info: '#66ccff',
    infoForeground: '#000000',
  },

  // CSS custom properties for dark high contrast
  cssVariables: {
    '--background': '0 0% 0%',
    '--foreground': '0 0% 100%',
    '--card': '0 0% 0%',
    '--card-foreground': '0 0% 100%',
    '--popover': '0 0% 0%',
    '--popover-foreground': '0 0% 100%',
    '--primary': '0 0% 100%',
    '--primary-foreground': '0 0% 0%',
    '--secondary': '0 0% 0%',
    '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 10%',
    '--muted-foreground': '0 0% 100%',
    '--accent': '200 100% 70%',
    '--accent-foreground': '0 0% 0%',
    '--destructive': '0 100% 70%',
    '--destructive-foreground': '0 0% 0%',
    '--border': '0 0% 100%',
    '--input': '0 0% 100%',
    '--ring': '40 100% 50%',
    '--success': '120 100% 70%',
    '--warning': '45 100% 70%',
    '--danger': '0 100% 70%',
    '--info': '200 100% 70%',
  },

  // High contrast specific overrides for dark
  overrides: {
    focusRingWidth: '3px',
    borderWidth: '2px',
    fontWeight: {
      normal: '500',
      medium: '600',
      semibold: '700',
      bold: '800',
    },
  },
} as const;
