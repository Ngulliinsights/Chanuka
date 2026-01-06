/**
 * UI Dialog Errors
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

export class UIDateError extends UIComponentError {
  public readonly date?: Date;

  constructor(componentName: string, message: string, date?: Date) {
    super(componentName, 'date', message, true);
    this.name = 'UIDateError';
    this.date = date;
  }
}

export class UIDialogError extends UIComponentError {
  constructor(
    componentName: string,
    operation: string,
    message: string,
    recoverable: boolean = true
  ) {
    super(componentName, operation, message, recoverable);
    this.name = 'UIDialogError';
  }
}
