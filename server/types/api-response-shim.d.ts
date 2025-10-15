
declare module '../utils/api-response' {
  // Match the runtime exports from server/utils/api-response.ts
  import { Response } from 'express';

  export interface ApiError {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  }

  export interface ResponseMetadata {
    timestamp: string;
    requestId?: string;
    source: 'database' | 'cache' | 'fallback' | 'static';
    executionTime?: number;
    cacheHit?: boolean;
    version: string;
  }

  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    pagination?: any;
    metadata: ResponseMetadata;
  }

  export class ApiResponseWrapper {
    static success(res: Response, data: any, metadata?: Partial<ResponseMetadata>, statusCode?: number): any;
    static error(res: Response, error: string | Error | ApiError, statusCode?: number, metadata?: Partial<ResponseMetadata>): any;
    static notFound(res: Response, resource?: string, metadata?: Partial<ResponseMetadata>): any;
    static validationError(res: Response, details: any, metadata?: Partial<ResponseMetadata>): any;
    static unauthorized(res: Response, message?: string, metadata?: Partial<ResponseMetadata>): any;
    static forbidden(res: Response, message?: string, metadata?: Partial<ResponseMetadata>): any;
    static cached(res: Response, data: any, metadata?: Partial<ResponseMetadata>): any;
    static fallback(res: Response, data: any, message?: string, metadata?: Partial<ResponseMetadata>): any;
    static createMetadata(startTime: number, source?: ResponseMetadata['source'], additional?: Partial<ResponseMetadata>): ResponseMetadata;
  }

  export const ApiSuccess: typeof ApiResponseWrapper.success;
  export const ApiError: typeof ApiResponseWrapper.error;
  // Some files import ApiErrorResponse (legacy name) — alias it here
  export const ApiErrorResponse: typeof ApiResponseWrapper.error;
  export const ApiNotFound: typeof ApiResponseWrapper.notFound;
  export const ApiValidationError: typeof ApiResponseWrapper.validationError;
  export const ApiUnauthorized: typeof ApiResponseWrapper.unauthorized;
  export const ApiForbidden: typeof ApiResponseWrapper.forbidden;
  export const ApiCached: typeof ApiResponseWrapper.cached;
  export const ApiFallback: typeof ApiResponseWrapper.fallback;

  export function success(data: any, metadata?: Partial<ResponseMetadata>): ApiResponse;
  export function error(error: string | Error, code?: string, metadata?: Partial<ResponseMetadata>): ApiResponse;
  export function paginated(data: any[], pagination: any, metadata?: Partial<ResponseMetadata>): ApiResponse;

  export type ApiResponseWrapperType = any;
}

declare module '../../utils/api-response.js' {
  export * from '../utils/api-response';
}

// Provide global fallbacks (temporary) so files that call ApiError/ApiSuccess
// without importing still type-check during incremental refactors.
declare global {
  const ApiError: any;
  const ApiSuccess: any;
  const ApiNotFound: any;
  const ApiErrorResponse: any;
}
