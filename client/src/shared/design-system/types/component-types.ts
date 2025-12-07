/**
 * Type-safe component variant definitions
 * Ensures components only use valid design tokens
 */

import { designTokens } from '../tokens/unified-export';

// Valid button variants
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'ghost'
  | 'outline'
  | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonState =
  | 'default'
  | 'hover'
  | 'active'
  | 'disabled'
  | 'focus'
  | 'loading';

export interface ButtonConfig {
  variant: ButtonVariant;
  size: ButtonSize;
  state?: ButtonState;
  disabled?: boolean;
  loading?: boolean;
}

// Valid card variants
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardInteractivity = 'none' | 'hoverable' | 'clickable';

export interface CardConfig {
  variant: CardVariant;
  interactive?: CardInteractivity;
}

// Valid input variants
export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'error'
  | 'success'
  | 'disabled';

export interface InputConfig {
  variant?: InputVariant;
  state?: InputState;
  size?: 'sm' | 'md' | 'lg';
}

// Color variants - ONLY from design tokens
export type ColorVariant = keyof typeof designTokens.colors;
export type SpacingValue = keyof typeof designTokens.spacing;
export type BreakpointValue = keyof typeof designTokens.breakpoints;

/**
 * Utility type to ensure only valid tokens are used
 */
export type ValidColorValue =
  | `hsl(var(--color-primary))`
  | `hsl(var(--color-secondary))`
  | `hsl(var(--color-accent))`
  | `hsl(var(--color-success))`
  | `hsl(var(--color-warning))`
  | `hsl(var(--color-error))`
  | `hsl(var(--color-info))`
  | `hsl(var(--color-background))`
  | `hsl(var(--color-foreground))`;

/**
 * Constrain color usage to only design tokens
 */
export function isValidColorToken(color: string): boolean {
  const validTokens = [
    'hsl(var(--color-primary))',
    'hsl(var(--color-secondary))',
    'hsl(var(--color-accent))',
    'hsl(var(--color-success))',
    'hsl(var(--color-warning))',
    'hsl(var(--color-error))',
    'hsl(var(--color-info))',
    'hsl(var(--color-background))',
    'hsl(var(--color-foreground))',
    'hsl(var(--color-card))',
    'hsl(var(--color-border))',
    'hsl(var(--color-muted))',
    'hsl(var(--color-muted-foreground))',
  ];
  return validTokens.includes(color);
}
