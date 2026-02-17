import { ErrorSeverity } from './error-standardization';

export enum ErrorDomain {
  SYSTEM = 'system',
  BUSINESS = 'business',
  API = 'api',
  DATA = 'data',
  SECURITY = 'security'
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
  public readonly cause?: Error;

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
