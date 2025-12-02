/**
 * Form Testing Utilities - Testing Library Implementation
 */

// @testing-library/dom is not available in shared module - this would be used in client/server
// import { screen, fireEvent, waitFor, queries } from '@testing-library/dom';
import { BaseFormTestingUtils, FormField, FormTestConfig, FormTestResult } from './base-form-testing';
// import { logger } from '../../observability/logging'; // Unused import

// Mock type for when testing-library is not available
type QueryMethods = {
  getBySelector?: (selector: string) => HTMLElement;
};

// Mock testing library functions for shared module compatibility
const mockQueries = {
  getBySelector: (selector: string): HTMLElement => {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`No element found for selector: ${selector}`);
    }
    return element as HTMLElement;
  }
};

const mockScreen = {
  getByText: (text: string) => ({ textContent: text } as unknown as HTMLElement),
  getByRole: (role: string, options?: any) => ({ role, ...options } as unknown as HTMLElement),
  getByTestId: (testId: string) => ({ 'data-testid': testId } as unknown as HTMLElement),
  getByLabelText: (label: string) => ({ 'aria-label': label } as unknown as HTMLElement)
};

const mockFireEvent = {
  change: (_element: any, _event: any) => { /* mock implementation */ },
  click: (_element: any) => { /* mock implementation */ }
};

const mockWaitFor = async (_callback: () => void, _options?: any) => {
  // Mock implementation - in real environment this would wait for DOM changes
  return Promise.resolve();
};

// Use mocks instead of real testing library
const queries = mockQueries;
const screen = mockScreen;
const fireEvent = mockFireEvent;
const waitFor = mockWaitFor;

export class TestingLibraryFormUtils extends BaseFormTestingUtils {
  private readonly customQueries: QueryMethods = {
    ...queries,
    getBySelector: (selector: string): HTMLElement => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`No element found for selector: ${selector}`);
      }
      return element as HTMLElement;
    }
  };
  async fillField(field: FormField, value: string | number): Promise<void> {
    const input = await this.findFieldElement(field);
    if (!input) {
      throw new Error(`Field ${field.name} not found`);
    }

    fireEvent.change(input, { target: { value: String(value) } });

    if (field.validation?.validateOnChange) {
      await waitFor(() => {
        // Wait for any validation to complete
      });
    }
  }

  async submitForm(config?: FormTestConfig): Promise<void> {
    let submitButton: HTMLElement;

    try {
      if (config?.submitButtonSelector && this.customQueries.getBySelector) {
        submitButton = this.customQueries.getBySelector(config.submitButtonSelector);
      } else if (config?.submitButtonText) {
        submitButton = screen.getByText(config.submitButtonText);
      } else {
        submitButton = screen.getByRole('button', { name: /submit/i });
      }

      fireEvent.click(submitButton);

      if (config?.waitForSubmission) {
        await waitFor(() => {}, { timeout: config.timeout || 5000 });
      }
    } catch (error) {
      throw new Error(`Failed to submit form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearField(field: FormField): Promise<void> {
    const input = await this.findFieldElement(field);
    if (!input) {
      throw new Error(`Field ${field.name} not found`);
    }

    fireEvent.change(input, { target: { value: '' } });

    if (field.validation?.validateOnChange) {
      await waitFor(() => {
        // Wait for any validation to complete
      });
    }
  }

  async checkFieldError(field: FormField, expectedError?: string): Promise<boolean> {
    const fieldElement = await this.findFieldElement(field);
    if (!fieldElement) return false;

    await waitFor(() => {}, { timeout: 1000 });

    try {
      if (!expectedError) {
        // Check for any error messages in the field's context
        const container = fieldElement.parentElement;
        if (!container) return false;
        const errorMessage = container.querySelector('[role="alert"]');
        return !errorMessage;
      }

      // Look for the specific error message
      const errorMessage = screen.getByText(expectedError);
      const describedBy = fieldElement.getAttribute('aria-describedby');
      const isAssociatedById = describedBy ? describedBy.includes(errorMessage.id || '') : false;
      const isAssociatedByParent = fieldElement.parentElement ? fieldElement.parentElement.contains(errorMessage) : false;
      
      return !!errorMessage && (isAssociatedById || isAssociatedByParent);
    } catch {
      return false;
    }
  }

  async checkFieldValue(field: FormField, expectedValue: any): Promise<boolean> {
    const input = await this.findFieldElement(field);
    if (!input) {
      throw new Error(`Field ${field.name} not found`);
    }

    return (input as HTMLInputElement).value === String(expectedValue);
  }

  async checkAccessibility(field: FormField): Promise<FormTestResult> {
    const result: FormTestResult = {
      success: true,
      errors: [],
      warnings: []
    };

    const input = await this.findFieldElement(field);
    if (!input) {
      result.success = false;
      result.errors.push(`Field ${field.name} not found`);
      return result;
    }

    // Check label association
    const label = input instanceof HTMLInputElement ? input.labels?.[0] : null;
    if (!label) {
      result.errors.push(`Field ${field.name} has no associated label`);
    }

    // Check ARIA attributes
    if (field.required && !input.hasAttribute('aria-required')) {
      result.warnings.push(`Required field ${field.name} should have aria-required attribute`);
    }

    if (!input.hasAttribute('aria-label') && !label) {
      result.errors.push(`Field ${field.name} needs either an aria-label or a visible label`);
    }

    return result;
  }

  private async findFieldElement(field: FormField): Promise<HTMLElement | null> {
    if (field.testId) {
      return screen.getByTestId(field.testId);
    }
    if (field.selector && this.customQueries.getBySelector) {
      return this.customQueries.getBySelector(field.selector);
    }
    if (field.ariaLabel) {
      return screen.getByLabelText(field.ariaLabel);
    }
    return screen.getByLabelText(field.label);
  }
}
















































