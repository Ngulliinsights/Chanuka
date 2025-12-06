/**
 * Loading States Design Standards
 * Unified loading states with skeleton screens and progress indicators
 * Optimized for performance, accessibility, and developer experience
 */

import { animationTokens } from '../tokens/animations';
import { borderTokens } from '../tokens/borders';
import { colorTokens } from '../tokens/colors';
import { spacingTokens } from '../tokens/spacing';

// Type definitions for better type safety and developer experience
export type LoadingSpinnerSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SkeletonType = 'base' | 'text' | 'title' | 'paragraph' | 'avatar' | 'card' | 'button';
export type AriaPoliteness = 'polite' | 'assertive';

export interface SkeletonElement {
  type: SkeletonType;
  className: string;
}

// Spinner size configuration - centralized for easier maintenance
const SPINNER_SIZES = {
  small: { width: '16px', height: '16px', borderWidth: '2px' },
  medium: { width: '24px', height: '24px', borderWidth: '2px' },
  large: { width: '32px', height: '32px', borderWidth: '3px' },
  xlarge: { width: '48px', height: '48px', borderWidth: '4px' },
} as const;

export const loadingStates = {
  // Base loading styles that apply to all loading components
  base: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },

  // Spinner configurations with consistent styling across all sizes
  spinner: {
    ...SPINNER_SIZES,
    styles: {
      border: `2px solid ${colorTokens.neutral[200]}`,
      borderTop: `2px solid ${colorTokens.accent[500]}`,
      borderRadius: '50%',
      animation: `spin ${animationTokens.duration.slower} ${animationTokens.easing.linear} infinite`,
    },
  },

  // Progress bar configurations with enhanced visual consistency
  progressBar: {
    base: {
      width: '100%',
      height: '4px',
      backgroundColor: colorTokens.neutral[200],
      borderRadius: borderTokens.radius.full,
      overflow: 'hidden' as const,
    },
    fill: {
      height: '100%',
      backgroundColor: colorTokens.accent[500],
      borderRadius: borderTokens.radius.full,
      transition: `width ${animationTokens.duration.normal} ${animationTokens.easing.easeOut}`,
    },
    indeterminate: {
      background: `linear-gradient(90deg, transparent, ${colorTokens.accent[500]}, transparent)`,
      animation: `shimmer ${animationTokens.duration.slower} ${animationTokens.easing.easeInOut} infinite`,
    },
  },

  // Skeleton screen configurations with improved pseudo-element handling
  skeleton: {
    base: {
      backgroundColor: colorTokens.neutral[200],
      borderRadius: borderTokens.radius.sm,
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    text: {
      height: '1em',
      marginBottom: spacingTokens.semantic.xs,
    },
    title: {
      height: '1.5em',
      width: '60%',
      marginBottom: spacingTokens.semantic.sm,
    },
    paragraph: {
      height: '1em',
      marginBottom: spacingTokens.semantic.xs,
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: borderTokens.radius.full,
    },
    card: {
      width: '100%',
      height: '200px',
      borderRadius: borderTokens.radius.lg,
    },
    button: {
      width: '120px',
      height: '40px',
      borderRadius: borderTokens.radius.md,
    },
  },

  // Loading overlay configurations with improved backdrop and content presentation
  overlay: {
    backdrop: {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10',
      backdropFilter: 'blur(2px)',
    },
    content: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: spacingTokens.semantic.md,
      padding: spacingTokens.semantic.lg,
      backgroundColor: colorTokens.surface.card.light,
      borderRadius: borderTokens.radius.lg,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    text: {
      color: colorTokens.neutral[600],
      fontSize: '0.875rem',
      fontWeight: '500',
      textAlign: 'center' as const,
    },
  },

  // Component-specific loading states for different UI elements
  component: {
    button: {
      content: {
        opacity: '0',
        visibility: 'hidden' as const,
      },
      spinner: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
    },
    input: {
      backgroundColor: colorTokens.neutral[50],
      cursor: 'wait',
    },
    card: {
      minHeight: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    table: {
      tbody: {
        opacity: '0.5',
      },
      overlay: {
        position: 'absolute' as const,
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '5',
      },
    },
  },
} as const;

// Enhanced loading state utility functions with improved error handling and documentation
export const loadingStateUtils = {
  /**
   * Get loading spinner classes with size validation
   * This generates the appropriate CSS class names for rendering a spinner of the specified size
   * @param size - The spinner size (defaults to 'medium')
   * @returns CSS class names for the spinner
   */
  getSpinnerClasses: (size: LoadingSpinnerSize = 'medium'): string => {
    return `chanuka-spinner chanuka-spinner-${size}`;
  },

  /**
   * Get skeleton classes with type validation
   * This generates the appropriate CSS class names for rendering skeleton placeholders
   * @param type - The skeleton type (defaults to 'base')
   * @returns CSS class names for the skeleton
   */
  getSkeletonClasses: (type: SkeletonType = 'base'): string => {
    return `chanuka-skeleton chanuka-skeleton-${type}`;
  },

  /**
   * Generate loading overlay with optional message
   * Creates a full-screen loading overlay with a spinner and optional text message
   * @param message - Optional loading message to display to users
   * @returns Configuration object for the loading overlay
   */
  createLoadingOverlay: (message?: string) => ({
    className: 'chanuka-loading-overlay',
    children: {
      spinner: { className: 'chanuka-spinner chanuka-spinner-large' },
      message: message ? { 
        className: 'chanuka-loading-message',
        text: message 
      } : null,
    },
  }),

  /**
   * Generate skeleton layout based on configuration
   * Creates a composable skeleton structure for content placeholders that match your content's structure
   * This is useful for creating skeleton screens that mirror the actual content layout
   * @param config - Configuration specifying which skeleton elements to include
   * @returns Array of skeleton element configurations
   */
  createSkeletonLayout: (config: {
    title?: boolean;
    paragraphs?: number;
    avatar?: boolean;
    button?: boolean;
  }): SkeletonElement[] => {
    const elements: SkeletonElement[] = [];
    
    if (config.avatar) {
      elements.push({ type: 'avatar', className: 'chanuka-skeleton chanuka-skeleton-avatar' });
    }
    
    if (config.title) {
      elements.push({ type: 'title', className: 'chanuka-skeleton chanuka-skeleton-title' });
    }
    
    if (config.paragraphs && config.paragraphs > 0) {
      for (let i = 0; i < config.paragraphs; i++) {
        elements.push({ type: 'paragraph', className: 'chanuka-skeleton chanuka-skeleton-paragraph' });
      }
    }
    
    if (config.button) {
      elements.push({ type: 'button', className: 'chanuka-skeleton chanuka-skeleton-button' });
    }
    
    return elements;
  },

  /**
   * Generate progress bar with clamped progress value
   * Ensures progress stays within valid 0-100 range for safety and prevents visual glitches
   * @param progress - Progress percentage (0-100)
   * @param indeterminate - Whether to show indeterminate progress (useful when duration is unknown)
   * @returns Configuration object for the progress bar
   */
  createProgressBar: (progress?: number, indeterminate: boolean = false) => {
    // Clamp progress value between 0 and 100 to prevent overflow or invalid states
    const clampedProgress = progress !== undefined 
      ? Math.max(0, Math.min(100, progress)) 
      : 0;

    return {
      className: 'chanuka-progress-bar',
      style: loadingStates.progressBar.base,
      children: {
        fill: {
          className: indeterminate ? 'chanuka-progress-indeterminate' : 'chanuka-progress-fill',
          style: {
            ...loadingStates.progressBar.fill,
            ...(indeterminate ? loadingStates.progressBar.indeterminate : {}),
            width: `${clampedProgress}%`,
          },
        },
      },
    };
  },

  /**
   * Generate CSS keyframes for all animations
   * These keyframes power the visual feedback in spinners, skeletons, and progress indicators
   * Each animation is carefully tuned for smoothness and performance
   * @returns CSS keyframe definitions as a string
   */
  generateKeyframes: (): string => {
    return `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
  },

  /**
   * Generate complete CSS for all loading states
   * This creates a comprehensive stylesheet that includes all styles for spinners, skeletons,
   * progress bars, and overlays, along with proper responsive and accessibility support
   * @returns Complete CSS as a string ready for injection
   */
  generateCSS: (): string => {
    return `
      ${loadingStateUtils.generateKeyframes()}

      /* Base spinner styles with rotating animation */
      .chanuka-spinner {
        display: inline-block;
        border: ${loadingStates.spinner.styles.border};
        border-top: ${loadingStates.spinner.styles.borderTop};
        border-radius: ${loadingStates.spinner.styles.borderRadius};
        animation: ${loadingStates.spinner.styles.animation};
      }

      /* Spinner size variants for different use cases */
      .chanuka-spinner-small {
        width: ${loadingStates.spinner.small.width};
        height: ${loadingStates.spinner.small.height};
        border-width: ${loadingStates.spinner.small.borderWidth};
      }

      .chanuka-spinner-medium {
        width: ${loadingStates.spinner.medium.width};
        height: ${loadingStates.spinner.medium.height};
        border-width: ${loadingStates.spinner.medium.borderWidth};
      }

      .chanuka-spinner-large {
        width: ${loadingStates.spinner.large.width};
        height: ${loadingStates.spinner.large.height};
        border-width: ${loadingStates.spinner.large.borderWidth};
      }

      .chanuka-spinner-xlarge {
        width: ${loadingStates.spinner.xlarge.width};
        height: ${loadingStates.spinner.xlarge.height};
        border-width: ${loadingStates.spinner.xlarge.borderWidth};
      }

      /* Skeleton base styles with shimmer effect for visual feedback */
      .chanuka-skeleton {
        background-color: ${loadingStates.skeleton.base.backgroundColor};
        border-radius: ${loadingStates.skeleton.base.borderRadius};
        position: relative;
        overflow: hidden;
      }

      .chanuka-skeleton::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, ${colorTokens.neutral[50]}, transparent);
        animation: shimmer ${animationTokens.duration.slower} ${animationTokens.easing.easeInOut} infinite;
      }

      /* Skeleton type variants for different content types */
      .chanuka-skeleton-text {
        height: ${loadingStates.skeleton.text.height};
        margin-bottom: ${loadingStates.skeleton.text.marginBottom};
      }

      .chanuka-skeleton-text:last-child {
        margin-bottom: 0;
      }

      .chanuka-skeleton-title {
        height: ${loadingStates.skeleton.title.height};
        width: ${loadingStates.skeleton.title.width};
        margin-bottom: ${loadingStates.skeleton.title.marginBottom};
      }

      .chanuka-skeleton-paragraph {
        height: ${loadingStates.skeleton.paragraph.height};
        margin-bottom: ${loadingStates.skeleton.paragraph.marginBottom};
      }

      .chanuka-skeleton-paragraph:nth-child(odd) {
        width: 100%;
      }

      .chanuka-skeleton-paragraph:nth-child(even) {
        width: 80%;
      }

      .chanuka-skeleton-avatar {
        width: ${loadingStates.skeleton.avatar.width};
        height: ${loadingStates.skeleton.avatar.height};
        border-radius: ${loadingStates.skeleton.avatar.borderRadius};
      }

      .chanuka-skeleton-card {
        width: ${loadingStates.skeleton.card.width};
        height: ${loadingStates.skeleton.card.height};
        border-radius: ${loadingStates.skeleton.card.borderRadius};
      }

      .chanuka-skeleton-button {
        width: ${loadingStates.skeleton.button.width};
        height: ${loadingStates.skeleton.button.height};
        border-radius: ${loadingStates.skeleton.button.borderRadius};
      }

      /* Loading overlay styles with backdrop blur for focus */
      .chanuka-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: ${spacingTokens.semantic.md};
        z-index: 10;
        backdrop-filter: blur(2px);
      }

      .chanuka-loading-message {
        color: ${loadingStates.overlay.text.color};
        font-size: ${loadingStates.overlay.text.fontSize};
        font-weight: ${loadingStates.overlay.text.fontWeight};
        text-align: ${loadingStates.overlay.text.textAlign};
      }

      /* Progress bar styles for determinate and indeterminate states */
      .chanuka-progress-bar {
        width: 100%;
        height: 4px;
        background-color: ${colorTokens.neutral[200]};
        border-radius: ${borderTokens.radius.full};
        overflow: hidden;
      }

      .chanuka-progress-fill {
        height: 100%;
        background-color: ${colorTokens.accent[500]};
        border-radius: ${borderTokens.radius.full};
        transition: width ${animationTokens.duration.normal} ${animationTokens.easing.easeOut};
      }

      .chanuka-progress-indeterminate {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, transparent, ${colorTokens.accent[500]}, transparent);
        animation: shimmer ${animationTokens.duration.slower} ${animationTokens.easing.easeInOut} infinite;
      }

      /* Reduced motion support for accessibility compliance */
      @media (prefers-reduced-motion: reduce) {
        .chanuka-spinner,
        .chanuka-skeleton::after,
        .chanuka-progress-indeterminate {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `;
  },

  /**
   * Validate loading state accessibility compliance
   * Checks for essential accessibility features to ensure loading states are usable by everyone
   * This helps catch accessibility issues during development before they reach users
   * @param loadingState - Object describing the loading state's accessibility features
   * @returns Validation result with any issues found
   */
  validateAccessibility: (loadingState: {
    hasAriaLabel: boolean;
    hasLiveRegion: boolean;
    hasVisualIndicator: boolean;
    hasTextAlternative: boolean;
  }): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!loadingState.hasAriaLabel) {
      issues.push('Loading state must have aria-label or aria-labelledby');
    }
    
    if (!loadingState.hasLiveRegion) {
      issues.push('Loading state should use aria-live="polite" for screen reader announcements');
    }
    
    if (!loadingState.hasVisualIndicator) {
      issues.push('Loading state must have a visible indicator for sighted users');
    }
    
    if (!loadingState.hasTextAlternative) {
      issues.push('Loading state should provide text alternative for screen readers');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Helper to create accessible loading announcements
   * Generates proper ARIA attributes for loading states that work well with screen readers
   * This ensures users with assistive technology receive appropriate feedback about loading states
   * @param message - Loading message to announce to screen reader users
   * @param politeness - ARIA live region politeness level ('polite' for non-urgent, 'assertive' for urgent)
   * @returns Object with ARIA attributes ready to spread onto elements
   */
  createAccessibleAnnouncement: (
    message: string,
    politeness: AriaPoliteness = 'polite'
  ) => ({
    role: 'status',
    'aria-live': politeness,
    'aria-atomic': 'true',
    'aria-label': message,
  }),
} as const;
