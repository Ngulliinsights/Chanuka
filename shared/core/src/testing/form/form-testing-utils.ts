/**
 * Form Testing Utilities
 * Centralized utilities for testing form components and validation
 */

export interface FormField {
  name: string;
  type: string;
  label: string;
  value?: string | number;
  required?: boolean;
  validation?: FormFieldValidation;
}

export interface FormFieldValidation {
  rules: ValidationRule[];
  messages?: Record<string, string>;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface FormTestConfig {
  onSubmit?: (data: any) => void | Promise<void>;
  expectedSubmitData?: Record<string, any>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export class FormTestingUtils {
  // @ts-expect-error Abstract method to be implemented by testing framework adapters
  static async fillField(field: FormField, value: string | number) {
    // Implementation would be environment specific (DOM, React Testing Library, etc.)
    throw new Error('fillField must be implemented by a testing framework adapter');
  }

  static async fillForm(fields: FormField[]) {
    for (const field of fields) {
      if (field.value) {
        await this.fillField(field, field.value);
      }
    }
  }

  // @ts-expect-error Abstract method to be implemented by testing framework adapters
  static async testFormSubmission(fields: FormField[], config: FormTestConfig) {
    await this.fillForm(fields);
    // Implementation for form submission testing
    throw new Error('testFormSubmission must be implemented by a testing framework adapter');
  }

  // @ts-expect-error Abstract method to be implemented by testing framework adapters
  static async testFieldValidation(field: FormField, invalidValue: any, expectedError: string) {
    await this.fillField(field, invalidValue);
    // Implementation for validation testing
    throw new Error('testFieldValidation must be implemented by a testing framework adapter');
  }

  // @ts-expect-error Abstract method to be implemented by testing framework adapters
  static async testFormAccessibility(fields: FormField[]) {
    // Implementation for accessibility testing
    throw new Error('testFormAccessibility must be implemented by a testing framework adapter');
  }
}

export class FormValidationHelpers {
  static emailValidation(): ValidationRule {
    return {
      type: 'email',
      message: 'Please enter a valid email address'
    };
  }

  static passwordValidation(minLength = 8): ValidationRule[] {
    return [
      {
        type: 'min',
        value: minLength,
        message: `Password must be at least ${minLength} characters long`
      },
      {
        type: 'pattern',
        value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
        message: 'Password must contain at least one letter and one number'
      }
    ];
  }

  static requiredFieldValidation(fieldName: string): ValidationRule {
    return {
      type: 'required',
      message: `${fieldName} is required`
    };
  }
}

export class FileUploadHelpers {
  static async createTestFile(name: string, type: string, size: number): Promise<File> {
    const content = new Array(size).fill('a').join('');
    return new File([content], name, { type });
  }

  static async createTestFiles(count: number, type: string): Promise<File[]> {
    return Promise.all(
      Array(count).fill(0).map((_, i) => 
        this.createTestFile(`test-file-${i + 1}.${type}`, `image/${type}`, 1024)
      )
    );
  }
}













































