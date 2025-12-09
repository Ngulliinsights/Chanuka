/**
 * Alert Component Unit Tests
 * Tests alert messaging and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert Component', () => {
  describe('Rendering', () => {
    it('should render alert container', () => {
      const { container } = render(
        <Alert>
          <AlertDescription>Alert content</AlertDescription>
        </Alert>
      );
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    it('should render with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Alert Title</AlertTitle>
          <AlertDescription>Alert description</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
      expect(screen.getByText('Alert description')).toBeInTheDocument();
    });

    it('should render description only', () => {
      render(
        <Alert>
          <AlertDescription>Just description</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Just description')).toBeInTheDocument();
    });

    it('should support custom children', () => {
      render(
        <Alert>
          <div className="custom-content">Custom</div>
        </Alert>
      );
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(
        <Alert>
          <AlertDescription>Default alert</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Default alert')).toBeInTheDocument();
    });

    it('should render destructive variant', () => {
      render(
        <Alert variant="destructive">
          <AlertDescription>Error alert</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Error alert')).toBeInTheDocument();
    });

    it('should render success variant', () => {
      render(
        <Alert variant="success">
          <AlertDescription>Success alert</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Success alert')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      render(
        <Alert variant="warning">
          <AlertDescription>Warning alert</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Warning alert')).toBeInTheDocument();
    });

    it('should render info variant', () => {
      render(
        <Alert variant="info">
          <AlertDescription>Info alert</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Info alert')).toBeInTheDocument();
    });
  });

  describe('AlertTitle', () => {
    it('should render title element', () => {
      render(
        <Alert>
          <AlertTitle>Title Text</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('should support className', () => {
      render(
        <Alert>
          <AlertTitle className="custom-title">Title</AlertTitle>
        </Alert>
      );
      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });

    it('should work with heading semantics', () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Heading</AlertTitle>
        </Alert>
      );
      const heading = container.querySelector('h4, h5, h6, div[role="heading"]');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('AlertDescription', () => {
    it('should render description element', () => {
      render(
        <Alert>
          <AlertDescription>Description text</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should support className', () => {
      render(
        <Alert>
          <AlertDescription className="custom-desc">Desc</AlertDescription>
        </Alert>
      );
      const desc = screen.getByText('Desc');
      expect(desc).toHaveClass('custom-desc');
    });

    it('should support complex content', () => {
      render(
        <Alert>
          <AlertDescription>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      const { container } = render(
        <Alert>
          <AlertDescription>Alert message</AlertDescription>
        </Alert>
      );
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    it('should announce to screen readers', () => {
      render(
        <Alert role="alert" aria-live="polite">
          <AlertDescription>Important message</AlertDescription>
        </Alert>
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should support aria-label', () => {
      render(
        <Alert aria-label="Error notification">
          <AlertDescription>An error occurred</AlertDescription>
        </Alert>
      );
      expect(screen.getByLabelText('Error notification')).toBeInTheDocument();
    });

    it('should announce errors assertively', () => {
      render(
        <Alert role="alert" aria-live="assertive" variant="destructive">
          <AlertDescription>Critical error</AlertDescription>
        </Alert>
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('With Actions', () => {
    it('should support action buttons', () => {
      const onClose = vi.fn();
      render(
        <Alert>
          <AlertDescription>Alert with action</AlertDescription>
          <button onClick={onClose}>Dismiss</button>
        </Alert>
      );
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('should trigger action on click', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <Alert>
          <AlertDescription>Alert</AlertDescription>
          <button onClick={onAction}>Action</button>
        </Alert>
      );

      await user.click(screen.getByRole('button', { name: /action/i }));
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should render empty alert', () => {
      const { container } = render(<Alert />);
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longText = 'A'.repeat(1000);
      render(
        <Alert>
          <AlertDescription>{longText}</AlertDescription>
        </Alert>
      );
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(
        <Alert>
          <AlertTitle>Error & Warning!</AlertTitle>
          <AlertDescription>Check the <code>error</code> message</AlertDescription>
        </Alert>
      );
      expect(screen.getByText('Error & Warning!')).toBeInTheDocument();
    });

    it('should render multiple alerts', () => {
      render(
        <>
          <Alert variant="success">
            <AlertDescription>Success 1</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertDescription>Error 1</AlertDescription>
          </Alert>
        </>
      );
      expect(screen.getByText('Success 1')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
    });
  });
});

/**
 * Badge Component Unit Tests
 * Tests badge display and variations
 */

import { Badge } from './badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge element', () => {
      render(<Badge>Badge</Badge>);
      expect(screen.getByText('Badge')).toBeInTheDocument();
    });

    it('should render with text content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render with element children', () => {
      render(
        <Badge>
          <span>Badge content</span>
        </Badge>
      );
      expect(screen.getByText('Badge content')).toBeInTheDocument();
    });

    it('should accept className', () => {
      render(
        <Badge className="custom-badge">Badge</Badge>
      );
      const badge = screen.getByText('Badge');
      expect(badge).toHaveClass('custom-badge');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should render primary variant', () => {
      render(<Badge variant="default">Primary</Badge>);
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should render destructive variant', () => {
      render(<Badge variant="destructive">Delete</Badge>);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should display count badge', () => {
      render(<Badge>5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display label badge', () => {
      render(<Badge variant="secondary">Featured</Badge>);
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should support icon and text', () => {
      render(
        <Badge>
          <span>🔔</span>
          <span>New</span>
        </Badge>
      );
      expect(screen.getByText('🔔')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should handle multiword text', () => {
      render(<Badge>In Progress</Badge>);
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  describe('Sizing', () => {
    it('should render default size', () => {
      render(<Badge>Normal</Badge>);
      expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('should render small size', () => {
      render(<Badge size="sm">Small</Badge>);
      expect(screen.getByText('Small')).toBeInTheDocument();
    });

    it('should render large size', () => {
      render(<Badge size="lg">Large</Badge>);
      expect(screen.getByText('Large')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate role', () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Badge aria-label="5 new messages">5</Badge>);
      expect(screen.getByLabelText('5 new messages')).toBeInTheDocument();
    });

    it('should announce count to screen readers', () => {
      render(
        <div>
          Messages <Badge aria-label="3 unread">3</Badge>
        </div>
      );
      expect(screen.getByLabelText('3 unread')).toBeInTheDocument();
    });

    it('should have visible text for status', () => {
      render(<Badge variant="success">Online</Badge>);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work in navigation', () => {
      render(
        <nav>
          <a href="#">Notifications <Badge>3</Badge></a>
        </nav>
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should work in lists', () => {
      render(
        <ul>
          <li>Item 1 <Badge variant="success">Done</Badge></li>
          <li>Item 2 <Badge variant="warning">Pending</Badge></li>
        </ul>
      );
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should work in tables', () => {
      render(
        <table>
          <tbody>
            <tr>
              <td>Status</td>
              <td><Badge variant="success">Active</Badge></td>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should work multiple per page', () => {
      render(
        <>
          <Badge variant="destructive">Critical</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="success">Success</Badge>
        </>
      );
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty badge', () => {
      render(<Badge />);
      expect(screen.getByRole('status', { hidden: true }) || document.querySelector('[class*="badge"]')).toBeInTheDocument();
    });

    it('should handle single character', () => {
      render(<Badge>A</Badge>);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(<Badge>!</Badge>);
      expect(screen.getByText('!')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(<Badge>✓</Badge>);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should handle emoji', () => {
      render(<Badge>🎉</Badge>);
      expect(screen.getByText('🎉')).toBeInTheDocument();
    });

    it('should handle long text', () => {
      const longText = 'A'.repeat(100);
      render(<Badge>{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
