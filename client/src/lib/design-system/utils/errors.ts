/**
 * Design System Error Handling
 * Centralized error types and utilities for UI components
 */

export class UIComponentError extends Error {
  public readonly componentName: string;
  public readonly operation: string;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    componentName: string,
    operation: string,
    message: string,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'UIComponentError';
    this.componentName = componentName;
    this.operation = operation;
    this.timestamp = new Date();
    this.recoverable = recoverable;
  }

  isRecoverable(): boolean {
    return this.recoverable;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      componentName: this.componentName,
      operation: this.operation,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

export function isUIComponentError(error: unknown): error is UIComponentError {
  return error instanceof UIComponentError;
}

export function createComponentError(
  componentName: string,
  operation: string,
  message: string,
  recoverable: boolean = true
): UIComponentError {
  return new UIComponentError(componentName, operation, message, recoverable);
}

/**
 * Validation-specific error types
 */
export class UIValidationError extends UIComponentError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(componentName: string, message: string, field?: string, value?: unknown) {
    super(componentName, 'validation', message, true);
    this.name = 'UIValidationError';
    this.field = field;
    this.value = value;
  }
}

export class UIInputError extends UIComponentError {
  public readonly inputType: string;

  constructor(componentName: string, message: string, inputType: string) {
    super(componentName, 'input', message, true);
    this.name = 'UIInputError';
    this.inputType = inputType;
  }
}

export class UIFormError extends UIComponentError {
  public readonly fields: Record<string, string>;

  constructor(componentName: string, message: string, fields: Record<string, string> = {}) {
    super(componentName, 'form', message, true);
    this.name = 'UIFormError';
    this.fields = fields;
  }
}

export class UIDateError extends UIComponentError {
  public readonly date?: Date;

  constructor(componentName: string, message: string, date?: Date) {
    super(componentName, 'date', message, true);
    this.name = 'UIDateError';
    this.date = date;
  }
}
