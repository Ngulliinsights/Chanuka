import { forwardRef, ComponentProps, useState, useCallback, useEffect } from "react"

import { cn } from "@/lib/utils"
import { logger } from '@/utils/browser-logger';
import { EnhancedTextareaProps, ValidationState } from './types';
import { validateInputValue, safeValidateInputValue } from './validation';
import { UIInputError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    className, 
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

    const validateValue = useCallback((textValue: string): ValidationState => {
      if (!showValidation) {
        return { isValid: true, touched: validationState.touched };
      }

      try {
        // Basic validation
        if (required && (!textValue || textValue.trim() === '')) {
          return {
            isValid: false,
            error: 'This field is required',
            touched: validationState.touched
          };
        }

        if (textValue && minLength && textValue.length < minLength) {
          return {
            isValid: false,
            error: `Minimum length is ${minLength} characters`,
            touched: validationState.touched
          };
        }

        if (textValue && maxLength && textValue.length > maxLength) {
          return {
            isValid: false,
            error: `Maximum length is ${maxLength} characters`,
            touched: validationState.touched
          };
        }

        if (textValue && pattern && !pattern.test(textValue)) {
          return {
            isValid: false,
            error: 'Invalid format',
            touched: validationState.touched
          };
        }

        // Custom validation
        if (textValue && customValidator) {
          const customError = customValidator(textValue);
          if (customError) {
            return {
              isValid: false,
              error: customError,
              touched: validationState.touched
            };
          }
        }

        // Basic text validation
        if (textValue) {
          const result = safeValidateInputValue(textValue);
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
        logger.error('Textarea validation error:', error);
        return {
          isValid: false,
          error: 'Validation error occurred',
          touched: validationState.touched
        };
      }
    }, [showValidation, required, minLength, maxLength, pattern, customValidator, validationState.touched]);

    const handleValidationError = useCallback(async (error: UIInputError) => {
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-textarea', error, retryCount);
        
        if (recoveryResult.success) {
          setRetryCount(0);
        } else if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        } else {
          const suggestions = getUIRecoverySuggestions(error);
          logger.warn('Textarea recovery failed, suggestions:', suggestions);
        }
      } catch (recoveryError) {
        logger.error('Textarea recovery error:', recoveryError);
      }
    }, [retryCount]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      
      if (validateOnChange) {
        const newValidationState = validateValue(newValue);
        setValidationState(newValidationState);
        onValidationChange?.(newValidationState);

        if (!newValidationState.isValid && newValidationState.error) {
          const error = new UIInputError(props.name || 'textarea', newValue, newValidationState.error);
          handleValidationError(error);
        }
      }
      
      onChange?.(event);
    }, [validateOnChange, validateValue, onValidationChange, onChange, props.name, handleValidationError]);

    const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
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
        const error = new UIInputError(props.name || 'textarea', event.target.value, newValidationState.error);
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
        
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
EnhancedTextarea.displayName = "EnhancedTextarea"

export { Textarea, EnhancedTextarea }
