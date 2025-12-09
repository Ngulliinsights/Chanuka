/**
 * Checkbox Component Unit Tests
 * Tests checkbox state management and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox Component', () => {
  describe('Rendering', () => {
    it('should render checkbox element', () => {
      render(<Checkbox data-testid="checkbox" />);
      expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      render(<Checkbox data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should render with id', () => {
      render(<Checkbox id="test-checkbox" data-testid="checkbox" />);
      expect(screen.getByTestId('checkbox')).toHaveAttribute('id', 'test-checkbox');
    });
  });

  describe('Checked State', () => {
    it('should render checked checkbox', () => {
      render(<Checkbox checked data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should handle onChange event', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} data-testid="checkbox" />);

      await user.click(screen.getByTestId('checkbox'));
      expect(onChange).toHaveBeenCalled();
    });

    it('should toggle checked state', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Checkbox checked={false} data-testid="checkbox" />
      );

      let checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      rerender(<Checkbox checked={true} data-testid="checkbox" />);
      checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should handle indeterminate state', () => {
      render(<Checkbox indeterminate data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should render disabled checkbox', () => {
      render(<Checkbox disabled data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('should not respond to clicks when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checkbox disabled onChange={onChange} data-testid="checkbox" />);

      await user.click(screen.getByTestId('checkbox'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show disabled styling', () => {
      render(<Checkbox disabled data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have checkbox role', () => {
      render(<Checkbox data-testid="checkbox" />);
      expect(screen.getByTestId('checkbox')).toHaveAttribute('type', 'checkbox');
    });

    it('should work with label', () => {
      render(
        <>
          <Checkbox id="terms" data-testid="checkbox" />
          <label htmlFor="terms">I agree to terms</label>
        </>
      );
      expect(screen.getByLabelText('I agree to terms')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(
        <Checkbox aria-label="Accept terms" data-testid="checkbox" />
      );
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Checkbox aria-describedby="desc" data-testid="checkbox" />
          <span id="desc">Terms description</span>
        </>
      );
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'desc');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      checkbox.focus();
      expect(checkbox).toHaveFocus();

      await user.keyboard(' ');
      expect(onChange).toHaveBeenCalled();
    });

    it('should announce checked state', () => {
      render(
        <Checkbox checked aria-label="Enable notifications" data-testid="checkbox" />
      );
      const checkbox = screen.getByLabelText('Enable notifications') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work in forms', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <form onSubmit={onSubmit}>
          <Checkbox name="agree" data-testid="checkbox" />
          <button type="submit">Submit</button>
        </form>
      );

      await user.click(screen.getByTestId('checkbox'));
      await user.click(screen.getByRole('button'));
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should work with checkbox groups', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Checkbox id="option1" data-testid="checkbox1" />
          <label htmlFor="option1">Option 1</label>
          <Checkbox id="option2" data-testid="checkbox2" />
          <label htmlFor="option2">Option 2</label>
        </div>
      );

      await user.click(screen.getByTestId('checkbox1'));
      await user.click(screen.getByTestId('checkbox2'));

      expect((screen.getByTestId('checkbox1') as HTMLInputElement).checked).toBe(true);
      expect((screen.getByTestId('checkbox2') as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Checkbox onChange={onChange} data-testid="checkbox" />);

      const checkbox = screen.getByTestId('checkbox');
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle className prop', () => {
      render(<Checkbox className="custom-checkbox" data-testid="checkbox" />);
      expect(screen.getByTestId('checkbox')).toHaveClass('custom-checkbox');
    });
  });
});

/**
 * Switch Component Unit Tests
 * Tests toggle switch functionality
 */

import { Switch } from './switch';

describe('Switch Component', () => {
  describe('Rendering', () => {
    it('should render switch element', () => {
      const { container } = render(<Switch data-testid="switch" />);
      expect(container.querySelector('[role="switch"]')).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      const { container } = render(<Switch data-testid="switch" />);
      const switchEl = container.querySelector('[role="switch"]');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Checked State', () => {
    it('should render checked switch', () => {
      const { container } = render(<Switch checked data-testid="switch" />);
      const switchEl = container.querySelector('[role="switch"]');
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should toggle on click', async () => {
      const user = userEvent.setup();
      const { container } = render(<Switch data-testid="switch" />);

      const switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });

    it('should handle onChange', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<Switch onChange={onChange} data-testid="switch" />);

      const switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      await user.click(switchEl);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should render disabled switch', () => {
      const { container } = render(<Switch disabled data-testid="switch" />);
      const switchEl = container.querySelector('[role="switch"]');
      expect(switchEl).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <Switch disabled onChange={onChange} data-testid="switch" />
      );

      const switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      await user.click(switchEl);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have switch role', () => {
      const { container } = render(<Switch data-testid="switch" />);
      expect(container.querySelector('[role="switch"]')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      const { container } = render(
        <Switch aria-label="Dark mode" data-testid="switch" />
      );
      expect(container.querySelector('[aria-label="Dark mode"]')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const { container } = render(<Switch data-testid="switch" />);

      const switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      switchEl.focus();
      expect(switchEl).toHaveFocus();

      await user.keyboard(' ');
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Integration', () => {
    it('should work for feature toggles', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <div>
          <label>Enable notifications</label>
          <Switch onChange={onChange} data-testid="switch" />
        </div>
      );

      const switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      await user.click(switchEl);
      expect(onChange).toHaveBeenCalled();
    });

    it('should work for theme switching', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(
        <Switch checked={false} data-testid="switch" />
      );

      let switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      rerender(<Switch checked={true} data-testid="switch" />);
      switchEl = container.querySelector('[role="switch"]') as HTMLElement;
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });
});

/**
 * Tooltip Component Unit Tests
 * Tests tooltip display and accessibility
 */

import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

describe('Tooltip Component', () => {
  describe('Rendering', () => {
    it('should not show tooltip by default', () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });

    it('should render trigger element', () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      );
      expect(screen.getByText('Hover me')).toBeInTheDocument();
    });
  });

  describe('Showing/Hiding', () => {
    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByText('Hover me');
      await user.hover(trigger);
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    it('should hide tooltip on unhover', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByText('Hover me');
      await user.hover(trigger);
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();

      await user.unhover(trigger);
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('should display text content', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Help</TooltipTrigger>
          <TooltipContent>This is help text</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Help'));
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('should display element content', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Info</TooltipTrigger>
          <TooltipContent>
            <div>Complex <span>content</span></div>
          </TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Info'));
      expect(screen.getByText('Complex')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have tooltip role', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Hover'));
      expect(container.querySelector('[role="tooltip"]')).toBeInTheDocument();
    });

    it('should support aria-describedby', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>Button</TooltipTrigger>
          <TooltipContent id="tooltip-desc">Description</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Button'));
      expect(container.querySelector('[id="tooltip-desc"]')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Button</TooltipTrigger>
          <TooltipContent>Tooltip</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByText('Button');
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should work with buttons', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Delete</button>
          </TooltipTrigger>
          <TooltipContent>This action cannot be undone</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByRole('button'));
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
    });

    it('should work with icons', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>ℹ️</TooltipTrigger>
          <TooltipContent>More information</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('ℹ️'));
      expect(screen.getByText('More information')).toBeInTheDocument();
    });

    it('should work with disabled buttons', () => {
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button disabled>Can't click</button>
          </TooltipTrigger>
          <TooltipContent>This is disabled</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', async () => {
      const user = userEvent.setup();
      const longText = 'A'.repeat(500);
      render(
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>{longText}</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Hover'));
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle rapid hover/unhover', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      );

      const trigger = screen.getByText('Hover');
      await user.hover(trigger);
      await user.unhover(trigger);
      await user.hover(trigger);
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
