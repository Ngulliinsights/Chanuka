/**
 * Shared Types Index
 * 
 * Central export point for all shared types across the application
 */

// Re-export core types from shared/core
export * from '../core/src/types/index';

// Re-export error types
export * from '../core/src/observability/error-management/errors/base-error';
export * from '../core/src/observability/error-management/errors/specialized-errors';

// Re-export common interfaces
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;