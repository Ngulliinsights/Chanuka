/**
 * Layout-specific error types
 * Following navigation component error patterns for consistency
 */

export enum LayoutErrorType {
  LAYOUT_ERROR = 'LAYOUT_ERROR',
  LAYOUT_CONFIGURATION_ERROR = 'LAYOUT_CONFIGURATION_ERROR',
  LAYOUT_VALIDATION_ERROR = 'LAYOUT_VALIDATION_ERROR',
  LAYOUT_RENDER_ERROR = 'LAYOUT_RENDER_ERROR',
  LAYOUT_RESPONSIVE_ERROR = 'LAYOUT_RESPONSIVE_ERROR',
  LAYOUT_ACCESSIBILITY_ERROR = 'LAYOUT_ACCESSIBILITY_ERROR',
  LAYOUT_PERFORMANCE_ERROR = 'LAYOUT_PERFORMANCE_ERROR',
  LAYOUT_NAVIGATION_ERROR = 'LAYOUT_NAVIGATION_ERROR',
  LAYOUT_USER_ERROR = 'LAYOUT_USER_ERROR',
  LAYOUT_BREAKPOINT_ERROR = 'LAYOUT_BREAKPOINT_ERROR'
}

export class LayoutError extends Error {
  public readonly type: LayoutErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: LayoutErrorType = LayoutErrorType.LAYOUT_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LayoutError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LayoutError);
    }
  }
}

export class LayoutConfigurationError extends LayoutError {
  constructor(message: string, configKey?: string, details?: Record<string, any>) {
    super(
      message,
      LayoutErrorType.LAYOUT_CONFIGURATION_ERROR,
      500,
      { configKey, ...details }
    );
  }
}

export class LayoutValidationError extends LayoutError {
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      LayoutErrorType.LAYOUT_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class LayoutRenderError extends LayoutError {
  constructor(message: string, component?: string, details?: Record<string, any>) {
    const fullMessage = component ? message : `Layout render error: ${message}`;
    super(
      fullMessage,
      LayoutErrorType.LAYOUT_RENDER_ERROR,
      500,
      { component, ...details }
    );
  }
}

export class LayoutResponsiveError extends LayoutError {
  constructor(
    message: string,
    breakpoint?: string,
    currentWidth?: number,
    details?: Record<string, any>
  ) {
    super(
      `Responsive layout error${breakpoint ? ` at ${breakpoint}` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_RESPONSIVE_ERROR,
      400,
      { breakpoint, currentWidth, ...details }
    );
  }
}

export class LayoutAccessibilityError extends LayoutError {
  constructor(
    message: string,
    accessibilityFeature?: string,
    element?: string,
    details?: Record<string, any>
  ) {
    super(
      `Accessibility error${accessibilityFeature ? ` in ${accessibilityFeature}` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_ACCESSIBILITY_ERROR,
      400,
      { accessibilityFeature, element, ...details }
    );
  }
}

export class LayoutPerformanceError extends LayoutError {
  constructor(
    message: string,
    metric?: string,
    threshold?: number,
    actualValue?: number,
    details?: Record<string, any>
  ) {
    super(
      `Performance error${metric ? ` in ${metric}` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_PERFORMANCE_ERROR,
      400,
      { metric, threshold, actualValue, ...details }
    );
  }
}

export class LayoutNavigationError extends LayoutError {
  constructor(
    message: string,
    navigationItem?: string,
    href?: string,
    details?: Record<string, any>
  ) {
    super(
      `Navigation error${navigationItem ? ` for ${navigationItem}` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_NAVIGATION_ERROR,
      400,
      { navigationItem, href, ...details }
    );
  }
}

export class LayoutUserError extends LayoutError { constructor(
    message: string,
    user_id?: string,
    user_role?: string,
    details?: Record<string, any>
  ) {
    super(
      `User-related layout error${user_id ? ` for user ${user_id }` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_USER_ERROR,
      403,
      { user_id, user_role, ...details  }
    );
  }
}

export class LayoutBreakpointError extends LayoutError {
  constructor(
    message: string,
    breakpoint?: string,
    expectedRange?: { min: number; max: number },
    actualValue?: number,
    details?: Record<string, any>
  ) {
    super(
      `Breakpoint error${breakpoint ? ` for ${breakpoint}` : ''}: ${message}`,
      LayoutErrorType.LAYOUT_BREAKPOINT_ERROR,
      400,
      { breakpoint, expectedRange, actualValue, ...details }
    );
  }
}

/**
 * Error factory functions for common layout error scenarios
 */

export function createLayoutConfigError(configKey: string, expectedType: string, actualValue: any): LayoutConfigurationError {
  return new LayoutConfigurationError(
    `Invalid configuration for '${configKey}': expected ${expectedType}, got ${typeof actualValue}`,
    configKey,
    { expectedType, actualValue }
  );
}

export function createLayoutValidationError(field: string, constraint: string, value: any): LayoutValidationError {
  return new LayoutValidationError(
    `Validation failed for '${field}': ${constraint}`,
    field,
    value,
    { constraint }
  );
}

export function createLayoutRenderError(component: string, reason: string, props?: any): LayoutRenderError {
  return new LayoutRenderError(
    reason,
    component,
    { props }
  );
}

export function createLayoutResponsiveError(
  breakpoint: string,
  currentWidth: number,
  expectedBehavior: string
): LayoutResponsiveError {
  return new LayoutResponsiveError(
    `Expected ${expectedBehavior} at ${breakpoint} breakpoint`,
    breakpoint,
    currentWidth,
    { expectedBehavior }
  );
}

export function createLayoutAccessibilityError(
  feature: string,
  element: string,
  requirement: string
): LayoutAccessibilityError {
  return new LayoutAccessibilityError(
    `${requirement} is required for ${feature}`,
    feature,
    element,
    { requirement }
  );
}

export function createLayoutPerformanceError(
  metric: string,
  threshold: number,
  actualValue: number,
  recommendation?: string
): LayoutPerformanceError {
  return new LayoutPerformanceError(
    `${metric} exceeded threshold: ${actualValue} > ${threshold}${recommendation ? `. ${recommendation}` : ''}`,
    metric,
    threshold,
    actualValue,
    { recommendation }
  );
}

export function createLayoutNavigationError(
  navigationItem: string,
  href: string,
  reason: string
): LayoutNavigationError {
  return new LayoutNavigationError(
    `Cannot navigate to ${href}: ${reason}`,
    navigationItem,
    href,
    { reason }
  );
}

export function createLayoutUserError(
  user_id: string,
  user_role: string,
  requiredRole: string,
  action: string
): LayoutUserError {
  return new LayoutUserError(
    `User with role '${user_role}' cannot ${action}. Required role: '${requiredRole}'`,
    user_id,
    user_role,
    { requiredRole, action }
  );
}

export function createLayoutBreakpointError(
  breakpoint: string,
  expectedRange: { min: number; max: number },
  actualValue: number
): LayoutBreakpointError {
  return new LayoutBreakpointError(
    `Breakpoint value ${actualValue} is outside expected range ${expectedRange.min}-${expectedRange.max}`,
    breakpoint,
    expectedRange,
    actualValue
  );
}

/**
 * Error type guards for better error handling
 */

export function isLayoutError(error: any): error is LayoutError {
  return error instanceof LayoutError;
}

export function isLayoutConfigurationError(error: any): error is LayoutConfigurationError {
  return error instanceof LayoutConfigurationError;
}

export function isLayoutValidationError(error: any): error is LayoutValidationError {
  return error instanceof LayoutValidationError;
}

export function isLayoutRenderError(error: any): error is LayoutRenderError {
  return error instanceof LayoutRenderError;
}

export function isLayoutResponsiveError(error: any): error is LayoutResponsiveError {
  return error instanceof LayoutResponsiveError;
}

export function isLayoutAccessibilityError(error: any): error is LayoutAccessibilityError {
  return error instanceof LayoutAccessibilityError;
}

export function isLayoutPerformanceError(error: any): error is LayoutPerformanceError {
  return error instanceof LayoutPerformanceError;
}

export function isLayoutNavigationError(error: any): error is LayoutNavigationError {
  return error instanceof LayoutNavigationError;
}

export function isLayoutUserError(error: any): error is LayoutUserError {
  return error instanceof LayoutUserError;
}

export function isLayoutBreakpointError(error: any): error is LayoutBreakpointError {
  return error instanceof LayoutBreakpointError;
}

