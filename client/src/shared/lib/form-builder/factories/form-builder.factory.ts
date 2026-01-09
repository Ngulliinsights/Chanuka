/**
 * Form Builder Factory Functions
 *
 * Factory functions for creating form builders with pre-configured schemas
 */

import { z } from 'zod';
import { useFormBuilder } from '../hooks/useFormBuilder';
import { FormBuilderServiceImpl } from '../services/form-builder.service';
import type {
  FormBuilderOptions,
  FormBuilderReturn,
  FormBuilderFactoryConfig,
  FormConfig,
  FormFieldConfig,
} from '../types/form-builder.types';

/**
 * Creates a form builder hook with pre-configured schema and options
 */
export function createFormBuilder<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  config?: Omit<FormBuilderFactoryConfig<T>, 'schema'>
) {
  return (additionalConfig?: Partial<FormBuilderOptions<T>>): FormBuilderReturn<T> =>
    useFormBuilder<T>({
      schema,
      ...config,
      ...additionalConfig,
    } as FormBuilderOptions<T>);
}

/**
 * Creates a login form builder
 */
export function createLoginFormBuilder() {
  const schema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    rememberMe: z.boolean().optional(),
  });

  return createFormBuilder(schema, {
    validationMode: 'onBlur',
    debug: false,
  });
}

/**
 * Creates a registration form builder
 */
export function createRegistrationFormBuilder() {
  const schema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
    newsletter: z.boolean().optional(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  return createFormBuilder(schema, {
    validationMode: 'onChange',
    debug: false,
  });
}

/**
 * Creates a profile form builder
 */
export function createProfileFormBuilder() {
  const schema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    bio: z.string().max(500, 'Bio too long').optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    avatar: z.string().url().optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().optional(),
  });

  return createFormBuilder(schema, {
    validationMode: 'onBlur',
    debug: false,
  });
}

/**
 * Creates a contact form builder
 */
export function createContactFormBuilder() {
  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject too long'),
    message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message too long'),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    attachments: z.array(z.string()).optional(),
  });

  return createFormBuilder(schema, {
    validationMode: 'onBlur',
    debug: false,
  });
}

/**
 * Creates a bill creation form builder
 */
export function createBillFormBuilder() {
  const schema = z.object({
    title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title too long'),
    description: z.string().min(50, 'Description must be at least 50 characters').max(5000, 'Description too long'),
    policyArea: z.string().min(1, 'Policy area is required').max(100, 'Policy area too long'),
    urgency: z.enum(['low', 'medium', 'high', 'critical'], {
      errorMap: () => ({ message: 'Select a valid urgency level' }),
    }),
    tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
    sponsors: z.array(z.string()).optional(),
    constitutionalImpact: z.string().max(1000, 'Constitutional impact too long').optional(),
    estimatedCost: z.number().nonnegative('Cost must be non-negative').optional(),
  });

  return createFormBuilder(schema, {
    validationMode: 'onBlur',
    debug: false,
  });
}

/**
 * Creates a dynamic form configuration from a schema
 */
export function createFormConfigFromSchema<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
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
 * Creates a form service with dependency injection
 */
export function createFormService<T extends Record<string, any>>(
  config: FormBuilderFactoryConfig<T>
) {
  return new FormBuilderServiceImpl<T>(config);
}

/**
 * Creates a form builder registry entry
 */
export function registerFormBuilder<T extends Record<string, any>>(
  key: string,
  config: FormBuilderFactoryConfig<T>
) {
  const service = createFormService(config);
  // This would register with the global registry
  return service;
}

/**
 * Creates a form builder container with multiple services
 */
export function createFormContainer() {
  const container = new Map<string, any>();

  return {
    register: <T extends Record<string, any>>(key: string, config: FormBuilderFactoryConfig<T>) => {
      const service = createFormService(config);
      container.set(key, service);
      return service;
    },

    get: <T extends Record<string, any>>(key: string): FormBuilderServiceImpl<T> => {
      const service = container.get(key);
      if (!service) {
        throw new Error(`Form builder service '${key}' not found`);
      }
      return service;
    },

    clear: () => {
      container.clear();
    },

    list: () => Array.from(container.keys()),
  };
}

/**
 * Creates a form builder with custom validation messages
 */
export function createFormBuilderWithMessages<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  messages: Partial<Record<keyof T, string>>,
  config?: Omit<FormBuilderFactoryConfig<T>, 'schema'>
) {
  return createFormBuilder(schema, {
    ...config,
    errorMessages: messages,
  });
}

/**
 * Creates a form builder with custom validation mode
 */
export function createFormBuilderWithMode<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  mode: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all',
  config?: Omit<FormBuilderFactoryConfig<T>, 'schema'>
) {
  return createFormBuilder(schema, {
    ...config,
    validationMode: mode,
  });
}

/**
 * Creates a form builder with debug enabled
 */
export function createDebugFormBuilder<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  config?: Omit<FormBuilderFactoryConfig<T>, 'schema'>
) {
  return createFormBuilder(schema, {
    ...config,
    debug: true,
  });
}
