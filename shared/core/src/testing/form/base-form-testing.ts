/**
 * Form Testing Utilities Base Class
 * Provides the core interfaces and abstract classes for form testing
 */

import { ValidationType } from '../../types/validation-types';
import { ValidationRule as BaseValidationRule } from '../../types/validation-types';
import { logger } from '../utils/logger';

// Re-export the base validation rule type with extensions for form testing
export type ValidationRule = BaseValidationRule;

// Extended validation rule type with additional form-specific validation types
export interface FormValidationRule extends BaseValidationRule {
  type: BaseValidationRule['type'] | 
    // Phone validation
    'phone' |
    // Number validation types
    'numberType' | 'integer' | 'positive' | 'decimalPlaces' | 'step';
  value?: any;
  message: string;
  validate?: (value: any, formData?: Record<string, any>) => boolean | Promise<boolean>;
  options?: Record<string, any>;
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  value?: string | number;
  required?: boolean;
  validation?: FormFieldValidation;
  selector?: string;
  testId?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export interface FormFieldValidation {
  rules: FormValidationRule[];
  messages?: Record<string, string>;
  async?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface FormValidationConfig {
  rules: FormValidationRule[];
  messages?: Record<string, string>;
  async?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface FormTestConfig {
  onSubmit?: (data: any) => void | Promise<void>;
  expectedSubmitData?: Record<string, any>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  submitButtonSelector?: string;
  submitButtonText?: string;
  formSelector?: string;
  waitForSubmission?: boolean;
  timeout?: number;
}

export interface FormTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  details?: Record<string, any>;
}

/**
 * Abstract base class for form testing utilities
 * This provides a consistent interface for testing forms across different frameworks
 * (React, Vue, vanilla HTML, etc.) while allowing specific implementations
 * to handle the actual DOM interaction details.
 */
export abstract class BaseFormTestingUtils {
  // Core abstract methods that must be implemented by subclasses
  abstract fillField(field: FormField, value: string | number): Promise<void>;
  abstract submitForm(config?: FormTestConfig): Promise<void>;
  abstract clearField(field: FormField): Promise<void>;
  abstract checkFieldError(field: FormField, expectedError?: string): Promise<boolean>;
  abstract checkFieldValue(field: FormField, expectedValue: any): Promise<boolean>;
  abstract checkAccessibility(field: FormField): Promise<FormTestResult>;

  /**
   * Convenience method to fill multiple form fields
   * This method processes fields sequentially to avoid race conditions
   * that might occur with rapid DOM updates
   */
  async fillForm(fields: FormField[]): Promise<void> {
    for (const field of fields) {
      if (field.value !== undefined && field.value !== null) {
        await this.fillField(field, field.value);
      }
    }
  }

  /**
   * Comprehensive form submission test
   * This method fills the form, submits it, and validates the results
   * against expected data if provided
   */
  async testFormSubmission(fields: FormField[], config: FormTestConfig): Promise<FormTestResult> {
    const result: FormTestResult = {
      success: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Fill form fields sequentially to ensure proper state management
      await this.fillForm(fields);

      // Submit the form and wait for processing if configured
      await this.submitForm(config);

      // Verify expected data if provided in the test configuration
      if (config.expectedSubmitData) {
        for (const field of fields) {
          const expected = config.expectedSubmitData[field.name];
          if (expected !== undefined) {
            const matches = await this.checkFieldValue(field, expected);
            if (!matches) {
              result.errors.push(
                `Field ${field.name} value does not match expected ${expected}`
              );
              result.success = false;
            }
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error during form submission'
      );
    }

    return result;
  }

  /**
   * Test field validation by providing invalid input and checking for expected errors
   * This method also verifies that errors clear when valid input is provided
   */
  async testFieldValidation(
    field: FormField, 
    invalidValue: any, 
    expectedError: string
  ): Promise<FormTestResult> {
    const result: FormTestResult = {
      success: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Clear any existing field value to start with clean state
      await this.clearField(field);

      // Set the invalid value that should trigger validation
      await this.fillField(field, invalidValue);

      // Check that the expected error message appears
      const hasError = await this.checkFieldError(field, expectedError);
      if (!hasError) {
        result.success = false;
        result.errors.push(
          `Expected error "${expectedError}" not found for field ${field.name}`
        );
      }

      // Test error clearing by setting a valid value
      await this.clearField(field);
      if (field.value !== undefined && field.value !== null) {
        await this.fillField(field, field.value);
        
        // Verify that the error message clears with valid input
        const errorCleared = !(await this.checkFieldError(field));
        if (!errorCleared) {
          result.warnings.push(
            `Error message persists after setting valid value for field ${field.name}`
          );
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error during validation testing'
      );
    }

    return result;
  }

  /**
   * Test accessibility compliance for all form fields
   * This includes checking for proper labeling, ARIA attributes, and keyboard navigation
   */
  async testFormAccessibility(fields: FormField[]): Promise<FormTestResult> {
    const result: FormTestResult = {
      success: true,
      errors: [],
      warnings: [],
      details: {
        fieldResults: {}
      }
    };

    // Test each field individually and aggregate results
    for (const field of fields) {
      const fieldResult = await this.checkAccessibility(field);
      
      if (!fieldResult.success) {
        result.success = false;
        result.errors.push(...fieldResult.errors);
      }
      
      result.warnings.push(...fieldResult.warnings);
      
      // Store individual field results for detailed analysis
      if (result.details?.fieldResults) {
        result.details.fieldResults[field.name] = fieldResult;
      }
    }

    return result;
  }

  /**
   * Utility method to validate a single field's configuration
   * This helps catch configuration errors before running tests
   */
  protected validateFieldConfig(field: FormField): string[] {
    const errors: string[] = [];

    if (!field.name) {
      errors.push('Field name is required');
    }

    if (!field.type) {
      errors.push(`Field ${field.name} must have a type specified`);
    }

    if (!field.selector && !field.testId) {
      errors.push(
        `Field ${field.name} must have either a selector or testId for DOM targeting`
      );
    }

    return errors;
  }

  /**
   * Utility method to validate form configuration
   * This helps ensure test configurations are properly structured
   */
  protected validateFormConfig(config: FormTestConfig): string[] {
    const errors: string[] = [];

    if (config.timeout && config.timeout < 0) {
      errors.push('Timeout value must be positive');
    }

    if (config.submitButtonSelector && config.submitButtonText) {
      errors.push('Cannot specify both submitButtonSelector and submitButtonText');
    }

    return errors;
  }
}






