/**
 * Error States Design Standards
 * Clear error states with helpful messaging and recovery actions
 */

import { animationTokens } from '../tokens/animations';
import { borderTokens } from '../tokens/borders';
import { colorTokens } from '../tokens/colors';
import { shadowTokens } from '../tokens/shadows';
import { spacingTokens } from '../tokens/spacing';

export const errorStates = {
  // Base error styles
  base: {
    borderRadius: borderTokens.radius.md,
    padding: spacingTokens.semantic.md,
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacingTokens.semantic.sm,
    animation: `fadeIn ${animationTokens.duration.normal} ${animationTokens.easing.easeOut}`,
  },

  // Error severity levels
  severity: {
    info: {
      backgroundColor: colorTokens.colorCombinations.status.info.background,
      borderColor: colorTokens.colorCombinations.status.info.border,
      color: colorTokens.colorCombinations.status.info.text,
      iconColor: colorTokens.semantic.info[500],
    },
    warning: {
      backgroundColor: colorTokens.colorCombinations.status.warning.background,
      borderColor: colorTokens.colorCombinations.status.warning.border,
      color: colorTokens.colorCombinations.status.warning.text,
      iconColor: colorTokens.semantic.warning[500],
    },
    error: {
      backgroundColor: colorTokens.colorCombinations.status.error.background,
      borderColor: colorTokens.colorCombinations.status.error.border,
      color: colorTokens.colorCombinations.status.error.text,
      iconColor: colorTokens.semantic.error[500],
    },
    critical: {
      backgroundColor: colorTokens.semantic.error[500],
      borderColor: colorTokens.semantic.error[600],
      color: '#ffffff',
      iconColor: '#ffffff',
      boxShadow: shadowTokens.component.card.error,
    },
  },

  // Error message configurations
  message: {
    title: {
      fontSize: '1rem',
      fontWeight: '600',
      lineHeight: '1.25',
      marginBottom: spacingTokens.semantic.xs,
      color: 'inherit',
    },
    description: {
      fontSize: '0.875rem',
      lineHeight: '1.5',
      marginBottom: spacingTokens.semantic.sm,
      color: 'inherit',
      opacity: '0.9',
    },
    details: {
      fontSize: '0.75rem',
      lineHeight: '1.4',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      padding: spacingTokens.semantic.xs,
      borderRadius: borderTokens.radius.sm,
      marginTop: spacingTokens.semantic.xs,
      whiteSpace: 'pre-wrap' as const,
      overflow: 'auto',
      maxHeight: '200px',
    },
  },

  // Recovery action configurations
  actions: {
    container: {
      display: 'flex',
      gap: spacingTokens.semantic.sm,
      marginTop: spacingTokens.semantic.md,
      flexWrap: 'wrap' as const,
    },
    primary: {
      backgroundColor: colorTokens.accent[500],
      color: '#ffffff',
      border: 'none',
      borderRadius: borderTokens.radius.sm,
      padding: `${spacingTokens.semantic.xs} ${spacingTokens.semantic.sm}`,
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: animationTokens.transition.colors,
      '&:hover': {
        backgroundColor: colorTokens.accent[600],
      },
      '&:focus': {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'inherit',
      border: `1px solid currentColor`,
      borderRadius: borderTokens.radius.sm,
      padding: `${spacingTokens.semantic.xs} ${spacingTokens.semantic.sm}`,
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: animationTokens.transition.colors,
      opacity: '0.8',
      '&:hover': {
        opacity: '1',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      },
      '&:focus': {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
  },

  // Component-specific error states
  component: {
    input: {
      borderColor: colorTokens.semantic.error[500],
      backgroundColor: colorTokens.semantic.error[50],
      boxShadow: `0 0 0 3px ${colorTokens.semantic.error[500]}20`,
      '&:focus': {
        borderColor: colorTokens.semantic.error[600],
        boxShadow: shadowTokens.interactive.focus.error,
      },
    },
    card: {
      borderColor: colorTokens.semantic.error[200],
      backgroundColor: colorTokens.semantic.error[50],
      boxShadow: shadowTokens.component.card.error,
    },
    button: {
      backgroundColor: colorTokens.semantic.error[500],
      borderColor: colorTokens.semantic.error[500],
      color: '#ffffff',
      '&:hover': {
        backgroundColor: colorTokens.semantic.error[600],
        borderColor: colorTokens.semantic.error[600],
      },
    },
    form: {
      marginTop: spacingTokens.semantic.xs,
      fontSize: '0.875rem',
      color: colorTokens.semantic.error[600],
      display: 'flex',
      alignItems: 'center',
      gap: spacingTokens.semantic.xs,
    },
  },

  // Error boundary configurations
  boundary: {
    container: {
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacingTokens.semantic.xl,
      textAlign: 'center' as const,
      backgroundColor: colorTokens.surface.background.light,
      borderRadius: borderTokens.radius.lg,
      border: `2px dashed ${colorTokens.border.light}`,
    },
    icon: {
      width: '64px',
      height: '64px',
      color: colorTokens.semantic.error[500],
      marginBottom: spacingTokens.semantic.lg,
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.sm,
    },
    description: {
      fontSize: '1rem',
      color: colorTokens.neutral[600],
      marginBottom: spacingTokens.semantic.lg,
      maxWidth: '500px',
      lineHeight: '1.6',
    },
  },

  // Inline error configurations
  inline: {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: spacingTokens.semantic.xs,
      fontSize: '0.875rem',
      color: colorTokens.semantic.error[600],
      marginTop: spacingTokens.semantic.xs,
    },
    icon: {
      width: '16px',
      height: '16px',
      flexShrink: 0,
    },
    message: {
      lineHeight: '1.4',
    },
  },
} as const;

// Error state utility functions
export const errorStateUtils = {
  /**
   * Get error classes
   */
  getErrorClasses: (
    severity: keyof typeof errorStates.severity = 'error',
    component?: keyof typeof errorStates.component
  ): string => {
    const classes = [`chanuka-error`, `chanuka-error-${severity}`];
    if (component) classes.push(`chanuka-error-${component}`);
    return classes.join(' ');
  },

  /**
   * Create error message structure
   */
  createErrorMessage: (config: {
    title: string;
    description?: string;
    details?: string;
    severity?: keyof typeof errorStates.severity;
    actions?: Array<{
      label: string;
      action: () => void;
      type?: 'primary' | 'secondary';
    }>;
  }) => ({
    className: errorStateUtils.getErrorClasses(config.severity),
    children: {
      icon: {
        className: 'chanuka-error-icon',
        'aria-hidden': 'true',
      },
      content: {
        className: 'chanuka-error-content',
        children: {
          title: {
            className: 'chanuka-error-title',
            text: config.title,
          },
          ...(config.description && {
            description: {
              className: 'chanuka-error-description',
              text: config.description,
            },
          }),
          ...(config.details && {
            details: {
              className: 'chanuka-error-details',
              text: config.details,
            },
          }),
          ...(config.actions && {
            actions: {
              className: 'chanuka-error-actions',
              children: config.actions.map((action, index) => ({
                key: index,
                className: `chanuka-error-action chanuka-error-action-${action.type || 'secondary'}`,
                onClick: action.action,
                text: action.label,
              })),
            },
          }),
        },
      },
    },
  }),

  /**
   * Create inline error
   */
  createInlineError: (message: string) => ({
    className: 'chanuka-error-inline',
    role: 'alert',
    'aria-live': 'polite',
    children: {
      icon: {
        className: 'chanuka-error-inline-icon',
        'aria-hidden': 'true',
      },
      message: {
        className: 'chanuka-error-inline-message',
        text: message,
      },
    },
  }),

  /**
   * Create error boundary fallback
   */
  createErrorBoundary: (config: {
    title?: string;
    description?: string;
    onRetry?: () => void;
    onReport?: () => void;
  }) => ({
    className: 'chanuka-error-boundary',
    children: {
      icon: {
        className: 'chanuka-error-boundary-icon',
        'aria-hidden': 'true',
      },
      title: {
        className: 'chanuka-error-boundary-title',
        text: config.title || 'Something went wrong',
      },
      description: {
        className: 'chanuka-error-boundary-description',
        text: config.description || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      },
      actions: {
        className: 'chanuka-error-actions',
        children: [
          ...(config.onRetry ? [{
            className: 'chanuka-error-action chanuka-error-action-primary',
            onClick: config.onRetry,
            text: 'Try Again',
          }] : []),
          ...(config.onReport ? [{
            className: 'chanuka-error-action chanuka-error-action-secondary',
            onClick: config.onReport,
            text: 'Report Issue',
          }] : []),
        ],
      },
    },
  }),

  /**
   * Generate CSS for error states
   */
  generateCSS: (): string => {
    return `
      .chanuka-error {
        border-radius: ${borderTokens.radius.md};
        padding: ${spacingTokens.semantic.md};
        display: flex;
        align-items: flex-start;
        gap: ${spacingTokens.semantic.sm};
        animation: fadeIn ${animationTokens.duration.normal} ${animationTokens.easing.easeOut};
        border: 1px solid;
      }

      .chanuka-error-info {
        background-color: ${errorStates.severity.info.backgroundColor};
        border-color: ${errorStates.severity.info.borderColor};
        color: ${errorStates.severity.info.color};
      }

      .chanuka-error-warning {
        background-color: ${errorStates.severity.warning.backgroundColor};
        border-color: ${errorStates.severity.warning.borderColor};
        color: ${errorStates.severity.warning.color};
      }

      .chanuka-error-error {
        background-color: ${errorStates.severity.error.backgroundColor};
        border-color: ${errorStates.severity.error.borderColor};
        color: ${errorStates.severity.error.color};
      }

      .chanuka-error-critical {
        background-color: ${errorStates.severity.critical.backgroundColor};
        border-color: ${errorStates.severity.critical.borderColor};
        color: ${errorStates.severity.critical.color};
        box-shadow: ${errorStates.severity.critical.boxShadow};
      }

      .chanuka-error-title {
        font-size: ${errorStates.message.title.fontSize};
        font-weight: ${errorStates.message.title.fontWeight};
        line-height: ${errorStates.message.title.lineHeight};
        margin-bottom: ${errorStates.message.title.marginBottom};
      }

      .chanuka-error-description {
        font-size: ${errorStates.message.description.fontSize};
        line-height: ${errorStates.message.description.lineHeight};
        margin-bottom: ${errorStates.message.description.marginBottom};
        opacity: ${errorStates.message.description.opacity};
      }

      .chanuka-error-details {
        font-size: ${errorStates.message.details.fontSize};
        line-height: ${errorStates.message.details.lineHeight};
        font-family: ${errorStates.message.details.fontFamily};
        background-color: ${errorStates.message.details.backgroundColor};
        padding: ${errorStates.message.details.padding};
        border-radius: ${errorStates.message.details.borderRadius};
        margin-top: ${errorStates.message.details.marginTop};
        white-space: ${errorStates.message.details.whiteSpace};
        overflow: ${errorStates.message.details.overflow};
        max-height: ${errorStates.message.details.maxHeight};
      }

      .chanuka-error-actions {
        display: flex;
        gap: ${spacingTokens.semantic.sm};
        margin-top: ${spacingTokens.semantic.md};
        flex-wrap: wrap;
      }

      .chanuka-error-action-primary {
        background-color: ${errorStates.actions.primary.backgroundColor};
        color: ${errorStates.actions.primary.color};
        border: ${errorStates.actions.primary.border};
        border-radius: ${errorStates.actions.primary.borderRadius};
        padding: ${errorStates.actions.primary.padding};
        font-size: ${errorStates.actions.primary.fontSize};
        font-weight: ${errorStates.actions.primary.fontWeight};
        cursor: ${errorStates.actions.primary.cursor};
        transition: ${errorStates.actions.primary.transition};
      }

      .chanuka-error-action-primary:hover {
        background-color: ${colorTokens.accent[600]};
      }

      .chanuka-error-action-primary:focus {
        outline: none;
        box-shadow: ${shadowTokens.interactive.focus.accent};
      }

      .chanuka-error-action-secondary {
        background-color: ${errorStates.actions.secondary.backgroundColor};
        color: ${errorStates.actions.secondary.color};
        border: ${errorStates.actions.secondary.border};
        border-radius: ${errorStates.actions.secondary.borderRadius};
        padding: ${errorStates.actions.secondary.padding};
        font-size: ${errorStates.actions.secondary.fontSize};
        font-weight: ${errorStates.actions.secondary.fontWeight};
        cursor: ${errorStates.actions.secondary.cursor};
        transition: ${errorStates.actions.secondary.transition};
        opacity: ${errorStates.actions.secondary.opacity};
      }

      .chanuka-error-action-secondary:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.05);
      }

      .chanuka-error-action-secondary:focus {
        outline: none;
        box-shadow: ${shadowTokens.interactive.focus.accent};
      }

      .chanuka-error-inline {
        display: flex;
        align-items: center;
        gap: ${spacingTokens.semantic.xs};
        font-size: ${errorStates.inline.container.fontSize};
        color: ${errorStates.inline.container.color};
        margin-top: ${errorStates.inline.container.marginTop};
      }

      .chanuka-error-inline-icon {
        width: ${errorStates.inline.icon.width};
        height: ${errorStates.inline.icon.height};
        flex-shrink: ${errorStates.inline.icon.flexShrink};
      }

      .chanuka-error-inline-message {
        line-height: ${errorStates.inline.message.lineHeight};
      }

      .chanuka-error-boundary {
        min-height: ${errorStates.boundary.container.minHeight};
        display: ${errorStates.boundary.container.display};
        flex-direction: ${errorStates.boundary.container.flexDirection};
        align-items: ${errorStates.boundary.container.alignItems};
        justify-content: ${errorStates.boundary.container.justifyContent};
        padding: ${errorStates.boundary.container.padding};
        text-align: ${errorStates.boundary.container.textAlign};
        background-color: ${errorStates.boundary.container.backgroundColor};
        border-radius: ${errorStates.boundary.container.borderRadius};
        border: ${errorStates.boundary.container.border};
      }

      .chanuka-error-boundary-icon {
        width: ${errorStates.boundary.icon.width};
        height: ${errorStates.boundary.icon.height};
        color: ${errorStates.boundary.icon.color};
        margin-bottom: ${errorStates.boundary.icon.marginBottom};
      }

      .chanuka-error-boundary-title {
        font-size: ${errorStates.boundary.title.fontSize};
        font-weight: ${errorStates.boundary.title.fontWeight};
        color: ${errorStates.boundary.title.color};
        margin-bottom: ${errorStates.boundary.title.marginBottom};
      }

      .chanuka-error-boundary-description {
        font-size: ${errorStates.boundary.description.fontSize};
        color: ${errorStates.boundary.description.color};
        margin-bottom: ${errorStates.boundary.description.marginBottom};
        max-width: ${errorStates.boundary.description.maxWidth};
        line-height: ${errorStates.boundary.description.lineHeight};
      }
    `;
  },

  /**
   * Validate error state accessibility
   */
  validateAccessibility: (errorState: {
    hasRole: boolean;
    hasAriaLive: boolean;
    hasDescriptiveText: boolean;
    hasRecoveryActions: boolean;
    meetsContrastRequirements: boolean;
  }): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!errorState.hasRole) {
      issues.push('Error state must have appropriate role (alert, status, etc.)');
    }
    
    if (!errorState.hasAriaLive) {
      issues.push('Error state should use aria-live for dynamic content');
    }
    
    if (!errorState.hasDescriptiveText) {
      issues.push('Error state must have clear, descriptive text');
    }
    
    if (!errorState.hasRecoveryActions) {
      issues.push('Error state should provide recovery actions when possible');
    }
    
    if (!errorState.meetsContrastRequirements) {
      issues.push('Error state must meet WCAG contrast requirements');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },
} as const;

export type ErrorSeverity = keyof typeof errorStates.severity;
export type ErrorComponent = keyof typeof errorStates.component;

