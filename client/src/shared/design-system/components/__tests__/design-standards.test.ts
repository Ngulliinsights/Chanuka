/**
 * Design Standards Tests
 * Comprehensive tests for all design standard utilities and functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  interactiveStateUtils,
  loadingStateUtils,
  errorStateUtils,
  emptyStateUtils,
  buttonUtils,
  cardUtils,
  inputUtils,
  typographyUtils,
} from '@client/index';

describe('Interactive State Utils', () => {
  describe('getStateClasses', () => {
    it('should generate correct classes for default component', () => {
      const classes = interactiveStateUtils.getStateClasses('default', { hover: true });
      expect(classes).toBe('chanuka-interactive-default chanuka-default-hover');
    });

    it('should generate correct classes for button with multiple states', () => {
      const classes = interactiveStateUtils.getStateClasses('button', {
        hover: true,
        focus: true,
        disabled: true,
      });
      expect(classes).toBe('chanuka-interactive-button chanuka-button-hover chanuka-button-focus chanuka-button-disabled');
    });

    it('should handle empty states object', () => {
      const classes = interactiveStateUtils.getStateClasses('card', {});
      expect(classes).toBe('chanuka-interactive-card');
    });
  });

  describe('getStateStyles', () => {
    it('should return base styles for default state', () => {
      const styles = interactiveStateUtils.getStateStyles('button', 'default');
      expect(styles).toHaveProperty('transition');
      expect(styles).toHaveProperty('cursor', 'pointer');
      expect(styles).toHaveProperty('userSelect', 'none');
    });

    it('should return hover styles for button', () => {
      const styles = interactiveStateUtils.getStateStyles('button', 'hover');
      expect(styles).toHaveProperty('transform', 'translateY(-1px)');
    });

    it('should return disabled styles', () => {
      const styles = interactiveStateUtils.getStateStyles('button', 'disabled');
      expect(styles).toHaveProperty('opacity', '0.6');
      expect(styles).toHaveProperty('cursor', 'not-allowed');
    });
  });

  describe('validateAccessibility', () => {
    it('should validate accessible interactive element', () => {
      const result = interactiveStateUtils.validateAccessibility({
        hasVisibleFocus: true,
        hasKeyboardSupport: true,
        hasAriaStates: true,
        meetsContrastRequirements: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify accessibility issues', () => {
      const result = interactiveStateUtils.validateAccessibility({
        hasVisibleFocus: false,
        hasKeyboardSupport: false,
        hasAriaStates: true,
        meetsContrastRequirements: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Element must have visible focus indicator');
      expect(result.issues).toContain('Element must support keyboard navigation');
    });
  });
});

describe('Loading State Utils', () => {
  describe('getSpinnerClasses', () => {
    it('should generate correct spinner classes', () => {
      expect(loadingStateUtils.getSpinnerClasses('small')).toBe('chanuka-spinner chanuka-spinner-small');
      expect(loadingStateUtils.getSpinnerClasses('large')).toBe('chanuka-spinner chanuka-spinner-large');
      expect(loadingStateUtils.getSpinnerClasses()).toBe('chanuka-spinner chanuka-spinner-medium');
    });
  });

  describe('getSkeletonClasses', () => {
    it('should generate correct skeleton classes', () => {
      expect(loadingStateUtils.getSkeletonClasses('text')).toBe('chanuka-skeleton chanuka-skeleton-text');
      expect(loadingStateUtils.getSkeletonClasses('avatar')).toBe('chanuka-skeleton chanuka-skeleton-avatar');
      expect(loadingStateUtils.getSkeletonClasses()).toBe('chanuka-skeleton chanuka-skeleton-base');
    });
  });

  describe('createLoadingOverlay', () => {
    it('should create loading overlay without message', () => {
      const overlay = loadingStateUtils.createLoadingOverlay();
      expect(overlay.className).toBe('chanuka-loading-overlay');
      expect(overlay.children.spinner.className).toBe('chanuka-spinner chanuka-spinner-large');
      expect(overlay.children.message).toBeNull();
    });

    it('should create loading overlay with message', () => {
      const overlay = loadingStateUtils.createLoadingOverlay('Loading data...');
      expect(overlay.children.message).toEqual({
        className: 'chanuka-loading-message',
        text: 'Loading data...',
      });
    });
  });

  describe('createSkeletonLayout', () => {
    it('should create skeleton layout with all elements', () => {
      const layout = loadingStateUtils.createSkeletonLayout({
        title: true,
        paragraphs: 2,
        avatar: true,
        button: true,
      });
      
      expect(layout).toHaveLength(5); // avatar + title + 2 paragraphs + button
      expect(layout[0].type).toBe('avatar');
      expect(layout[1].type).toBe('title');
      expect(layout[2].type).toBe('paragraph');
      expect(layout[3].type).toBe('paragraph');
      expect(layout[4].type).toBe('button');
    });

    it('should create minimal skeleton layout', () => {
      const layout = loadingStateUtils.createSkeletonLayout({});
      expect(layout).toHaveLength(0);
    });
  });

  describe('createProgressBar', () => {
    it('should create determinate progress bar', () => {
      const progressBar = loadingStateUtils.createProgressBar(75);
      expect(progressBar.className).toBe('chanuka-progress-bar');
      expect(progressBar.children.fill.style.width).toBe('75%');
    });

    it('should create indeterminate progress bar', () => {
      const progressBar = loadingStateUtils.createProgressBar(undefined, true);
      expect(progressBar.children.fill.className).toBe('chanuka-progress-indeterminate');
    });

    it('should clamp progress values', () => {
      const progressBar1 = loadingStateUtils.createProgressBar(-10);
      expect(progressBar1.children.fill.style.width).toBe('0%');

      const progressBar2 = loadingStateUtils.createProgressBar(150);
      expect(progressBar2.children.fill.style.width).toBe('100%');
    });
  });

  describe('validateAccessibility', () => {
    it('should validate accessible loading state', () => {
      const result = loadingStateUtils.validateAccessibility({
        hasAriaLabel: true,
        hasLiveRegion: true,
        hasVisualIndicator: true,
        hasTextAlternative: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify loading accessibility issues', () => {
      const result = loadingStateUtils.validateAccessibility({
        hasAriaLabel: false,
        hasLiveRegion: false,
        hasVisualIndicator: true,
        hasTextAlternative: false,
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Loading state must have aria-label or aria-labelledby');
      expect(result.issues).toContain('Loading state should use aria-live for screen readers');
    });
  });
});

describe('Error State Utils', () => {
  describe('getErrorClasses', () => {
    it('should generate correct error classes', () => {
      expect(errorStateUtils.getErrorClasses('error')).toBe('chanuka-error chanuka-error-error');
      expect(errorStateUtils.getErrorClasses('warning', 'input')).toBe('chanuka-error chanuka-error-warning chanuka-error-input');
    });
  });

  describe('createErrorMessage', () => {
    it('should create basic error message', () => {
      const errorMessage = errorStateUtils.createErrorMessage({
        title: 'Test Error',
        description: 'This is a test error',
      });
      
      expect(errorMessage.className).toContain('chanuka-error');
      expect(errorMessage.children.content.children.title.text).toBe('Test Error');
      expect(errorMessage.children.content.children.description.text).toBe('This is a test error');
    });

    it('should create error message with actions', () => {
      const mockAction = vi.fn();
      const errorMessage = errorStateUtils.createErrorMessage({
        title: 'Test Error',
        actions: [
          { label: 'Retry', action: mockAction, type: 'primary' },
          { label: 'Cancel', action: mockAction },
        ],
      });
      
      expect(errorMessage.children.content.children.actions.children).toHaveLength(2);
      expect(errorMessage.children.content.children.actions.children[0].text).toBe('Retry');
      expect(errorMessage.children.content.children.actions.children[1].text).toBe('Cancel');
    });
  });

  describe('createInlineError', () => {
    it('should create inline error', () => {
      const inlineError = errorStateUtils.createInlineError('Field is required');
      expect(inlineError.className).toBe('chanuka-error-inline');
      expect(inlineError.role).toBe('alert');
      expect(inlineError['aria-live']).toBe('polite');
      expect(inlineError.children.message.text).toBe('Field is required');
    });
  });

  describe('createErrorBoundary', () => {
    it('should create error boundary with default values', () => {
      const errorBoundary = errorStateUtils.createErrorBoundary({});
      expect(errorBoundary.className).toBe('chanuka-error-boundary');
      expect(errorBoundary.children.title.text).toBe('Something went wrong');
    });

    it('should create error boundary with custom values and actions', () => {
      const mockRetry = vi.fn();
      const mockReport = vi.fn();
      
      const errorBoundary = errorStateUtils.createErrorBoundary({
        title: 'Custom Error',
        description: 'Custom description',
        onRetry: mockRetry,
        onReport: mockReport,
      });
      
      expect(errorBoundary.children.title.text).toBe('Custom Error');
      expect(errorBoundary.children.description.text).toBe('Custom description');
      expect(errorBoundary.children.actions.children).toHaveLength(2);
    });
  });

  describe('validateAccessibility', () => {
    it('should validate accessible error state', () => {
      const result = errorStateUtils.validateAccessibility({
        hasRole: true,
        hasAriaLive: true,
        hasDescriptiveText: true,
        hasRecoveryActions: true,
        meetsContrastRequirements: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});

describe('Empty State Utils', () => {
  describe('getEmptyStateClasses', () => {
    it('should generate correct empty state classes', () => {
      expect(emptyStateUtils.getEmptyStateClasses('noData', 'compact', 'dashboard'))
        .toBe('chanuka-empty-state chanuka-empty-noData chanuka-empty-compact chanuka-empty-dashboard');
    });
  });

  describe('createEmptyState', () => {
    it('should create empty state with default values', () => {
      const emptyState = emptyStateUtils.createEmptyState({
        type: 'noData',
      });
      
      expect(emptyState.children.content.children.title.text).toBe('No data available');
      expect(emptyState.children.content.children.description.text).toBe('There is no data to display at the moment.');
    });

    it('should create empty state with custom values and actions', () => {
      const mockAction = vi.fn();
      const emptyState = emptyStateUtils.createEmptyState({
        type: 'noData',
        title: 'Custom Title',
        description: 'Custom description',
        actions: [
          { label: 'Add Item', action: mockAction, type: 'primary' },
        ],
      });
      
      expect(emptyState.children.content.children.title.text).toBe('Custom Title');
      expect(emptyState.children.content.children.actions.children).toHaveLength(1);
    });
  });

  describe('getContextualSuggestions', () => {
    it('should return dashboard suggestions', () => {
      const suggestions = emptyStateUtils.getContextualSuggestions('dashboard');
      expect(suggestions).toContain('Add your first widget to get started');
      expect(suggestions).toContain('Customize your dashboard layout');
    });

    it('should return search suggestions', () => {
      const suggestions = emptyStateUtils.getContextualSuggestions('search');
      expect(suggestions).toContain('Try different search terms');
      expect(suggestions).toContain('Check your spelling');
    });

    it('should return default suggestions for unknown context', () => {
      const suggestions = emptyStateUtils.getContextualSuggestions('unknown');
      expect(suggestions).toContain('Try refreshing the page');
      expect(suggestions).toContain('Contact support if the issue persists');
    });
  });

  describe('validateAccessibility', () => {
    it('should validate accessible empty state', () => {
      const result = emptyStateUtils.validateAccessibility({
        hasDescriptiveText: true,
        hasActionableElements: true,
        hasProperHeadingStructure: true,
        hasKeyboardNavigation: true,
        meetsContrastRequirements: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});

describe('Button Utils', () => {
  describe('getButtonClasses', () => {
    it('should generate correct button classes', () => {
      expect(buttonUtils.getButtonClasses('primary', 'md', false, false))
        .toBe('chanuka-btn chanuka-btn-primary chanuka-btn-md');
      
      expect(buttonUtils.getButtonClasses('secondary', 'lg', true, false))
        .toBe('chanuka-btn chanuka-btn-secondary chanuka-btn-lg chanuka-btn-disabled');
      
      expect(buttonUtils.getButtonClasses('outline', 'sm', false, true))
        .toBe('chanuka-btn chanuka-btn-outline chanuka-btn-sm chanuka-btn-loading');
    });
  });

  describe('getButtonStyles', () => {
    it('should return combined styles', () => {
      const styles = buttonUtils.getButtonStyles('primary', 'md', 'hover');
      expect(styles).toHaveProperty('display', 'inline-flex');
      expect(styles).toHaveProperty('backgroundColor');
      expect(styles).toHaveProperty('padding');
    });
  });

  describe('validateAccessibility', () => {
    it('should validate accessible button', () => {
      const result = buttonUtils.validateAccessibility({
        hasText: true,
        hasAriaLabel: false,
        width: 48,
        height: 48,
      });
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify button accessibility issues', () => {
      const result = buttonUtils.validateAccessibility({
        hasText: false,
        hasAriaLabel: false,
        width: 20,
        height: 20,
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Button must have visible text or aria-label');
      expect(result.issues).toContain('Button must be at least 44px in both dimensions');
    });
  });
});

describe('Card Utils', () => {
  describe('getCardClasses', () => {
    it('should generate correct card classes', () => {
      expect(cardUtils.getCardClasses('default', 'md', false))
        .toBe('chanuka-card chanuka-card-default chanuka-card-md');
      
      expect(cardUtils.getCardClasses('elevated', 'lg', true))
        .toBe('chanuka-card chanuka-card-elevated chanuka-card-lg chanuka-card-interactive');
    });
  });

  describe('getCardStyles', () => {
    it('should return combined card styles', () => {
      const styles = cardUtils.getCardStyles('elevated', 'lg', 'hover');
      expect(styles).toHaveProperty('backgroundColor');
      expect(styles).toHaveProperty('borderRadius');
      expect(styles).toHaveProperty('padding');
    });
  });
});

describe('Input Utils', () => {
  describe('getInputClasses', () => {
    it('should generate correct input classes', () => {
      expect(inputUtils.getInputClasses('default', 'md'))
        .toBe('chanuka-input chanuka-input-default chanuka-input-md');
      
      expect(inputUtils.getInputClasses('filled', 'lg', 'error'))
        .toBe('chanuka-input chanuka-input-filled chanuka-input-lg chanuka-input-error');
    });
  });

  describe('getInputStyles', () => {
    it('should return combined input styles', () => {
      const styles = inputUtils.getInputStyles('outlined', 'sm', 'focus');
      expect(styles).toHaveProperty('width', '100%');
      expect(styles).toHaveProperty('fontSize');
      expect(styles).toHaveProperty('padding');
    });
  });
});

describe('Typography Utils', () => {
  describe('getTypographyClasses', () => {
    it('should generate correct typography classes', () => {
      expect(typographyUtils.getTypographyClasses('heading', 'h1'))
        .toBe('chanuka-typography chanuka-heading-h1');
      
      expect(typographyUtils.getTypographyClasses('body', 'large'))
        .toBe('chanuka-typography chanuka-body-large');
    });
  });

  describe('getHeadingStyles', () => {
    it('should return heading styles', () => {
      const styles = typographyUtils.getHeadingStyles('h1');
      expect(styles).toHaveProperty('fontSize', '2.25rem');
      expect(styles).toHaveProperty('fontWeight', '800');
      expect(styles).toHaveProperty('lineHeight', '1.2');
    });
  });

  describe('getBodyStyles', () => {
    it('should return body text styles', () => {
      const styles = typographyUtils.getBodyStyles('default');
      expect(styles).toHaveProperty('fontSize', '1rem');
      expect(styles).toHaveProperty('lineHeight', '1.6');
    });
  });
});

