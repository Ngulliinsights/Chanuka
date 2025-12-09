import { Bill, Comment, User } from './core';

/**
 * Type guard for Bill objects
 * Validates that the object has required string properties: id, title, summary
 * @param obj - The object to validate
 * @returns True if obj is a valid Bill, false otherwise
 */
export function isBill(obj: any): obj is Bill {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.summary === 'string'
  );
}

/**
 * Type guard for Comment objects
 * Validates that the object has required string properties: id, billId, authorId, content
 * @param obj - The object to validate
 * @returns True if obj is a valid Comment, false otherwise
 */
export function isComment(obj: any): obj is Comment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.billId === 'string' &&
    typeof obj.authorId === 'string' &&
    typeof obj.content === 'string'
  );
}

/**
 * Type guard for User objects
 * Validates that the object has required string properties: id, email, name
 * @param obj - The object to validate
 * @returns True if obj is a valid User, false otherwise
 */
export function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.name === 'string'
  );
}

/**
 * Generic API response wrapper type
 * Provides a standardized structure for API responses
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: Record<string, any>;
}

/**
 * Pagination metadata for paginated responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * API response type for list endpoints with pagination
 */
export interface ApiListResponse<T> {
  data: T[];
  success: boolean;
  error?: string;
  meta: PaginationMeta;
}

/**
 * API response type for error responses
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Utility type to make specific keys optional in a type
 * @template T - The base type
 * @template K - The keys to make optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type to make specific keys required in a type
 * @template T - The base type
 * @template K - The keys to make required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type to add timestamp fields to a type
 * @template T - The base type
 */
export type WithTimestamps<T> = T & {
  createdAt: string;
  updatedAt: string;
};

/**
 * Utility type to add an id field to a type
 * @template T - The base type
 */
export type Identifiable<T> = T & {
  id: string;
};