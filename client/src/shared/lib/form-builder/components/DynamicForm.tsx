/**
 * Dynamic Form Component
 *
 * A reusable component that generates forms based on configuration
 */

import React from 'react';
import { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';

import { useDynamicForm } from '../hooks/useFormBuilder';
import type { FormConfig } from '../types/form-builder.types';

interface DynamicFormProps<T extends Record<string, any>> {
  config: FormConfig<T>;
  onSubmit: SubmitHandler<T>;
  onSuccess?: (data: T) => Promise<void> | void;
  onError?: (error: Error) => void;
  className?: string;
  debug?: boolean;
}

export function DynamicForm<T extends Record<string, any>>({
  config,
  onSubmit,
  onSuccess,
  onError,
  className = '',
  debug = false,
}: DynamicFormProps<T>) {
  const { form, fields } = useDynamicForm({
    formConfig: config,
    onSubmit,
    onSuccess,
    onError,
    debug,
  });

  const renderField = (field: FormConfig<T>['fields'][0]) => {
    const { name, type, label, placeholder, options, required, disabled, className: fieldClassName } = field;
    const error = form.formState.errors[name];
    const hasError = !!error;

    const commonProps = {
      ...form.register(name),
      id: name,
      placeholder: placeholder || label,
      disabled,
      className: `form-input ${fieldClassName || ''} ${hasError ? 'error' : ''}`,
    };

    switch (type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <input
            type={type}
            {...commonProps}
            aria-label={label}
            aria-describedby={hasError ? `${name}-error` : undefined}
            aria-invalid={hasError}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            aria-label={label}
            aria-describedby={hasError ? `${name}-error` : undefined}
            aria-invalid={hasError}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            aria-label={label}
            aria-describedby={hasError ? `${name}-error` : undefined}
            aria-invalid={hasError}
          >
            <option value="">Select an option</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              {...commonProps}
              aria-label={label}
              aria-describedby={hasError ? `${name}-error` : undefined}
              aria-invalid={hasError}
            />
            <label htmlFor={name} className="ml-2 text-sm">
              {label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  {...form.register(name)}
                  value={option.value}
                  disabled={disabled}
                  className={`form-radio ${hasError ? 'error' : ''}`}
                  aria-label={option.label}
                />
                <span className="ml-2">{option.label}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form
      onSubmit={form.onSubmit(onSubmit)}
      className={`dynamic-form ${className}`}
      noValidate
    >
      <div className={`form-fields ${config.layout || 'vertical'}`}>
        {fields.map((field) => (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name} className="form-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {form.hasError(field.name) && (
              <span id={`${field.name}-error`} className="form-error" role="alert">
                {form.getErrorMessage(field.name)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={form.isSubmitting}
          className={`btn-primary ${form.isSubmitting ? 'loading' : ''}`}
        >
          {form.isSubmitting ? 'Submitting...' : config.submitText || 'Submit'}
        </button>

        <button
          type="button"
          onClick={form.resetForm}
          className="btn-secondary"
        >
          {config.resetText || 'Reset'}
        </button>
      </div>

      {form.submitError && (
        <div className="form-error-message" role="alert">
          {form.submitError.message}
        </div>
      )}
    </form>
  );
}

export default DynamicForm;
