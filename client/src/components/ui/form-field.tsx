/**
 * Enhanced Form Field Components
 * Provides advanced form inputs with validation, help text, and accessibility features
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@client/lib/utils';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

interface BaseFieldProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

interface EnhancedFormInputProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showValidationIcon?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  customValidator?: (value: string) => string | undefined;
}

export const EnhancedFormInput: React.FC<EnhancedFormInputProps> = ({
  id,
  label,
  description,
  error,
  helpText,
  required = false,
  className,
  onChange,
  onValidationChange,
  showValidationIcon = true,
  validateOnBlur = true,
  validateOnChange = false,
  customValidator,
  type = 'text',
  value = '',
  ...props
}) => {
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isTouched, setIsTouched] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const currentError = error || internalError;
  const showError = isTouched && currentError;

  const validateValue = useCallback((val: string): string | undefined => {
    if (required && !val.trim()) {
      return 'This field is required';
    }

    if (type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return 'Please enter a valid email address';
    }

    if (type === 'url' && val && !/^https?:\/\/.+\..+/.test(val)) {
      return 'Please enter a valid URL';
    }

    if (customValidator) {
      return customValidator(val);
    }

    return undefined;
  }, [required, type, customValidator]);

  const handleValidation = useCallback((val: string) => {
    const validationError = validateValue(val);
    setInternalError(validationError);
    const valid = !validationError;
    setIsValid(valid);
    onValidationChange?.(valid, validationError);
  }, [validateValue, onValidationChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    
    if (validateOnChange) {
      handleValidation(newValue);
    }
  }, [onChange, validateOnChange, handleValidation]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);
    if (validateOnBlur) {
      handleValidation(value as string);
    }
  }, [validateOnBlur, handleValidation, value]);

  const getValidationIcon = () => {
    if (!showValidationIcon || !isTouched) return null;
    
    if (currentError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (isValid && value) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    return null;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={inputId} className="flex items-center space-x-1">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
          {helpText && (
            <div className="group relative">
              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {helpText}
              </div>
            </div>
          )}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}
      
      <div className="relative">
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            showError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            isValid && isTouched && value && 'border-green-500',
            showValidationIcon && 'pr-10'
          )}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={
            showError ? `${inputId}-error` : 
            helpText ? `${inputId}-help` : undefined
          }
          {...props}
        />
        
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {showError && (
        <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
          {currentError}
        </p>
      )}
      
      {helpText && !showError && (
        <p id={`${inputId}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

interface EnhancedFormTextareaProps extends BaseFieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  showCharacterCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  customValidator?: (value: string) => string | undefined;
}

export const EnhancedFormTextarea: React.FC<EnhancedFormTextareaProps> = ({
  id,
  label,
  description,
  error,
  helpText,
  required = false,
  className,
  onChange,
  onValidationChange,
  showCharacterCount = false,
  maxLength,
  autoResize = false,
  customValidator,
  value = '',
  rows = 3,
  ...props
}) => {
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isTouched, setIsTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const currentError = error || internalError;
  const showError = isTouched && currentError;
  const characterCount = (value as string).length;

  const validateValue = useCallback((val: string): string | undefined => {
    if (required && !val.trim()) {
      return 'This field is required';
    }

    if (maxLength && val.length > maxLength) {
      return `Maximum ${maxLength} characters allowed`;
    }

    if (customValidator) {
      return customValidator(val);
    }

    return undefined;
  }, [required, maxLength, customValidator]);

  const handleValidation = useCallback((val: string) => {
    const validationError = validateValue(val);
    setInternalError(validationError);
    const valid = !validationError;
    onValidationChange?.(valid, validationError);
  }, [validateValue, onValidationChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    handleValidation(newValue);
  }, [onChange, handleValidation]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);
  }, []);

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, autoResize]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={textareaId} className="flex items-center space-x-1">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            showError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            autoResize && 'resize-none overflow-hidden'
          )}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={
            showError ? `${textareaId}-error` : 
            helpText ? `${textareaId}-help` : undefined
          }
          {...props}
        />
      </div>
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {showError && (
            <p id={`${textareaId}-error`} className="text-sm text-red-600" role="alert">
              {currentError}
            </p>
          )}
          
          {helpText && !showError && (
            <p id={`${textareaId}-help`} className="text-sm text-gray-500">
              {helpText}
            </p>
          )}
        </div>
        
        {showCharacterCount && (
          <p className={cn(
            'text-xs text-gray-500 ml-2',
            maxLength && characterCount > maxLength * 0.9 && 'text-amber-600',
            maxLength && characterCount >= maxLength && 'text-red-600'
          )}>
            {characterCount}{maxLength && `/${maxLength}`}
          </p>
        )}
      </div>
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface EnhancedFormSelectProps extends BaseFieldProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  customValidator?: (value: string) => string | undefined;
}

export const EnhancedFormSelect: React.FC<EnhancedFormSelectProps> = ({
  id,
  label,
  description,
  error,
  helpText,
  required = false,
  className,
  onChange,
  onValidationChange,
  options,
  placeholder = 'Select an option...',
  customValidator,
  value = '',
  ...props
}) => {
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isTouched, setIsTouched] = useState(false);
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const currentError = error || internalError;
  const showError = isTouched && currentError;

  const validateValue = useCallback((val: string): string | undefined => {
    if (required && !val) {
      return 'Please select an option';
    }

    if (customValidator) {
      return customValidator(val);
    }

    return undefined;
  }, [required, customValidator]);

  const handleValidation = useCallback((val: string) => {
    const validationError = validateValue(val);
    setInternalError(validationError);
    const valid = !validationError;
    onValidationChange?.(valid, validationError);
  }, [validateValue, onValidationChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    handleValidation(newValue);
  }, [onChange, handleValidation]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={selectId} className="flex items-center space-x-1">
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}
      
      <select
        id={selectId}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          showError && 'border-red-500 focus:border-red-500 focus:ring-red-500'
        )}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={
          showError ? `${selectId}-error` : 
          helpText ? `${selectId}-help` : undefined
        }
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
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
      
      {showError && (
        <p id={`${selectId}-error`} className="text-sm text-red-600" role="alert">
          {currentError}
        </p>
      )}
      
      {helpText && !showError && (
        <p id={`${selectId}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};