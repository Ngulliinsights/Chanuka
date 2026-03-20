/**
 * Border Design Tokens
 * Consistent border styles and radius values
 */

export const borderTokens = {
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.125rem', // 2px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    full: '9999px',
  },

  // Border styles
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    none: 'none',
  },
} as const;
