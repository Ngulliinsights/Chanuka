/**
 * Typography System - Chanuka Brand Typography
 * Based on brand roadmap emphasis on accessibility and readability
 * Supports multiple languages (English, Swahili) and literacy levels
 */

export const typographyTokens = {
  // Font Families - System fonts for performance and accessibility
  fontFamily: {
    sans: [
      '"Segoe UI"',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ],
    mono: [
      '"SF Mono"',
      'Monaco',
      '"Cascadia Code"',
      '"Roboto Mono"',
      'Consolas',
      '"Courier New"',
      'monospace',
    ],
    display: [
      '"Segoe UI"',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ],
  },

  // Font Sizes - T-shirt sizing with rem units for accessibility
  fontSize: {
    xs: {
      size: '0.75rem',    // 12px
      lineHeight: '1rem', // 16px
      letterSpacing: '0.05em',
    },
    sm: {
      size: '0.875rem',   // 14px
      lineHeight: '1.25rem', // 20px
      letterSpacing: '0.025em',
    },
    base: {
      size: '1rem',       // 16px
      lineHeight: '1.5rem', // 24px
      letterSpacing: '0',
    },
    lg: {
      size: '1.125rem',   // 18px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.025em',
    },
    xl: {
      size: '1.25rem',    // 20px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.025em',
    },
    '2xl': {
      size: '1.5rem',     // 24px
      lineHeight: '2rem', // 32px
      letterSpacing: '-0.025em',
    },
    '3xl': {
      size: '1.875rem',   // 30px
      lineHeight: '2.25rem', // 36px
      letterSpacing: '-0.025em',
    },
    '4xl': {
      size: '2.25rem',    // 36px
      lineHeight: '2.5rem', // 40px
      letterSpacing: '-0.025em',
    },
    '5xl': {
      size: '3rem',       // 48px
      lineHeight: '1',
      letterSpacing: '-0.025em',
    },
    '6xl': {
      size: '3.75rem',    // 60px
      lineHeight: '1',
      letterSpacing: '-0.025em',
    },
  },

  // Font Weights - Semantic naming for better maintainability
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights - Optimized for readability
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing - Subtle adjustments for better readability
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Typography Scale - Predefined combinations for consistency
export const typographyScale = {
  // Display text - Large headings and hero text
  display: {
    large: {
      fontSize: typographyTokens.fontSize['6xl'].size,
      lineHeight: typographyTokens.fontSize['6xl'].lineHeight,
      fontWeight: typographyTokens.fontWeight.bold,
      letterSpacing: typographyTokens.fontSize['6xl'].letterSpacing,
      fontFamily: typographyTokens.fontFamily.display.join(', '),
    },
    medium: {
      fontSize: typographyTokens.fontSize['5xl'].size,
      lineHeight: typographyTokens.fontSize['5xl'].lineHeight,
      fontWeight: typographyTokens.fontWeight.bold,
      letterSpacing: typographyTokens.fontSize['5xl'].letterSpacing,
      fontFamily: typographyTokens.fontFamily.display.join(', '),
    },
    small: {
      fontSize: typographyTokens.fontSize['4xl'].size,
      lineHeight: typographyTokens.fontSize['4xl'].lineHeight,
      fontWeight: typographyTokens.fontWeight.semibold,
      letterSpacing: typographyTokens.fontSize['4xl'].letterSpacing,
      fontFamily: typographyTokens.fontFamily.display.join(', '),
    },
  },

  // Headings - Hierarchical text structure
  heading: {
    h1: {
      fontSize: typographyTokens.fontSize['3xl'].size,
      lineHeight: typographyTokens.fontSize['3xl'].lineHeight,
      fontWeight: typographyTokens.fontWeight.bold,
      letterSpacing: typographyTokens.fontSize['3xl'].letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    h2: {
      fontSize: typographyTokens.fontSize['2xl'].size,
      lineHeight: typographyTokens.fontSize['2xl'].lineHeight,
      fontWeight: typographyTokens.fontWeight.semibold,
      letterSpacing: typographyTokens.fontSize['2xl'].letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    h3: {
      fontSize: typographyTokens.fontSize.xl.size,
      lineHeight: typographyTokens.fontSize.xl.lineHeight,
      fontWeight: typographyTokens.fontWeight.semibold,
      letterSpacing: typographyTokens.fontSize.xl.letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    h4: {
      fontSize: typographyTokens.fontSize.lg.size,
      lineHeight: typographyTokens.fontSize.lg.lineHeight,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.fontSize.lg.letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    h5: {
      fontSize: typographyTokens.fontSize.base.size,
      lineHeight: typographyTokens.fontSize.base.lineHeight,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.fontSize.base.letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    h6: {
      fontSize: typographyTokens.fontSize.sm.size,
      lineHeight: typographyTokens.fontSize.sm.lineHeight,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.fontSize.sm.letterSpacing,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
  },

  // Body text - Main content text
  body: {
    large: {
      fontSize: typographyTokens.fontSize.lg.size,
      lineHeight: typographyTokens.lineHeight.relaxed,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    medium: {
      fontSize: typographyTokens.fontSize.base.size,
      lineHeight: typographyTokens.lineHeight.normal,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    small: {
      fontSize: typographyTokens.fontSize.sm.size,
      lineHeight: typographyTokens.lineHeight.normal,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
  },

  // Labels and UI text
  label: {
    large: {
      fontSize: typographyTokens.fontSize.base.size,
      lineHeight: typographyTokens.lineHeight.snug,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    medium: {
      fontSize: typographyTokens.fontSize.sm.size,
      lineHeight: typographyTokens.lineHeight.snug,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.letterSpacing.wide,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
    small: {
      fontSize: typographyTokens.fontSize.xs.size,
      lineHeight: typographyTokens.lineHeight.snug,
      fontWeight: typographyTokens.fontWeight.medium,
      letterSpacing: typographyTokens.letterSpacing.wider,
      fontFamily: typographyTokens.fontFamily.sans.join(', '),
    },
  },

  // Code and monospace text
  code: {
    large: {
      fontSize: typographyTokens.fontSize.base.size,
      lineHeight: typographyTokens.lineHeight.normal,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.mono.join(', '),
    },
    medium: {
      fontSize: typographyTokens.fontSize.sm.size,
      lineHeight: typographyTokens.lineHeight.normal,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.mono.join(', '),
    },
    small: {
      fontSize: typographyTokens.fontSize.xs.size,
      lineHeight: typographyTokens.lineHeight.normal,
      fontWeight: typographyTokens.fontWeight.normal,
      letterSpacing: typographyTokens.letterSpacing.normal,
      fontFamily: typographyTokens.fontFamily.mono.join(', '),
    },
  },
} as const;

// Responsive typography - Mobile-first approach
export const responsiveTypography = {
  // Mobile typography adjustments
  mobile: {
    display: {
      large: { fontSize: '2.5rem', lineHeight: '1.1' },
      medium: { fontSize: '2rem', lineHeight: '1.1' },
      small: { fontSize: '1.75rem', lineHeight: '1.2' },
    },
    heading: {
      h1: { fontSize: '1.875rem', lineHeight: '1.2' },
      h2: { fontSize: '1.5rem', lineHeight: '1.3' },
      h3: { fontSize: '1.25rem', lineHeight: '1.3' },
    },
    body: {
      large: { fontSize: '1.125rem', lineHeight: '1.6' },
      medium: { fontSize: '1rem', lineHeight: '1.6' },
      small: { fontSize: '0.875rem', lineHeight: '1.5' },
    },
  },

  // Tablet typography adjustments
  tablet: {
    display: {
      large: { fontSize: '3.5rem', lineHeight: '1.1' },
      medium: { fontSize: '2.75rem', lineHeight: '1.1' },
      small: { fontSize: '2.25rem', lineHeight: '1.2' },
    },
    heading: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2' },
      h2: { fontSize: '1.875rem', lineHeight: '1.3' },
      h3: { fontSize: '1.5rem', lineHeight: '1.3' },
    },
  },
} as const;

// Accessibility typography settings
export const accessibilityTypography = {
  // Font size scaling for accessibility preferences
  fontSizeScale: {
    small: 0.875,   // 87.5% of base size
    normal: 1,      // 100% of base size
    large: 1.125,   // 112.5% of base size
    extraLarge: 1.25, // 125% of base size
  },

  // High contrast typography adjustments
  highContrast: {
    fontWeight: {
      normal: '500',    // Slightly bolder for better visibility
      medium: '600',
      semibold: '700',
      bold: '800',
    },
    letterSpacing: {
      normal: '0.025em', // Slightly wider for better readability
      wide: '0.05em',
      wider: '0.075em',
    },
  },

  // Minimum font sizes for accessibility compliance
  minimumSizes: {
    body: '14px',     // Minimum readable size
    label: '12px',    // Minimum for UI labels
    caption: '11px',  // Minimum for captions
  },
} as const;

// Typography utility functions
export const typographyUtils = {
  /**
   * Get responsive font size based on screen size
   */
  getResponsiveFontSize: (
    baseSize: string,
    breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  ): string => {
    // Implementation would adjust font size based on breakpoint
    return baseSize;
  },

  /**
   * Apply accessibility font scaling
   */
  applyFontScaling: (baseSize: string, scale: keyof typeof accessibilityTypography.fontSizeScale): string => {
    const scaleValue = accessibilityTypography.fontSizeScale[scale];
    const numericSize = parseFloat(baseSize);
    const unit = baseSize.replace(numericSize.toString(), '');
    return `${numericSize * scaleValue}${unit}`;
  },

  /**
   * Get optimal line height for given font size
   */
  getOptimalLineHeight: (fontSize: string): string => {
    const numericSize = parseFloat(fontSize);
    // Golden ratio for line height: 1.618
    const lineHeight = numericSize * 1.618;
    const unit = fontSize.replace(numericSize.toString(), '');
    return `${lineHeight}${unit}`;
  },

  /**
   * Check if text meets readability requirements
   */
  meetsReadabilityRequirements: (
    fontSize: string,
    lineHeight: string,
    contrast: number
  ): boolean => {
    const minFontSize = parseFloat(accessibilityTypography.minimumSizes.body);
    const currentFontSize = parseFloat(fontSize);
    const minContrast = 4.5; // WCAG AA requirement

    return currentFontSize >= minFontSize && contrast >= minContrast;
  },
} as const;

export type TypographyToken = typeof typographyTokens;
export type TypographyScale = typeof typographyScale;
export type ResponsiveTypography = typeof responsiveTypography;

