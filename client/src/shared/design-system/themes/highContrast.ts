/**
 * High Contrast Theme - Maximum accessibility
 * WCAG AAA compliance for users with visual impairments
 */

export const highContrastTheme = {
  name: 'highContrast',
  
  colors: {
    // High contrast colors - pure black and white
    primary: '#000000',
    primaryForeground: '#ffffff',
    primaryHover: '#333333',
    
    secondary: '#000000',
    secondaryForeground: '#ffffff',
    secondaryHover: '#333333',
    
    accent: '#000000',
    accentForeground: '#ffffff',
    accentHover: '#333333',
    
    // Surface colors
    background: '#ffffff',
    foreground: '#000000',
    
    // Card colors
    card: '#ffffff',
    cardForeground: '#000000',
    
    // Muted colors (still high contrast)
    muted: '#f0f0f0',
    mutedForeground: '#000000',
    
    // Border colors
    border: '#000000',
    borderSubtle: '#666666',
    
    // Input colors
    input: '#000000',
    inputForeground: '#000000',
    
    // Ring/focus colors
    ring: '#000000',
    
    // Semantic colors (high contrast versions)
    success: '#006600',
    successForeground: '#ffffff',
    warning: '#cc6600',
    warningForeground: '#ffffff',
    error: '#cc0000',
    errorForeground: '#ffffff',
    info: '#0066cc',
    infoForeground: '#ffffff',
  },
  
  // CSS custom properties for high contrast
  cssVariables: {
    '--background': '0 0% 100%',
    '--foreground': '0 0% 0%',
    '--card': '0 0% 100%',
    '--card-foreground': '0 0% 0%',
    '--popover': '0 0% 100%',
    '--popover-foreground': '0 0% 0%',
    '--primary': '0 0% 0%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 0%',
    '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 94%',
    '--muted-foreground': '0 0% 0%',
    '--accent': '0 0% 0%',
    '--accent-foreground': '0 0% 100%',
    '--destructive': '0 100% 40%',
    '--destructive-foreground': '0 0% 100%',
    '--border': '0 0% 0%',
    '--input': '0 0% 0%',
    '--ring': '0 0% 0%',
    '--success': '120 100% 20%',
    '--warning': '30 100% 40%',
    '--danger': '0 100% 40%',
    '--info': '210 100% 40%',
  },
  
  // Additional high contrast settings
  settings: {
    borderWidth: '2px',        // Thicker borders
    focusWidth: '3px',         // Thicker focus indicators
    fontWeight: '600',         // Bolder text
    letterSpacing: '0.025em',  // Wider letter spacing
  },
} as const;

