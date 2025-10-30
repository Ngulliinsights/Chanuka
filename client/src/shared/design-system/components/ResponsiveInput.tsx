/**
 * ResponsiveInput Component
 * 
 * A form input component optimized for responsive design with touch-friendly
 * interactions and proper sizing for mobile devices.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { cn } from '../lib/utils';
import { useResponsive } from '../responsive';
import { inputUtils } from './input';

export interface ResponsiveInputProps {
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
      // Map component sizes to design standards sizes
      const sizeMap = {
        small: 'sm',
        medium: 'md',
        large: 'lg',
      } as const;

      return sizeMap[size];
    };

    const getVariantClasses = () => {
      // Map component variants to design standards variants
      const variantMap = {
        default: 'default',
        filled: 'filled',
        outline: 'outlined',
      } as const;

      return variantMap[variant];
    };

    const getStateClasses = () => {
      if (error) return 'error';
      if (disabled) return 'disabled';
      if (readOnly) return 'disabled'; // Using disabled state for readOnly as well
      return undefined;
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
      inputUtils.getInputClasses(getVariantClasses(), getSizeClasses(), getStateClasses()),
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
        aria-invalid={ariaInvalid || error ? 'true' : 'false'}
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

