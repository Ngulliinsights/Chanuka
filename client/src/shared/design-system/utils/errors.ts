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
      stack: this.stack
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