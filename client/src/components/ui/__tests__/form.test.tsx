/**
 * Enhanced Form component tests
 * Following navigation component testing patterns for consistency
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { z } from 'zod';
import { EnhancedForm } from '@client/form';
import { UIFormError } from '@client/errors';

describe('EnhancedForm', () => {
  const TestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18 years old')
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders form with children', () => {
      render(
        <EnhancedForm>
          <input name="test" aria-label="Test input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute('role', 'form');
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <EnhancedForm className="custom-form">
          <div>Content</div>
        </EnhancedForm>
      );
      
      expect(screen.getByRole('form')).toHaveClass('custom-form');
    });
  });

  describe('Schema Validation', () => {
    it('validates form data against schema on submit', async () => {
      const onSubmit = vi.fn();
      const onValidationError = vi.fn();
      
      render(
        <EnhancedForm
          schema={TestSchema}
          onSubmit={onSubmit}
          onValidationError={onValidationError}
        >
          <input name="name" aria-label="Name" />
          <input name="email" aria-label="Email" />
          <input name="age" type="number" aria-label="Age" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('calls onSubmit with validated data when validation passes', async () => {
      const onSubmit = vi.fn();
      
      render(
        <EnhancedForm schema={TestSchema} onSubmit={onSubmit}>
          <input name="name" defaultValue="John Doe" aria-label="Name" />
          <input name="email" defaultValue="john@example.com" aria-label="Email" />
          <input name="age" type="number" defaultValue="25" aria-label="Age" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          age: '25' // FormData values are strings
        });
      });
    });

    it('displays validation errors in error summary', async () => {
      const onValidationError = vi.fn();
      
      render(
        <EnhancedForm
          schema={TestSchema}
          onValidationError={onValidationError}
          config={{ showErrorSummary: true }}
        >
          <input name="name" aria-label="Name" />
          <input name="email" defaultValue="invalid-email" aria-label="Email" />
          <input name="age" type="number" defaultValue="15" aria-label="Age" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please correct the following errors:')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Options', () => {
    it('validates on submit by default', async () => {
      const onSubmit = vi.fn();
      const onValidationError = vi.fn();
      
      render(
        <EnhancedForm
          schema={TestSchema}
          onSubmit={onSubmit}
          onValidationError={onValidationError}
        >
          <input name="name" aria-label="Name" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalled();
      });
    });

    it('skips validation when validateOnSubmit is false', async () => {
      const onSubmit = vi.fn();
      
      render(
        <EnhancedForm
          schema={TestSchema}
          onSubmit={onSubmit}
          config={{ validateOnSubmit: false }}
        >
          <input name="name" aria-label="Name" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('shows error summary when configured', async () => {
      render(
        <EnhancedForm
          schema={TestSchema}
          config={{ showErrorSummary: true }}
        >
          <input name="name" aria-label="Name" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please correct the following errors:')).toBeInTheDocument();
      });
    });

    it('hides error summary when configured', async () => {
      render(
        <EnhancedForm
          schema={TestSchema}
          config={{ showErrorSummary: false }}
        >
          <input name="name" aria-label="Name" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Please correct the following errors:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" aria-label="Test input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeInTheDocument();
      });
    });

    it('hides loading indicator after submission completes', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      
      render(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" aria-label="Test input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles submission errors gracefully', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
      const onValidationError = vi.fn();
      
      render(
        <EnhancedForm
          onSubmit={onSubmit}
          onValidationError={onValidationError}
        >
          <input name="test" defaultValue="value" aria-label="Test input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalledWith({
          general: 'Form submission failed'
        });
      });
    });

    it('handles invalid configuration gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <EnhancedForm config={{ validateOnSubmit: 'invalid' as any }}>
          <input name="test" aria-label="Test input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Form Data Handling', () => {
    it('handles FormData correctly', async () => {
      const onSubmit = vi.fn();
      
      render(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="text" defaultValue="test value" aria-label="Text input" />
          <input name="number" type="number" defaultValue="42" aria-label="Number input" />
          <input name="checkbox" type="checkbox" defaultChecked aria-label="Checkbox input" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        const formData = onSubmit.mock.calls[0][0];
        expect(formData).toBeInstanceOf(FormData);
      });
    });
  });
});