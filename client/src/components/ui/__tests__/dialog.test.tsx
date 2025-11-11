/**
 * Comprehensive tests for Dialog components
 * Covers basic dialog functionality, enhanced dialog features, accessibility, and error handling
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  EnhancedDialog,
} from '../dialog';
import { renderWithWrapper, spyOnConsole } from './test-utils';

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

vi.mock('../recovery', () => ({
  attemptUIRecovery: vi.fn(),
  getUIRecoverySuggestions: vi.fn()
}));

vi.mock('../errors', () => ({
  UIDialogError: class UIDialogError extends Error {
    constructor(component: string, action: string, reason: string, details?: any) {
      super(reason);
      this.name = 'UIDialogError';
    }
  }
}));

describe('Basic Dialog Components', () => {
  const user = userEvent.setup();

  describe('Dialog Structure', () => {
    it('renders dialog with trigger and content', async () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogHeader>
            <p>Dialog content</p>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();

      // Dialog should not be visible initially
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', async () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    it('closes dialog when close button is clicked', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Dialog Title')).toBeInTheDocument();

      await user.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Components', () => {
    it('DialogHeader applies correct classes', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header">Header Content</DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });

    it('DialogTitle applies correct classes and semantic role', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle data-testid="title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg', 'font-semibold');
      expect(title.tagName).toBe('H2');
    });

    it('DialogDescription applies correct classes', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription data-testid="desc">Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('DialogFooter applies correct classes', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter data-testid="footer">Footer Content</DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'flex-col-reverse');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('close button has screen reader text', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Close')).toBeInTheDocument();
      const srText = screen.getByText('Close');
      expect(srText).toHaveClass('sr-only');
    });

    it('supports keyboard navigation', async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <button>Focusable Button</button>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByText('Close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });
});

describe('EnhancedDialog Component', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = spyOnConsole();
  });

  afterEach(() => {
    consoleSpy.restore();
    vi.clearAllMocks();
  });

  it('renders with basic props', () => {
    renderWithWrapper(
      <EnhancedDialog
        title="Test Dialog"
        description="Test description"
        open={true}
      >
        <p>Content</p>
      </EnhancedDialog>
    );

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows confirm and cancel buttons', () => {
    renderWithWrapper(
      <EnhancedDialog
        title="Confirm Dialog"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  describe('Loading State', () => {
    it('shows loading spinner and disables buttons when loading', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Loading Dialog"
          open={true}
          loading={true}
          onConfirm={vi.fn()}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      // Check for loading spinner
      const spinner = confirmButton.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message with icon', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Error Dialog"
          open={true}
          error="Something went wrong"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Check for error icon in title
      const title = screen.getByText('Error Dialog');
      const icon = title.parentElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      renderWithWrapper(
        <EnhancedDialog
          title="Confirm Dialog"
          open={true}
          onConfirm={onConfirm}
          onOpenChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('Confirm'));

      expect(onConfirm).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      renderWithWrapper(
        <EnhancedDialog
          title="Cancel Dialog"
          open={true}
          onCancel={onCancel}
          onOpenChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('closes dialog after successful confirmation', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onOpenChange = vi.fn();

      renderWithWrapper(
        <EnhancedDialog
          title="Success Dialog"
          open={true}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('handles confirmation errors', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockRejectedValue(new Error('Confirm failed'));

      renderWithWrapper(
        <EnhancedDialog
          title="Error Dialog"
          open={true}
          onConfirm={onConfirm}
        />
      );

      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Confirm failed')).toBeInTheDocument();
      });
    });
  });

  describe('Validation and Error Recovery', () => {
    it('validates props on mount', () => {
      renderWithWrapper(
        <EnhancedDialog
          title=""
          open={true}
        />
      );

      // Should handle invalid title gracefully
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('attempts recovery on validation errors', async () => {
      const user = userEvent.setup();
      const mockRecovery = vi.fn().mockResolvedValue({ success: true });

      vi.mocked(require('../recovery').attemptUIRecovery).mockImplementation(mockRecovery);

      renderWithWrapper(
        <EnhancedDialog
          title="Recovery Test"
          open={true}
          onConfirm={vi.fn().mockRejectedValue(new Error('Test error'))}
        />
      );

      await user.click(screen.getByText('Confirm'));

      expect(mockRecovery).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Accessible Dialog"
          open={true}
        />
      );

      const title = screen.getByText('Accessible Dialog');
      expect(title.tagName).toBe('H2');
    });

    it('error messages are properly announced', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Error Dialog"
          open={true}
          error="Validation error"
        />
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('Validation error');
    });

    it('buttons have proper focus management', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Focus Dialog"
          open={true}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');

      confirmButton.focus();
      expect(confirmButton).toHaveFocus();

      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
    });
  });

  describe('Customization', () => {
    it('accepts custom button text', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Custom Dialog"
          open={true}
          confirmText="Yes"
          cancelText="No"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="Custom Class Dialog"
          open={true}
          className="custom-dialog"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-dialog');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onConfirm gracefully', () => {
      renderWithWrapper(
        <EnhancedDialog
          title="No Confirm Dialog"
          open={true}
        />
      );

      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('prevents actions during loading', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      renderWithWrapper(
        <EnhancedDialog
          title="Loading Dialog"
          open={true}
          loading={true}
          onConfirm={onConfirm}
        />
      );

      await user.click(screen.getByText('Confirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('handles async operations', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithWrapper(
        <EnhancedDialog
          title="Async Dialog"
          open={true}
          onConfirm={onConfirm}
        />
      );

      await user.click(screen.getByText('Confirm'));

      expect(screen.getByText('Confirm')).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Confirm')).not.toBeDisabled();
      });
    });
  });
});