/**
 * Auth button component with loading states
 * Following navigation component patterns for UI components
 */

import { Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import { Button } from '../../../ui/button';

export interface AuthButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  onClick,
}) => {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8',
  };

  return (
    <Button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <Loader2 className={cn(
          'animate-spin',
          size === 'sm' ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'
        )} />
      )}
      {children}
    </Button>
  );
};

// Specialized button components
export const SubmitButton: React.FC<Omit<AuthButtonProps, 'type'> & {
  mode: 'login' | 'register';
}> = ({ mode, loading, children, ...props }) => (
  <AuthButton
    {...props}
    type="submit"
    variant="primary"
    loading={loading}
    className="w-full"
  >
    {children || (loading
      ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
      : (mode === 'login' ? 'Sign In' : 'Create Account')
    )}
  </AuthButton>
);

export const ModeToggleButton: React.FC<{
  currentMode: 'login' | 'register';
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ currentMode, onToggle, disabled = false, className }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={cn(
      'font-medium text-primary hover:text-primary/80 transition-colors',
      'focus:outline-none focus:underline',
      'disabled:opacity-50 disabled:pointer-events-none',
      className
    )}
    data-testid="auth-toggle-button"
  >
    {currentMode === 'login' ? 'Sign up' : 'Sign in'}
  </button>
);

export const RetryButton: React.FC<{
  onRetry: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ onRetry, loading = false, disabled = false, className }) => (
  <AuthButton
    type="button"
    variant="outline"
    size="sm"
    loading={loading}
    disabled={disabled}
    onClick={onRetry}
    className={className}
  >
    {loading ? 'Retrying...' : 'Try Again'}
  </AuthButton>
);