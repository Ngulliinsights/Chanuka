/**
 * UI component error types and classes
 * Following navigation component error patterns for consistency
 */

export enum UIErrorType {
  UI_ERROR = 'UI_ERROR',
  UI_VALIDATION_ERROR = 'UI_VALIDATION_ERROR',
  UI_COMPONENT_ERROR = 'UI_COMPONENT_ERROR',
  UI_FORM_ERROR = 'UI_FORM_ERROR',
  UI_INPUT_ERROR = 'UI_INPUT_ERROR',
  UI_DIALOG_ERROR = 'UI_DIALOG_ERROR',
  UI_TABLE_ERROR = 'UI_TABLE_ERROR',
  UI_DATE_ERROR = 'UI_DATE_ERROR',
  UI_CONFIGURATION_ERROR = 'UI_CONFIGURATION_ERROR'
}

export class UIError extends Error {
  public readonly type: UIErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: UIErrorType = UIErrorType.UI_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'UIError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UIError);
    }
  }
}

// Import unified ValidationError from shared core types
import type { ValidationError } from '../../../shared/core/src/types/validation-types';

// Re-export for backward compatibility
export type { ValidationError };

// Keep UIValidationError for UI-specific validation errors
export class UIValidationError extends UIError {
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      UIErrorType.UI_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class UIComponentError extends UIError {
  constructor(component: string, action: string, reason: string, details?: Record<string, any>) {
    super(
      `UI component error in ${component} during ${action}: ${reason}`,
      UIErrorType.UI_COMPONENT_ERROR,
      500,
      { component, action, reason, ...details }
    );
  }
}

export class UIFormError extends UIError {
  constructor(formName: string, errors: Record<string, string>, details?: Record<string, any>) {
    super(
      `Form validation failed for ${formName}`,
      UIErrorType.UI_FORM_ERROR,
      422,
      { formName, errors, ...details }
    );
  }
}

export class UIInputError extends UIError {
  constructor(inputName: string, value: any, reason: string, details?: Record<string, any>) {
    super(
      `Input validation failed for ${inputName}: ${reason}`,
      UIErrorType.UI_INPUT_ERROR,
      422,
      { inputName, value, reason, ...details }
    );
  }
}

export class UIDialogError extends UIError {
  constructor(dialogName: string, action: string, reason: string, details?: Record<string, any>) {
    super(
      `Dialog error in ${dialogName} during ${action}: ${reason}`,
      UIErrorType.UI_DIALOG_ERROR,
      400,
      { dialogName, action, reason, ...details }
    );
  }
}

export class UITableError extends UIError {
  constructor(tableName: string, operation: string, reason: string, details?: Record<string, any>) {
    super(
      `Table error in ${tableName} during ${operation}: ${reason}`,
      UIErrorType.UI_TABLE_ERROR,
      400,
      { tableName, operation, reason, ...details }
    );
  }
}

export class UIDateError extends UIError {
  constructor(component: string, value: any, reason: string, details?: Record<string, any>) {
    super(
      `Date validation error in ${component}: ${reason}`,
      UIErrorType.UI_DATE_ERROR,
      422,
      { component, value, reason, ...details }
    );
  }
}

export class UIConfigurationError extends UIError {
  constructor(component: string, config: string, reason: string, details?: Record<string, any>) {
    super(
      `Configuration error in ${component} for ${config}: ${reason}`,
      UIErrorType.UI_CONFIGURATION_ERROR,
      500,
      { component, config, reason, ...details }
    );
  }
}

