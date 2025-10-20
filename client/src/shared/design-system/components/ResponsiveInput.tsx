/**
 * ResponsiveInput Component
 * 
 * A form input component optimized for responsive design with touch-friendly
 * interactions and proper sizing for mobile devices.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { useResponsive } from '../responsive';

interface ResponsiveInputProps {
  className?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'filled' | 'outline';
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
}

export const ResponsiveInput = React.forwardRef<HTMLInputElement, ResponsiveInputProps>(
  ({
    className,
    type = 'text',
    size = 'medium',
    variant = 'default',
    error = false,
    disabled = false,
    readOnly = false,
    placeholder,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    id,
    name,
    autoComplete,
    autoFocus,
    required,
    min,
    max,
    step,
    pattern,
    maxLength,
    minLength,
    ...props
  }, ref) => {
    const { isTouchDevice, prefersReducedMotion } = useResponsive();

    const getSizeClasses = () => {
      const sizeMap = {
        small: isTouchDevice 
          ? 'min-h-[36px] px-3 py-1.5 text-sm' 
          : 'min-h-[32px] px-2.5 py-1 text-sm',
        medium: isTouchDevice 
          ? 'min-h-[44px] px-4 py-2 text-base' 
          : 'min-h-[36px] px-3 py-1.5 text-sm',
        large: isTouchDevice 
          ? 'min-h-[48px] px-4 py-3 text-lg' 
          : 'min-h-[40px] px-4 py-2 text-base',
      };
      
      return sizeMap[size];
    };

    const getVariantClasses = () => {
      const variantMap = {
        default: [
          'bg-white border-gray-300',
          'focus:border-blue-500 focus:ring-blue-500',
          'dark:bg-gray-900 dark:border-gray-600',
          'dark:focus:border-blue-400 dark:focus:ring-blue-400',
        ],
        filled: [
          'bg-gray-50 border-gray-200',
          'focus:bg-white focus:border-blue-500 focus:ring-blue-500',
          'dark:bg-gray-800 dark:border-gray-700',
          'dark:focus:bg-gray-900 dark:focus:border-blue-400 dark:focus:ring-blue-400',
        ],
        outline: [
          'bg-transparent border-gray-300',
          'focus:border-blue-500 focus:ring-blue-500',
          'dark:border-gray-600',
          'dark:focus:border-blue-400 dark:focus:ring-blue-400',
        ],
      };
      
      return variantMap[variant];
    };

    const getStateClasses = () => {
      const classes = [];
      
      if (error) {
        classes.push(
          'border-red-500 focus:border-red-500 focus:ring-red-500',
          'dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
        );
      }
      
      if (disabled) {
        classes.push(
          'bg-gray-100 text-gray-500 cursor-not-allowed',
          'dark:bg-gray-800 dark:text-gray-400'
        );
      }
      
      if (readOnly) {
        classes.push(
          'bg-gray-50 cursor-default',
          'dark:bg-gray-800'
        );
      }
      
      return classes;
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
        // Prevent zoom on iOS by using 16px font size minimum
        type === 'text' || type === 'email' || type === 'password' || type === 'search' 
          ? 'text-base' 
          : '',
      ];
    };

    const baseClasses = [
      'responsive-input',
      'w-full rounded-md border',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'text-gray-900 dark:text-gray-100',
      getSizeClasses(),
      getVariantClasses(),
      getStateClasses(),
      getTransitionClasses(),
      getTouchClasses(),
    ];

    return (
      <input
        ref={ref}
        className={cn(baseClasses, className)}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid || error}
        id={id}
        name={name}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        min={min}
        max={max}
        step={step}
        pattern={pattern}
        maxLength={maxLength}
        minLength={minLength}
        {...props}
      />
    );
  }
);

ResponsiveInput.displayName = 'ResponsiveInput';

export default ResponsiveInput;