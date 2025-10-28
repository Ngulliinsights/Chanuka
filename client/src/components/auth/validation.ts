import { z } from 'zod';
import { AuthValidationError } from './errors';

/**
 * Auth validation schemas and utilities
 */

export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim()
  .max(254, 'Email address is too long');

export const PasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

export const StrongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Must contain an uppercase, lowercase, number, and special character'
  );

export const NameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z'-]+$/, 'Name can only contain letters, hyphens, and apostrophes')
  .trim();

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const RegisterSchema = z.object({
  firstName: NameSchema,
  lastName: NameSchema,
  email: EmailSchema,
  password: StrongPasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const AuthModeSchema = z.enum(['login', 'register']);

export const AuthConfigSchema = z.object({
  validation: z.object({
    enabled: z.boolean(),
    strict: z.boolean(),
    realTimeValidation: z.boolean(),
  }),
  password: z.object({
    minLength: z.number().int().min(8).max(100),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumbers: z.boolean(),
    requireSpecialChars: z.boolean(),
  }),
  ui: z.object({
    showPasswordRequirements: z.boolean(),
    enablePasswordToggle: z.boolean(),
    autoFocusFirstField: z.boolean(),
  }),
  security: z.object({
    sanitizeInput: z.boolean(),
    maxAttempts: z.number().int().min(1),
    lockoutDuration: z.number().int().min(0),
  }),
});

/**
 * Validation utility functions
 */

export function validateEmail(email: string): string {
  try {
    return EmailSchema.parse(email);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid email address';
      throw new AuthValidationError(message, 'email', email, { zodError: error });
    }
    throw new AuthValidationError('Email validation failed', 'email', email);
  }
}

export function validatePassword(password: string, strict: boolean = false): string {
  try {
    const schema = strict ? StrongPasswordSchema : PasswordSchema;
    return schema.parse(password);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid password';
      throw new AuthValidationError(message, 'password', password, { zodError: error });
    }
    throw new AuthValidationError('Password validation failed', 'password', password);
  }
}

export function validateName(name: string, fieldName: string = 'name'): string {
  try {
    return NameSchema.parse(name);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid name';
      throw new AuthValidationError(message, fieldName, name, { zodError: error });
    }
    throw new AuthValidationError('Name validation failed', fieldName, name);
  }
}

export function validateLoginData(data: unknown): any {
  try {
    return LoginSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid login data';
      throw new AuthValidationError(message, field, data, { zodError: error });
    }
    throw new AuthValidationError('Login data validation failed', 'data', data);
  }
}

export function validateRegisterData(data: unknown): any {
  try {
    return RegisterSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid registration data';
      throw new AuthValidationError(message, field, data, { zodError: error });
    }
    throw new AuthValidationError('Registration data validation failed', 'data', data);
  }
}

export function validateAuthMode(mode: string): string {
  try {
    return AuthModeSchema.parse(mode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid auth mode';
      throw new AuthValidationError(message, 'mode', mode, { zodError: error });
    }
    throw new AuthValidationError('Auth mode validation failed', 'mode', mode);
  }
}

export function validateAuthConfig(config: unknown): any {
  try {
    return AuthConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid auth configuration';
      throw new AuthValidationError(message, field, config, { zodError: error });
    }
    throw new AuthValidationError('Auth configuration validation failed', 'config', config);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateEmail(email: string): { success: boolean; data?: string; error?: AuthValidationError } {
  try {
    const data = validateEmail(email);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as AuthValidationError };
  }
}

export function safeValidatePassword(password: string, strict: boolean = false): { success: boolean; data?: string; error?: AuthValidationError } {
  try {
    const data = validatePassword(password, strict);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as AuthValidationError };
  }
}

export function safeValidateLoginData(data: unknown): { success: boolean; data?: any; error?: AuthValidationError } {
  try {
    const validData = validateLoginData(data);
    return { success: true, data: validData };
  } catch (error) {
    return { success: false, error: error as AuthValidationError };
  }
}

export function safeValidateRegisterData(data: unknown): { success: boolean; data?: any; error?: AuthValidationError } {
  try {
    const validData = validateRegisterData(data);
    return { success: true, data: validData };
  } catch (error) {
    return { success: false, error: error as AuthValidationError };
  }
}

/**
 * Field validation helper for real-time validation
 */
export function validateField(fieldName: string, value: string, mode: 'login' | 'register'): string | null {
  try {
    switch (fieldName) {
      case 'email':
        validateEmail(value);
        break;
      case 'password':
        validatePassword(value, mode === 'register');
        break;
      case 'firstName':
      case 'lastName':
        validateName(value, fieldName);
        break;
      case 'confirmPassword':
        // This requires the original password for comparison, handled in component
        if (!value) throw new Error('Please confirm your password');
        break;
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
    return null;
  } catch (error) {
    if (error instanceof AuthValidationError) {
      return error.message;
    }
    return error instanceof Error ? error.message : 'Validation failed';
  }
}

