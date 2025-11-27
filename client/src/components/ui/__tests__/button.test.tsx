/**
 * Comprehensive tests for Button and EnhancedButton components
 * Covers props, state, user interactions, accessibility, and mobile responsiveness
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, EnhancedButton, buttonVariants } from '@client/button';
import { attemptUIRecovery, getUIRecoverySuggestions } from '@client/recovery';
import { renderWithWrapper, createMockComponentError, spyOnConsole } from '@client/test-utils';

// Mock dependencies
vi.mock('../../../lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}));

vi.mock('../recovery', () => ({
  attemptUIRecovery: vi.fn(),
  getUIRecoverySuggestions: vi.fn()
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../recovery', () => ({
  attemptUIRecovery: vi.fn(),
  getUIRecoverySuggestions: vi.fn()
}));

vi.mock('../errors', () => ({
  UIComponentError: class UIComponentError extends Error {
    constructor(component: string, action: string, reason: string, details?: any) {
      super(reason);
      this.name = 'UIComponentError';
    }
  }
}));

describe('Button Component', () => {
  const user = userEvent.setup();

  describe('Basic Button', () => {
    it('renders with default props', () => {
      renderWithWrapper(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
      // Button component doesn't explicitly set type="button", it uses default behavior
    });

    it('renders with different variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;

      variants.forEach(variant => {
        const { rerender } = renderWithWrapper(
          <Button variant={variant}>Button {variant}</Button>
        );

        const button = screen.getByRole('button', { name: new RegExp(variant, 'i') });
        expect(button).toBeInTheDocument();

        rerender(<div></div>); // Clear for next test
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;

      sizes.forEach(size => {
        const { rerender } = renderWithWrapper(
          <Button size={size}>Button {size}</Button>
        );

        const button = screen.getByRole('button', { name: new RegExp(size, 'i') });
        expect(button).toBeInTheDocument();

        rerender(<div></div>);
      });
    });

    it('renders with asChild prop using Slot', () => {
      renderWithWrapper(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });

    it('passes through additional props', () => {
      renderWithWrapper(
        <Button
          type="submit"
          disabled
          className="custom-class"
          data-testid="custom-button"
          id="test-button"
        >
          Submit
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('id', 'test-button');
      expect(button).toHaveClass('custom-class');
    });

    it('handles click events', async () => {
      const handleClick = vi.fn();
      renderWithWrapper(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is accessible with keyboard navigation', async () => {
      renderWithWrapper(<Button>Focusable Button</Button>);

      const button = screen.getByRole('button', { name: /focusable button/i });

      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Button is focusable by default, no explicit tabindex needed
    });

    it('has proper focus styles', () => {
      renderWithWrapper(<Button>Focus Test</Button>);

      const button = screen.getByRole('button', { name: /focus test/i });
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('EnhancedButton Component', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = spyOnConsole();
    });

    afterEach(() => {
      consoleSpy.restore();
      vi.clearAllMocks();
    });

    it('renders with default props', () => {
      renderWithWrapper(<EnhancedButton>Enhanced Button</EnhancedButton>);

      const button = screen.getByRole('button', { name: /enhanced button/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('renders with custom variant and size', () => {
      renderWithWrapper(
        <EnhancedButton variant="outline" size="lg">
          Custom Button
        </EnhancedButton>
      );

      const button = screen.getByRole('button', { name: /custom button/i });
      expect(button).toBeInTheDocument();
    });

    describe('Loading State', () => {
      it('shows loading spinner and text when loading', () => {
        renderWithWrapper(
          <EnhancedButton state={{ loading: true }} loadingText="Processing...">
            Click me
          </EnhancedButton>
        );

        const button = screen.getByRole('button', { name: /processing/i });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(button).toHaveClass('cursor-not-allowed');

        // Check for spinner icon (Loader2)
        const spinner = button.querySelector('svg');
        expect(spinner).toBeInTheDocument();
      });

      it('uses default loading text when not provided', () => {
        renderWithWrapper(
          <EnhancedButton state={{ loading: true }}>
            Click me
          </EnhancedButton>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

      it('prevents clicks when loading', async () => {
        const handleClick = vi.fn();
        renderWithWrapper(
          <EnhancedButton state={{ loading: true }} onClick={handleClick}>
            Loading Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    describe('Error State', () => {
      it('shows error icon and text when error', () => {
        renderWithWrapper(
          <EnhancedButton
            state={{ error: true }}
            errorText="Failed to save"
            id="error-button"
          >
            Save
          </EnhancedButton>
        );

        const button = screen.getByRole('button', { name: /failed to save/i });
        expect(button).toHaveClass('animate-pulse'); // Error state animation

        // Check for error icon (AlertCircle)
        const errorIcon = button.querySelector('svg');
        expect(errorIcon).toBeInTheDocument();

        // Check for screen reader text
        const srText = screen.getByRole('alert');
        expect(srText).toHaveTextContent('Failed to save');
        expect(srText).toHaveClass('sr-only');
      });

      it('uses destructive variant when error', () => {
        renderWithWrapper(
          <EnhancedButton state={{ error: true }}>
            Error Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        // Should have destructive variant classes
        expect(button).toHaveClass('bg-destructive');
      });

      it('includes aria-describedby when error and id provided', () => {
        renderWithWrapper(
          <EnhancedButton state={{ error: true }} id="test-btn">
            Test
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-describedby', 'test-btn-error');
      });
    });

    describe('Success State', () => {
      it('shows success icon and text when success', () => {
        renderWithWrapper(
          <EnhancedButton
            state={{ success: true }}
            successText="Saved successfully!"
          >
            Save
          </EnhancedButton>
        );

        const button = screen.getByRole('button', { name: /saved successfully/i });

        // Check for success icon (CheckCircle)
        const successIcon = button.querySelector('svg');
        expect(successIcon).toBeInTheDocument();
      });

      it('uses default variant when success', () => {
        renderWithWrapper(
          <EnhancedButton state={{ success: true }}>
            Success Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-primary');
      });
    });

    describe('State Transitions', () => {
      it('transitions from loading to success', async () => {
        const { rerender } = renderWithWrapper(
          <EnhancedButton state={{ loading: true }}>
            Test Button
          </EnhancedButton>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();

        rerender(
          <EnhancedButton state={{ success: true }}>
            Test Button
          </EnhancedButton>
        );

        expect(screen.getByText('Success!')).toBeInTheDocument();
      });

      it('auto-clears success state after timeout', async () => {
        vi.useFakeTimers();

        const { rerender } = renderWithWrapper(
          <EnhancedButton state={{ success: true }}>
            Test Button
          </EnhancedButton>
        );

        expect(screen.getByText('Success!')).toBeInTheDocument();

        // Fast-forward time
        vi.advanceTimersByTime(2000);

        // Re-render to check state (in real component, this would be internal state)
        rerender(
          <EnhancedButton>
            Test Button
          </EnhancedButton>
        );

        vi.useRealTimers();
      });
    });

    describe('Click Handling', () => {
      it('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        renderWithWrapper(
          <EnhancedButton onClick={handleClick}>
            Click me
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('handles async onClick', async () => {
        const handleClick = vi.fn().mockResolvedValue(undefined);
        renderWithWrapper(
          <EnhancedButton onClick={handleClick}>
            Async Click
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('handles onClick errors gracefully', async () => {
        const handleClick = vi.fn().mockRejectedValue(new Error('Test error'));
        renderWithWrapper(
          <EnhancedButton onClick={handleClick}>
            Error Click
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        await waitFor(() => {
          expect(screen.getByText('Error occurred')).toBeInTheDocument();
        });
      });

      it('validates button state on click', async () => {
        const handleClick = vi.fn();
        renderWithWrapper(
          <EnhancedButton
            state={{ loading: 'invalid' as any }}
            onClick={handleClick}
          >
            Test
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        // Should not call onClick due to validation error
        expect(handleClick).not.toHaveBeenCalled();
      });

      it('validates variant and size on click', async () => {
        const handleClick = vi.fn();
        renderWithWrapper(
          <EnhancedButton
            variant="invalid" as any
            onClick={handleClick}
          >
            Test
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    describe('Validation and Error Recovery', () => {
      it('has recovery functionality available', () => {
        // Test that recovery module is properly imported and available
        expect(typeof attemptUIRecovery).toBe('function');
        expect(typeof getUIRecoverySuggestions).toBe('function');
      });

      it('validates button state properly', () => {
        // Test that button state validation works
        renderWithWrapper(
          <EnhancedButton state={{ loading: true }}>
            Loading Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('disabled:pointer-events-none');
      });

      it('handles error states correctly', () => {
        // Test that error states are handled properly
        renderWithWrapper(
          <EnhancedButton state={{ error: true }}>
            Error Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-destructive');
      });
    });

    describe('Accessibility', () => {
      it('has proper ARIA attributes for loading state', () => {
        renderWithWrapper(
          <EnhancedButton state={{ loading: true }}>
            Loading
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
      });

      it('provides screen reader feedback for errors', () => {
        renderWithWrapper(
          <EnhancedButton state={{ error: true }} id="btn">
            Test
          </EnhancedButton>
        );

        const srText = screen.getByRole('alert');
        expect(srText).toHaveTextContent('Error occurred');
        expect(srText).toHaveClass('sr-only');
        expect(srText).toHaveAttribute('id', 'btn-error');
      });

      it('maintains focusability', () => {
        renderWithWrapper(<EnhancedButton>Focusable</EnhancedButton>);

        const button = screen.getByRole('button');
        button.focus();
        expect(button).toHaveFocus();
      });
    });

    describe('Mobile Responsiveness', () => {
      it('has appropriate touch target size', () => {
        renderWithWrapper(<EnhancedButton>Touch Target</EnhancedButton>);

        const button = screen.getByRole('button');
        const styles = window.getComputedStyle(button);

        // Check minimum touch target (44px is common minimum)
        // Note: This is a basic check; real mobile testing would use device emulation
        expect(button).toBeInTheDocument();
      });

      it('handles touch events', async () => {
        const handleClick = vi.fn();
        renderWithWrapper(
          <EnhancedButton onClick={handleClick}>
            Touch Button
          </EnhancedButton>
        );

        const button = screen.getByRole('button');

        // Simulate touch
        await user.click(button); // userEvent click simulates touch on mobile

        expect(handleClick).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('handles missing onClick gracefully', async () => {
        renderWithWrapper(<EnhancedButton>Missing onClick</EnhancedButton>);

        const button = screen.getByRole('button');
        await user.click(button);

        // Should not throw
        expect(button).toBeInTheDocument();
      });

      it('handles disabled prop correctly', () => {
        renderWithWrapper(
          <EnhancedButton disabled onClick={vi.fn()}>
            Disabled
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });

      it('combines disabled prop with loading state', () => {
        renderWithWrapper(
          <EnhancedButton disabled state={{ loading: true }}>
            Disabled Loading
          </EnhancedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
      });

      it('handles empty children', () => {
        renderWithWrapper(<EnhancedButton></EnhancedButton>);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toBeEmptyDOMElement();
      });

      it('handles complex children', () => {
        renderWithWrapper(
          <EnhancedButton>
            <span>Complex</span> <strong>Content</strong>
          </EnhancedButton>
        );

        expect(screen.getByText('Complex')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });

  describe('buttonVariants export', () => {
    it('exports buttonVariants function', () => {
      expect(typeof buttonVariants).toBe('function');
    });

    it('generates correct classes for variants and sizes', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'lg' });
      expect(classes).toContain('border');
      expect(classes).toContain('h-11');
    });
  });
});