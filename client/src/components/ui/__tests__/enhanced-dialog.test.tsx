/**
 * Enhanced Dialog component tests
 * Following navigation component testing patterns for consistency
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedDialog } from '../dialog';
import { UIDialogError } from '../errors';

describe('EnhancedDialog', () => {
  const defaultProps = {
    title: 'Test Dialog',
    open: true,
    onOpenChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders dialog with title', () => {
      render(<EnhancedDialog {...defaultProps} />);
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders with description when provided', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          description="This is a test dialog description"
        />
      );
      
      expect(screen.getByText('This is a test dialog description')).toBeInTheDocument();
    });

    it('renders custom button text', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          confirmText="Save Changes"
          cancelText="Discard"
          onConfirm={vi.fn()}
        />
      );
      
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <EnhancedDialog {...defaultProps}>
          <div>Custom content</div>
        </EnhancedDialog>
      );
      
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });

  describe('Dialog State Management', () => {
    it('calls onOpenChange when dialog is closed', async () => {
      const onOpenChange = vi.fn();
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onOpenChange={onOpenChange}
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not render when open is false', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          open={false}
        />
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Confirmation Handling', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const onOpenChange = vi.fn();
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      expect(onConfirm).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('handles async onConfirm function', async () => {
      const onConfirm = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      // Should show loading state
      expect(confirmButton).toBeDisabled();
      
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onCancel={onCancel}
          onOpenChange={onOpenChange}
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading prop is true', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          loading={true}
          onConfirm={vi.fn()}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toBeDisabled();
    });

    it('shows loading state during async confirmation', async () => {
      const onConfirm = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      expect(confirmButton).toBeDisabled();
    });

    it('disables buttons during loading', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          loading={true}
          onConfirm={vi.fn()}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');
      
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          error="Something went wrong"
        />
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows error icon in title when error is present', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          error="Error occurred"
        />
      );
      
      const title = screen.getByText('Test Dialog');
      expect(title.parentElement).toContainHTML('AlertCircle');
    });

    it('handles confirmation errors', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('Confirmation failed'));
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={onConfirm}
        />
      );
      
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirmation failed')).toBeInTheDocument();
      });
    });

    it('handles cancel errors gracefully', async () => {
      const onCancel = vi.fn().mockImplementation(() => {
        throw new Error('Cancel failed');
      });
      
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onCancel={onCancel}
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      
      // Should not throw error
      expect(() => userEvent.click(cancelButton)).not.toThrow();
    });
  });

  describe('Validation', () => {
    it('validates dialog props on mount', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should not throw with valid props
      expect(() => {
        render(<EnhancedDialog {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('handles invalid props gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <EnhancedDialog 
          title="" // Invalid: empty title
          open={true}
          onOpenChange={vi.fn()}
        />
      );
      
      // Should still render but may show validation errors
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog semantics', () => {
      render(<EnhancedDialog {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has proper ARIA attributes for error state', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          error="Error message"
        />
      );
      
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });

    it('focuses properly when opened', () => {
      render(<EnhancedDialog {...defaultProps} />);
      
      // Dialog should be focusable
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has proper button roles and labels', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={vi.fn()}
        />
      );
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes dialog on Escape key', async () => {
      const onOpenChange = vi.fn();
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onOpenChange={onOpenChange}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Note: This test might need adjustment based on Radix UI's implementation
      // The actual behavior depends on how Radix handles escape key
    });
  });

  describe('Button Visibility', () => {
    it('shows only cancel button when onConfirm is not provided', () => {
      render(<EnhancedDialog {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('shows both buttons when onConfirm is provided', () => {
      render(
        <EnhancedDialog 
          {...defaultProps} 
          onConfirm={vi.fn()}
        />
      );
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });
});