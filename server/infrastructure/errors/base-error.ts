import { ErrorSeverity } from './error-standardization';

export enum ErrorDomain {
  SYSTEM = 'system',
  BUSINESS = 'business',
  API = 'api',
  DATA = 'data',
  SECURITY = 'security',
  VALIDATION = 'validation'
}

export interface BaseErrorOptions {
  statusCode?: number;
  code?: string;
  cause?: Error;
  details?: Record<string, unknown>;
  isOperational?: boolean;
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
}

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;
  public readonly domain: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public override readonly cause?: Error;

  constructor(message: string, options: BaseErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.domain = options.domain || ErrorDomain.SYSTEM;
    this.severity = options.severity || ErrorSeverity.HIGH;
    this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  code?: string;
}

export class ValidationError extends BaseError {
  public readonly errors: ValidationErrorItem[];

  constructor(message: string, errors: ValidationErrorItem[] = []) {
    super(message, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      details: { errors },
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
