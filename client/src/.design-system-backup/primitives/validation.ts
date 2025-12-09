/**
 * UI component validation schemas and utilities
 * Following navigation component validation patterns for consistency
 */

import { z } from 'zod';

import { UIValidationError, UIInputError, UIFormError, UIDateError } from './errors';

/**
 * Base validation schemas
 */

export const BaseUIPropsSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  'data-testid': z.string().optional(),
});

export const ValidationStateSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
  touched: z.boolean(),
});

/**
 * Input validation schemas
 */

export const InputValueSchema = z.string()
  .min(0, 'Input value cannot be negative length')
  .max(10000, 'Input value too long');

export const EmailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email too long');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number');

export const PhoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long');

export const URLSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export const NumberInputSchema = z.union([
  z.string().transform((val) => {
    if (/^\d*\.?\d*$/.test(val)) {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }),
  z.number()
]).transform((val) => {
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }
  return val;
});

/**
 * Form validation schemas
 */

export const FormFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  value: z.any(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
});

export const FormValidationConfigSchema = z.object({
  validateOnSubmit: z.boolean().optional(),
  validateOnChange: z.boolean().optional(),
  validateOnBlur: z.boolean().optional(),
  showErrorSummary: z.boolean().optional(),
  scrollToFirstError: z.boolean().optional(),
});

/**
 * Select validation schemas
 */

export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

export const SelectValueSchema = z.string()
  .min(1, 'Please select an option');

/**
 * Button validation schemas
 */

export const ButtonStateSchema = z.object({
  loading: z.boolean().optional(),
  error: z.boolean().optional(),
  success: z.boolean().optional(),
});

export const ButtonVariantSchema = z.enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']);
export const ButtonSizeSchema = z.enum(['default', 'sm', 'lg', 'icon']);

/**
 * Date validation schemas
 */

export const DateSchema = z.date({
  required_error: 'Date is required',
  invalid_type_error: 'Invalid date format',
});

export const DateRangeSchema = z.object({
  from: DateSchema.optional(),
  to: DateSchema.optional(),
}).refine((data) => {
  if (data.from && data.to) {
    return data.from <= data.to;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['to'],
});

/**
 * Table validation schemas
 */

export const TableColumnSchema = z.object({
  key: z.string().min(1, 'Column key is required'),
  header: z.string().min(1, 'Column header is required'),
  validator: z.any().optional(), // ZodSchema
  required: z.boolean().optional(),
});

export const TableDataSchema = z.array(z.record(z.any()));

/**
 * Dialog validation schemas
 */

export const DialogPropsSchema = z.object({
  title: z.string().min(1, 'Dialog title is required'),
  description: z.string().optional(),
  confirmText: z.string().optional(),
  cancelText: z.string().optional(),
  loading: z.boolean().optional(),
  error: z.string().optional(),
});

/**
 * Validation utility functions
 */

export function validateInputValue(value: string, type?: string): string {
  try {
    if (type === 'email') {
      return EmailSchema.parse(value);
    } else if (type === 'password') {
      return PasswordSchema.parse(value);
    } else if (type === 'tel') {
      return PhoneSchema.parse(value);
    } else if (type === 'url') {
      return URLSchema.parse(value);
    } else {
      return InputValueSchema.parse(value);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid input value';
      throw new UIInputError('input', value, message, { zodError: error, type });
    }
    throw new UIInputError('input', value, 'Input validation failed', { type });
  }
}

export function validateSelectValue(value: string, options?: Array<{ value: string; label: string }>): string {
  try {
    const validatedValue = SelectValueSchema.parse(value);
    
    if (options && options.length > 0) {
      const validOptions = options.map(opt => opt.value);
      if (!validOptions.includes(validatedValue)) {
        throw new UIValidationError('Invalid option selected', 'select', value, { validOptions });
      }
    }
    
    return validatedValue;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid selection';
      throw new UIValidationError(message, 'select', value, { zodError: error });
    }
    throw error;
  }
}

export function validateFormData(data: Record<string, any>, schema: z.ZodSchema): any {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      throw new UIFormError('form', errors, { zodError: error });
    }
    throw new UIFormError('form', { general: 'Form validation failed' });
  }
}

export function validateDate(date: Date | string, minDate?: Date, maxDate?: Date): Date {
  try {
    let parsedDate: Date;
    
    if (typeof date === 'string') {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new UIDateError('date-picker', date, 'Invalid date format');
      }
    } else {
      parsedDate = DateSchema.parse(date);
    }
    
    if (minDate && parsedDate < minDate) {
      throw new UIDateError('date-picker', date, `Date must be after ${minDate.toLocaleDateString()}`);
    }
    
    if (maxDate && parsedDate > maxDate) {
      throw new UIDateError('date-picker', date, `Date must be before ${maxDate.toLocaleDateString()}`);
    }
    
    return parsedDate;
  } catch (error) {
    if (error instanceof UIDateError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid date';
      throw new UIDateError('date-picker', date, message, { zodError: error });
    }
    throw new UIDateError('date-picker', date, 'Date validation failed');
  }
}

export function validateTableData(data: unknown[], columns: Array<{ key: string; validator?: z.ZodSchema; required?: boolean }>): any[] {
  try {
    const validatedData = TableDataSchema.parse(data);
    
    const errors: Array<{ row: number; column: string; message: string; value: any }> = [];
    
    validatedData.forEach((row, rowIndex) => {
      columns.forEach((column) => {
        const value = row[column.key];
        
        if (column.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: rowIndex,
            column: column.key,
            message: `${column.key} is required`,
            value
          });
        }
        
        if (column.validator) {
          if (value === undefined || value === null || value === '') {
            if (column.required !== false) { // Treat fields with validators as required unless explicitly optional
              errors.push({
                row: rowIndex,
                column: column.key,
                message: `${column.key} is required`,
                value
              });
            }
          } else {
            try {
              column.validator.parse(value);
            } catch (validationError) {
              if (validationError instanceof z.ZodError) {
                errors.push({
                  row: rowIndex,
                  column: column.key,
                  message: validationError.errors[0]?.message || 'Invalid value',
                  value
                });
              }
            }
          }
        } else if (column.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: rowIndex,
            column: column.key,
            message: `${column.key} is required`,
            value
          });
        }
      });
    });
    
    if (errors.length > 0) {
      throw new UIValidationError('Table data validation failed', 'table', data, { errors });
    }
    
    return validatedData;
  } catch (error) {
    if (error instanceof UIValidationError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new UIValidationError('Invalid table data format', 'table', data, { zodError: error });
    }
    throw new UIValidationError('Table data validation failed', 'table', data);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateInputValue(value: string, type?: string): { success: boolean; data?: string; error?: UIInputError } {
  try {
    const data = validateInputValue(value, type);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as UIInputError };
  }
}

export function safeValidateSelectValue(value: string, options?: Array<{ value: string; label: string }>): { success: boolean; data?: string; error?: UIValidationError } {
  try {
    const data = validateSelectValue(value, options);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as UIValidationError };
  }
}

export function safeValidateFormData(data: Record<string, any>, schema: z.ZodSchema): { success: boolean; data?: any; error?: UIFormError } {
  try {
    const validatedData = validateFormData(data, schema);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: error as UIFormError };
  }
}

export function safeValidateDate(date: Date | string, minDate?: Date, maxDate?: Date): { success: boolean; data?: Date; error?: UIDateError } {
  try {
    const data = validateDate(date, minDate, maxDate);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as UIDateError };
  }
}

