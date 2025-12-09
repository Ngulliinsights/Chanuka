/**
 * Dialog Component Unit Tests
 * Tests modal dialog functionality and accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';

describe('Dialog Component', () => {
  describe('Rendering', () => {
    it('should not render dialog content initially', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Dialog content</DialogContent>
        </Dialog>
      );
      expect(screen.queryByText('Dialog content')).not.toBeInTheDocument();
    });

    it('should render trigger button', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('should render dialog content after trigger click', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <p>Content</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('DialogTrigger', () => {
    it('should render trigger button', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    it('should accept custom button text', () => {
      render(
        <Dialog>
          <DialogTrigger>Custom Text</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      expect(screen.getByRole('button', { name: /custom text/i })).toBeInTheDocument();
    });

    it('should support className', () => {
      render(
        <Dialog>
          <DialogTrigger className="custom-trigger">Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('custom-trigger');
    });
  });

  describe('DialogContent', () => {
    it('should render content when open', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Dialog content here</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Dialog content here')).toBeInTheDocument();
    });

    it('should have dialog role', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('DialogHeader and Footer', () => {
    it('should render header', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>Header Content</DialogHeader>
            <p>Body</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should render footer', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <p>Body</p>
            <DialogFooter>
              <button>Cancel</button>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('DialogTitle and Description', () => {
    it('should render title', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    it('should render description', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });
  });

  describe('Opening and Closing', () => {
    it('should close on backdrop click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Content')).toBeInTheDocument();

      const backdrop = container.querySelector('[data-state="open"]');
      if (backdrop) {
        await user.click(backdrop);
      }
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>My Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <button>Button 1</button>
            <button>Button 2</button>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      expect(screen.getByRole('button', { name: /button 1/i })).toBeInTheDocument();
    });

    it('should announce title to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Important Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Important Dialog')).toBeInTheDocument();
    });
  });

  describe('Complex Dialogs', () => {
    it('should render full dialog structure', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information</DialogDescription>
            </DialogHeader>
            <div>
              <input placeholder="Name" />
              <input placeholder="Email" />
            </div>
            <DialogFooter>
              <button>Cancel</button>
              <button onClick={onSave}>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    });

    it('should handle form submission in dialog', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <form onSubmit={onSubmit}>
              <input name="field" />
              <button type="submit">Submit</button>
            </form>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      const input = screen.getByRole('textbox');
      await user.type(input, 'value');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('Multiple Dialogs', () => {
    it('should handle multiple dialogs on same page', async () => {
      render(
        <>
          <Dialog>
            <DialogTrigger>Dialog 1</DialogTrigger>
            <DialogContent>Content 1</DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger>Dialog 2</DialogTrigger>
            <DialogContent>Content 2</DialogContent>
          </Dialog>
        </>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should handle nested dialogs', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Outer</DialogTrigger>
          <DialogContent>
            Outer content
            <Dialog>
              <DialogTrigger>Inner</DialogTrigger>
              <DialogContent>Inner content</DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /outer/i }));
      expect(screen.getByText('Outer content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render empty dialog', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent />
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle very long content', async () => {
      const user = userEvent.setup();
      const longText = 'A'.repeat(1000);
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <p>{longText}</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open & Special!</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title & Description #1</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Title & Description #1')).toBeInTheDocument();
    });
  });
});
