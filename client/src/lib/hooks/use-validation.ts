/**
 * Client-Side Validation Hook
 * 
 * Provides client-side validation using shared Zod schemas.
 * Integrates with react-hook-form for form validation.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm as useHookForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Transform Zod errors to validation errors
 */
function transformZodErrors(zodError: ZodError): ValidationError[] {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Validate data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result
 * 
 * @example
 * const result = validateData(UserSchema, formData);
 * if (result.success) {
 *   // Use result.data
 * } else {
 *   // Handle result.errors
 * }
 */
export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: transformZodErrors(result.error),
  };
}

/**
 * Validate a single field against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param fieldName - Name of the field to validate
 * @param value - Value to validate
 * @returns Validation result for the field
 * 
 * @example
 * const result = validateField(UserSchema, 'email', 'test@example.com');
 * if (!result.success) {
 *   // Show result.errors
 * }
 */
export function validateField<T>(
  schema: ZodSchema<T>,
  fieldName: string,
  value: unknown
): ValidationResult<unknown> {
  try {
    // Create a partial schema for the field
    const fieldSchema = schema.pick({ [fieldName]: true } as any);
    const result = fieldSchema.safeParse({ [fieldName]: value });

    if (result.success) {
      return {
        success: true,
        data: (result.data as any)[fieldName],
      };
    }

    return {
      success: false,
      errors: transformZodErrors(result.error),
    };
  } catch (error) {
    // If field doesn't exist in schema, return success
    return {
      success: true,
      data: value,
    };
  }
}

/**
 * Hook for form validation with react-hook-form and Zod
 * 
 * @param schema - Zod schema to validate against
 * @param options - react-hook-form options
 * @returns react-hook-form methods
 * 
 * @example
 * import { UserRegistrationSchema } from '@shared/validation';
 * 
 * function RegistrationForm() {
 *   const { register, handleSubmit, formState: { errors } } = useFormValidation(
 *     UserRegistrationSchema
 *   );
 * 
 *   const onSubmit = (data) => {
 *     // data is validated and type-safe
 *     console.log(data);
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <input {...register('email')} />
 *       {errors.email && <span>{errors.email.message}</span>}
 *       <button type="submit">Submit</button>
 *     </form>
 *   );
 * }
 */
export function useFormValidation<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>
): UseFormReturn<T> {
  return useHookForm<T>({
    ...options,
    resolver: zodResolver(schema),
  });
}

/**
 * Hook for async validation (e.g., checking if email exists)
 * 
 * @param validationFn - Async validation function
 * @returns Validation state and trigger function
 * 
 * @example
 * const { validate, isValidating, error } = useAsyncValidation(
 *   async (email) => {
 *     const response = await fetch(`/api/users/check-email?email=${email}`);
 *     const data = await response.json();
 *     if (data.exists) {
 *       throw new Error('Email already exists');
 *     }
 *   }
 * );
 * 
 * // In your form
 * <input
 *   onBlur={(e) => validate(e.target.value)}
 * />
 * {error && <span>{error}</span>}
 */
export function useAsyncValidation<T>(
  validationFn: (value: T) => Promise<void>
) {
  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const validate = React.useCallback(
    async (value: T) => {
      setIsValidating(true);
      setError(null);

      try {
        await validationFn(value);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
      } finally {
        setIsValidating(false);
      }
    },
    [validationFn]
  );

  return {
    validate,
    isValidating,
    error,
  };
}

/**
 * Hook for real-time field validation
 * 
 * @param schema - Zod schema to validate against
 * @param fieldName - Name of the field to validate
 * @returns Validation state and setter
 * 
 * @example
 * const { value, setValue, error, isValid } = useFieldValidation(
 *   UserSchema,
 *   'email'
 * );
 * 
 * <input
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 * />
 * {error && <span>{error}</span>}
 */
export function useFieldValidation<T>(
  schema: ZodSchema<T>,
  fieldName: string
) {
  const [value, setValue] = React.useState<unknown>('');
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const validate = React.useCallback(
    (newValue: unknown) => {
      if (!touched) return;

      const result = validateField(schema, fieldName, newValue);
      if (!result.success && result.errors && result.errors.length > 0) {
        setError(result.errors[0].message);
      } else {
        setError(null);
      }
    },
    [schema, fieldName, touched]
  );

  const handleSetValue = React.useCallback(
    (newValue: unknown) => {
      setValue(newValue);
      validate(newValue);
    },
    [validate]
  );

  const handleBlur = React.useCallback(() => {
    setTouched(true);
    validate(value);
  }, [validate, value]);

  return {
    value,
    setValue: handleSetValue,
    error,
    isValid: error === null,
    touched,
    onBlur: handleBlur,
  };
}

// Re-export React for hooks
import * as React from 'react';
