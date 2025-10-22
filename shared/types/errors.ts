// Import from the single source of truth for error management
import { 
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError
} from '../core/src/observability/error-management';

// Re-export all error classes
export {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError
};

// Additional specialized error types for domain-specific use
export class AuthError extends UnauthorizedError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor(message: string = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class UserExistsError extends ConflictError {
  constructor(message: string = 'User already exists') {
    super(message);
    this.name = 'UserExistsError';
  }
}

export class OAuthError extends AuthError {
  constructor(message: string = 'OAuth authentication failed') {
    super(message);
    this.name = 'OAuthError';
  }
}

export class SponsorNotFoundError extends NotFoundError {
  constructor(message: string = 'Sponsor not found') {
    super('Sponsor', undefined, { message });
    this.name = 'SponsorNotFoundError';
  }
}

// Legacy type for backward compatibility
export type ErrorType = 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'database' | 'network' | 'system';

// Legacy factory functions for backward compatibility
export function createValidationError(message: string, field?: string): ValidationError {
  return new ValidationError(message);
}

export function createAuthenticationError(message: string = 'Authentication required'): UnauthorizedError {
  return new UnauthorizedError(message);
}

export function createAuthorizationError(message: string = 'Insufficient permissions'): ForbiddenError {
  return new ForbiddenError(message);
}

export function createNotFoundError(message: string = 'Resource not found'): NotFoundError {
  return new NotFoundError(message);
}

export function createConflictError(message: string = 'Resource conflict'): ConflictError {
  return new ConflictError(message);
}

export function createDatabaseError(message: string = 'Database operation failed'): DatabaseError {
  return new DatabaseError(message);
}

// Simple async handler for backward compatibility
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Placeholder for global error handlers setup
export function setupGlobalErrorHandlers() {
  // This would set up global error handlers for unhandled rejections, etc.
  console.log('Global error handlers setup - implement as needed');
}











































