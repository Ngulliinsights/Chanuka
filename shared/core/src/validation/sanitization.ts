/**
 * Sanitization utilities for secure input handling
 */

import * as DOMPurify from 'dompurify';
import * as sqlTemplate from 'sql-template-tag';
import { logger } from '../observability/logging';

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

/**
 * Sanitize SQL input to prevent injection
 */
export function sanitizeSql(input: string): string {
  return sqlTemplate.default([input]).text;
}

/**
 * Sanitize user input for general use
 */
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Create a sanitizer function with specified options
 */
export function createSanitizer(options: {
  html?: boolean;
  sql?: boolean;
  userInput?: boolean;
}) {
  return (input: string): string => {
    let result = input;
    
    if (options.html) {
      result = sanitizeHtml(result);
    }
    
    if (options.sql) {
      result = sanitizeSql(result);
    }
    
    if (options.userInput) {
      result = sanitizeUserInput(result);
    }
    
    return result;
  };
}















































