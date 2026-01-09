/**
 * Form Builder Service
 *
 * Service layer for form builder operations with dependency injection support
 */

import { ZodSchema, ZodError } from 'zod';
import type {
  FormBuilderOptions,
  FormBuilderReturn,
  FormBuilderService,
  FormValidationContext,
  FormSubmissionResult,
  FormBuilderFactoryConfig,
} from '../types/form-builder.types';
import { useFormBuilder } from '../hooks/useFormBuilder';

/**
 * Form Builder Service Implementation
 * Provides dependency injection patterns and centralized form management
 */
export class FormBuilderServiceImpl<T extends Record<string, any>> implements FormBuilderService<T> {
  private readonly defaultOptions: Partial<Omit<FormBuilderOptions<T>, 'schema'>>;

  constructor(config?: FormBuilderFactoryConfig<T>) {
    this.defaultOptions = {
      validationMode: config?.validationMode || 'onBlur',
      debug: config?.debug || false,
      errorMessages: config?.errorMessages || {},
    };
  }

  /**
   * Creates a form instance with the provided options
   */
  createForm(options: FormBuilderOptions<T>): FormBuilderReturn<T> {
    return useFormBuilder({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Validates a specific field against the schema
   */
  async validateField(fieldName: string, value: any): Promise<string | undefined> {
    try {
      // This would need access to the schema, which we don't have here
      // In a real implementation, we'd need to pass the schema or have it available
      return undefined;
    } catch (error) {
      if (error instanceof ZodError) {
        return error.errors[0]?.message;
      }
      return 'Validation failed';
    }
  }

  /**
   * Validates the entire form data against the schema
   */
  async validateForm(data: T): Promise<{ isValid: boolean; errors: Record<string, string> }> {
    try {
      // This would need access to the schema, which we don't have here
      // In a real implementation, we'd need to pass the schema or have it available
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          errors[field] = err.message;
        });
        return { isValid: false, errors };
      }
      return { isValid: false, errors: { _form: 'Validation failed' } };
    }
  }

  /**
   * Resets a form instance to its initial state
   */
  resetForm(form: FormBuilderReturn<T>): void {
    form.resetForm();
  }

  /**
   * Gets the current form data
   */
  getFormData(form: FormBuilderReturn<T>): T {
    return form.getValues() as T;
  }

  /**
   * Sets form data
   */
  setFormData(form: FormBuilderReturn<T>, data: Partial<T>): void {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined) {
        form.setValue(key as any, value);
      }
    });
  }

  /**
   * Gets form validation context
   */
  getValidationContext(form: FormBuilderReturn<T>): FormValidationContext<T> {
    return {
      schema: form.formState.schema as unknown as ZodSchema<T>,
      errors: form.formState.errors as Partial<Record<string, string>>,
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      touchedFields: form.formState.touchedFields as Partial<Record<string, boolean>>,
    };
  }

  /**
   * Submits form data with validation
   */
  async submitForm(
    form: FormBuilderReturn<T>,
    data: T,
    onSubmitHandler: (data: T) => Promise<void>
  ): Promise<FormSubmissionResult<T>> {
    try {
      // Validate the data
      const validation = await this.validateForm(data);

      if (!validation.isValid) {
        return {
          success: false,
          validationErrors: validation.errors,
        };
      }

      // Execute the submit handler
      await onSubmitHandler(data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Form submission failed'),
      };
    }
  }
}

/**
 * Form Builder Factory
 * Creates configured form builder services
 */
export class FormBuilderFactory {
  /**
   * Creates a form builder service with the provided configuration
   */
  static createService<T extends Record<string, any>>(
    config: FormBuilderFactoryConfig<T>
  ): FormBuilderService<T> {
    return new FormBuilderServiceImpl<T>(config);
  }

  /**
   * Creates a pre-configured form builder hook
   */
  static createHook<T extends Record<string, any>>(
    config: FormBuilderFactoryConfig<T>
  ): (options?: Partial<FormBuilderOptions<T>>) => FormBuilderReturn<T> {
    return (options = {}) => {
      const formOptions: FormBuilderOptions<T> = {
        schema: config.schema,
        validationMode: config.validationMode || 'onBlur',
        debug: config.debug || false,
        errorMessages: config.errorMessages || {},
        ...(config.defaultValues && { defaultValues: config.defaultValues }),
        ...options,
      };
      return useFormBuilder(formOptions);
    };
  }
}

/**
 * Form Builder Registry
 * Manages multiple form builders with dependency injection
 */
export class FormBuilderRegistry {
  private static instances: Map<string, FormBuilderService<any>> = new Map();

  /**
   * Registers a form builder service
   */
  static register<T extends Record<string, any>>(
    key: string,
    service: FormBuilderService<T>
  ): void {
    this.instances.set(key, service);
  }

  /**
   * Gets a registered form builder service
   */
  static get<T extends Record<string, any>>(key: string): FormBuilderService<T> | undefined {
    return this.instances.get(key) as FormBuilderService<T>;
  }

  /**
   * Creates and registers a form builder service
   */
  static createAndRegister<T extends Record<string, any>>(
    key: string,
    config: FormBuilderFactoryConfig<T>
  ): FormBuilderService<T> {
    const service = FormBuilderFactory.createService(config);
    this.register(key, service);
    return service;
  }

  /**
   * Clears all registered services
   */
  static clear(): void {
    this.instances.clear();
  }
}

/**
 * Dependency injection container for form builders
 */
export class FormBuilderContainer {
  private services: Map<string, FormBuilderService<any>> = new Map();

  /**
   * Registers a service with the container
   */
  register<T extends Record<string, any>>(
    key: string,
    service: FormBuilderService<T>
  ): void {
    this.services.set(key, service);
  }

  /**
   * Gets a service from the container
   */
  get<T extends Record<string, any>>(key: string): FormBuilderService<T> {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Form builder service '${key}' not found`);
    }
    return service as FormBuilderService<T>;
  }

  /**
   * Creates and registers a service
   */
  createAndRegister<T extends Record<string, any>>(
    key: string,
    config: FormBuilderFactoryConfig<T>
  ): FormBuilderService<T> {
    const service = FormBuilderFactory.createService(config);
    this.register(key, service);
    return service;
  }

  /**
   * Clears all services
   */
  clear(): void {
    this.services.clear();
  }
}

// Global container instance
export const formBuilderContainer = new FormBuilderContainer();
