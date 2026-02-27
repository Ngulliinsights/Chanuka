/**
 * Form Helpers Tests
 *
 * Tests for form validation helpers and React Hook Form integration.
 */

import { describe, it, expect } from 'vitest';
import {
  createRHFValidator,
  schemaToRHFRules,
  validateFormForRHF,
  errorsToFieldMap,
  errorsToMessages,
  hasErrors,
  getFieldError,
  getFieldErrors,
  mergeErrors,
  filterErrorsByField,
  groupErrorsByField,
  createFormState,
  updateFormField,
  touchField,
  setFormErrors,
  clearFormErrors,
  shouldShowFieldError,
} from '../form-helpers';
import type { ValidationFieldError } from '../types';

describe('Form Helpers', () => {
  describe('createRHFValidator', () => {
    it('should create React Hook Form validator', () => {
      const validator = createRHFValidator({ required: true, email: true });

      expect(validator('user@example.com')).toBe(true);
      expect(validator('invalid')).toBeTypeOf('string');
      expect(validator('')).toBeTypeOf('string');
    });
  });

  describe('schemaToRHFRules', () => {
    it('should convert schema to RHF rules', () => {
      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8, maxLength: 128 },
        age: { required: true, min: 18, max: 120 },
      };

      const rhfRules = schemaToRHFRules(schema);

      expect(rhfRules.email.required).toBeDefined();
      expect(rhfRules.password.minLength).toEqual({ value: 8, message: expect.any(String) });
      expect(rhfRules.password.maxLength).toEqual({ value: 128, message: expect.any(String) });
      expect(rhfRules.age.min).toEqual({ value: 18, message: expect.any(String) });
      expect(rhfRules.age.max).toEqual({ value: 120, message: expect.any(String) });
    });
  });

  describe('validateFormForRHF', () => {
    it('should validate form and return RHF format errors', () => {
      const formData = {
        email: 'invalid',
        password: '123',
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
      };

      const errors = validateFormForRHF(formData, schema);

      expect(errors).toBeDefined();
      expect(errors?.email).toBeDefined();
      expect(errors?.password).toBeDefined();
      expect(errors?.email.type).toBeDefined();
      expect(errors?.email.message).toBeDefined();
    });

    it('should return undefined for valid form', () => {
      const formData = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      const schema = {
        email: { required: true, email: true },
        password: { required: true, minLength: 8 },
      };

      const errors = validateFormForRHF(formData, schema);

      expect(errors).toBeUndefined();
    });
  });

  describe('error utilities', () => {
    const mockErrors: ValidationFieldError[] = [
      { field: 'email', message: 'Invalid email', code: 'INVALID_FORMAT' },
      { field: 'password', message: 'Too short', code: 'MIN_LENGTH' },
      { field: 'email', message: 'Required', code: 'REQUIRED' },
    ];

    it('should convert errors to field map', () => {
      const fieldMap = errorsToFieldMap(mockErrors);

      expect(fieldMap.email).toBe('Invalid email'); // First error only
      expect(fieldMap.password).toBe('Too short');
    });

    it('should convert errors to messages', () => {
      const messages = errorsToMessages(mockErrors);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toBe('email: Invalid email');
      expect(messages[1]).toBe('password: Too short');
    });

    it('should check if has errors', () => {
      expect(hasErrors(mockErrors)).toBe(true);
      expect(hasErrors([])).toBe(false);
      expect(hasErrors(undefined)).toBe(false);
    });

    it('should get field error', () => {
      const error = getFieldError(mockErrors, 'email');
      expect(error).toBe('Invalid email'); // First error

      const noError = getFieldError(mockErrors, 'nonexistent');
      expect(noError).toBeUndefined();
    });

    it('should get all field errors', () => {
      const errors = getFieldErrors(mockErrors, 'email');
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Invalid email');
      expect(errors).toContain('Required');
    });

    it('should merge errors', () => {
      const errors1: ValidationFieldError[] = [
        { field: 'email', message: 'Error 1', code: 'CODE1' },
      ];
      const errors2: ValidationFieldError[] = [
        { field: 'password', message: 'Error 2', code: 'CODE2' },
      ];

      const merged = mergeErrors(errors1, errors2, undefined);

      expect(merged).toHaveLength(2);
      expect(merged.map(e => e.field)).toContain('email');
      expect(merged.map(e => e.field)).toContain('password');
    });

    it('should filter errors by field pattern', () => {
      const filtered = filterErrorsByField(mockErrors, /^email$/);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.field === 'email')).toBe(true);
    });

    it('should group errors by field', () => {
      const grouped = groupErrorsByField(mockErrors);

      expect(grouped.email).toHaveLength(2);
      expect(grouped.password).toHaveLength(1);
    });
  });

  describe('form state helpers', () => {
    it('should create initial form state', () => {
      const state = createFormState({ email: '', password: '' });

      expect(state.data).toEqual({ email: '', password: '' });
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
      expect(state.isValid).toBe(true);
      expect(state.isSubmitting).toBe(false);
      expect(state.isDirty).toBe(false);
    });

    it('should update form field', () => {
      const initialState = createFormState({ email: '', password: '' });
      const updatedState = updateFormField(initialState, 'email', 'user@example.com');

      expect(updatedState.data.email).toBe('user@example.com');
      expect(updatedState.isDirty).toBe(true);
    });

    it('should mark field as touched', () => {
      const initialState = createFormState({ email: '' });
      const touchedState = touchField(initialState, 'email');

      expect(touchedState.touched.email).toBe(true);
    });

    it('should set form errors', () => {
      const initialState = createFormState({ email: '' });
      const errors: ValidationFieldError[] = [
        { field: 'email', message: 'Invalid', code: 'INVALID' },
      ];

      const errorState = setFormErrors(initialState, errors);

      expect(errorState.errors.email).toBe('Invalid');
      expect(errorState.isValid).toBe(false);
    });

    it('should clear form errors', () => {
      const stateWithErrors = {
        ...createFormState({ email: '' }),
        errors: { email: 'Invalid' },
        isValid: false,
      };

      const clearedState = clearFormErrors(stateWithErrors);

      expect(clearedState.errors).toEqual({});
      expect(clearedState.isValid).toBe(true);
    });

    it('should determine if field error should show', () => {
      const state = {
        ...createFormState({ email: '' }),
        errors: { email: 'Invalid' },
        touched: { email: true },
      };

      expect(shouldShowFieldError(state, 'email')).toBe(true);
      expect(shouldShowFieldError(state, 'password')).toBe(false);

      const untouchedState = {
        ...state,
        touched: {},
      };

      expect(shouldShowFieldError(untouchedState, 'email')).toBe(false);
    });
  });
});
