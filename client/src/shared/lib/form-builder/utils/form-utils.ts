/**
 * Form Builder Utilities
 *
 * Utility functions for form builder operations
 */

import { z } from 'zod';
import type { FormFieldConfig, FormConfig, FormBuilderOptions } from '../types/form-builder.types';

/**
 * Creates a Zod schema from form configuration
 */
export function createSchemaFromConfig<T extends Record<string, any>>(
  config: FormConfig<T>
): z.ZodObject<any> {
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

  return z.object(schemaFields);
}

/**
 * Validates a form field value
 */
export function validateField<T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  fieldName: keyof T,
  value: any
): string | undefined {
  try {
    schema.pick({ [fieldName]: true }).parse({ [fieldName]: value });
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message;
    }
    return 'Validation failed';
  }
}

/**
 * Validates entire form data
 */
export function validateFormData<T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  data: T
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  try {
    schema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Partial<Record<keyof T, string>> = {};
      error.errors.forEach((err) => {
        const field = err.path.join('.') as keyof T;
        errors[field] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _form: 'Validation failed' } };
  }
}

/**
 * Creates a form configuration from a Zod schema
 */
export function createFormConfigFromSchema<T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  options?: {
    labels?: Partial<Record<keyof T, string>>;
    placeholders?: Partial<Record<keyof T, string>>;
    types?: Partial<Record<keyof T, FormFieldConfig<T>['type']>>;
    required?: Partial<Record<keyof T, boolean>>;
  }
): FormConfig<T> {
  const fields: FormFieldConfig<T>[] = [];

  const shape = schema.shape;
  const keys = Object.keys(shape) as (keyof T)[];

  keys.forEach((key) => {
    const field: FormFieldConfig<T> = {
      name: key,
      type: options?.types?.[key] || 'text',
      label: options?.labels?.[key] || String(key),
      placeholder: options?.placeholders?.[key] || String(key),
      required: options?.required?.[key] || false,
    };
    fields.push(field);
  });

  return {
    fields,
    submitText: 'Submit',
    resetText: 'Reset',
    layout: 'vertical',
  };
}

/**
 * Merges form configurations
 */
export function mergeFormConfigs<T extends Record<string, any>>(
  baseConfig: FormConfig<T>,
  overrideConfig: Partial<FormConfig<T>>
): FormConfig<T> {
  return {
    ...baseConfig,
    ...overrideConfig,
    fields: overrideConfig.fields ? [...baseConfig.fields, ...overrideConfig.fields] : baseConfig.fields,
  };
}

/**
 * Creates a form builder options object
 */
export function createFormBuilderOptions<T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  options?: Partial<FormBuilderOptions<T>>
): FormBuilderOptions<T> {
  return {
    schema,
    validationMode: 'onBlur',
    debug: false,
    errorMessages: {},
    ...options,
  };
}

/**
 * Extracts field names from a form configuration
 */
export function getFieldNames<T extends Record<string, any>>(
  config: FormConfig<T>
): (keyof T)[] {
  return config.fields.map(field => field.name);
}

/**
 * Checks if a form has required fields
 */
export function hasRequiredFields<T extends Record<string, any>>(
  config: FormConfig<T>
): boolean {
  return config.fields.some(field => field.required);
}

/**
 * Gets required field names from a form configuration
 */
export function getRequiredFieldNames<T extends Record<string, any>>(
  config: FormConfig<T>
): (keyof T)[] {
  return config.fields.filter(field => field.required).map(field => field.name);
}

/**
 * Creates a default values object from form configuration
 */
export function createDefaultValues<T extends Record<string, any>>(
  config: FormConfig<T>
): Partial<T> {
  const defaults: Partial<T> = {};

  config.fields.forEach(field => {
    if (field.type === 'checkbox') {
      defaults[field.name] = false as any;
    } else if (field.type === 'select' || field.type === 'radio') {
      defaults[field.name] = '' as any;
    } else {
      defaults[field.name] = '' as any;
    }
  });

  return defaults;
}

/**
 * Validates form configuration
 */
export function validateFormConfig<T extends Record<string, any>>(
  config: FormConfig<T>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.fields || config.fields.length === 0) {
    errors.push('Form must have at least one field');
  }

  const fieldNames = config.fields.map(field => field.name);
  const duplicateFields = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);

  if (duplicateFields.length > 0) {
    errors.push(`Duplicate field names: ${duplicateFields.join(', ')}`);
  }

  config.fields.forEach((field, index) => {
    if (!field.name) {
      errors.push(`Field at index ${index} must have a name`);
    }
    if (!field.label) {
      errors.push(`Field '${field.name}' must have a label`);
    }
    if (!field.type) {
      errors.push(`Field '${field.name}' must have a type`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats form data for submission
 */
export function formatFormData<T extends Record<string, any>>(
  data: T,
  config: FormConfig<T>
): T {
  const formatted: any = { ...data };

  config.fields.forEach(field => {
    const value = formatted[field.name];

    if (value === '' || value === null || value === undefined) {
      formatted[field.name] = field.type === 'checkbox' ? false : '';
    }
  });

  return formatted;
}

/**
 * Sanitizes form data
 */
export function sanitizeFormData<T extends Record<string, any>>(
  data: T,
  config: FormConfig<T>
): T {
  const sanitized: any = { ...data };

  config.fields.forEach(field => {
    const value = sanitized[field.name];

    if (typeof value === 'string') {
      sanitized[field.name] = value.trim();
    }
  });

  return sanitized;
}
