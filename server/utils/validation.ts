import { ValidationError } from '@shared/core';
import { logger } from '@shared/core';
import { NextFunction, Request, Response } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z,ZodError } from 'zod';

type ZodSchema<T> = z.ZodType<T>;

type ValidationDecorator<T> = (
  target: T,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

/**
 * Decorator for method parameter validation
 */
export const validate = (fields: string | string[]): ValidationDecorator<any> => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    const fieldsToValidate = Array.isArray(fields) ? fields : [fields];

    descriptor.value = function (...args: any[]) {
      fieldsToValidate.forEach((field, index) => {
        if (args[index] === undefined || args[index] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      });
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};

/**
 * Middleware for Zod schema validation
 */
export function validateSchema<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed'));
      } else {
        next(err);
      }
    }
  };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, sanitized: trimmed.toLowerCase() };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; strength?: string; score?: number; errors?: string[] } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }

  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Password too short');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Missing lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Missing uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Missing number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Missing special character');
  } else {
    score += 1;
  }

  const strength = score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak';

  return {
    isValid: errors.length === 0,
    strength: strength as string | undefined,
    score: score as number | undefined,
    errors: errors.length > 0 ? errors : []
  };
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Validate Canadian bill number format
 */
export function validateBillNumber(bill_number: string): { isValid: boolean; normalized?: string; error?: string } {
  if (!bill_number || typeof bill_number !== 'string') {
    return { isValid: false, error: 'Bill number is required' };
  }

  const trimmed = bill_number.trim().toUpperCase();
  const billRegex = /^[CS]-\d{1,4}$/;

  if (!billRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid bill number format. Expected C-123 or S-456' };
  }

  const numberPart = trimmed.split('-')[1];
  if (!numberPart) {
    return { isValid: false, error: 'Invalid bill number format' };
  }
  const number = parseInt(numberPart);
  if (number < 1 || number > 9999) {
    return { isValid: false, error: 'Bill number must be between 1 and 9999' };
  }

  return { isValid: true, normalized: trimmed };
}














































