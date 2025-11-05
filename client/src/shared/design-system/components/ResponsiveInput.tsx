/**
 * ResponsiveInput Component
 * 
 * A highly accessible, touch-optimized form input component that adapts to different
 * device capabilities and user preferences. This component ensures consistent behavior
 * across mobile and desktop platforms while respecting accessibility requirements.
 * 
 * Key Features:
 * - Touch-friendly sizing on mobile devices (minimum 44x44px tap targets)
 * - Prevents iOS zoom on focus by maintaining 16px minimum font size
 * - Respects prefers-reduced-motion for users with vestibular disorders
 * - Comprehensive ARIA support for screen readers
 * - Keyboard navigation optimized for form workflows
 * 
 * Requirements: 9.1 (Responsive Design), 9.5 (Accessibility)
 */

import React, { useCallback, useMemo } from 'react';
import { cn } from '../lib/utils';
import { useResponsive } from '../responsive';
import { inputUtils } from './input';

/**
 * Props interface for ResponsiveInput with comprehensive type safety
 * and accessibility attributes following WAI-ARIA best practices
 */
export interface ResponsiveInputProps {
  // Styling and layout
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'filled' | 'outline';
  
  // Input configuration
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  
  // Value management (controlled or uncontrolled)
  value?: string;
  defaultValue?: string;
  
  // State management
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  
  // Event handlers
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  
  // Accessibility attributes
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  
  // Standard HTML input attributes
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  
  // Validation attributes
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  
  // Additional props passthrough
  [key: string]: any;
}

/**
 * ResponsiveInput is a forwardRef component that provides a reference to the underlying
 * input element, enabling parent components to imperatively focus or manipulate the input.
 * This is essential for form validation libraries and custom focus management.
 */
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
    'aria-required': ariaRequired,
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
    ...restProps
  }, ref) => {
    // Extract responsive context to adapt component behavior
    const { isTouchDevice, prefersReducedMotion } = useResponsive();

    /**
     * Maps component size props to design system size tokens.
     * This abstraction allows the component API to remain stable even if
     * the underlying design system changes its size naming conventions.
     */
    const designSystemSize = useMemo(() => {
      const sizeMap = {
        small: 'sm',
        medium: 'md',
        large: 'lg',
      } as const;
      return sizeMap[size];
    }, [size]);

    /**
     * Maps component variant props to design system variant tokens.
     * The 'outline' variant maps to 'outlined' to match design system conventions.
     */
    const designSystemVariant = useMemo(() => {
      const variantMap = {
        default: 'default',
        filled: 'filled',
        outline: 'outlined',
      } as const;
      return variantMap[variant];
    }, [variant]);

    /**
     * Determines the current state of the input for styling purposes.
     * Priority order: error > disabled > readOnly > default.
     * ReadOnly uses disabled styling to provide consistent visual feedback.
     */
    const inputState = useMemo(() => {
      if (error) return 'error';
      if (disabled) return 'disabled';
      if (readOnly) return 'disabled';
      return undefined;
    }, [error, disabled, readOnly]);

    /**
     * Constructs transition classes that respect user motion preferences.
     * Users with vestibular disorders may experience discomfort from animations,
     * so we conditionally disable transitions when prefers-reduced-motion is active.
     */
    const transitionClasses = useMemo(() => {
      if (prefersReducedMotion) {
        return '';
      }
      return 'transition-all duration-200 ease-in-out';
    }, [prefersReducedMotion]);

    /**
     * Applies touch-specific optimizations for mobile devices.
     * 
     * Key optimizations:
     * 1. touch-manipulation: Prevents double-tap zoom and reduces touch delay
     * 2. text-base (16px): Prevents iOS Safari from zooming on input focus
     * 
     * iOS Safari zooms the page when an input with font-size < 16px receives focus.
     * This behavior cannot be disabled with viewport meta tags alone, so we ensure
     * text inputs always use at least 16px font size on touch devices.
     */
    const touchOptimizationClasses = useMemo(() => {
      if (!isTouchDevice) return '';
      
      const classes = ['touch-manipulation'];
      
      // Text-based input types that benefit from font size optimization
      const textInputTypes = ['text', 'email', 'password', 'search', 'url', 'tel'];
      if (textInputTypes.includes(type)) {
        classes.push('text-base');
      }
      
      return classes.join(' ');
    }, [isTouchDevice, type]);

    /**
     * Combines all class names into a single className string.
     * The order matters: base classes first, then responsive classes,
     * and finally user-provided overrides via className prop.
     */
    const computedClassName = useMemo(() => {
      const baseInputClasses = inputUtils.getInputClasses(
        designSystemVariant,
        designSystemSize,
        inputState
      );
      
      return cn(
        baseInputClasses,
        transitionClasses,
        touchOptimizationClasses,
        className
      );
    }, [
      designSystemVariant,
      designSystemSize,
      inputState,
      transitionClasses,
      touchOptimizationClasses,
      className
    ]);

    /**
     * Enhanced onChange handler that can be extended with additional logic
     * such as validation, formatting, or analytics tracking without modifying
     * the consumer's onChange handler.
     */
    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      // Call user-provided onChange if it exists
      onChange?.(event);
      
      // Future enhancement: Add custom validation, formatting, or tracking here
    }, [onChange]);

    /**
     * Enhanced onFocus handler that can implement focus management features
     * such as select-all-on-focus for better UX in certain input types.
     */
    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      // Call user-provided onFocus if it exists
      onFocus?.(event);
      
      // Future enhancement: Could implement select-all on focus for number inputs
      // or automatically show error messages on focus
    }, [onFocus]);

    /**
     * Enhanced onBlur handler for implementing validation triggers or
     * auto-formatting (e.g., formatting phone numbers or credit card numbers).
     */
    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      // Call user-provided onBlur if it exists
      onBlur?.(event);
      
      // Future enhancement: Trigger validation or apply formatting
    }, [onBlur]);

    /**
     * Determines the correct aria-invalid value.
     * ARIA spec requires string 'true' or 'false', not boolean.
     * The error prop takes precedence over explicit ariaInvalid for consistency.
     */
    const ariaInvalidValue = (ariaInvalid || error) ? 'true' : 'false';

    /**
     * Determines aria-required value, using explicit ariaRequired prop
     * or falling back to the required HTML attribute for consistency.
     */
    const ariaRequiredValue = ariaRequired ?? required;

    return (
      <input
        ref={ref}
        className={computedClassName}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalidValue}
        aria-required={ariaRequiredValue}
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
        {...restProps}
      />
    );
  }
);

/**
 * Setting displayName helps with debugging in React DevTools and improves
 * error messages when this component is used incorrectly.
 */
ResponsiveInput.displayName = 'ResponsiveInput';

export default ResponsiveInput;