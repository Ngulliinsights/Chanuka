/**
 * Enhanced form field components with improved validation feedback
 * Implements inline error messages, success indicators, and accessibility features
 */

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Label } from './label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';


// Enhanced input with validation states
interface EnhancedFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  helpText?: string;
  showPasswordToggle?: boolean;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export const EnhancedFormInput = forwardRef<HTMLInputElement, EnhancedFormInputProps>(
  ({
    className,
    type,
    label,
    description,
    error,
    success,
    helpText,
    showPasswordToggle = false,
    onValidationChange,
    id,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalError, setInternalError] = useState<string>();
    const inputRef = useRef<HTMLInputElement>(null);

    // Combine refs
    const combinedRef = useCallback((node: HTMLInputElement | null) => {
      if (inputRef.current !== node) {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    }, [ref]);

    const currentType = showPasswordToggle && type === 'password'
      ? (showPassword ? 'text' : 'password')
      : type;

    const hasError = Boolean(error || internalError);
    const hasSuccess = Boolean(success) && !hasError;
    const displayError = error || internalError;

    // Real-time validation
    const handleValidation = useCallback((value: string) => {
      let validationError: string | undefined;

      // Basic validation examples
      if (props.required && !value.trim()) {
        validationError = `${label || 'This field'} is required`;
      } else if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        validationError = 'Please enter a valid email address';
      } else if (type === 'password' && value && value.length < 8) {
        validationError = 'Password must be at least 8 characters long';
      }

      setInternalError(validationError);
      onValidationChange?.(!validationError, validationError);
    }, [props.required, type, label, onValidationChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      props.onChange?.(e);
      handleValidation(e.target.value);
    }, [props.onChange, handleValidation]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      props.onBlur?.(e);
      handleValidation(e.target.value);
    }, [props.onBlur, handleValidation]);

    const togglePasswordVisibility = useCallback(() => {
      setShowPassword(prev => !prev);
      // Refocus input after toggle
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }, []);

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={id}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                hasError && 'text-destructive',
                hasSuccess && 'text-green-700'
              )}
            >
              {label}
              {props.required && (
                <span className="text-destructive ml-1" aria-label="required">*</span>
              )}
            </Label>

            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-0 h-4 w-4"
                    >
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="sr-only">Help for {label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {description && (
          <p
            id={id ? `${id}-description` : undefined}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        <div className="relative">
          <input
            type={currentType}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              hasError && 'border-destructive focus-visible:ring-destructive pr-10',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500 pr-10',
              showPasswordToggle && 'pr-10',
              className
            )}
            ref={combinedRef}
            id={id}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={cn(
              description && `${id}-description`,
              hasError && `${id}-error`
            )}
            {...props}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          {/* Validation status icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {hasError && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
            {hasSuccess && (
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            )}
          </div>

          {showPasswordToggle && type === 'password' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <div
            id={id ? `${id}-error` : undefined}
            className="flex items-start space-x-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Success message */}
        {hasSuccess && (
          <div
            className="flex items-start space-x-2 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    );
  }
);
EnhancedFormInput.displayName = 'EnhancedFormInput';

// Enhanced textarea with validation
interface EnhancedFormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  helpText?: string;
  showCharacterCount?: boolean;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export const EnhancedFormTextarea = forwardRef<HTMLTextAreaElement, EnhancedFormTextareaProps>(
  ({
    className,
    label,
    description,
    error,
    success,
    helpText,
    showCharacterCount = false,
    onValidationChange,
    id,
    maxLength,
    value,
    ...props
  }, ref) => {
    const [internalError, setInternalError] = useState<string>();
    const [characterCount, setCharacterCount] = useState(0);

    const hasError = Boolean(error || internalError);
    const hasSuccess = Boolean(success) && !hasError;
    const displayError = error || internalError;

    // Update character count
    useEffect(() => {
      setCharacterCount(String(value || '').length);
    }, [value]);

    const handleValidation = useCallback((textValue: string) => {
      let validationError: string | undefined;

      if (props.required && !textValue.trim()) {
        validationError = `${label || 'This field'} is required`;
      } else if (maxLength && textValue.length > maxLength) {
        validationError = `Maximum ${maxLength} characters allowed`;
      }

      setInternalError(validationError);
      onValidationChange?.(!validationError, validationError);
    }, [props.required, maxLength, label, onValidationChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setCharacterCount(newValue.length);
      props.onChange?.(e);
      handleValidation(newValue);
    }, [props.onChange, handleValidation]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      props.onBlur?.(e);
      handleValidation(e.target.value);
    }, [props.onBlur, handleValidation]);

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={id}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                hasError && 'text-destructive',
                hasSuccess && 'text-green-700'
              )}
            >
              {label}
              {props.required && (
                <span className="text-destructive ml-1" aria-label="required">*</span>
              )}
            </Label>

            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-0 h-4 w-4"
                    >
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="sr-only">Help for {label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {description && (
          <p
            id={id ? `${id}-description` : undefined}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        <div className="relative">
          <textarea
            className={cn(
              'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-vertical',
              hasError && 'border-destructive focus-visible:ring-destructive',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500',
              className
            )}
            ref={ref}
            id={id}
            maxLength={maxLength}
            value={value}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={cn(
              description && `${id}-description`,
              hasError && `${id}-error`
            )}
            {...props}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          {/* Validation status icons */}
          <div className="absolute right-3 top-3 pointer-events-none">
            {hasError && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
            {hasSuccess && (
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            )}
          </div>

          {showCharacterCount && maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-1">
              <span className={cn(
                characterCount > maxLength * 0.9 && 'text-orange-500',
                characterCount >= maxLength && 'text-destructive'
              )}>
                {characterCount}
              </span>
              /{maxLength}
            </div>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <div
            id={id ? `${id}-error` : undefined}
            className="flex items-start space-x-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Success message */}
        {hasSuccess && (
          <div
            className="flex items-start space-x-2 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    );
  }
);
EnhancedFormTextarea.displayName = 'EnhancedFormTextarea';

// Enhanced select with validation
interface EnhancedFormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  helpText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export const EnhancedFormSelect = forwardRef<HTMLSelectElement, EnhancedFormSelectProps>(
  ({
    className,
    label,
    description,
    error,
    success,
    helpText,
    options,
    placeholder = 'Select an option...',
    onValidationChange,
    id,
    ...props
  }, ref) => {
    const [internalError, setInternalError] = useState<string>();

    const hasError = Boolean(error || internalError);
    const hasSuccess = Boolean(success) && !hasError;
    const displayError = error || internalError;

    const handleValidation = useCallback((selectValue: string) => {
      let validationError: string | undefined;

      if (props.required && (!selectValue || selectValue === '')) {
        validationError = `${label || 'This field'} is required`;
      }

      setInternalError(validationError);
      onValidationChange?.(!validationError, validationError);
    }, [props.required, label, onValidationChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      props.onChange?.(e);
      handleValidation(e.target.value);
    }, [props.onChange, handleValidation]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLSelectElement>) => {
      props.onBlur?.(e);
      handleValidation(e.target.value);
    }, [props.onBlur, handleValidation]);

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={id}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                hasError && 'text-destructive',
                hasSuccess && 'text-green-700'
              )}
            >
              {label}
              {props.required && (
                <span className="text-destructive ml-1" aria-label="required">*</span>
              )}
            </Label>

            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-0 h-4 w-4"
                    >
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="sr-only">Help for {label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {description && (
          <p
            id={id ? `${id}-description` : undefined}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}

        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              hasError && 'border-destructive focus-visible:ring-destructive',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500',
              className
            )}
            ref={ref}
            id={id}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={cn(
              description && `${id}-description`,
              hasError && `${id}-error`
            )}
            {...props}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Validation status icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {hasError && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
            {hasSuccess && (
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Error message */}
        {hasError && (
          <div
            id={id ? `${id}-error` : undefined}
            className="flex items-start space-x-2 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Success message */}
        {hasSuccess && (
          <div
            className="flex items-start space-x-2 text-sm text-green-700"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    );
  }
);
EnhancedFormSelect.displayName = 'EnhancedFormSelect';

