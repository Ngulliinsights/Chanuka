/**
 * Typography Accessibility - Readable and scalable text
 * Supports multiple literacy levels and languages
 */

export const typographyAccessibility = {
  // Minimum font sizes for accessibility
  minimumSizes: {
    body: '16px',       // Base readable size
    small: '14px',      // Minimum for secondary text
    caption: '12px',    // Minimum for captions/labels
  },

  // Font scaling for accessibility preferences
  scaling: {
    small: 0.875,       // 87.5% - for users who prefer smaller text
    normal: 1.0,        // 100% - default size
    large: 1.125,       // 112.5% - for better readability
    extraLarge: 1.25,   // 125% - for accessibility needs
    huge: 1.5,          // 150% - for vision impairments
  },

  // Line height adjustments for readability
  lineHeight: {
    tight: 1.25,        // For headings
    normal: 1.5,        // For body text (WCAG recommended)
    loose: 1.75,        // For improved readability
    extraLoose: 2.0,    // For accessibility needs
  },

  // Letter spacing for readability
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',    // Helps with dyslexia
    wider: '0.05em',    // For accessibility
    widest: '0.1em',    // Maximum for readability
  },
} as const;

// Typography utility functions
export const typographyUtils = {
  /**
   * Apply font scaling based on user preference
   */
  applyFontScaling: (
    baseSize: string,
    scale: keyof typeof typographyAccessibility.scaling = 'normal'
  ): string => {
    const scaleValue = typographyAccessibility.scaling[scale];
    const numericSize = parseFloat(baseSize);
    const unit = baseSize.replace(numericSize.toString(), '');
    return `${numericSize * scaleValue}${unit}`;
  },

  /**
   * Get optimal line height for font size
   */
  getOptimalLineHeight: (fontSize: string): string => {
    const numericSize = parseFloat(fontSize);
    
    // Smaller text needs more line height
    if (numericSize <= 14) return typographyAccessibility.lineHeight.loose.toString();
    if (numericSize <= 16) return typographyAccessibility.lineHeight.normal.toString();
    if (numericSize <= 24) return typographyAccessibility.lineHeight.normal.toString();
    
    // Larger text can have tighter line height
    return typographyAccessibility.lineHeight.tight.toString();
  },

  /**
   * Check if typography meets accessibility requirements
   */
  meetsAccessibilityRequirements: (
    fontSize: string,
    lineHeight: string,
    contrast: number
  ): boolean => {
    const minSize = parseFloat(typographyAccessibility.minimumSizes.body);
    const currentSize = parseFloat(fontSize);
    const currentLineHeight = parseFloat(lineHeight);
    const minLineHeight = 1.5; // WCAG requirement
    const minContrast = 4.5; // WCAG AA requirement

    return (
      currentSize >= minSize &&
      currentLineHeight >= minLineHeight &&
      contrast >= minContrast
    );
  },

  /**
   * Get accessible font size for context
   */
  getAccessibleFontSize: (
    context: 'body' | 'small' | 'caption',
    userPreference: keyof typeof typographyAccessibility.scaling = 'normal'
  ): string => {
    const baseSize = typographyAccessibility.minimumSizes[context];
    return typographyUtils.applyFontScaling(baseSize, userPreference);
  },
} as const;