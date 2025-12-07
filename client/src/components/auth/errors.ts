/**
 * Auth-specific error types
 * Following navigation component error pattern
 */

export enum AuthErrorType {
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_VALIDATION_ERROR = 'AUTH_VALIDATION_ERROR',
  AUTH_CREDENTIALS_ERROR = 'AUTH_CREDENTIALS_ERROR',
  AUTH_REGISTRATION_ERROR = 'AUTH_REGISTRATION_ERROR',
  AUTH_NETWORK_ERROR = 'AUTH_NETWORK_ERROR',
  AUTH_RATE_LIMIT_ERROR = 'AUTH_RATE_LIMIT_ERROR',
  AUTH_CONFIGURATION_ERROR = 'AUTH_CONFIGURATION_ERROR',
  AUTH_SESSION_ERROR = 'AUTH_SESSION_ERROR'
}

export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;
  public readonly canRetry: boolean;

  constructor(
    message: string,
    type: AuthErrorType = AuthErrorType.AUTH_ERROR,
    statusCode: number = 400,
    details?: Record<string, unknown>,
    canRetry: boolean = false
  ) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    this.canRetry = canRetry;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

export class AuthValidationError extends AuthError {
  constructor(message: string, field: string, value: unknown, details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_VALIDATION_ERROR,
      422,
      { field, value, ...details },
      false
    );
  }
}

export class AuthCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials', details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_CREDENTIALS_ERROR,
      401,
      details,
      true
    );
  }
}

export class AuthRegistrationError extends AuthError {
  constructor(message: string, reason?: string, details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_REGISTRATION_ERROR,
      409,
      { reason, ...details },
      true
    );
  }
}

export class AuthNetworkError extends AuthError {
  constructor(message: string = 'Network error occurred', details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_NETWORK_ERROR,
      503,
      details,
      true
    );
  }
}

export class AuthRateLimitError extends AuthError {
  constructor(
    message: string = 'Too many attempts. Please try again later.',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      AuthErrorType.AUTH_RATE_LIMIT_ERROR,
      429,
      { retryAfter, ...details },
      false
    );
  }
}

export class AuthConfigurationError extends AuthError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_CONFIGURATION_ERROR,
      500,
      details,
      false
    );
  }
}

export class AuthSessionError extends AuthError {
  constructor(message: string = 'Session expired or invalid', details?: Record<string, unknown>) {
    super(
      message,
      AuthErrorType.AUTH_SESSION_ERROR,
      401,
      details,
      true
    );
  }
}

/**
 * Error classification helpers
 */

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isRetryableError(error: unknown): boolean {
  return isAuthError(error) && error.canRetry;
}

export function isValidationError(error: unknown): error is AuthValidationError {
  return isAuthError(error) && error.type === AuthErrorType.AUTH_VALIDATION_ERROR;
}

export function isCredentialsError(error: unknown): error is AuthCredentialsError {
  return isAuthError(error) && error.type === AuthErrorType.AUTH_CREDENTIALS_ERROR;
}

export function isNetworkError(error: unknown): error is AuthNetworkError {
  return isAuthError(error) && error.type === AuthErrorType.AUTH_NETWORK_ERROR;
}

export function isRateLimitError(error: unknown): error is AuthRateLimitError {
  return isAuthError(error) && error.type === AuthErrorType.AUTH_RATE_LIMIT_ERROR;
}

/**
 * Error message helpers
 */

export function getErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

export function getErrorDetails(error: unknown): Record<string, unknown> | undefined {
  if (isAuthError(error)) {
    return error.details;
  }
  
  return undefined;
}

/**
 * User-friendly error messages
 */

export function getUserFriendlyMessage(error: unknown): string {
  if (!isAuthError(error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (error.type) {
    case AuthErrorType.AUTH_VALIDATION_ERROR:
      return error.message; // Validation messages are already user-friendly
    
    case AuthErrorType.AUTH_CREDENTIALS_ERROR:
      return 'Invalid email or password. Please check your credentials and try again.';
    
    case AuthErrorType.AUTH_REGISTRATION_ERROR:
      return error.message.includes('email') 
        ? 'An account with this email already exists. Please use a different email or try logging in.'
        : 'Registration failed. Please check your information and try again.';
    
    case AuthErrorType.AUTH_NETWORK_ERROR:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case AuthErrorType.AUTH_RATE_LIMIT_ERROR:
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    
    case AuthErrorType.AUTH_SESSION_ERROR:
      return 'Your session has expired. Please log in again.';
    
    case AuthErrorType.AUTH_CONFIGURATION_ERROR:
      return 'A system error occurred. Please contact support if this continues.';
    
    default:
      return 'An error occurred during authentication. Please try again.';
  }
}

