/**
 * Design System Compliance Test Suite
 * 
 * Tests that all components:
 * ✅ Use design tokens (no hardcoded colors)
 * ✅ Support all required variants
 * ✅ Have proper accessibility attributes
 * ✅ Are properly typed with TypeScript
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { designTokens, isValidColorToken } from '@client/shared/design-system/tokens/unified-export';
import {
  type ButtonVariant,
  type CardVariant,
  type InputVariant,
  type ButtonSize,
  type InputState,
} from '@client/shared/design-system/types/component-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@client/shared/design-system/primitives/button';
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/design-system/primitives/card';
import { Input } from '@client/shared/design-system/primitives/input';

/**
 * Suite 1: Design Token Validation
 * Ensures tokens are properly defined and accessible
 */
describe('Design Tokens', () => {
  it('should have all required color tokens', () => {
    expect(designTokens.colors).toBeDefined();
    expect(designTokens.colors.primary).toBeDefined();
    expect(designTokens.colors.secondary).toBeDefined();
    expect(designTokens.colors.accent).toBeDefined();
    expect(designTokens.colors.destructive).toBeDefined();
    expect(designTokens.colors.background).toBeDefined();
    expect(designTokens.colors.foreground).toBeDefined();
    expect(designTokens.colors.border).toBeDefined();
    expect(designTokens.colors.muted).toBeDefined();
    expect(designTokens.colors.mutedForeground).toBeDefined();
  });

  it('should have all required spacing tokens', () => {
    expect(designTokens.spacing).toBeDefined();
    expect(designTokens.spacing.xs).toBeDefined();
    expect(designTokens.spacing.sm).toBeDefined();
    expect(designTokens.spacing.md).toBeDefined();
    expect(designTokens.spacing.lg).toBeDefined();
    expect(designTokens.spacing.xl).toBeDefined();
  });

  it('should have all required border radius tokens', () => {
    expect(designTokens.radius).toBeDefined();
    expect(designTokens.radius.xs).toBeDefined();
    expect(designTokens.radius.sm).toBeDefined();
    expect(designTokens.radius.md).toBeDefined();
    expect(designTokens.radius.lg).toBeDefined();
    expect(designTokens.radius.full).toBeDefined();
  });

  it('should validate color token values', () => {
    expect(isValidColorToken('primary')).toBe(true);
    expect(isValidColorToken('secondary')).toBe(true);
    expect(isValidColorToken('invalid-token')).toBe(false);
  });

  it('should use CSS custom properties for colors', () => {
    const primaryColor = designTokens.colors.primary;
    expect(primaryColor).toContain('hsl(var(--color-primary))');
  });

  it('should have typography tokens', () => {
    expect(designTokens.typography).toBeDefined();
    expect(designTokens.typography.fontSize).toBeDefined();
    expect(designTokens.typography.fontWeight).toBeDefined();
  });

  it('should have breakpoint tokens', () => {
    expect(designTokens.breakpoints).toBeDefined();
    expect(designTokens.breakpoints.mobile).toBeDefined();
    expect(designTokens.breakpoints.tablet).toBeDefined();
    expect(designTokens.breakpoints.desktop).toBeDefined();
  });
});

/**
 * Suite 2: Button Component Compliance
 * Ensures Button uses tokens and supports all variants
 */
describe('Button Component', () => {
  const validVariants: ButtonVariant[] = [
    'primary',
    'secondary',
    'accent',
    'outline',
    'ghost',
    'destructive',
  ];

  const validSizes: ButtonSize[] = ['sm', 'md', 'lg', 'icon'];

  it('should render with primary variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should support all button variants', () => {
    validVariants.forEach((variant) => {
      const { unmount } = render(
        <Button variant={variant} data-testid={`button-${variant}`}>
          {variant}
        </Button>
      );
      expect(screen.getByTestId(`button-${variant}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should support all button sizes', () => {
    validSizes.forEach((size) => {
      const { unmount } = render(
        <Button size={size} data-testid={`button-size-${size}`}>
          {size}
        </Button>
      );
      expect(screen.getByTestId(`button-size-${size}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<Button>Accessible Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should support disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should support loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('should not have hardcoded colors in className', () => {
    const { container } = render(<Button>Test</Button>);
    const button = container.querySelector('button');
    const classStr = button?.className || '';

    // Should NOT contain hardcoded Tailwind color classes
    expect(classStr).not.toMatch(/bg-(red|blue|green|yellow|purple|pink)-(50|100|200|300|400|500|600|700|800|900)/);
    // Should use CSS variables instead
    expect(classStr).toContain('hsl(var(');
  });
});

/**
 * Suite 3: Card Component Compliance
 * Ensures Card uses tokens and supports variants
 */
describe('Card Component', () => {
  const validVariants: CardVariant[] = ['default', 'elevated', 'outlined', 'ghost'];

  it('should render card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Content here</CardContent>
      </Card>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('should support all card variants', () => {
    validVariants.forEach((variant) => {
      const { unmount } = render(
        <Card variant={variant} data-testid={`card-${variant}`}>
          {variant}
        </Card>
      );
      expect(screen.getByTestId(`card-${variant}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should support interactive variant', () => {
    render(
      <Card interactive data-testid="interactive-card">
        Click me
      </Card>
    );
    const card = screen.getByTestId('interactive-card');
    expect(card).toBeInTheDocument();
  });

  it('should have proper semantic structure', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );

    const header = container.querySelector('[class*="border-b"]');
    expect(header).toBeInTheDocument();
  });

  it('should not have hardcoded colors', () => {
    const { container } = render(
      <Card>
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = container.querySelector('[class*="rounded"]');
    const classStr = card?.className || '';

    // Should NOT contain hardcoded colors
    expect(classStr).not.toMatch(/bg-(white|gray|blue)/);
    // Should use CSS variables
    expect(classStr).toContain('hsl(var(');
  });
});

/**
 * Suite 4: Input Component Compliance
 * Ensures Input uses tokens and supports variants
 */
describe('Input Component', () => {
  const validVariants: InputVariant[] = ['default', 'filled', 'outlined'];
  const validStates: InputState[] = ['default', 'error', 'success', 'disabled'];

  it('should render input field', () => {
    render(<Input placeholder="Enter text" data-testid="input-field" />);
    expect(screen.getByTestId('input-field')).toBeInTheDocument();
  });

  it('should support all input variants', () => {
    validVariants.forEach((variant) => {
      const { unmount } = render(
        <Input variant={variant} placeholder={variant} data-testid={`input-${variant}`} />
      );
      expect(screen.getByTestId(`input-${variant}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('should support all input states', () => {
    validStates.forEach((state) => {
      if (state === 'disabled') {
        const { unmount } = render(
          <Input disabled placeholder={state} data-testid={`input-${state}`} />
        );
        expect(screen.getByTestId(`input-${state}`)).toBeDisabled();
        unmount();
      } else {
        const { unmount } = render(
          <Input state={state} placeholder={state} data-testid={`input-${state}`} />
        );
        expect(screen.getByTestId(`input-${state}`)).toBeInTheDocument();
        unmount();
      }
    });
  });

  it('should display helper text', () => {
    render(
      <Input
        placeholder="Email"
        state="error"
        helperText="Email is required"
        data-testid="input-with-helper"
      />
    );
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('should support user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" data-testid="input-interactive" />);

    const input = screen.getByTestId('input-interactive') as HTMLInputElement;
    await user.type(input, 'test input');

    expect(input.value).toBe('test input');
  });

  it('should not have hardcoded colors', () => {
    const { container } = render(<Input placeholder="Test" />);
    const input = container.querySelector('input');
    const classStr = input?.className || '';

    // Should NOT contain hardcoded colors
    expect(classStr).not.toMatch(/border-(red|blue|green)/);
    // Should use CSS variables
    expect(classStr).toContain('hsl(var(');
  });
});

/**
 * Suite 5: Accessibility Compliance
 * Ensures all components meet WCAG standards
 */
describe('Accessibility Compliance', () => {
  it('button should have proper roles and attributes', () => {
    render(<Button>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('input should be accessible', () => {
    render(<Input aria-label="Email input" placeholder="email@example.com" />);
    const input = screen.getByLabelText('Email input');
    expect(input).toBeInTheDocument();
  });

  it('card title should be heading', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Accessible Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('disabled inputs should have proper attributes', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});

/**
 * Suite 6: Type Safety Compliance
 * Ensures components enforce type safety
 */
describe('Type Safety', () => {
  it('should accept valid button variants at compile time', () => {
    const validVariant: ButtonVariant = 'primary';
    render(<Button variant={validVariant}>Safe</Button>);
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('should accept valid card variants at compile time', () => {
    const validVariant: CardVariant = 'elevated';
    render(<Card variant={validVariant}>Safe</Card>);
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('should accept valid input variants at compile time', () => {
    const validVariant: InputVariant = 'filled';
    render(<Input variant={validVariant} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
