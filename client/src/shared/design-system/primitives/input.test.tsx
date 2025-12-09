/**
 * Input Component Unit Tests
 * Tests form input functionality, validation, and accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Input } from './input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toBeInTheDocument();
    });

    it('should render with type attribute', () => {
      render(<Input type="email" data-testid="email-input" />);
      const input = screen.getByTestId('email-input') as HTMLInputElement;
      expect(input.type).toBe('email');
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text..." data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Enter text...');
    });

    it('should render with value', () => {
      render(<Input value="default value" readOnly data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('default value');
    });

    it('should render input variations', () => {
      const types = ['text', 'email', 'password', 'number', 'tel', 'url'];
      types.forEach((type) => {
        const { container } = render(<Input type={type} />);
        const input = container.querySelector('input');
        expect(input).toHaveAttribute('type', type);
      });
    });
  });

  describe('User Interaction', () => {
    it('should handle text input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input onChange={onChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Hello');

      expect(onChange).toHaveBeenCalled();
      expect((input as HTMLInputElement).value).toBe('Hello');
    });

    it('should handle character by character input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input onChange={onChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Test');

      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle paste events', async () => {
      const user = userEvent.setup();
      const onPaste = vi.fn();
      render(<Input onPaste={onPaste} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.click(input);
      await user.paste('pasted text');

      expect(onPaste).toHaveBeenCalled();
    });

    it('should handle focus and blur', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <Input onFocus={onFocus} onBlur={onBlur} data-testid="input" />
      );

      const input = screen.getByTestId('input');
      await user.click(input);
      expect(onFocus).toHaveBeenCalled();

      await user.click(document.body);
      expect(onBlur).toHaveBeenCalled();
    });

    it('should clear input when cleared', async () => {
      const user = userEvent.setup();
      render(
        <Input defaultValue="initial" data-testid="input" />
      );

      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('initial');

      await user.clear(input);
      expect(input.value).toBe('');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input disabled onChange={onChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'text', { skipClick: true });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should be read-only when readOnly prop is true', () => {
      render(<Input readOnly value="read-only" data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });

    it('should not allow editing when read-only', async () => {
      const user = userEvent.setup();
      render(
        <Input readOnly value="fixed" data-testid="input" />
      );

      const input = screen.getByTestId('input');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect((input as HTMLInputElement).value).toBe('fixed');
    });

    it('should support required attribute', () => {
      render(<Input required data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.required).toBe(true);
    });
  });

  describe('Input Types', () => {
    it('should handle email input validation', () => {
      render(<Input type="email" data-testid="email" />);
      const input = screen.getByTestId('email') as HTMLInputElement;
      expect(input.type).toBe('email');
    });

    it('should handle password input', () => {
      render(<Input type="password" data-testid="password" />);
      const input = screen.getByTestId('password') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('should handle number input', () => {
      render(<Input type="number" data-testid="number" />);
      const input = screen.getByTestId('number') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('should handle search input', () => {
      render(<Input type="search" data-testid="search" />);
      const input = screen.getByTestId('search') as HTMLInputElement;
      expect(input.type).toBe('search');
    });

    it('should handle tel input', () => {
      render(<Input type="tel" data-testid="tel" />);
      const input = screen.getByTestId('tel') as HTMLInputElement;
      expect(input.type).toBe('tel');
    });

    it('should handle url input', () => {
      render(<Input type="url" data-testid="url" />);
      const input = screen.getByTestId('url') as HTMLInputElement;
      expect(input.type).toBe('url');
    });
  });

  describe('Props', () => {
    it('should accept and apply className', () => {
      render(
        <Input className="custom-input" data-testid="input" />
      );
      expect(screen.getByTestId('input')).toHaveClass('custom-input');
    });

    it('should support id attribute', () => {
      render(<Input id="unique-id" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('id', 'unique-id');
    });

    it('should support name attribute', () => {
      render(<Input name="input-name" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('name', 'input-name');
    });

    it('should support min/max attributes for number', () => {
      render(
        <Input type="number" min="1" max="100" data-testid="input" />
      );
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should support step attribute for number', () => {
      render(<Input type="number" step="0.5" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('step', '0.5');
    });

    it('should support autoComplete attribute', () => {
      render(
        <Input autoComplete="email" data-testid="input" />
      );
      expect(screen.getByTestId('input')).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.tagName).toBe('INPUT');
    });

    it('should support aria-label', () => {
      render(
        <Input aria-label="Username" data-testid="input" />
      );
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" data-testid="input" />
          <span id="help-text">Enter your email</span>
        </>
      );
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      input.focus();
      expect(input).toHaveFocus();

      await user.keyboard('a');
      expect((input as HTMLInputElement).value).toBe('a');
    });

    it('should have visible focus state', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');

      input.focus();
      expect(input).toHaveFocus();
    });

    it('should announce disabled state to screen readers', () => {
      render(<Input disabled aria-label="Disabled field" data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work in a form', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <form onSubmit={onSubmit}>
          <Input name="field" data-testid="input" />
          <button type="submit">Submit</button>
        </form>
      );

      const input = screen.getByTestId('input');
      await user.type(input, 'value');
      await user.click(screen.getByRole('button'));

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should work with controlled component pattern', async () => {
      const user = userEvent.setup();
      let value = '';
      const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      };

      const { rerender } = render(
        <Input value={value} onChange={onChange} data-testid="input" />
      );

      const input = screen.getByTestId('input');
      await user.type(input, 'test');
      
      rerender(
        <Input value={value} onChange={onChange} data-testid="input" />
      );

      expect((input as HTMLInputElement).value).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(1000);
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, longText);

      expect((input as HTMLInputElement).value).toBe(longText);
    });

    it('should handle special characters', async () => {
      const user = userEvent.setup();
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, specialChars);

      expect((input as HTMLInputElement).value).toBe(specialChars);
    });

    it('should handle unicode characters', async () => {
      const user = userEvent.setup();
      const unicodeText = '你好世界🌍';
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, unicodeText);

      expect((input as HTMLInputElement).value).toBe(unicodeText);
    });

    it('should handle rapid input changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input onChange={onChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'rapid');

      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });
});
