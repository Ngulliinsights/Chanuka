/**
 * Form Builder Utility
 *
 * A production-ready form creation utility that combines react-hook-form
 * with Zod validation, providing built-in error handling, loading states,
 * and accessibility features.
 *
 * @module useFormBuilder
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState, useRef } from 'react';
import {
  useForm,
  UseFormProps,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  Path,
} from 'react-hook-form';
import { ZodSchema, ZodError } from 'zod';

import { logger } from '../utils/logger';

/**
 * Configuration options for the form builder.
 * Extends react-hook-form's options while enforcing Zod validation.
 */
interface FormBuilderOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  /**
   * Zod validation schema for type-safe form validation.
   * The schema output type should match the form data type T.
   */
  schema: ZodSchema<T>;

  /**
   * Callback invoked after successful form submission and validation.
   * Use this for API calls, navigation, or other side effects.
   *
   * @param data - The validated form data
   * @returns A promise that resolves when the operation completes
   */
  onSuccess?: (data: T) => Promise<void> | void;

  /**
   * Callback invoked when form submission fails due to validation
   * or runtime errors. Useful for displaying toast notifications.
   *
   * @param error - Either a ZodError (validation) or standard Error (runtime)
   */
  onError?: (error: Error | ZodError) => void;

  /**
   * Enable detailed console logging for debugging form behavior.
   * Should be disabled in production environments.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Custom error messages that override the default Zod messages.
   * Keys should match field names, values are the custom messages.
   *
   * @example
   * errorMessages: {
   *   email: 'Please provide a valid email address',
   *   password: 'Password must be at least 8 characters'
   * }
   */
  errorMessages?: Partial<Record<Path<T>, string>>;

  /**
   * When to trigger validation. Each mode has different UX implications:
   * - 'onBlur': Validates when field loses focus (least intrusive)
   * - 'onChange': Validates on every keystroke (most responsive)
   * - 'onSubmit': Only validates on form submission (most permissive)
   * - 'onTouched': Validates after first interaction
   * - 'all': Combines all validation triggers
   *
   * @default 'onBlur'
   */
  validationMode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
}

/**
 * Enhanced form return type that wraps react-hook-form with additional utilities.
 * This provides a richer API while maintaining full compatibility with the base form.
 */
interface FormBuilderReturn<T extends FieldValues> extends UseFormReturn<T> {
  /**
   * Enhanced submit handler that wraps your submission logic with:
   * - Automatic validation
   * - Error handling and logging
   * - Loading state management
   * - Success/error callbacks
   *
   * Use this instead of react-hook-form's handleSubmit for enhanced features.
   *
   * @param onSubmitHandler - Your form submission logic
   * @returns A function to attach to the form's onSubmit prop
   *
   * @example
   * <form onSubmit={form.onSubmit(async (data) => {
   *   await api.users.create(data);
   * })}>
   */
  onSubmit: (onSubmitHandler: SubmitHandler<T>) => (e?: React.BaseSyntheticEvent) => Promise<void>;

  /**
   * Indicates whether the form is currently being submitted.
   * Combines both internal state and react-hook-form's state for accuracy.
   * Use this to disable submit buttons or show loading indicators.
   */
  isSubmitting: boolean;

  /**
   * The most recent error that occurred during form submission.
   * This is separate from field validation errors and represents
   * runtime errors (like network failures or server errors).
   * Reset to null on the next submission attempt.
   */
  submitError: Error | null;

  /**
   * Resets the entire form to its initial state, including:
   * - All field values
   * - Validation errors
   * - Touch state
   * - Submission state
   * - Custom error state
   */
  resetForm: () => void;

  /**
   * Checks if a specific field currently has validation errors.
   * More convenient than checking form.formState.errors directly.
   *
   * @param fieldName - The field to check
   * @returns true if the field has errors, false otherwise
   */
  hasError: (fieldName: Path<T>) => boolean;

  /**
   * Retrieves the error message for a specific field, with support
   * for custom error messages defined in the form configuration.
   *
   * @param fieldName - The field to get the error message for
   * @returns The error message string, or undefined if no error
   */
  getErrorMessage: (fieldName: Path<T>) => string | undefined;

  /**
   * Retrieves all current error messages as a key-value object.
   * Useful for displaying error summaries or logging.
   *
   * @returns An object mapping field names to error messages
   */
  getErrorMessages: () => Partial<Record<Path<T>, string>>;
}

/**
 * Custom hook for building forms with integrated validation and error handling.
 *
 * This hook wraps react-hook-form and provides additional features like
 * automatic Zod validation, enhanced error handling, loading states,
 * and success/error callbacks. It's designed to reduce boilerplate and
 * provide a consistent form-building experience across your application.
 *
 * @template T - The type of your form data, extending FieldValues
 * @param options - Configuration options for the form builder
 * @returns An enhanced form object with additional utility methods
 *
 * @example
 * // Basic usage with validation
 * const form = useFormBuilder({
 *   schema: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   }),
 *   onSuccess: async (data) => {
 *     await api.auth.login(data);
 *     router.push('/dashboard');
 *   },
 *   onError: (error) => {
 *     toast.error('Login failed: ' + error.message);
 *   }
 * });
 *
 * // In your JSX
 * <form onSubmit={form.onSubmit(async (data) => {
 *   console.log('Validated data:', data);
 * })}>
 *   <input {...form.register('email')} />
 *   {form.hasError('email') && (
 *     <span>{form.getErrorMessage('email')}</span>
 *   )}
 *   <button disabled={form.isSubmitting}>Submit</button>
 * </form>
 */
export function useFormBuilder<T extends FieldValues>({
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
  };
}

/**
 * Higher-Order Component that wraps a component with form builder functionality.
 * This is useful for creating reusable form components with pre-configured
 * validation schemas and options.
 *
 * The wrapped component receives the form builder instance via props,
 * eliminating the need to call useFormBuilder in the component itself.
 *
 * @template T - The form data type
 * @param Component - The component to wrap, which must accept a 'form' prop
 * @param options - Form builder configuration options
 * @returns A new component with integrated form builder
 *
 * @example
 * // Create a reusable registration form component
 * const RegisterForm = withFormBuilder<RegisterFormData>(
 *   ({ form }) => (
 *     <form onSubmit={form.onSubmit(handleRegister)}>
 *       <input {...form.register('email')} />
 *       <input {...form.register('password')} type="password" aria-label="Password input" aria-label="Password input" />
 *       <button disabled={form.isSubmitting}>Register</button>
 *     </form>
 *   ),
 *   {
 *     schema: registerSchema,
 *     validationMode: 'onChange'
 *   }
 * );
 *
 * // Use it anywhere without calling useFormBuilder
 * <RegisterForm />
 */
export function withFormBuilder<T extends FieldValues>(
  Component: React.ComponentType<{ form: FormBuilderReturn<T> }>,
  options: FormBuilderOptions<T>
): React.FC {
  // Create the wrapped component that provides the form builder
  const WrappedFormComponent: React.FC = () => {
    const form = useFormBuilder<T>(options);
    return <Component form={form} />;
  };

  // Set a meaningful display name for debugging in React DevTools
  WrappedFormComponent.displayName = `withFormBuilder(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedFormComponent;
}

/**
 * Factory function that creates a typed form builder hook with pre-configured
 * schema and options. This is ideal for creating reusable form hooks for
 * specific forms throughout your application.
 *
 * The returned hook can be used like any other hook, and accepts additional
 * configuration options that merge with or override the pre-configured ones.
 *
 * @template T - The form data type
 * @param schema - The Zod validation schema
 * @param config - Base configuration options
 * @returns A custom hook that creates form builders with the given schema
 *
 * @example
 * // Define a reusable login form hook
 * const useLoginForm = createFormBuilder<LoginFormData>(
 *   z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   }),
 *   { validationMode: 'onChange' }
 * );
 *
 * // Use it in multiple components with optional overrides
 * function LoginPage() {
 *   const form = useLoginForm({
 *     onSuccess: async (data) => {
 *       await api.auth.login(data);
 *       router.push('/dashboard');
 *     }
 *   });
 *
 *   return (
 *     <form onSubmit={form.onSubmit(async (data) => {
 *       console.log('Logging in with:', data.email);
 *     })}>
 *       // Form fields...
 *     </form>
 *   );
 * }
 */
export function createFormBuilder<T extends FieldValues>(
  schema: ZodSchema<T>,
  config?: Omit<FormBuilderOptions<T>, 'schema'>
) {
  return (additionalConfig?: Partial<FormBuilderOptions<T>>): FormBuilderReturn<T> =>
    useFormBuilder<T>({
      schema,
      ...config,
      ...additionalConfig,
    } as FormBuilderOptions<T>);
}
