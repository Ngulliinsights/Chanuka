/**
 * Typography Component Design Standards
 * Consistent typography styling and hierarchy patterns
 */

import { colorTokens } from '../tokens/colors';
import { spacingTokens } from '../tokens/spacing';

export const typographyDesignStandards = {
  // Font families
  fontFamilies: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },

  // Heading styles
  headings: {
    h1: {
      fontSize: '2.25rem', // 36px
      fontWeight: '800',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.lg,
    },
    h2: {
      fontSize: '1.875rem', // 30px
      fontWeight: '700',
      lineHeight: '1.3',
      letterSpacing: '-0.025em',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.md,
    },
    h3: {
      fontSize: '1.5rem', // 24px
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '-0.025em',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.md,
    },
    h4: {
      fontSize: '1.25rem', // 20px
      fontWeight: '600',
      lineHeight: '1.4',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.sm,
    },
    h5: {
      fontSize: '1.125rem', // 18px
      fontWeight: '600',
      lineHeight: '1.4',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.sm,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: '600',
      lineHeight: '1.4',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.sm,
    },
  },

  // Body text styles
  body: {
    large: {
      fontSize: '1.125rem', // 18px
      fontWeight: '400',
      lineHeight: '1.7',
      color: colorTokens.neutral[700],
      marginBottom: spacingTokens.semantic.md,
    },
    default: {
      fontSize: '1rem', // 16px
      fontWeight: '400',
      lineHeight: '1.6',
      color: colorTokens.neutral[700],
      marginBottom: spacingTokens.semantic.md,
    },
    small: {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      color: colorTokens.neutral[600],
      marginBottom: spacingTokens.semantic.sm,
    },
    xs: {
      fontSize: '0.75rem', // 12px
      fontWeight: '400',
      lineHeight: '1.4',
      color: colorTokens.neutral[500],
      marginBottom: spacingTokens.semantic.xs,
    },
  },

  // Specialized text styles
  specialized: {
    lead: {
      fontSize: '1.25rem', // 20px
      fontWeight: '400',
      lineHeight: '1.6',
      color: colorTokens.neutral[600],
      marginBottom: spacingTokens.semantic.lg,
    },
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: '500',
      lineHeight: '1.4',
      color: colorTokens.neutral[500],
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    code: {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.4',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      color: colorTokens.accent[700],
      backgroundColor: colorTokens.neutral[100],
      padding: '0.125rem 0.25rem',
      borderRadius: '0.25rem',
    },
    blockquote: {
      fontSize: '1.125rem', // 18px
      fontWeight: '400',
      lineHeight: '1.6',
      fontStyle: 'italic',
      color: colorTokens.neutral[600],
      borderLeft: `4px solid ${colorTokens.accent[500]}`,
      paddingLeft: spacingTokens.semantic.lg,
      marginLeft: spacingTokens.semantic.md,
      marginBottom: spacingTokens.semantic.lg,
    },
  },

  // Link styles
  links: {
    default: {
      color: colorTokens.accent[600],
      textDecoration: 'underline',
      textDecorationColor: 'transparent',
      textUnderlineOffset: '0.125em',
      transition: 'all 150ms ease-out',
      '&:hover': {
        color: colorTokens.accent[700],
        textDecorationColor: 'currentColor',
      },
      '&:focus': {
        outline: 'none',
        color: colorTokens.accent[700],
        textDecorationColor: 'currentColor',
        textDecorationThickness: '2px',
      },
    },
    subtle: {
      color: colorTokens.neutral[600],
      textDecoration: 'none',
      transition: 'color 150ms ease-out',
      '&:hover': {
        color: colorTokens.accent[600],
        textDecoration: 'underline',
      },
      '&:focus': {
        outline: 'none',
        color: colorTokens.accent[600],
        textDecoration: 'underline',
      },
    },
  },

  // List styles
  lists: {
    unordered: {
      paddingLeft: spacingTokens.semantic.lg,
      marginBottom: spacingTokens.semantic.md,
      '& li': {
        marginBottom: spacingTokens.semantic.xs,
        lineHeight: '1.6',
      },
    },
    ordered: {
      paddingLeft: spacingTokens.semantic.lg,
      marginBottom: spacingTokens.semantic.md,
      '& li': {
        marginBottom: spacingTokens.semantic.xs,
        lineHeight: '1.6',
      },
    },
  },
} as const;

// Typography utility functions
export const typographyUtils = {
  /**
   * Get typography classes
   */
  getTypographyClasses: (
    type: 'heading' | 'body' | 'specialized' | 'link',
    variant: string
  ): string => {
    return `chanuka-typography chanuka-${type}-${variant}`;
  },

  /**
   * Get heading styles
   */
  getHeadingStyles: (level: keyof typeof typographyDesignStandards.headings) => {
    return typographyDesignStandards.headings[level];
  },

  /**
   * Get body text styles
   */
  getBodyStyles: (size: keyof typeof typographyDesignStandards.body) => {
    return typographyDesignStandards.body[size];
  },

  /**
   * Generate CSS for typography
   */
  generateCSS: (): string => {
    return `
      .chanuka-typography {
        font-family: ${typographyDesignStandards.fontFamilies.sans};
      }

      .chanuka-heading-h1 {
        font-size: ${typographyDesignStandards.headings.h1.fontSize};
        font-weight: ${typographyDesignStandards.headings.h1.fontWeight};
        line-height: ${typographyDesignStandards.headings.h1.lineHeight};
        letter-spacing: ${typographyDesignStandards.headings.h1.letterSpacing};
        color: ${typographyDesignStandards.headings.h1.color};
        margin-bottom: ${typographyDesignStandards.headings.h1.marginBottom};
      }

      .chanuka-heading-h2 {
        font-size: ${typographyDesignStandards.headings.h2.fontSize};
        font-weight: ${typographyDesignStandards.headings.h2.fontWeight};
        line-height: ${typographyDesignStandards.headings.h2.lineHeight};
        letter-spacing: ${typographyDesignStandards.headings.h2.letterSpacing};
        color: ${typographyDesignStandards.headings.h2.color};
        margin-bottom: ${typographyDesignStandards.headings.h2.marginBottom};
      }

      .chanuka-heading-h3 {
        font-size: ${typographyDesignStandards.headings.h3.fontSize};
        font-weight: ${typographyDesignStandards.headings.h3.fontWeight};
        line-height: ${typographyDesignStandards.headings.h3.lineHeight};
        letter-spacing: ${typographyDesignStandards.headings.h3.letterSpacing};
        color: ${typographyDesignStandards.headings.h3.color};
        margin-bottom: ${typographyDesignStandards.headings.h3.marginBottom};
      }

      .chanuka-body-default {
        font-size: ${typographyDesignStandards.body.default.fontSize};
        font-weight: ${typographyDesignStandards.body.default.fontWeight};
        line-height: ${typographyDesignStandards.body.default.lineHeight};
        color: ${typographyDesignStandards.body.default.color};
        margin-bottom: ${typographyDesignStandards.body.default.marginBottom};
      }

      .chanuka-body-large {
        font-size: ${typographyDesignStandards.body.large.fontSize};
        font-weight: ${typographyDesignStandards.body.large.fontWeight};
        line-height: ${typographyDesignStandards.body.large.lineHeight};
        color: ${typographyDesignStandards.body.large.color};
        margin-bottom: ${typographyDesignStandards.body.large.marginBottom};
      }

      .chanuka-body-small {
        font-size: ${typographyDesignStandards.body.small.fontSize};
        font-weight: ${typographyDesignStandards.body.small.fontWeight};
        line-height: ${typographyDesignStandards.body.small.lineHeight};
        color: ${typographyDesignStandards.body.small.color};
        margin-bottom: ${typographyDesignStandards.body.small.marginBottom};
      }

      .chanuka-link-default {
        color: ${typographyDesignStandards.links.default.color};
        text-decoration: ${typographyDesignStandards.links.default.textDecoration};
        text-decoration-color: ${typographyDesignStandards.links.default.textDecorationColor};
        text-underline-offset: ${typographyDesignStandards.links.default.textUnderlineOffset};
        transition: ${typographyDesignStandards.links.default.transition};
      }

      .chanuka-link-default:hover {
        color: ${colorTokens.accent[700]};
        text-decoration-color: currentColor;
      }

      .chanuka-link-default:focus {
        outline: none;
        color: ${colorTokens.accent[700]};
        text-decoration-color: currentColor;
        text-decoration-thickness: 2px;
      }

      .chanuka-specialized-code {
        font-size: ${typographyDesignStandards.specialized.code.fontSize};
        font-weight: ${typographyDesignStandards.specialized.code.fontWeight};
        line-height: ${typographyDesignStandards.specialized.code.lineHeight};
        font-family: ${typographyDesignStandards.specialized.code.fontFamily};
        color: ${typographyDesignStandards.specialized.code.color};
        background-color: ${typographyDesignStandards.specialized.code.backgroundColor};
        padding: ${typographyDesignStandards.specialized.code.padding};
        border-radius: ${typographyDesignStandards.specialized.code.borderRadius};
      }
    `;
  },
} as const;

