/**
 * Comprehensive tests for Unified Components
 * Focus on enhanced Shadcn features, civic-specific variants, error recovery, and accessibility compliance
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UnifiedButton,
  unifiedButtonVariants,
  UnifiedCard,
  UnifiedCardHeader,
  UnifiedCardTitle,
  UnifiedCardDescription,
  UnifiedCardContent,
  UnifiedCardFooter,
  UnifiedBadge,
  unifiedBadgeVariants,
  UnifiedInput,
  UnifiedAlert,
  unifiedAlertVariants,
  UnifiedAlertTitle,
  UnifiedAlertDescription,
  UnifiedTabs,
  UnifiedTabsList,
  UnifiedTabsTrigger,
  UnifiedTabsContent,
  UnifiedAccordion,
  UnifiedAccordionTrigger,
  UnifiedAccordionContent,
  UnifiedAccordionGroup,
  UnifiedToolbar,
  UnifiedToolbarButton,
  UnifiedToolbarSeparator
} from '@client/unified-components';
import { renderWithWrapper, spyOnConsole } from '@client/test-utils';

// Mock dependencies
vi.mock('../../../lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('Unified Components', () => {
  const user = userEvent.setup();
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = spyOnConsole();
  });

  afterEach(() => {
    consoleSpy.restore();
    vi.clearAllMocks();
  });

  describe('UnifiedButton Component', () => {
    describe('Civic-Specific Variants', () => {
      it('renders voteYes variant with correct styling', () => {
        renderWithWrapper(
          <UnifiedButton variant="voteYes">Vote Yes</UnifiedButton>
        );

        const button = screen.getByRole('button', { name: /vote yes/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('bg-green-600', 'text-white');
      });

      it('renders voteNo variant with correct styling', () => {
        renderWithWrapper(
          <UnifiedButton variant="voteNo">Vote No</UnifiedButton>
        );

        const button = screen.getByRole('button', { name: /vote no/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('bg-red-600', 'text-white');
      });

      it('renders voteAbstain variant with correct styling', () => {
        renderWithWrapper(
          <UnifiedButton variant="voteAbstain">Abstain</UnifiedButton>
        );

        const button = screen.getByRole('button', { name: /abstain/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('bg-gray-600', 'text-white');
      });

      it('handles loading state with civic variants', () => {
        renderWithWrapper(
          <UnifiedButton variant="voteYes" loading>
            Vote Yes
          </UnifiedButton>
        );

        const button = screen.getByRole('button', { name: /vote yes/i });
        expect(button).toBeDisabled();

        const spinner = button.querySelector('svg');
        expect(spinner).toBeInTheDocument();
      });
    });

    describe('Accessibility Features', () => {
      it('has proper focus-visible styles', () => {
        renderWithWrapper(<UnifiedButton>Focus Test</UnifiedButton>);

        const button = screen.getByRole('button', { name: /focus test/i });
        expect(button).toHaveClass('focus-visible:outline-none');
        expect(button).toHaveClass('focus-visible:ring-2');
        expect(button).toHaveClass('focus-visible:ring-offset-2');
      });

      it('maintains keyboard navigation', async () => {
        renderWithWrapper(<UnifiedButton>Keyboard Test</UnifiedButton>);

        const button = screen.getByRole('button', { name: /keyboard test/i });

        // Test that button can receive focus programmatically
        button.focus();
        expect(document.activeElement).toBe(button);
      });

      it('has minimum touch target size', () => {
        renderWithWrapper(<UnifiedButton>Touch Target</UnifiedButton>);

        const button = screen.getByRole('button');
        // Check for min-h-[var(--touch-target-min)] class
        expect(button).toHaveClass('min-h-[var(--touch-target-min)]');
      });

      it('supports screen reader with aria-label', () => {
        renderWithWrapper(
          <UnifiedButton aria-label="Submit form">Submit</UnifiedButton>
        );

        const button = screen.getByRole('button', { name: /submit form/i });
        expect(button).toHaveAttribute('aria-label', 'Submit form');
      });
    });

    describe('Error Recovery', () => {
      it('handles disabled state correctly', () => {
        renderWithWrapper(
          <UnifiedButton disabled>Disabled Button</UnifiedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveClass('disabled:pointer-events-none');
      });

      it('combines loading and disabled states', () => {
        renderWithWrapper(
          <UnifiedButton disabled loading>
            Loading Disabled
          </UnifiedButton>
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('UnifiedBadge Component', () => {
    describe('Legislative Variants', () => {
      const legislativeVariants = [
        'legislativeIntroduced',
        'legislativePassed',
        'legislativeFailed',
        'legislativePending',
        'legislativeWithdrawn'
      ] as const;

      legislativeVariants.forEach(variant => {
        it(`renders ${variant} variant correctly`, () => {
          renderWithWrapper(
            <UnifiedBadge variant={variant}>
              {variant.replace('legislative', '').toUpperCase()}
            </UnifiedBadge>
          );

          const badge = screen.getByText(variant.replace('legislative', '').toUpperCase());
          expect(badge).toBeInTheDocument();
          expect(badge).toHaveClass('inline-flex', 'items-center');
        });
      });

      it('legislativeIntroduced has blue styling', () => {
        renderWithWrapper(
          <UnifiedBadge variant="legislativeIntroduced">INTRODUCED</UnifiedBadge>
        );

        const badge = screen.getByText('INTRODUCED');
        expect(badge).toHaveClass('bg-blue-600', 'text-white');
      });

      it('legislativePassed has green styling', () => {
        renderWithWrapper(
          <UnifiedBadge variant="legislativePassed">PASSED</UnifiedBadge>
        );

        const badge = screen.getByText('PASSED');
        expect(badge).toHaveClass('bg-green-600', 'text-white');
      });

      it('legislativeFailed has red styling', () => {
        renderWithWrapper(
          <UnifiedBadge variant="legislativeFailed">FAILED</UnifiedBadge>
        );

        const badge = screen.getByText('FAILED');
        expect(badge).toHaveClass('bg-red-600', 'text-white');
      });

      it('legislativePending has yellow styling', () => {
        renderWithWrapper(
          <UnifiedBadge variant="legislativePending">PENDING</UnifiedBadge>
        );

        const badge = screen.getByText('PENDING');
        expect(badge).toHaveClass('bg-yellow-500', 'text-black');
      });

      it('legislativeWithdrawn has gray styling', () => {
        renderWithWrapper(
          <UnifiedBadge variant="legislativeWithdrawn">WITHDRAWN</UnifiedBadge>
        );

        const badge = screen.getByText('WITHDRAWN');
        expect(badge).toHaveClass('bg-gray-500', 'text-white');
      });
    });

    describe('Error Handling', () => {
      it('switches to error variant when error prop is true', () => {
        renderWithWrapper(
          <UnifiedBadge error={true} variant="default">
            Error Badge
          </UnifiedBadge>
        );

        const badge = screen.getByText('Error Badge');
        expect(badge).toHaveClass('bg-[hsl(var(--color-error))]', 'text-white');
      });

      it('overrides variant with error when both provided', () => {
        renderWithWrapper(
          <UnifiedBadge error={true} variant="success">
            Error Override
          </UnifiedBadge>
        );

        const badge = screen.getByText('Error Override');
        expect(badge).toHaveClass('bg-[hsl(var(--color-error))]', 'text-white');
        expect(badge).not.toHaveClass('bg-[hsl(var(--color-success))]');
      });
    });

    describe('Accessibility', () => {
      it('has focus-visible styles', () => {
        renderWithWrapper(<UnifiedBadge>Focusable Badge</UnifiedBadge>);

        const badge = screen.getByText('Focusable Badge');
        expect(badge).toHaveClass('focus:outline-none');
        expect(badge).toHaveClass('focus:ring-2');
        expect(badge).toHaveClass('focus:ring-offset-2');
      });

      it('supports custom className', () => {
        renderWithWrapper(
          <UnifiedBadge className="custom-badge">Custom</UnifiedBadge>
        );

        const badge = screen.getByText('Custom');
        expect(badge).toHaveClass('custom-badge');
      });
    });
  });

  describe('UnifiedTabsContent Component', () => {
    describe('Error Recovery Mechanism', () => {
      it('displays error message when error prop is true', () => {
        renderWithWrapper(
          <UnifiedTabs value="tab1">
            <UnifiedTabsContent value="tab1" error={true} errorMessage="Failed to load content">
              Normal content
            </UnifiedTabsContent>
          </UnifiedTabs>
        );

        expect(screen.getByText('Failed to load content')).toBeInTheDocument();
        expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
      });

      it('shows default error message when errorMessage not provided', () => {
        renderWithWrapper(
          <UnifiedTabs value="tab1">
            <UnifiedTabsContent value="tab1" error={true}>
              Normal content
            </UnifiedTabsContent>
          </UnifiedTabs>
        );

        expect(screen.getByText('Error loading tab content')).toBeInTheDocument();
      });

      it('renders children when error is false', () => {
        renderWithWrapper(
          <UnifiedTabs value="tab1">
            <UnifiedTabsContent value="tab1" error={false}>
              Normal content
            </UnifiedTabsContent>
          </UnifiedTabs>
        );

        expect(screen.getByText('Normal content')).toBeInTheDocument();
        expect(screen.queryByText('Error loading tab content')).not.toBeInTheDocument();
      });

      it('defaults to no error state', () => {
        renderWithWrapper(
          <UnifiedTabs value="tab1">
            <UnifiedTabsContent value="tab1">
              Default content
            </UnifiedTabsContent>
          </UnifiedTabs>
        );

        expect(screen.getByText('Default content')).toBeInTheDocument();
      });
    });

    describe('Accessibility', () => {
      it('has focus-visible styles', () => {
        renderWithWrapper(
          <UnifiedTabs value="tab1">
            <UnifiedTabsContent value="tab1">
              Focusable content
            </UnifiedTabsContent>
          </UnifiedTabs>
        );

        const content = screen.getByText('Focusable content').closest('[data-state]');
        expect(content).toHaveClass('focus-visible:outline-none');
        expect(content).toHaveClass('focus-visible:ring-2');
        expect(content).toHaveClass('focus-visible:ring-offset-2');
      });
    });
  });

  describe('UnifiedAlert Component', () => {
    describe('Accessibility Compliance', () => {
      it('has role="alert" for screen readers', () => {
        renderWithWrapper(
          <UnifiedAlert>
            <UnifiedAlertTitle>Alert Title</UnifiedAlertTitle>
            <UnifiedAlertDescription>Alert description</UnifiedAlertDescription>
          </UnifiedAlert>
        );

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });

      it('supports different variants with proper styling', () => {
        const variants = ['default', 'destructive', 'success', 'warning', 'info'] as const;

        variants.forEach(variant => {
          const { rerender } = renderWithWrapper(
            <UnifiedAlert variant={variant}>
              <UnifiedAlertTitle>{variant} Alert</UnifiedAlertTitle>
            </UnifiedAlert>
          );

          const alert = screen.getByRole('alert');
          expect(alert).toBeInTheDocument();
          expect(alert).toHaveTextContent(`${variant} Alert`);

          rerender(<div></div>);
        });
      });

      it('destructive variant has error styling', () => {
        renderWithWrapper(
          <UnifiedAlert variant="destructive">
            <UnifiedAlertTitle>Error Alert</UnifiedAlertTitle>
          </UnifiedAlert>
        );

        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('border-[hsl(var(--color-error))]/50');
        expect(alert).toHaveClass('text-[hsl(var(--color-error))]');
      });

      it('success variant has success styling', () => {
        renderWithWrapper(
          <UnifiedAlert variant="success">
            <UnifiedAlertTitle>Success Alert</UnifiedAlertTitle>
          </UnifiedAlert>
        );

        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('border-[hsl(var(--color-success))]/50');
        expect(alert).toHaveClass('text-[hsl(var(--color-success))]');
      });
    });
  });

  describe('UnifiedInput Component', () => {
    describe('Accessibility Features', () => {
      it('has proper focus-visible styles', () => {
        renderWithWrapper(<UnifiedInput placeholder="Test input" />);

        const input = screen.getByPlaceholderText('Test input');
        expect(input).toHaveClass('focus-visible:outline-none');
        expect(input).toHaveClass('focus-visible:ring-2');
        expect(input).toHaveClass('focus-visible:ring-offset-2');
      });

      it('supports disabled state', () => {
        renderWithWrapper(<UnifiedInput disabled placeholder="Disabled input" />);

        const input = screen.getByPlaceholderText('Disabled input');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled:cursor-not-allowed');
        expect(input).toHaveClass('disabled:opacity-50');
      });

      it('supports different input types', () => {
        renderWithWrapper(<UnifiedInput type="email" placeholder="Email input" />);

        const input = screen.getByPlaceholderText('Email input');
        expect(input).toHaveAttribute('type', 'email');
      });

      it('has proper placeholder text styling', () => {
        renderWithWrapper(<UnifiedInput placeholder="Placeholder text" />);

        const input = screen.getByPlaceholderText('Placeholder text');
        expect(input).toHaveClass('placeholder:text-[hsl(var(--color-muted-foreground))]');
      });
    });
  });

  describe('UnifiedCard Component', () => {
    describe('Hover and Focus States', () => {
      it('has hover shadow effect', () => {
        renderWithWrapper(
          <UnifiedCard>
            <UnifiedCardContent>Card content</UnifiedCardContent>
          </UnifiedCard>
        );

        // Find the card by its background class
        const card = document.querySelector('.bg-\\[hsl\\(var\\(--color-background\\)\\)\\]');
        expect(card).toHaveClass('hover:shadow-[var(--shadow-md)]');
        expect(card).toHaveClass('transition-all');
      });

      it('has border color change on hover', () => {
        renderWithWrapper(
          <UnifiedCard>
            <UnifiedCardContent>Card content</UnifiedCardContent>
          </UnifiedCard>
        );

        // Find the card by its background class
        const card = document.querySelector('.bg-\\[hsl\\(var\\(--color-background\\)\\)\\]');
        expect(card).toHaveClass('hover:border-[hsl(var(--color-border)/0.8)]');
      });

      it('supports card header with proper spacing', () => {
        renderWithWrapper(
          <UnifiedCard>
            <UnifiedCardHeader>
              <UnifiedCardTitle>Card Title</UnifiedCardTitle>
              <UnifiedCardDescription>Card description</UnifiedCardDescription>
            </UnifiedCardHeader>
            <UnifiedCardContent>Content</UnifiedCardContent>
            <UnifiedCardFooter>Footer</UnifiedCardFooter>
          </UnifiedCard>
        );

        expect(screen.getByText('Card Title')).toBeInTheDocument();
        expect(screen.getByText('Card description')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
      });
    });
  });

  describe('UnifiedAccordionGroup Component', () => {
    const mockItems = [
      {
        id: 'item1',
        title: 'First Item',
        content: 'First item content'
      },
      {
        id: 'item2',
        title: 'Second Item',
        content: 'Second item content'
      }
    ];

    it('renders all accordion items', () => {
      renderWithWrapper(<UnifiedAccordionGroup items={mockItems} />);

      expect(screen.getByText('First Item')).toBeInTheDocument();
      expect(screen.getByText('Second Item')).toBeInTheDocument();
    });

    it('wraps items in UnifiedCard components', () => {
      renderWithWrapper(<UnifiedAccordionGroup items={mockItems} />);

      const cards = screen.getAllByRole('button').map(btn => btn.closest('.bg-background'));
      expect(cards).toHaveLength(2);
    });

    it('supports defaultOpen prop', () => {
      const itemsWithDefaultOpen = [
        { ...mockItems[0], defaultOpen: true },
        mockItems[1]
      ];

      renderWithWrapper(<UnifiedAccordionGroup items={itemsWithDefaultOpen} />);

      // First item should be open by default
      expect(screen.getByText('First item content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithWrapper(
        <UnifiedAccordionGroup items={mockItems} className="custom-accordion" />
      );

      const container = screen.getByText('First Item').closest('.space-y-2');
      expect(container).toHaveClass('custom-accordion');
    });
  });

  describe('UnifiedToolbar Component', () => {
    it('renders horizontal layout by default', () => {
      renderWithWrapper(
        <UnifiedToolbar>
          <UnifiedToolbarButton>Button 1</UnifiedToolbarButton>
          <UnifiedToolbarSeparator />
          <UnifiedToolbarButton>Button 2</UnifiedToolbarButton>
        </UnifiedToolbar>
      );

      const toolbar = screen.getByText('Button 1').closest('div');
      expect(toolbar).toHaveClass('flex');
      expect(toolbar).not.toHaveClass('flex-col');
    });

    it('renders vertical layout when specified', () => {
      renderWithWrapper(
        <UnifiedToolbar orientation="vertical">
          <UnifiedToolbarButton>Button 1</UnifiedToolbarButton>
          <UnifiedToolbarSeparator />
          <UnifiedToolbarButton>Button 2</UnifiedToolbarButton>
        </UnifiedToolbar>
      );

      const toolbar = screen.getByText('Button 1').closest('div');
      expect(toolbar).toHaveClass('flex-col');
    });

    it('renders toolbar buttons with proper styling', () => {
      renderWithWrapper(
        <UnifiedToolbar>
          <UnifiedToolbarButton>Test Button</UnifiedToolbarButton>
        </UnifiedToolbar>
      );

      const button = screen.getByRole('button', { name: /test button/i });
      expect(button).toHaveClass('hover:bg-[hsl(var(--color-accent))]');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('renders separator with proper styling', () => {
      renderWithWrapper(
        <UnifiedToolbar>
          <UnifiedToolbarSeparator />
        </UnifiedToolbar>
      );

      const separator = document.querySelector('.mx-1.h-6.w-px');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass('bg-[hsl(var(--color-border))]');
    });

    it('supports active button state', () => {
      renderWithWrapper(
        <UnifiedToolbar>
          <UnifiedToolbarButton variant="active">Active Button</UnifiedToolbarButton>
        </UnifiedToolbar>
      );

      const button = screen.getByRole('button', { name: /active button/i });
      expect(button).toHaveClass('bg-[hsl(var(--color-accent))]');
      expect(button).toHaveClass('text-[hsl(var(--color-accent-foreground))]');
    });
  });

  describe('Variant Exports', () => {
    it('exports unifiedButtonVariants function', () => {
      expect(typeof unifiedButtonVariants).toBe('function');
    });

    it('exports unifiedBadgeVariants function', () => {
      expect(typeof unifiedBadgeVariants).toBe('function');
    });

    it('exports unifiedAlertVariants function', () => {
      expect(typeof unifiedAlertVariants).toBe('function');
    });

    it('unifiedButtonVariants generates civic variant classes', () => {
      const voteYesClasses = unifiedButtonVariants({ variant: 'voteYes' });
      expect(voteYesClasses).toContain('bg-green-600');

      const voteNoClasses = unifiedButtonVariants({ variant: 'voteNo' });
      expect(voteNoClasses).toContain('bg-red-600');

      const voteAbstainClasses = unifiedButtonVariants({ variant: 'voteAbstain' });
      expect(voteAbstainClasses).toContain('bg-gray-600');
    });

    it('unifiedBadgeVariants generates legislative variant classes', () => {
      const legislativeClasses = unifiedBadgeVariants({ variant: 'legislativeIntroduced' });
      expect(legislativeClasses).toContain('bg-blue-600');

      const passedClasses = unifiedBadgeVariants({ variant: 'legislativePassed' });
      expect(passedClasses).toContain('bg-green-600');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty props gracefully', () => {
      renderWithWrapper(<UnifiedButton />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles undefined children', () => {
      renderWithWrapper(<UnifiedBadge>{undefined}</UnifiedBadge>);
      const badge = document.querySelector('.inline-flex');
      expect(badge).toBeInTheDocument();
    });

    it('handles complex children in buttons', () => {
      renderWithWrapper(
        <UnifiedButton>
          <span>Complex</span> <strong>Button</strong>
        </UnifiedButton>
      );

      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('handles missing items in AccordionGroup', () => {
      renderWithWrapper(<UnifiedAccordionGroup items={[]} />);

      const container = document.querySelector('.space-y-2');
      expect(container).toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });

    it('handles invalid variant gracefully', () => {
      // @ts-expect-error Testing invalid variant
      renderWithWrapper(<UnifiedButton variant="invalid">Invalid</UnifiedButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Should fall back to default variant
    });
  });
});