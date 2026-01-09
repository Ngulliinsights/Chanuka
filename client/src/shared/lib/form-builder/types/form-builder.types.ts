/**
 * Form Builder Type Definitions
 * 
 * Type-safe definitions for the Form Builder FSD module
 */

import { z } from 'zod';
import { UseFormProps, UseFormReturn, SubmitHandler, Path } from 'react-hook-form';
import { ZodSchema, ZodError } from 'zod';

/**
 * Configuration options for the form builder.
 * Extends react-hook-form's options while enforcing Zod validation.
 */
export interface FormBuilderOptions<T extends Record<string, any>> extends Omit<UseFormProps<T>, 'resolver'> {
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
export interface FormBuilderReturn<T extends Record<string, any>> extends UseFormReturn<T> {
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
 * Form field configuration for dynamic form generation
 */
export interface FormFieldConfig<T extends Record<string, any>> {
  name: Path<T>;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | true;
  };
}

/**
 * Form configuration for dynamic form generation
 */
export interface FormConfig<T extends Record<string, any>> {
  fields: FormFieldConfig<T>[];
  submitText?: string;
  resetText?: string;
  className?: string;
  layout?: 'vertical' | 'horizontal' | 'grid';
  validationMode?: FormBuilderOptions<T>['validationMode'];
  debug?: boolean;
}

/**
 * Form submission result
 */
export interface FormSubmissionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  validationErrors?: Partial<Record<string, string>>;
}

/**
 * Form validation context
 */
export interface FormValidationContext<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  errors: Partial<Record<Path<T>, string>>;
  isValid: boolean;
  isDirty: boolean;
  touchedFields: Partial<Record<Path<T>, boolean>>;
}

/**
 * Form builder factory configuration
 */
export interface FormBuilderFactoryConfig<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  validationMode?: FormBuilderOptions<T>['validationMode'];
  debug?: boolean;
  errorMessages?: Partial<Record<Path<T>, string>>;
}

/**
 * Form builder service interface
 */
export interface FormBuilderService<T extends Record<string, any>> {
  createForm(options: FormBuilderOptions<T>): FormBuilderReturn<T>;
  validateField(fieldName: Path<T>, value: any): Promise<string | undefined>;
  validateForm(data: T): Promise<{ isValid: boolean; errors: Partial<Record<Path<T>, string>> }>;
  resetForm(form: FormBuilderReturn<T>): void;
  getFormData(form: FormBuilderReturn<T>): T;
  setFormData(form: FormBuilderReturn<T>, data: Partial<T>): void;
}