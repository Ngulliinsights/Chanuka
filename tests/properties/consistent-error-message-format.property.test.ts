/**
 * Property 7: Consistent Error Message Format
 * 
 * Validates: Requirements 5.4, 6.4
 * 
 * This property test verifies that all validation error messages follow
 * the consistent format: "{field}: {rule} - {description}"
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatValidationError,
  formatValidationErrors,
  createValidationError,
  createFieldValidationError,
  ValidationRules,
  ValidationMessages,
  type ValidationErrorDetail,
} from '../../shared/validation/errors';
import { ValidationError } from '../../shared/utils/errors/types';

describe('Property 7: Consistent Error Message Format', () => {
  it('formatValidationError follows the format "{field}: {rule} - {description}"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // field
        fc.string({ minLength: 1 }), // rule
        fc.string({ minLength: 1 }), // description
        (field, rule, description) => {
          const formatted = formatValidationError(field, rule, description);
          
          // Verify format contains the separators
          expect(formatted).toContain(':');
          expect(formatted).toContain(' - ');
          
          // Verify the formatted string is not empty
          expect(formatted.length).toBeGreaterThan(0);
          
          // For simple strings without special chars, verify exact format
          if (!field.includes(':') && !field.includes(';') && !field.includes(' - ') &&
              !rule.includes(':') && !rule.includes(';') && !rule.includes(' - ') &&
              !description.includes(':') && !description.includes(';') && !description.includes(' - ')) {
            expect(formatted).toBe(`${field}: ${rule} - ${description}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatValidationErrors joins multiple errors with semicolons', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            field: fc.string({ minLength: 1 }),
            rule: fc.string({ minLength: 1 }),
            message: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (errors) => {
          const formatted = formatValidationErrors(errors);
          
          // Verify the formatted string is not empty
          expect(formatted.length).toBeGreaterThan(0);
          
          // Verify errors are joined (if multiple)
          if (errors.length > 1) {
            // Should contain at least one semicolon separator
            expect(formatted).toContain(';');
          }
          
          // For simple strings without special chars, verify each error is present
          const hasSpecialChars = errors.some(e => 
            e.field.includes(':') || e.field.includes(';') || e.field.includes(' - ') ||
            e.rule.includes(':') || e.rule.includes(';') || e.rule.includes(' - ') ||
            e.message.includes(':') || e.message.includes(';') || e.message.includes(' - ')
          );
          
          if (!hasSpecialChars) {
            for (const error of errors) {
              const expectedFormat = `${error.field}: ${error.rule} - ${error.message}`;
              expect(formatted).toContain(expectedFormat);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createValidationError produces ValidationError with consistent format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // operation
        fc.array(
          fc.record({
            field: fc.string({ minLength: 1 }),
            rule: fc.string({ minLength: 1 }),
            message: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (operation, errors) => {
          const validationError = createValidationError(operation, errors);
          
          // Verify it's a ValidationError
          expect(validationError).toBeInstanceOf(ValidationError);
          expect(validationError.name).toBe('ValidationError');
          
          // Verify message is not empty
          expect(validationError.message.length).toBeGreaterThan(0);
          
          // Verify context
          expect(validationError.context.operation).toBe(operation);
          expect(validationError.context.layer).toBe('api');
          expect(validationError.context.severity).toBe('medium');
          
          // Verify validation errors array
          expect(validationError.validationErrors).toEqual(errors);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createFieldValidationError produces single-field ValidationError with consistent format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // operation
        fc.string({ minLength: 1 }), // field
        fc.string({ minLength: 1 }), // rule
        fc.string({ minLength: 1 }), // description
        (operation, field, rule, description) => {
          const validationError = createFieldValidationError(
            operation,
            field,
            rule,
            description
          );
          
          // Verify it's a ValidationError
          expect(validationError).toBeInstanceOf(ValidationError);
          
          // Verify message is not empty
          expect(validationError.message.length).toBeGreaterThan(0);
          
          // Verify context
          expect(validationError.context.operation).toBe(operation);
          expect(validationError.context.layer).toBe('api');
          expect(validationError.context.field).toBe(field);
          expect(validationError.context.severity).toBe('medium');
          
          // Verify validation errors array has one entry
          expect(validationError.validationErrors).toHaveLength(1);
          expect(validationError.validationErrors[0]).toEqual({
            field,
            rule,
            message: description,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ValidationMessages produce consistent format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // field name
        (field) => {
          // Test various validation message generators
          const messages = [
            ValidationMessages.required(field),
            ValidationMessages.minLength(field, 5),
            ValidationMessages.maxLength(field, 100),
            ValidationMessages.email(field),
            ValidationMessages.notEmpty(field),
            ValidationMessages.noWhitespaceOnly(field),
          ];
          
          // All messages should start with the field name
          for (const message of messages) {
            expect(message.startsWith(field)).toBe(true);
            expect(message).toContain(' ');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all ValidationRules are valid strings', () => {
    const rules = Object.values(ValidationRules);
    
    expect(rules.length).toBeGreaterThan(0);
    
    for (const rule of rules) {
      expect(typeof rule).toBe('string');
      expect(rule.length).toBeGreaterThan(0);
      // Rules should be lowercase with underscores
      expect(rule).toMatch(/^[a-z_]+$/);
    }
  });

  it('error format is parseable for simple strings', () => {
    fc.assert(
      fc.property(
        // Generate strings without special characters
        fc.string({ minLength: 1 }).filter(s => !s.includes(':') && !s.includes(';') && !s.includes(' - ')),
        fc.string({ minLength: 1 }).filter(s => !s.includes(':') && !s.includes(';') && !s.includes(' - ')),
        fc.string({ minLength: 1 }).filter(s => !s.includes(':') && !s.includes(';') && !s.includes(' - ')),
        (field, rule, description) => {
          const formatted = formatValidationError(field, rule, description);
          
          // Parse the format
          const colonIndex = formatted.indexOf(':');
          const dashIndex = formatted.indexOf(' - ');
          
          expect(colonIndex).toBeGreaterThan(-1);
          expect(dashIndex).toBeGreaterThan(colonIndex);
          
          const parsedField = formatted.substring(0, colonIndex);
          const parsedRule = formatted.substring(colonIndex + 2, dashIndex);
          const parsedDescription = formatted.substring(dashIndex + 3);
          
          expect(parsedField).toBe(field);
          expect(parsedRule).toBe(rule);
          expect(parsedDescription).toBe(description);
        }
      ),
      { numRuns: 100 }
    );
  });
});
