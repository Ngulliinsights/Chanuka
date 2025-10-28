/**
 * Spacing Design Tokens
 * Consistent spacing system for layouts and components
 */

export const spacingTokens = {
  // Base spacing scale
  base: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem',  // 8px
    3: '0.75rem', // 12px
    4: '1rem',    // 16px
    5: '1.25rem', // 20px
    6: '1.5rem',  // 24px
    8: '2rem',    // 32px
    10: '2.5rem', // 40px
    12: '3rem',   // 48px
    16: '4rem',   // 64px
    20: '5rem',   // 80px
    24: '6rem',   // 96px
  },

  // Semantic spacing
  semantic: {
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '3rem', // 48px
  },

  // Component-specific spacing
  component: {
    button: {
      paddingX: {
        sm: '0.75rem', // 12px
        md: '1rem',    // 16px
        lg: '1.5rem',  // 24px
      },
      paddingY: {
        sm: '0.5rem',  // 8px
        md: '0.75rem', // 12px
        lg: '1rem',    // 16px
      },
    },
    input: {
      paddingX: {
        sm: '0.75rem', // 12px
        md: '1rem',    // 16px
        lg: '1.25rem', // 20px
      },
      paddingY: {
        sm: '0.5rem',  // 8px
        md: '0.75rem', // 12px
        lg: '1rem',    // 16px
      },
    },
  },

  // Touch target spacing
  touch: {
    minTarget: '44px',
    recommendedTarget: '48px',
    minSpacing: '8px',
  },
} as const;