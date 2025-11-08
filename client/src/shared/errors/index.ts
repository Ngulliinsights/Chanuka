/**
 * Shared Error Types and Classes
 * Consolidates error definitions to eliminate redundancy
 * IMPORTANT: No imports from shared/core to avoid tight coupling
 */

// Define error types locally to avoid shared/core coupling
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorDomain {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  CACHE = 'cache',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Base error class - client-specific implementation
export class BaseError extends Error {
  public readonly code: string;
  public readonly metadata?: Record<string, any>;

  constructor(message: string, code = 'UNKNOWN_ERROR', metadata?: Record<string, any>) {
    super(message);
    this.name = 'BaseError';
    this.code = code;
    this.metadata = metadata;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata
    };
  }
}

// Validation error for handling input/data validation failures
export class ValidationError extends BaseError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', {
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      fields
    });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

// Specialized error classes that extend BaseError
export class NotFoundError extends BaseError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, code, { domain: ErrorDomain.SYSTEM, severity: ErrorSeverity.MEDIUM });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, code = 'UNAUTHORIZED') {
    super(message, code, { domain: ErrorDomain.AUTHENTICATION, severity: ErrorSeverity.HIGH });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, code = 'FORBIDDEN') {
    super(message, code, { domain: ErrorDomain.AUTHORIZATION, severity: ErrorSeverity.HIGH });
    this.name = 'ForbiddenError';
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, code = 'NETWORK_ERROR') {
    super(message, code, { domain: ErrorDomain.NETWORK, severity: ErrorSeverity.MEDIUM });
    this.name = 'NetworkError';
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, code = 'EXTERNAL_SERVICE_ERROR') {
    super(message, code, { domain: ErrorDomain.EXTERNAL_SERVICE, severity: ErrorSeverity.MEDIUM });
    this.name = 'ExternalServiceError';
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string, code = 'SERVICE_UNAVAILABLE') {
    super(message, code, { domain: ErrorDomain.EXTERNAL_SERVICE, severity: ErrorSeverity.HIGH });
    this.name = 'ServiceUnavailableError';
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, code = 'DATABASE_ERROR') {
    super(message, code, { domain: ErrorDomain.DATABASE, severity: ErrorSeverity.HIGH });
    this.name = 'DatabaseError';
  }
}

export class CacheError extends BaseError {
  constructor(message: string, code = 'CACHE_ERROR') {
    super(message, code, { domain: ErrorDomain.CACHE, severity: ErrorSeverity.LOW });
    this.name = 'CacheError';
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, code = 'CONFLICT_ERROR') {
    super(message, code, { domain: ErrorDomain.BUSINESS_LOGIC, severity: ErrorSeverity.MEDIUM });
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string, code = 'TOO_MANY_REQUESTS') {
    super(message, code, { domain: ErrorDomain.NETWORK, severity: ErrorSeverity.MEDIUM });
    this.name = 'TooManyRequestsError';
  }
}