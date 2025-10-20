import { forwardRef, ComponentProps, useState, useCallback, useEffect } from "react"

import { cn } from "@/lib/utils"
import { logger } from '../utils/logger.js';
import { EnhancedInputProps, ValidationState } from './types';
import { validateInputValue, safeValidateInputValue } from './validation';
import { UIInputError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    type, 
    label,
    description,
    errorMessage,
    showValidation = true,
    required = false,
    minLength,
    maxLength,
    pattern,
    customValidator,
    validateOnChange = true,
    validateOnBlur = true,
    onValidationChange,
    value,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [validationState, setValidationState] = useState<ValidationState>({
      isValid: true,
      touched: false
    });
    const [retryCount, setRetryCount] = useState(0);

    const validateValue = useCallback((inputValue: string): ValidationState => {
      if (!showValidation) {
        return { isValid: true, touched: validationState.touched };
      }

      try {
        // Basic validation
        if (required && (!inputValue || inputValue.trim() === '')) {
          return {
            isValid: false,
            error: 'This field is required',
            touched: validationState.touched
          };
        }

        if (inputValue && minLength && inputValue.length < minLength) {
          return {
            isValid: false,
            error: `Minimum length is ${minLength} characters`,
            touched: validationState.touched
          };
        }

        if (inputValue && maxLength && inputValue.length > maxLength) {
          return {
            isValid: false,
            error: `Maximum length is ${maxLength} characters`,
            touched: validationState.touched
          };
        }

        if (inputValue && pattern && !pattern.test(inputValue)) {
          return {
            isValid: false,
            error: 'Invalid format',
            touched: validationState.touched
          };
        }

        // Custom validation
        if (inputValue && customValidator) {
          const customError = customValidator(inputValue);
          if (customError) {
            return {
              isValid: false,
              error: customError,
              touched: validationState.touched
            };
          }
        }

        // Type-specific validation
        if (inputValue) {
          const result = safeValidateInputValue(inputValue, type);
          if (!result.success) {
            return {
              isValid: false,
              error: result.error?.message || 'Invalid input',
              touched: validationState.touched
            };
          }
        }

        return { isValid: true, touched: validationState.touched };
      } catch (error) {
        logger.error('Input validation error:', error);
        return {
          isValid: false,
          error: 'Validation error occurred',
          touched: validationState.touched
        };
      }
    }, [showValidation, required, minLength, maxLength, pattern, customValidator, type, validationState.touched]);

    const handleValidationError = useCallback(async (error: UIInputError) => {
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-input', error, retryCount);
        
        if (recoveryResult.success) {
          setRetryCount(0);
          // Recovery successful, validation will be re-run
        } else if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        } else {
          // Show recovery suggestions to user
          const suggestions = getUIRecoverySuggestions(error);
          logger.warn('Input recovery failed, suggestions:', suggestions);
        }
      } catch (recoveryError) {
        logger.error('Input recovery error:', recoveryError);
      }
    }, [retryCount]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      
      if (validateOnChange) {
        const newValidationState = validateValue(newValue);
        setValidationState(newValidationState);
        onValidationChange?.(newValidationState);

        if (!newValidationState.isValid && newValidationState.error) {
          const error = new UIInputError(props.name || 'input', newValue, newValidationState.error);
          handleValidationError(error);
        }
      }
      
      onChange?.(event);
    }, [validateOnChange, validateValue, onValidationChange, onChange, props.name, handleValidationError]);

    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
      const newValidationState = {
        ...validationState,
        touched: true
      };

      if (validateOnBlur) {
        const validatedState = validateValue(event.target.value);
        newValidationState.isValid = validatedState.isValid;
        newValidationState.error = validatedState.error;
      }

      setValidationState(newValidationState);
      onValidationChange?.(newValidationState);

      if (!newValidationState.isValid && newValidationState.error) {
        const error = new UIInputError(props.name || 'input', event.target.value, newValidationState.error);
        handleValidationError(error);
      }

      onBlur?.(event);
    }, [validateOnBlur, validateValue, validationState, onValidationChange, onBlur, props.name, handleValidationError]);

    // Initial validation on mount if value is provided
    useEffect(() => {
      if (value && showValidation) {
        const initialValidation = validateValue(String(value));
        setValidationState(initialValidation);
        onValidationChange?.(initialValidation);
      }
    }, [value, showValidation, validateValue, onValidationChange]);

    const hasError = showValidation && validationState.touched && !validationState.isValid;
    const displayError = errorMessage || validationState.error;

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={props.id} 
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              hasError && "text-destructive",
              required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}
          >
            {label}
          </label>
        )}
        
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            hasError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={hasError}
          aria-describedby={
            description || hasError 
              ? `${props.id}-description ${props.id}-error`.trim()
              : undefined
          }
          {...props}
        />
        
        {description && (
          <p 
            id={`${props.id}-description`}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        
        {hasError && displayError && (
          <p 
            id={`${props.id}-error`}
            className="text-sm font-medium text-destructive"
            role="alert"
          >
            {displayError}
          </p>
        )}
      </div>
    );
  }
)
EnhancedInput.displayName = "EnhancedInput"

export { Input, EnhancedInput }
