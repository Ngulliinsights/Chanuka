/**
 * UI Component Errors
 * 
 * MIGRATED: Now uses DashboardError from core error system instead of custom hierarchy.
 * Provides unified error handling for interactive UI components.
 */

import { DashboardError } from '@client/lib/ui/dashboard/errors';
import type { ErrorContext } from '@client/infrastructure/error/types';

/**
 * UI component error - for component-level failures
 * Uses DashboardError as base for consistency
 */
export class UIComponentError extends DashboardError {
  public readonly componentName: string;
  public readonly operation: string;
  public readonly timestamp: Date;

  constructor(
    componentName: string,
    operation: string,
    message: string,
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(message, undefined, {
      statusCode: options?.statusCode ?? 400,
      context: {
        component: componentName,
        operation,
        ...options?.context,
      },
    });
    Object.defineProperty(this, 'name', { value: 'UIComponentError', writable: true });
    this.componentName = componentName;
    this.operation = operation;
    this.timestamp = new Date();
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

/**
 * UI date picker error - for date-related component failures
 */
export class UIDateError extends UIComponentError {
  public readonly date?: Date;

  constructor(
    componentName: string,
    message: string,
    date?: Date,
    options?: {
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(componentName, 'date', message, options);
    Object.defineProperty(this, 'name', { value: 'UIDateError', writable: true });
    this.date = date;
  }
}

/**
 * UI dialog error - for dialog/modal component failures
 */
export class UIDialogError extends UIComponentError {
  constructor(
    componentName: string,
    operation: string,
    message: string,
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      cause?: Error | unknown;
    }
  ) {
    super(componentName, operation, message, options);
    Object.defineProperty(this, 'name', { value: 'UIDialogError', writable: true });
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isUIComponentError(error: unknown): error is UIComponentError {
  return error instanceof UIComponentError;
}

export function isUIDateError(error: unknown): error is UIDateError {
  return error instanceof UIDateError;
}

export function isUIDialogError(error: unknown): error is UIDialogError {
  return error instanceof UIDialogError;
}
