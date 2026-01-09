/**
 * Form Builder Hook
 * 
 * Core hook for building forms with integrated validation and error handling.
 * This hook wraps react-hook-form and provides additional features like
 * automatic Zod validation, enhanced error handling, loading states,
 * and success/error callbacks.
 */

import { useCallback, useState, useRef } from 'react';
import { useForm, UseFormReturn, SubmitHandler, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema, ZodError } from 'zod';

import { logger } from '@client/shared/lib/utils/logger';
import type {
  FormBuilderOptions,
  FormBuilderReturn,
  FormValidationContext,
  FormSubmissionResult,
} from '../types/form-builder.types';

/**
 * Core form builder hook with FSD patterns
 */
export function useFormBuilder<T extends Record<string, any>>({
  schema,
  onSuccess,
  onError,
  debug = false,
  errorMessages = {},
  validationMode = 'onBlur',
  ...formProps
}: FormBuilderOptions<T>): FormBuilderReturn<T> {
  // Track submission state independently to avoid race conditions with react-hook-form
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Use a ref to track if the component is mounted, preventing state updates after unmount
  const isMountedRef = useRef(true);

  // Initialize react-hook-form with Zod resolver
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: validationMode,
    ...formProps,
  });

  // Clean up on unmount to prevent memory leaks
  useState(() => {
    return () => {
      isMountedRef.current = false;
    };
  });

  /**
   * Resets the form to its pristine state, clearing all user input,
   * errors, and submission state. Useful after successful submissions
   * or when the user cancels form editing.
   */
  const resetForm = useCallback(() => {
    form.reset();
    if (isMountedRef.current) {
      setSubmitError(null);
      setIsSubmittingCustom(false);
    }
  }, [form]);

  /**
   * Efficiently checks if a field has errors by directly accessing
   * the error state. This is memoized based on the errors object
   * to prevent unnecessary re-renders.
   */
  const hasError = useCallback(
    (fieldName: Path<T>): boolean => {
      return !!form.formState.errors[fieldName];
    },
    [form.formState.errors]
  );

  /**
   * Retrieves the error message for a field, preferring custom messages
   * defined in the configuration over the default Zod messages.
   * This provides a consistent way to display user-friendly error text.
   */
  const getErrorMessage = useCallback(
    (fieldName: Path<T>): string | undefined => {
      const error = form.formState.errors[fieldName];
      if (!error?.message) return undefined;

      // Prefer custom error messages for better UX
      const customMessage = errorMessages[fieldName];
      return customMessage || (error.message as string);
    },
    [form.formState.errors, errorMessages]
  );

  /**
   * Collects all current error messages into a single object.
   * This is useful for error summaries, analytics, or debugging.
   * Custom error messages are automatically applied.
   */
  const getErrorMessages = useCallback((): Partial<Record<Path<T>, string>> => {
    const messages: Partial<Record<Path<T>, string>> = {};

    // Iterate through all errors and build the messages object
    Object.entries(form.formState.errors).forEach(([key, error]) => {
      if (error?.message) {
        const fieldName = key as Path<T>;
        messages[fieldName] = errorMessages[fieldName] || (error.message as string);
      }
    });

    return messages;
  }, [form.formState.errors, errorMessages]);

  /**
   * Creates an enhanced submit handler that wraps your submission logic
   * with validation, error handling, logging, and state management.
   * This is the core of the form builder's functionality.
   *
   * The handler follows this flow:
   * 1. Prevents default form submission
   * 2. Resets error state
   * 3. Triggers validation
   * 4. If valid, executes onSuccess callback (if provided)
   * 5. Executes your custom submit handler
   * 6. Handles any errors and calls onError callback
   * 7. Always resets loading state in finally block
   */
  const onSubmit = useCallback(
    (onSubmitHandler: SubmitHandler<T>) =>
      async (e?: React.BaseSyntheticEvent): Promise<void> => {
        // Always prevent default form behavior to avoid page reloads
        e?.preventDefault();
        e?.stopPropagation();

        // Only proceed if the component is still mounted
        if (!isMountedRef.current) return;

        // Clear any previous errors and set loading state
        setSubmitError(null);
        setIsSubmittingCustom(true);

        try {
          if (debug) {
            logger.info('Form submission initiated', {
              component: 'useFormBuilder',
              mode: validationMode,
              timestamp: new Date().toISOString(),
            });
          }

          // Manually trigger validation to ensure we have the latest state
          // This is important because react-hook-form's validation might be async
          const isValid = await form.trigger();

          if (!isValid) {
            // Validation failed, collect and log errors
            const errors = getErrorMessages();

            if (debug) {
              logger.warn('Form validation failed', {
                errors,
                fieldCount: Object.keys(errors).length,
              });
            }

            // Reset loading state since we're not proceeding with submission
            if (isMountedRef.current) {
              setIsSubmittingCustom(false);
            }
            return;
          }

          // Validation passed, retrieve the validated form data
          const validatedData = form.getValues();

          if (debug) {
            logger.info('Form validation successful', {
              fieldCount: Object.keys(validatedData).length,
              fields: Object.keys(validatedData),
            });
          }

          // Execute the onSuccess callback if provided (e.g., for API calls)
          // This runs before the custom handler, allowing for consistent side effects
          if (onSuccess) {
            await onSuccess(validatedData);
          }

          // Execute the consumer's custom submit handler
          await onSubmitHandler(validatedData);

          if (debug) {
            logger.info('Form submission completed successfully', {
              component: 'useFormBuilder',
            });
          }
        } catch (error) {
          // Normalize all errors to Error instances for consistent handling
          const normalizedError =
            error instanceof Error ? error : new Error(String(error) || 'Form submission failed');

          // Log the error for debugging and monitoring
          logger.error('Form submission error', {
            component: 'useFormBuilder',
            error: normalizedError.message,
            stack: normalizedError.stack,
            isZodError: error instanceof ZodError,
          });

          // Update error state if component is still mounted
          if (isMountedRef.current) {
            setSubmitError(normalizedError);
          }

          // Invoke the error callback with the appropriate error type
          if (onError) {
            onError(error instanceof ZodError ? error : normalizedError);
          }
        } finally {
          // Always clean up loading state, preventing stuck loading indicators
          if (isMountedRef.current) {
            setIsSubmittingCustom(false);
          }
        }
      },
    [form, debug, onSuccess, onError, getErrorMessages, validationMode]
  );

  /**
   * Gets the current form validation context
   */
  const getValidationContext = useCallback((): FormValidationContext<T> => {
    return {
      schema,
      errors: form.formState.errors as Partial<Record<Path<T>, string>>,
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      touchedFields: form.formState.touchedFields as Partial<Record<Path<T>, boolean>>,
    };
  }, [form.formState, schema]);

  /**
   * Validates a specific field
   */
  const validateField = useCallback(
    async (fieldName: Path<T>, value: any): Promise<string | undefined> => {
      try {
        await schema.pick({ [fieldName]: true }).parseAsync({ [fieldName]: value });
        return undefined;
      } catch (error) {
        if (error instanceof ZodError) {
          return error.errors[0]?.message;
        }
        return 'Validation failed';
      }
    },
    [schema]
  );

  /**
   * Validates the entire form
   */
  const validateForm = useCallback(
    async (data: T): Promise<{ isValid: boolean; errors: Partial<Record<Path<T>, string>> }> => {
      try {
        await schema.parseAsync(data);
        return { isValid: true, errors: {} };
      } catch (error) {
        if (error instanceof ZodError) {
          const errors: Partial<Record<Path<T>, string>> = {};
          error.errors.forEach((err) => {
            const field = err.path.join('.') as Path<T>;
            errors[field] = err.message;
          });
          return { isValid: false, errors };
        }
        return { isValid: false, errors: { _form: 'Validation failed' } };
      }
    },
    [schema]
  );

  /**
   * Gets form submission result
   */
  const getSubmissionResult = useCallback(
    (success: boolean, data?: T, error?: Error): FormSubmissionResult<T> => {
      return {
        success,
        data,
        error,
        validationErrors: success ? undefined : (form.formState.errors as Partial<Record<Path<T>, string>>),
      };
    },
    [form.formState.errors]
  );

  // Return the enhanced form object with all utilities
  return {
    ...form,
    onSubmit,
    // Combine both loading states for the most accurate indication
    isSubmitting: isSubmittingCustom || form.formState.isSubmitting,
    submitError,
    resetForm,
    hasError,
    getErrorMessage,
    getErrorMessages,
    getValidationContext,
    validateField,
    validateForm,
    getSubmissionResult,
  };
}

/**
 * Hook for creating dynamic forms based on configuration
 */
export function useDynamicForm<T extends Record<string, any>>(config: {
  formConfig: import('../types/form-builder.types').FormConfig<T>;
  onSubmit: SubmitHandler<T>;
  onSuccess?: (data: T) => Promise<void> | void;
  onError?: (error: Error | ZodError) => void;
  debug?: boolean;
}) {
  const { formConfig, onSubmit, onSuccess, onError, debug } = config;

  // Create a schema from the form configuration
  const schema = createSchemaFromConfig(formConfig);

  const form = useFormBuilder<T>({
    schema,
    onSuccess,
    onError,
    debug,
    validationMode: formConfig.validationMode || 'onBlur',
  });

  return {
    form,
    formConfig,
    fields: formConfig.fields,
  };
}

/**
 * Creates a Zod schema from form configuration
 */
function createSchemaFromConfig<T extends Record<string, any>>(
  config: import('../types/form-builder.types').FormConfig<T>
): ZodSchema<T> {
  const schemaFields: Record<string, any> = {};

  config.fields.forEach((field) => {
    let fieldSchema = field.type === 'email' ? z.string().email() : z.string();

    if (field.validation?.required) {
      fieldSchema = fieldSchema.min(1, `${field.label} is required`);
    }

    if (field.validation?.minLength) {
      fieldSchema = fieldSchema.min(field.validation.minLength, `${field.label} must be at least ${field.validation.minLength} characters`);
    }

    if (field.validation?.maxLength) {
      fieldSchema = fieldSchema.max(field.validation.maxLength, `${field.label} must not exceed ${field.validation.maxLength} characters`);
    }

    if (field.validation?.pattern) {
      fieldSchema = fieldSchema.regex(field.validation.pattern, `${field.label} format is invalid`);
    }

    schemaFields[field.name] = fieldSchema;
  });

  return z.object(schemaFields) as ZodSchema<T>;
}