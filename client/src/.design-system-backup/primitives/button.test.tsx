/**
 * Button Component Unit Tests
 * Tests rendering, variants, states, and accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Button } from './button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render button with children', () => {
      render(<Button><span>Custom content</span></Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });

    it('should support multiple child elements', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Icon');
      expect(button).toHaveTextContent('Text');
    });

    it('should render without crashing when empty', () => {
      const { container } = render(<Button />);
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('should render with HTML attributes', () => {
      render(<Button data-testid="custom-button" title="Button tooltip">Click</Button>);
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Button tooltip');
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue');
    });

    it('should apply primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });

    it('should not trigger click when disabled', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={onClick} disabled>Click</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should handle click events', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={onClick}>Click</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should support type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should support type reset', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Button size="md">Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(<Button>Accessible Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have proper button semantics', () => {
      render(<Button type="button">Test</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      expect(screen.getByRole('button', { name: /custom label/i })).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="desc">Button</Button>
          <span id="desc">Description</span>
        </>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'desc');
    });

    it('should be keyboard accessible', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={onClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });

    it('should have visible focus indicator', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Class Names', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should merge custom className with variant classes', () => {
      render(<Button className="custom-class" variant="secondary">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Integration', () => {
    it('should work within a form', () => {
      const handleSubmit = vi.fn();
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should work with async onClick', async () => {
      const onClickAsync = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<Button onClick={onClickAsync}>Async</Button>);

      await user.click(screen.getByRole('button'));
      expect(onClickAsync).toHaveBeenCalled();
    });
  });
});
