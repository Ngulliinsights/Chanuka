/**
 * Data Utilities Module
 *
 * Provides comprehensive utilities for data manipulation, validation,
 * transformation, and processing operations.
 *
 * This module consolidates data-related utilities from various sources
 * into a unified, framework-agnostic interface.
 */

import { logger } from '../observability/logging';

// ==================== Type Definitions ====================

export interface DataValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface DataTransformationOptions {
  deep?: boolean;
  preserveKeys?: boolean;
  filterFn?: (key: string, value: any) => boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== Data Validation ====================

/**
 * Validates data against a schema or set of rules.
 */
export function validateData<T>(
  data: any,
  validator: (data: any) => DataValidationResult<T>
): DataValidationResult<T> {
  try {
    return validator(data);
  } catch (error) {
    logger.warn('Data validation failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed']
    };
  }
}

/**
 * Validates that a value is not null or undefined.
 */
export function validateRequired(value: any, fieldName: string): DataValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      errors: [`${fieldName} is required`]
    };
  }
  return { isValid: true, data: value };
}

/**
 * Validates string length constraints.
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): DataValidationResult<string> {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      errors: [`${fieldName} must be a string`]
    };
  }

  if (min !== undefined && value.length < min) {
    return {
      isValid: false,
      errors: [`${fieldName} must be at least ${min} characters long`]
    };
  }

  if (max !== undefined && value.length > max) {
    return {
      isValid: false,
      errors: [`${fieldName} must be no more than ${max} characters long`]
    };
  }

  return { isValid: true, data: value };
}

/**
 * Validates numeric range constraints.
 */
export function validateNumberRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): DataValidationResult<number> {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: false,
      errors: [`${fieldName} must be a valid number`]
    };
  }

  if (min !== undefined && value < min) {
    return {
      isValid: false,
      errors: [`${fieldName} must be at least ${min}`]
    };
  }

  if (max !== undefined && value > max) {
    return {
      isValid: false,
      errors: [`${fieldName} must be no more than ${max}`]
    };
  }

  return { isValid: true, data: value };
}

// ==================== Data Transformation ====================

/**
 * Deep clones an object or array.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Transforms object keys according to a mapping function.
 */
export function transformKeys<T extends Record<string, any>>(
  obj: T,
  keyTransformer: (key: string) => string,
  options: DataTransformationOptions = {}
): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const result = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    const newKey = keyTransformer(key);

    if (options.filterFn && !options.filterFn(key, value)) {
      continue;
    }

    if (options.deep && typeof value === 'object' && value !== null) {
      result[newKey as keyof T] = transformKeys(value, keyTransformer, options);
    } else {
      result[newKey as keyof T] = value;
    }
  }

  return result;
}

/**
 * Converts object keys from camelCase to snake_case.
 */
export function camelToSnake<T extends Record<string, any>>(obj: T): T {
  return transformKeys(obj, key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
}

/**
 * Converts object keys from snake_case to camelCase.
 */
export function snakeToCamel<T extends Record<string, any>>(obj: T): T {
  return transformKeys(obj, key => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()));
}

/**
 * Flattens a nested object into a single-level object with dot notation keys.
 */
export function flattenObject(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflattens a flattened object back to nested structure.
 */
export function unflattenObject(obj: Record<string, any>): any {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

// ==================== Data Filtering & Sorting ====================

/**
 * Filters an array based on a predicate function.
 */
export function filterData<T>(
  data: T[],
  predicate: (item: T, index: number) => boolean
): T[] {
  return data.filter(predicate);
}

/**
 * Sorts an array based on a key and direction.
 */
export function sortData<T>(
  data: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Groups an array of objects by a key.
 */
export function groupBy<T, K extends keyof T>(
  data: T[],
  key: K
): Record<string, T[]> {
  return data.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Removes duplicate items from an array based on a key function.
 */
export function uniqueBy<T, K>(
  data: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>();
  return data.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ==================== Pagination ====================

/**
 * Paginates an array of data.
 */
export function paginateData<T>(
  data: T[],
  options: PaginationOptions
): PaginatedResult<T> {
  const { page, limit, sortBy, sortOrder = 'asc' } = options;

  let sortedData = data;
  if (sortBy) {
    sortedData = sortData(data, sortBy as keyof T, sortOrder);
  }

  const total = sortedData.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedData = sortedData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// ==================== Data Comparison ====================

/**
 * Performs a deep comparison between two values.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * Computes the difference between two objects.
 */
export function objectDiff(
  obj1: Record<string, any>,
  obj2: Record<string, any>
): { added: Record<string, any>; removed: Record<string, any>; changed: Record<string, any> } {
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const changed: Record<string, any> = {};

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (!(key in obj1)) {
      added[key] = val2;
    } else if (!(key in obj2)) {
      removed[key] = val1;
    } else if (!deepEqual(val1, val2)) {
      changed[key] = { from: val1, to: val2 };
    }
  }

  return { added, removed, changed };
}

// ==================== Data Sanitization ====================

/**
 * Sanitizes a string by trimming and removing potentially harmful characters.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove HTML characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Sanitizes an object by recursively sanitizing string values.
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}