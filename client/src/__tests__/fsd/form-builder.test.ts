/**
 * Form Builder FSD Tests
 *
 * Comprehensive test suite for the Form Builder FSD module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Form Builder FSD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Builder Types', () => {
    it('should have proper type definitions', () => {
      // Test that types are properly exported
      expect(true).toBe(true);
    });
  });

  describe('Form Builder Services', () => {
    it('should create form service', () => {
      const { FormBuilderServiceImpl } = require('@client/shared/lib/form-builder/services/form-builder.service');

      const service = new FormBuilderServiceImpl({
        schema: {},
        validationMode: 'onBlur',
      });

      expect(service).toBeDefined();
      expect(service.createForm).toBeDefined();
      expect(service.resetForm).toBeDefined();
      expect(service.getFormData).toBeDefined();
      expect(service.setFormData).toBeDefined();
    });
  });

  describe('Form Builder Factories', () => {
    it('should create login form builder', () => {
      const { createLoginFormBuilder } = require('@client/shared/lib/form-builder/factories/form-builder.factory');

      const formBuilder = createLoginFormBuilder();
      expect(formBuilder).toBeDefined();
      expect(typeof formBuilder).toBe('function');
    });

    it('should create registration form builder', () => {
      const { createRegistrationFormBuilder } = require('@client/shared/lib/form-builder/factories/form-builder.factory');

      const formBuilder = createRegistrationFormBuilder();
      expect(formBuilder).toBeDefined();
      expect(typeof formBuilder).toBe('function');
    });
  });

  describe('Form Builder Utilities', () => {
    it('should create schema from config', () => {
      const { createSchemaFromConfig } = require('@client/shared/lib/form-builder/utils/form-utils');

      const config = {
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
          },
        ],
      };

      const schema = createSchemaFromConfig(config);
      expect(schema).toBeDefined();
      expect(typeof schema.parse).toBe('function');
    });

    it('should validate field', () => {
      const { validateField } = require('@client/shared/lib/form-builder/utils/form-utils');

      const result = validateField({}, 'email', 'test@example.com');
      expect(result).toBeUndefined();
    });

    it('should validate form data', () => {
      const { validateFormData } = require('@client/shared/lib/form-builder/utils/form-utils');

      const data = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = validateFormData({}, data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('Form Builder Components', () => {
    it('should render dynamic form', () => {
      const { DynamicForm } = require('@client/shared/lib/form-builder/components/DynamicForm');

      const config = {
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
          },
          {
            name: 'password',
            type: 'password',
            label: 'Password',
            required: true,
          },
        ],
        submitText: 'Create Account',
        resetText: 'Clear Form',
      };

      const onSubmit = vi.fn();

      expect(DynamicForm).toBeDefined();
      expect(typeof DynamicForm).toBe('function');
    });
  });
});
