/**
 * Visual Regression Tests for Unified Components
 * Ensures styling consistency across component migrations
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, describe, it, beforeEach } from 'vitest';
import {
  UnifiedButton,
  UnifiedCard,
  UnifiedCardHeader,
  UnifiedCardTitle,
  UnifiedCardDescription,
  UnifiedCardContent,
  UnifiedCardFooter,
  UnifiedBadge
} from '@client/components/ui/unified-components';

// Mock CSS custom properties for testing
const mockCSSProperties = {
  '--color-primary': '213 94% 23%',
  '--color-primary-foreground': '0 0% 100%',
  '--color-secondary': '196 100% 18%',
  '--color-secondary-foreground': '0 0% 100%',
  '--color-accent': '28 94% 54%',
  '--color-accent-foreground': '0 0% 100%',
  '--color-success': '142 71% 45%',
  '--color-warning': '43 96% 56%',
  '--color-error': '0 84% 60%',
  '--color-background': '210 20% 98%',
  '--color-foreground': '0 0% 10%',
  '--color-muted': '210 20% 97%',
  '--color-muted-foreground': '215 16% 47%',
  '--color-border': '214 32% 91%',
  '--radius-sm': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
  '--radius-full': '9999px',
  '--touch-target-min': '44px',
  '--touch-target-recommended': '48px',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
  '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.07)',
  '--duration-normal': '250ms'
};

describe('UnifiedButton Visual Tests', () => {
  beforeEach(() => {
    // Apply CSS custom properties to document root
    Object.entries(mockCSSProperties).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  });

  it('renders primary button with correct styling', () => {
    render(<UnifiedButton variant="primary">Primary Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Primary Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-[hsl(var(--color-primary))]');
    expect(button).toHaveClass('text-[hsl(var(--color-primary-foreground))]');
    expect(button).toHaveClass('min-h-[var(--touch-target-min)]');
  });

  it('renders secondary button with correct styling', () => {
    render(<UnifiedButton variant="secondary">Secondary Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Secondary Button' });
    expect(button).toHaveClass('bg-[hsl(var(--color-secondary))]');
    expect(button).toHaveClass('text-[hsl(var(--color-secondary-foreground))]');
  });

  it('renders accent button with correct styling', () => {
    render(<UnifiedButton variant="accent">Accent Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Accent Button' });
    expect(button).toHaveClass('bg-[hsl(var(--color-accent))]');
    expect(button).toHaveClass('text-[hsl(var(--color-accent-foreground))]');
  });

  it('renders success button with correct styling', () => {
    render(<UnifiedButton variant="success">Success Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Success Button' });
    expect(button).toHaveClass('bg-[hsl(var(--color-success))]');
    expect(button).toHaveClass('text-white');
  });

  it('renders warning button with correct styling', () => {
    render(<UnifiedButton variant="warning">Warning Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Warning Button' });
    expect(button).toHaveClass('bg-[hsl(var(--color-warning))]');
    expect(button).toHaveClass('text-black');
  });

  it('renders error button with correct styling', () => {
    render(<UnifiedButton variant="error">Error Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Error Button' });
    expect(button).toHaveClass('bg-[hsl(var(--color-error))]');
    expect(button).toHaveClass('text-white');
  });

  it('renders outline button with correct styling', () => {
    render(<UnifiedButton variant="outline">Outline Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Outline Button' });
    expect(button).toHaveClass('border-[hsl(var(--color-border))]');
    expect(button).toHaveClass('bg-transparent');
  });

  it('renders ghost button with correct styling', () => {
    render(<UnifiedButton variant="ghost">Ghost Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Ghost Button' });
    expect(button).toHaveClass('hover:bg-[hsl(var(--color-muted))]');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<UnifiedButton size="sm">Small</UnifiedButton>);
    let button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-9', 'px-3', 'text-xs');

    rerender(<UnifiedButton size="default">Default</UnifiedButton>);
    button = screen.getByRole('button', { name: 'Default' });
    expect(button).toHaveClass('h-10', 'px-4', 'py-2');

    rerender(<UnifiedButton size="lg">Large</UnifiedButton>);
    button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-11', 'px-8', 'text-base');
    expect(button).toHaveClass('min-h-[var(--touch-target-recommended)]');

    rerender(<UnifiedButton size="icon">🔍</UnifiedButton>);
    button = screen.getByRole('button', { name: '🔍' });
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('handles disabled state correctly', () => {
    render(<UnifiedButton disabled>Disabled Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
  });
});

describe('UnifiedCard Visual Tests', () => {
  beforeEach(() => {
    Object.entries(mockCSSProperties).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  });

  it('renders card with correct base styling', () => {
    render(
      <UnifiedCard data-testid="test-card">
        <UnifiedCardContent>Card content</UnifiedCardContent>
      </UnifiedCard>
    );
    
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('bg-[hsl(var(--color-background))]');
    expect(card).toHaveClass('text-[hsl(var(--color-foreground))]');
    expect(card).toHaveClass('border', 'border-[hsl(var(--color-border))]');
    expect(card).toHaveClass('rounded-[var(--radius-lg)]');
    expect(card).toHaveClass('shadow-[var(--shadow-sm)]');
  });

  it('renders card header with correct styling', () => {
    render(
      <UnifiedCard>
        <UnifiedCardHeader data-testid="card-header">
          <UnifiedCardTitle>Card Title</UnifiedCardTitle>
          <UnifiedCardDescription>Card Description</UnifiedCardDescription>
        </UnifiedCardHeader>
      </UnifiedCard>
    );
    
    const header = screen.getByTestId('card-header');
    expect(header).toHaveClass('bg-[hsl(var(--color-muted))]');
    expect(header).toHaveClass('border-b', 'border-[hsl(var(--color-border))]');
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
  });

  it('renders card title with correct styling', () => {
    render(
      <UnifiedCard>
        <UnifiedCardHeader>
          <UnifiedCardTitle>Test Title</UnifiedCardTitle>
        </UnifiedCardHeader>
      </UnifiedCard>
    );
    
    const title = screen.getByText('Test Title');
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    expect(title).toHaveClass('text-[hsl(var(--color-foreground))]');
  });

  it('renders card description with correct styling', () => {
    render(
      <UnifiedCard>
        <UnifiedCardHeader>
          <UnifiedCardDescription>Test Description</UnifiedCardDescription>
        </UnifiedCardHeader>
      </UnifiedCard>
    );
    
    const description = screen.getByText('Test Description');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-[hsl(var(--color-muted-foreground))]');
  });

  it('renders card content with correct styling', () => {
    render(
      <UnifiedCard>
        <UnifiedCardContent data-testid="card-content">
          Content text
        </UnifiedCardContent>
      </UnifiedCard>
    );
    
    const content = screen.getByTestId('card-content');
    expect(content).toHaveClass('p-6', 'pt-0');
  });

  it('renders card footer with correct styling', () => {
    render(
      <UnifiedCard>
        <UnifiedCardFooter data-testid="card-footer">
          Footer content
        </UnifiedCardFooter>
      </UnifiedCard>
    );
    
    const footer = screen.getByTestId('card-footer');
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    expect(footer).toHaveClass('bg-[hsl(var(--color-muted))]');
    expect(footer).toHaveClass('border-t', 'border-[hsl(var(--color-border))]');
  });
});

describe('UnifiedBadge Visual Tests', () => {
  beforeEach(() => {
    Object.entries(mockCSSProperties).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  });

  it('renders default badge with correct styling', () => {
    render(<UnifiedBadge>Default Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Default Badge');
    expect(badge).toHaveClass('inline-flex', 'items-center');
    expect(badge).toHaveClass('rounded-[var(--radius-full)]');
    expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs', 'font-medium');
    expect(badge).toHaveClass('bg-[hsl(var(--color-primary))]');
    expect(badge).toHaveClass('text-[hsl(var(--color-primary-foreground))]');
  });

  it('renders secondary badge with correct styling', () => {
    render(<UnifiedBadge variant="secondary">Secondary Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Secondary Badge');
    expect(badge).toHaveClass('bg-[hsl(var(--color-muted))]');
    expect(badge).toHaveClass('text-[hsl(var(--color-muted-foreground))]');
  });

  it('renders success badge with correct styling', () => {
    render(<UnifiedBadge variant="success">Success Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Success Badge');
    expect(badge).toHaveClass('bg-[hsl(var(--color-success))]');
    expect(badge).toHaveClass('text-white');
  });

  it('renders warning badge with correct styling', () => {
    render(<UnifiedBadge variant="warning">Warning Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Warning Badge');
    expect(badge).toHaveClass('bg-[hsl(var(--color-warning))]');
    expect(badge).toHaveClass('text-black');
  });

  it('renders error badge with correct styling', () => {
    render(<UnifiedBadge variant="error">Error Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Error Badge');
    expect(badge).toHaveClass('bg-[hsl(var(--color-error))]');
    expect(badge).toHaveClass('text-white');
  });

  it('renders outline badge with correct styling', () => {
    render(<UnifiedBadge variant="outline">Outline Badge</UnifiedBadge>);
    
    const badge = screen.getByText('Outline Badge');
    expect(badge).toHaveClass('text-[hsl(var(--color-foreground))]');
    expect(badge).toHaveClass('border', 'border-[hsl(var(--color-border))]');
  });
});

describe('Component Integration Tests', () => {
  beforeEach(() => {
    Object.entries(mockCSSProperties).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  });

  it('renders complex card composition correctly', () => {
    render(
      <UnifiedCard data-testid="complex-card">
        <UnifiedCardHeader>
          <div className="flex justify-between items-start">
            <div>
              <UnifiedCardTitle>Complex Card Title</UnifiedCardTitle>
              <UnifiedCardDescription>
                This is a complex card with multiple elements
              </UnifiedCardDescription>
            </div>
            <UnifiedBadge variant="success">Active</UnifiedBadge>
          </div>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <p>This card demonstrates the integration of multiple unified components.</p>
        </UnifiedCardContent>
        <UnifiedCardFooter>
          <UnifiedButton variant="primary">Primary Action</UnifiedButton>
          <UnifiedButton variant="outline">Secondary Action</UnifiedButton>
        </UnifiedCardFooter>
      </UnifiedCard>
    );

    // Verify all components are rendered
    expect(screen.getByTestId('complex-card')).toBeInTheDocument();
    expect(screen.getByText('Complex Card Title')).toBeInTheDocument();
    expect(screen.getByText('This is a complex card with multiple elements')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();

    // Verify styling consistency
    const card = screen.getByTestId('complex-card');
    expect(card).toHaveClass('bg-[hsl(var(--color-background))]');
    
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('bg-[hsl(var(--color-success))]');
    
    const primaryButton = screen.getByRole('button', { name: 'Primary Action' });
    expect(primaryButton).toHaveClass('bg-[hsl(var(--color-primary))]');
    
    const secondaryButton = screen.getByRole('button', { name: 'Secondary Action' });
    expect(secondaryButton).toHaveClass('border-[hsl(var(--color-border))]');
  });

  it('maintains accessibility attributes', () => {
    render(
      <UnifiedCard role="article" aria-labelledby="card-title">
        <UnifiedCardHeader>
          <UnifiedCardTitle id="card-title">Accessible Card</UnifiedCardTitle>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <UnifiedButton 
            variant="primary"
            aria-label="Perform primary action"
          >
            Action
          </UnifiedButton>
        </UnifiedCardContent>
      </UnifiedCard>
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    
    const button = screen.getByRole('button', { name: 'Perform primary action' });
    expect(button).toHaveAttribute('aria-label', 'Perform primary action');
  });
});

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    Object.entries(mockCSSProperties).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  });

  it('applies touch-friendly sizing', () => {
    render(<UnifiedButton>Touch Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Touch Button' });
    expect(button).toHaveClass('min-h-[var(--touch-target-min)]');
  });

  it('applies recommended touch sizing for large buttons', () => {
    render(<UnifiedButton size="lg">Large Touch Button</UnifiedButton>);
    
    const button = screen.getByRole('button', { name: 'Large Touch Button' });
    expect(button).toHaveClass('min-h-[var(--touch-target-recommended)]');
  });

  it('maintains consistent spacing across components', () => {
    render(
      <div>
        <UnifiedButton className="mb-4">Button 1</UnifiedButton>
        <UnifiedCard>
          <UnifiedCardContent className="p-6">
            Card content with consistent padding
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    );

    const button = screen.getByRole('button', { name: 'Button 1' });
    expect(button).toHaveClass('px-4', 'py-2');
    
    const cardContent = screen.getByText('Card content with consistent padding');
    expect(cardContent.parentElement).toHaveClass('p-6');
  });
});