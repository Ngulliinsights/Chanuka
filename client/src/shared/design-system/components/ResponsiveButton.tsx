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
    const variantMap = {
      primary: [
        'bg-blue-600 text-white border-blue-600',
        'hover:bg-blue-700 hover:border-blue-700',
        'focus:ring-blue-500',
        'active:bg-blue-800',
        'disabled:bg-blue-300 disabled:border-blue-300',
      ],
      secondary: [
        'bg-gray-600 text-white border-gray-600',
        'hover:bg-gray-700 hover:border-gray-700',
        'focus:ring-gray-500',
        'active:bg-gray-800',
        'disabled:bg-gray-300 disabled:border-gray-300',
      ],
      outline: [
        'bg-transparent text-gray-700 border-gray-300',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:ring-gray-500',
        'active:bg-gray-100',
        'disabled:text-gray-400 disabled:border-gray-200',
        'dark:text-gray-300 dark:border-gray-600',
        'dark:hover:bg-gray-800 dark:hover:border-gray-500',
        'dark:active:bg-gray-700',
      ],
      ghost: [
        'bg-transparent text-gray-700 border-transparent',
        'hover:bg-gray-100',
        'focus:ring-gray-500',
        'active:bg-gray-200',
        'disabled:text-gray-400',
        'dark:text-gray-300',
        'dark:hover:bg-gray-800',
        'dark:active:bg-gray-700',
      ],
      destructive: [
        'bg-red-600 text-white border-red-600',
        'hover:bg-red-700 hover:border-red-700',
        'focus:ring-red-500',
        'active:bg-red-800',
        'disabled:bg-red-300 disabled:border-red-300',
      ],
    };
    
    return variantMap[variant];
  };

  const getSizeClasses = () => {
    const sizeMap = {
      small: isTouchDevice 
        ? 'min-h-[36px] px-3 py-1.5 text-sm' 
        : 'min-h-[32px] px-2.5 py-1 text-sm',
      medium: isTouchDevice 
        ? 'min-h-[44px] px-4 py-2 text-base' 
        : 'min-h-[36px] px-3 py-1.5 text-sm',
      large: isTouchDevice 
        ? 'min-h-[48px] px-6 py-3 text-lg' 
        : 'min-h-[40px] px-4 py-2 text-base',
    };
    
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
    'responsive-button',
    'inline-flex items-center justify-center',
    'font-medium rounded-md border',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    getSizeClasses(),
    getVariantClasses(),
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