/**
 * Empty States Design Standards
 * Actionable guidance and visual appeal for empty states
 */

import { animationTokens } from '../tokens/animations';
import { borderTokens } from '../tokens/borders';
import { colorTokens } from '../tokens/colors';
import { shadowTokens } from '../tokens/shadows';
import { spacingTokens } from '../tokens/spacing';

export const emptyStates = {
  // Base empty state styles
  base: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: spacingTokens.semantic.xl,
    minHeight: '300px',
    backgroundColor: colorTokens.surface.background.light,
    borderRadius: borderTokens.radius.lg,
    border: `2px dashed ${colorTokens.border.light}`,
    animation: `fadeIn ${animationTokens.duration.normal} ${animationTokens.easing.easeOut}`,
  },

  // Empty state types
  types: {
    // No data available
    noData: {
      icon: {
        name: 'database',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No data available',
      description: 'There is no data to display at the moment.',
      suggestion: 'Try refreshing the page or check back later.',
    },

    // No search results
    noResults: {
      icon: {
        name: 'search',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No results found',
      description: 'We couldn\'t find anything matching your search.',
      suggestion: 'Try adjusting your search terms or filters.',
    },

    // No items in list/collection
    noItems: {
      icon: {
        name: 'list',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No items yet',
      description: 'You haven\'t added any items to this collection.',
      suggestion: 'Get started by adding your first item.',
    },

    // No content created
    noContent: {
      icon: {
        name: 'document',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No content yet',
      description: 'You haven\'t created any content.',
      suggestion: 'Create your first piece of content to get started.',
    },

    // No notifications
    noNotifications: {
      icon: {
        name: 'bell',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No notifications',
      description: 'You\'re all caught up! No new notifications.',
      suggestion: 'We\'ll notify you when something new happens.',
    },

    // No favorites/bookmarks
    noFavorites: {
      icon: {
        name: 'heart',
        color: colorTokens.neutral[400],
        size: '64px',
      },
      title: 'No favorites yet',
      description: 'You haven\'t added any items to your favorites.',
      suggestion: 'Start favoriting items you want to save for later.',
    },

    // Connection/network issues
    noConnection: {
      icon: {
        name: 'wifi-off',
        color: colorTokens.semantic.warning[500],
        size: '64px',
      },
      title: 'Connection lost',
      description: 'Unable to connect to the server.',
      suggestion: 'Check your internet connection and try again.',
    },

    // Permission denied
    noAccess: {
      icon: {
        name: 'lock',
        color: colorTokens.semantic.error[500],
        size: '64px',
      },
      title: 'Access denied',
      description: 'You don\'t have permission to view this content.',
      suggestion: 'Contact an administrator for access.',
    },

    // Feature not available
    notAvailable: {
      icon: {
        name: 'construction',
        color: colorTokens.semantic.info[500],
        size: '64px',
      },
      title: 'Coming soon',
      description: 'This feature is not available yet.',
      suggestion: 'We\'re working on it! Check back soon.',
    },

    // Maintenance mode
    maintenance: {
      icon: {
        name: 'tools',
        color: colorTokens.semantic.warning[500],
        size: '64px',
      },
      title: 'Under maintenance',
      description: 'This service is temporarily unavailable.',
      suggestion: 'We\'ll be back shortly. Thank you for your patience.',
    },
  },

  // Visual elements
  visual: {
    icon: {
      width: '64px',
      height: '64px',
      marginBottom: spacingTokens.semantic.lg,
      opacity: '0.8',
    },
    illustration: {
      width: '200px',
      height: '150px',
      marginBottom: spacingTokens.semantic.lg,
      opacity: '0.6',
    },
  },

  // Text content
  content: {
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: colorTokens.neutral[900],
      marginBottom: spacingTokens.semantic.sm,
      lineHeight: '1.3',
    },
    description: {
      fontSize: '1rem',
      color: colorTokens.neutral[600],
      marginBottom: spacingTokens.semantic.md,
      maxWidth: '400px',
      lineHeight: '1.5',
    },
    suggestion: {
      fontSize: '0.875rem',
      color: colorTokens.neutral[500],
      marginBottom: spacingTokens.semantic.lg,
      maxWidth: '350px',
      lineHeight: '1.4',
    },
  },

  // Action buttons
  actions: {
    container: {
      display: 'flex',
      gap: spacingTokens.semantic.sm,
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: colorTokens.accent[500],
      color: '#ffffff',
      border: 'none',
      borderRadius: borderTokens.radius.md,
      padding: `${spacingTokens.semantic.sm} ${spacingTokens.semantic.lg}`,
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: animationTokens.transition.colors,
      boxShadow: shadowTokens.component.button.default,
      '&:hover': {
        backgroundColor: colorTokens.accent[600],
        transform: 'translateY(-1px)',
        boxShadow: shadowTokens.component.button.hover,
      },
      '&:focus': {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
    secondary: {
      backgroundColor: 'transparent',
      color: colorTokens.neutral[700],
      border: `1px solid ${colorTokens.border.light}`,
      borderRadius: borderTokens.radius.md,
      padding: `${spacingTokens.semantic.sm} ${spacingTokens.semantic.lg}`,
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: animationTokens.transition.colors,
      '&:hover': {
        backgroundColor: colorTokens.neutral[50],
        borderColor: colorTokens.border.emphasis,
      },
      '&:focus': {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
  },

  // Layout variations
  layouts: {
    compact: {
      minHeight: '200px',
      padding: spacingTokens.semantic.lg,
    },
    standard: {
      minHeight: '300px',
      padding: spacingTokens.semantic.xl,
    },
    spacious: {
      minHeight: '400px',
      padding: spacingTokens.semantic['2xl'],
    },
  },

  // Context-specific configurations
  context: {
    dashboard: {
      backgroundColor: colorTokens.surface.card.light,
      border: `1px solid ${colorTokens.border.light}`,
      boxShadow: shadowTokens.component.card.default,
    },
    modal: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: spacingTokens.semantic.lg,
    },
    page: {
      backgroundColor: colorTokens.surface.background.light,
      border: 'none',
      minHeight: '60vh',
    },
    sidebar: {
      backgroundColor: colorTokens.surface.card.light,
      border: `1px solid ${colorTokens.border.light}`,
      minHeight: '250px',
      padding: spacingTokens.semantic.lg,
    },
  },
} as const;

// Empty state utility functions
export const emptyStateUtils: {
  getEmptyStateClasses: (
    type?: keyof typeof emptyStates.types,
    variant?: keyof typeof emptyStates.variants
  ) => string;
  getEmptyStateContent: (
    type: keyof typeof emptyStates.types,
    context?: string
  ) => {
    title: string;
    description: string;
    icon: string;
    action?: string;
  };
  getContextualSuggestions: (context: string, _user_role?: string) => string[];
} = {
  /**
   * Get empty state classes
   */
  getEmptyStateClasses: (
    type: keyof typeof emptyStates.types = 'noData',
    layout: keyof typeof emptyStates.layouts = 'standard',
    context?: keyof typeof emptyStates.context
  ): string => {
    const classes = [`chanuka-empty-state`, `chanuka-empty-${type}`, `chanuka-empty-${layout}`];
    if (context) classes.push(`chanuka-empty-${context}`);
    return classes.join(' ');
  },

  /**
   * Create empty state structure
   */
  createEmptyState: (config: {
    type: keyof typeof emptyStates.types;
    title?: string;
    description?: string;
    suggestion?: string;
    actions?: Array<{
      label: string;
      action: () => void;
      type?: 'primary' | 'secondary';
    }>;
    layout?: keyof typeof emptyStates.layouts;
    context?: keyof typeof emptyStates.context;
    customIcon?: {
      name: string;
      color?: string;
      size?: string;
    };
  }) => {
    const typeConfig = emptyStates.types[config.type];
    
    return {
      className: emptyStateUtils.getEmptyStateClasses(config.type, config.layout, config.context),
      children: {
        icon: {
          className: 'chanuka-empty-icon',
          name: config.customIcon?.name || typeConfig.icon.name,
          style: {
            width: config.customIcon?.size || typeConfig.icon.size,
            height: config.customIcon?.size || typeConfig.icon.size,
            color: config.customIcon?.color || typeConfig.icon.color,
          },
          'aria-hidden': 'true',
        },
        content: {
          className: 'chanuka-empty-content',
          children: {
            title: {
              className: 'chanuka-empty-title',
              text: config.title || typeConfig.title,
            },
            description: {
              className: 'chanuka-empty-description',
              text: config.description || typeConfig.description,
            },
            suggestion: {
              className: 'chanuka-empty-suggestion',
              text: config.suggestion || typeConfig.suggestion,
            },
            ...(config.actions && {
              actions: {
                className: 'chanuka-empty-actions',
                children: config.actions.map((action, index) => ({
                  key: index,
                  className: `chanuka-empty-action chanuka-empty-action-${action.type || 'secondary'}`,
                  onClick: action.action,
                  text: action.label,
                })),
              },
            }),
          },
        },
      },
    };
  },

  /**
   * Create contextual empty states
   */
  createContextualEmptyState: (context: {
    dashboard: () => ReturnType<typeof emptyStateUtils.createEmptyState>;
    table: () => ReturnType<typeof emptyStateUtils.createEmptyState>;
    search: () => ReturnType<typeof emptyStateUtils.createEmptyState>;
    notifications: () => ReturnType<typeof emptyStateUtils.createEmptyState>;
    favorites: () => ReturnType<typeof emptyStateUtils.createEmptyState>;
  }) => context,

  /**
   * Generate CSS for empty states
   */
  generateCSS: (): string => {
    return `
      .chanuka-empty-state {
        display: ${emptyStates.base.display};
        flex-direction: ${emptyStates.base.flexDirection};
        align-items: ${emptyStates.base.alignItems};
        justify-content: ${emptyStates.base.justifyContent};
        text-align: ${emptyStates.base.textAlign};
        padding: ${emptyStates.base.padding};
        min-height: ${emptyStates.base.minHeight};
        background-color: ${emptyStates.base.backgroundColor};
        border-radius: ${emptyStates.base.borderRadius};
        border: ${emptyStates.base.border};
        animation: ${emptyStates.base.animation};
      }

      .chanuka-empty-compact {
        min-height: ${emptyStates.layouts.compact.minHeight};
        padding: ${emptyStates.layouts.compact.padding};
      }

      .chanuka-empty-standard {
        min-height: ${emptyStates.layouts.standard.minHeight};
        padding: ${emptyStates.layouts.standard.padding};
      }

      .chanuka-empty-spacious {
        min-height: ${emptyStates.layouts.spacious.minHeight};
        padding: ${emptyStates.layouts.spacious.padding};
      }

      .chanuka-empty-dashboard {
        background-color: ${emptyStates.context.dashboard.backgroundColor};
        border: ${emptyStates.context.dashboard.border};
        box-shadow: ${emptyStates.context.dashboard.boxShadow};
      }

      .chanuka-empty-modal {
        background-color: ${emptyStates.context.modal.backgroundColor};
        border: ${emptyStates.context.modal.border};
        padding: ${emptyStates.context.modal.padding};
      }

      .chanuka-empty-page {
        background-color: ${emptyStates.context.page.backgroundColor};
        border: ${emptyStates.context.page.border};
        min-height: ${emptyStates.context.page.minHeight};
      }

      .chanuka-empty-sidebar {
        background-color: ${emptyStates.context.sidebar.backgroundColor};
        border: ${emptyStates.context.sidebar.border};
        min-height: ${emptyStates.context.sidebar.minHeight};
        padding: ${emptyStates.context.sidebar.padding};
      }

      .chanuka-empty-icon {
        width: ${emptyStates.visual.icon.width};
        height: ${emptyStates.visual.icon.height};
        margin-bottom: ${emptyStates.visual.icon.marginBottom};
        opacity: ${emptyStates.visual.icon.opacity};
      }

      .chanuka-empty-title {
        font-size: ${emptyStates.content.title.fontSize};
        font-weight: ${emptyStates.content.title.fontWeight};
        color: ${emptyStates.content.title.color};
        margin-bottom: ${emptyStates.content.title.marginBottom};
        line-height: ${emptyStates.content.title.lineHeight};
      }

      .chanuka-empty-description {
        font-size: ${emptyStates.content.description.fontSize};
        color: ${emptyStates.content.description.color};
        margin-bottom: ${emptyStates.content.description.marginBottom};
        max-width: ${emptyStates.content.description.maxWidth};
        line-height: ${emptyStates.content.description.lineHeight};
      }

      .chanuka-empty-suggestion {
        font-size: ${emptyStates.content.suggestion.fontSize};
        color: ${emptyStates.content.suggestion.color};
        margin-bottom: ${emptyStates.content.suggestion.marginBottom};
        max-width: ${emptyStates.content.suggestion.maxWidth};
        line-height: ${emptyStates.content.suggestion.lineHeight};
      }

      .chanuka-empty-actions {
        display: ${emptyStates.actions.container.display};
        gap: ${emptyStates.actions.container.gap};
        flex-wrap: ${emptyStates.actions.container.flexWrap};
        justify-content: ${emptyStates.actions.container.justifyContent};
      }

      .chanuka-empty-action-primary {
        background-color: ${emptyStates.actions.primary.backgroundColor};
        color: ${emptyStates.actions.primary.color};
        border: ${emptyStates.actions.primary.border};
        border-radius: ${emptyStates.actions.primary.borderRadius};
        padding: ${emptyStates.actions.primary.padding};
        font-size: ${emptyStates.actions.primary.fontSize};
        font-weight: ${emptyStates.actions.primary.fontWeight};
        cursor: ${emptyStates.actions.primary.cursor};
        transition: ${emptyStates.actions.primary.transition};
        box-shadow: ${emptyStates.actions.primary.boxShadow};
      }

      .chanuka-empty-action-primary:hover {
        background-color: ${colorTokens.accent[600]};
        transform: translateY(-1px);
        box-shadow: ${shadowTokens.component.button.hover};
      }

      .chanuka-empty-action-primary:focus {
        outline: none;
        box-shadow: ${shadowTokens.interactive.focus.accent};
      }

      .chanuka-empty-action-secondary {
        background-color: ${emptyStates.actions.secondary.backgroundColor};
        color: ${emptyStates.actions.secondary.color};
        border: ${emptyStates.actions.secondary.border};
        border-radius: ${emptyStates.actions.secondary.borderRadius};
        padding: ${emptyStates.actions.secondary.padding};
        font-size: ${emptyStates.actions.secondary.fontSize};
        font-weight: ${emptyStates.actions.secondary.fontWeight};
        cursor: ${emptyStates.actions.secondary.cursor};
        transition: ${emptyStates.actions.secondary.transition};
      }

      .chanuka-empty-action-secondary:hover {
        background-color: ${colorTokens.neutral[50]};
        border-color: ${colorTokens.border.emphasis};
      }

      .chanuka-empty-action-secondary:focus {
        outline: none;
        box-shadow: ${shadowTokens.interactive.focus.accent};
      }
    `;
  },

  /**
   * Validate empty state accessibility
   */
  validateAccessibility: (emptyState: {
    hasDescriptiveText: boolean;
    hasActionableElements: boolean;
    hasProperHeadingStructure: boolean;
    hasKeyboardNavigation: boolean;
    meetsContrastRequirements: boolean;
  }): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!emptyState.hasDescriptiveText) {
      issues.push('Empty state must have clear, descriptive text');
    }
    
    if (!emptyState.hasActionableElements) {
      issues.push('Empty state should provide actionable elements when appropriate');
    }
    
    if (!emptyState.hasProperHeadingStructure) {
      issues.push('Empty state should use proper heading hierarchy');
    }
    
    if (!emptyState.hasKeyboardNavigation) {
      issues.push('Empty state actions must be keyboard accessible');
    }
    
    if (!emptyState.meetsContrastRequirements) {
      issues.push('Empty state must meet WCAG contrast requirements');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Get contextual empty state suggestions
   */
  getContextualSuggestions: (context: string, _user_role?: string): string[] => {
    const suggestions: Record<string, string[]> = {
      dashboard: [
        'Add your first widget to get started',
        'Customize your dashboard layout',
        'Import data from external sources',
      ],
      search: [
        'Try different search terms',
        'Check your spelling',
        'Use fewer or more general keywords',
        'Clear all filters and try again',
      ],
      notifications: [
        'Enable notifications in settings',
        'Check your notification preferences',
        'New notifications will appear here',
      ],
      favorites: [
        'Browse content and add favorites',
        'Use the heart icon to save items',
        'Your saved items will appear here',
      ],
    };
    
    return suggestions[context] || ['Try refreshing the page', 'Contact support if the issue persists'];
  },
} as const;

export type EmptyStateType = keyof typeof emptyStates.types;
export type EmptyStateLayout = keyof typeof emptyStates.layouts;
export type EmptyStateContext = keyof typeof emptyStates.context;

