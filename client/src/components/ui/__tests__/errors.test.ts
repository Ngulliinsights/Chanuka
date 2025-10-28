/**
 * UI error classes tests
 * Following navigation component testing patterns for consistency
 */

import { describe, it, expect } from 'vitest';
import {
  UIError,
  UIValidationError,
  UIComponentError,
  UIFormError,
  UIInputError,
  UIDialogError,
  UITableError,
  UIDateError,
  UIConfigurationError,
  UIErrorType
} from '../errors';

describe('UI Error Classes', () => {
  describe('UIError (Base Class)', () => {
    it('creates error with default values', () => {
      const error = new UIError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('UIError');
      expect(error.type).toBe(UIErrorType.UI_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('creates error with custom values', () => {
      const details = { custom: 'data' };
      const error = new UIError(
        'Custom error',
        UIErrorType.UI_COMPONENT_ERROR,
        500,
        details
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.type).toBe(UIErrorType.UI_COMPONENT_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBe(details);
    });

    it('maintains proper stack trace', () => {
      const error = new UIError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('UIError');
    });

    it('is instance of Error', () => {
      const error = new UIError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UIError);
    });
  });

  describe('UIValidationError', () => {
    it('creates validation error with proper defaults', () => {
      const error = new UIValidationError('Validation failed', 'email', 'invalid@');
      
      expect(error.message).toBe('Validation failed');
      expect(error.type).toBe(UIErrorType.UI_VALIDATION_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({
        field: 'email',
        value: 'invalid@'
      });
    });

    it('includes additional details', () => {
      const additionalDetails = { zodError: 'zod error object' };
      const error = new UIValidationError(
        'Validation failed',
        'email',
        'invalid@',
        additionalDetails
      );
      
      expect(error.details).toEqual({
        field: 'email',
        value: 'invalid@',
        zodError: 'zod error object'
      });
    });

    it('is instance of UIError', () => {
      const error = new UIValidationError('Validation failed', 'field', 'value');
      expect(error).toBeInstanceOf(UIError);
      expect(error).toBeInstanceOf(UIValidationError);
    });
  });

  describe('UIComponentError', () => {
    it('creates component error with proper message format', () => {
      const error = new UIComponentError('dropdown', 'render', 'Failed to render');
      
      expect(error.message).toBe('UI component error in dropdown during render: Failed to render');
      expect(error.type).toBe(UIErrorType.UI_COMPONENT_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({
        component: 'dropdown',
        action: 'render',
        reason: 'Failed to render'
      });
    });

    it('includes additional details', () => {
      const additionalDetails = { props: { disabled: true } };
      const error = new UIComponentError(
        'button',
        'click',
        'Click failed',
        additionalDetails
      );
      
      expect(error.details).toEqual({
        component: 'button',
        action: 'click',
        reason: 'Click failed',
        props: { disabled: true }
      });
    });
  });

  describe('UIFormError', () => {
    it('creates form error with proper message format', () => {
      const errors = { email: 'Invalid email', password: 'Too short' };
      const error = new UIFormError('login-form', errors);
      
      expect(error.message).toBe('Form validation failed for login-form');
      expect(error.type).toBe(UIErrorType.UI_FORM_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({
        formName: 'login-form',
        errors
      });
    });

    it('includes additional details', () => {
      const errors = { field: 'error' };
      const additionalDetails = { formData: { field: 'value' } };
      const error = new UIFormError('test-form', errors, additionalDetails);
      
      expect(error.details).toEqual({
        formName: 'test-form',
        errors,
        formData: { field: 'value' }
      });
    });
  });

  describe('UIInputError', () => {
    it('creates input error with proper message format', () => {
      const error = new UIInputError('username', 'invalid-chars', 'Contains invalid characters');
      
      expect(error.message).toBe('Input validation failed for username: Contains invalid characters');
      expect(error.type).toBe(UIErrorType.UI_INPUT_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({
        inputName: 'username',
        value: 'invalid-chars',
        reason: 'Contains invalid characters'
      });
    });

    it('includes additional details', () => {
      const additionalDetails = { pattern: /^[a-zA-Z]+$/ };
      const error = new UIInputError('name', 'test123', 'Invalid format', additionalDetails);
      
      expect(error.details).toEqual({
        inputName: 'name',
        value: 'test123',
        reason: 'Invalid format',
        pattern: /^[a-zA-Z]+$/
      });
    });
  });

  describe('UIDialogError', () => {
    it('creates dialog error with proper message format', () => {
      const error = new UIDialogError('confirmation-dialog', 'confirm', 'Confirmation failed');
      
      expect(error.message).toBe('Dialog error in confirmation-dialog during confirm: Confirmation failed');
      expect(error.type).toBe(UIErrorType.UI_DIALOG_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        dialogName: 'confirmation-dialog',
        action: 'confirm',
        reason: 'Confirmation failed'
      });
    });
  });

  describe('UITableError', () => {
    it('creates table error with proper message format', () => {
      const error = new UITableError('data-table', 'sort', 'Sort operation failed');
      
      expect(error.message).toBe('Table error in data-table during sort: Sort operation failed');
      expect(error.type).toBe(UIErrorType.UI_TABLE_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        tableName: 'data-table',
        operation: 'sort',
        reason: 'Sort operation failed'
      });
    });
  });

  describe('UIDateError', () => {
    it('creates date error with proper message format', () => {
      const error = new UIDateError('date-picker', '2023-13-01', 'Invalid month');
      
      expect(error.message).toBe('Date validation error in date-picker: Invalid month');
      expect(error.type).toBe(UIErrorType.UI_DATE_ERROR);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({
        component: 'date-picker',
        value: '2023-13-01',
        reason: 'Invalid month'
      });
    });
  });

  describe('UIConfigurationError', () => {
    it('creates configuration error with proper message format', () => {
      const error = new UIConfigurationError('form-validator', 'schema', 'Invalid schema format');
      
      expect(error.message).toBe('Configuration error in form-validator for schema: Invalid schema format');
      expect(error.type).toBe(UIErrorType.UI_CONFIGURATION_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({
        component: 'form-validator',
        config: 'schema',
        reason: 'Invalid schema format'
      });
    });
  });

  describe('Error Type Enum', () => {
    it('has all expected error types', () => {
      expect(UIErrorType.UI_ERROR).toBe('UI_ERROR');
      expect(UIErrorType.UI_VALIDATION_ERROR).toBe('UI_VALIDATION_ERROR');
      expect(UIErrorType.UI_COMPONENT_ERROR).toBe('UI_COMPONENT_ERROR');
      expect(UIErrorType.UI_FORM_ERROR).toBe('UI_FORM_ERROR');
      expect(UIErrorType.UI_INPUT_ERROR).toBe('UI_INPUT_ERROR');
      expect(UIErrorType.UI_DIALOG_ERROR).toBe('UI_DIALOG_ERROR');
      expect(UIErrorType.UI_TABLE_ERROR).toBe('UI_TABLE_ERROR');
      expect(UIErrorType.UI_DATE_ERROR).toBe('UI_DATE_ERROR');
      expect(UIErrorType.UI_CONFIGURATION_ERROR).toBe('UI_CONFIGURATION_ERROR');
    });
  });

  describe('Error Serialization', () => {
    it('serializes error properties correctly', () => {
      const error = new UIValidationError('Test error', 'field', 'value', { extra: 'data' });
      
      const serialized = JSON.parse(JSON.stringify(error));
      
      // Note: Error message and stack might not serialize by default
      // This test verifies that custom properties are preserved
      expect(serialized.type).toBe(UIErrorType.UI_VALIDATION_ERROR);
      expect(serialized.statusCode).toBe(422);
      expect(serialized.isOperational).toBe(true);
      expect(serialized.details).toEqual({
        field: 'field',
        value: 'value',
        extra: 'data'
      });
    });
  });

  describe('Error Inheritance Chain', () => {
    it('maintains proper inheritance chain', () => {
      const validationError = new UIValidationError('Test', 'field', 'value');
      
      expect(validationError instanceof Error).toBe(true);
      expect(validationError instanceof UIError).toBe(true);
      expect(validationError instanceof UIValidationError).toBe(true);
      
      expect(validationError.constructor.name).toBe('UIValidationError');
    });

    it('allows instanceof checks for base class', () => {
      const errors = [
        new UIValidationError('Test', 'field', 'value'),
        new UIComponentError('comp', 'action', 'reason'),
        new UIFormError('form', {}),
        new UIInputError('input', 'value', 'reason')
      ];
      
      errors.forEach(error => {
        expect(error instanceof UIError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });
  });

  describe('Error Details Handling', () => {
    it('handles undefined details gracefully', () => {
      const error = new UIError('Test error');
      expect(error.details).toBeUndefined();
    });

    it('handles empty details object', () => {
      const error = new UIError('Test error', UIErrorType.UI_ERROR, 400, {});
      expect(error.details).toEqual({});
    });

    it('preserves complex details objects', () => {
      const complexDetails = {
        nested: { object: true },
        array: [1, 2, 3],
        function: () => 'test',
        date: new Date(),
        regex: /test/g
      };
      
      const error = new UIError('Test error', UIErrorType.UI_ERROR, 400, complexDetails);
      expect(error.details).toBe(complexDetails);
    });
  });
});

