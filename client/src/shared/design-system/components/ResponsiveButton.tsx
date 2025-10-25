/**
 * ResponsiveButton Component
 * 
 * A button component optimized for responsive design with touch-friendly
 * interactions and consistent sizing across all devices.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { useResponsive } from '../responsive';
import { buttonUtils } from './button';

interface ResponsiveButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  as: Component = 'button',
  href,
  target,
  rel,
  onClick,
  onKeyDown,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...props
}) => {
  const { isTouchDevice, prefersReducedMotion } = useResponsive();

  const getVariantClasses = () => {
    // Map component variants to design standards variants
    const variantMap = {
      primary: 'primary',
      secondary: 'secondary',
      outline: 'outline',
      ghost: 'ghost',
      destructive: 'destructive',
    } as const;

    return variantMap[variant];
  };

  const getSizeClasses = () => {
    // Map component sizes to design standards sizes
    const sizeMap = {
      small: 'sm',
      medium: 'md',
      large: 'lg',
    } as const;

    return sizeMap[size];
  };

  const getTransitionClasses = () => {
    if (prefersReducedMotion) {
      return '';
    }
    
    return 'transition-all duration-200 ease-in-out';
  };

  const getTouchClasses = () => {
    if (!isTouchDevice) return '';
    
    return [
      'touch-manipulation',
      'select-none',
      '-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1)',
    ];
  };

  const handleClick = (event: React.MouseEvent) => {
    if (disabled || loading) return;
    onClick?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || loading) return;
    
    // Handle Enter and Space key presses
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault();
      onClick(event as any);
    }
    
    onKeyDown?.(event);
  };

  const baseClasses = [
    buttonUtils.getButtonClasses(getVariantClasses(), getSizeClasses(), disabled || loading, loading),
    getTransitionClasses(),
    getTouchClasses(),
    fullWidth && 'w-full',
  ];

  const componentProps = {
    className: cn(baseClasses, className),
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    disabled: disabled || loading,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    'aria-disabled': disabled || loading,
    ...props,
  };

  if (Component === 'a') {
    return (
      <a
        {...componentProps}
        href={disabled || loading ? undefined : href}
        target={target}
        rel={rel}
        role="button"
        tabIndex={disabled || loading ? -1 : 0}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </a>
    );
  }

  return (
    <button
      {...componentProps}
      type={type}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default ResponsiveButton;