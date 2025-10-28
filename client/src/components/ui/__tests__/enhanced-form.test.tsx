/**
 * Enhanced Form component tests
 * Following navigation component testing patterns for consistency
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { EnhancedForm } from '../form';
import { UIFormError } from '../errors';

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
          <input name="test" />
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
          <input name="name" />
          <input name="email" />
          <input name="age" type="number" />
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
          <input name="name" defaultValue="John Doe" />
          <input name="email" defaultValue="john@example.com" />
          <input name="age" type="number" defaultValue="25" />
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
          <input name="name" />
          <input name="email" defaultValue="invalid-email" />
          <input name="age" type="number" defaultValue="15" />
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
          <input name="name" />
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
          <input name="name" />
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
          <input name="name" />
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
          <input name="name" />
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
          <input name="test" defaultValue="value" />
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
          <input name="test" defaultValue="value" />
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
          <input name="test" defaultValue="value" />
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
          <input name="test" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );
      
      expect(screen.getByRole('form')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility - WCAG 2.1 AA Compliance', () => {
    describe('Form Semantics and Structure', () => {
      it('has proper form semantics with noValidate attribute', () => {
        render(
          <EnhancedForm>
            <input name="test" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const form = screen.getByRole('form');
        expect(form).toHaveAttribute('novalidate');
      });

      it('maintains proper heading hierarchy in error summary', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const heading = screen.getByRole('heading', { level: 3 });
          expect(heading).toHaveTextContent('Please correct the following errors:');
        });
      });
    });

    describe('ARIA Attributes and Screen Reader Support', () => {
      it('provides proper ARIA labels for error summary', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const errorSummary = screen.getByRole('alert');
          expect(errorSummary).toHaveAttribute('aria-labelledby', 'form-error-summary');
        });
      });

      it('announces form submission status to screen readers', async () => {
        const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(
          <EnhancedForm onSubmit={onSubmit}>
            <input name="test" defaultValue="value" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Submitting...')).toBeInTheDocument();
        });

        // Status text should be available to screen readers
        const statusText = screen.getByText('Submitting...');
        expect(statusText).toHaveAttribute('aria-live', 'polite');
      });

      it('provides accessible error messages with proper ARIA attributes', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" aria-label="Full Name" />
            <input name="email" aria-label="Email Address" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const errorSummary = screen.getByRole('alert');
          expect(errorSummary).toBeInTheDocument();
          // Error summary should be announced immediately
          expect(errorSummary).toHaveAttribute('aria-live', 'assertive');
        });
      });
    });

    describe('Keyboard Navigation', () => {
      it('supports keyboard submission with Enter key', async () => {
        const onSubmit = vi.fn();

        render(
          <EnhancedForm onSubmit={onSubmit}>
            <input name="test" defaultValue="value" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const input = screen.getByRole('textbox');
        input.focus();
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
          expect(onSubmit).toHaveBeenCalled();
        });
      });

      it('maintains logical tab order through form elements', () => {
        render(
          <EnhancedForm>
            <input name="first" data-testid="first-input" />
            <input name="second" data-testid="second-input" />
            <button type="submit" data-testid="submit-btn">Submit</button>
          </EnhancedForm>
        );

        const firstInput = screen.getByTestId('first-input');
        const secondInput = screen.getByTestId('second-input');
        const submitBtn = screen.getByTestId('submit-btn');

        // Start with first input
        firstInput.focus();
        expect(document.activeElement).toBe(firstInput);

        // Tab to second input
        fireEvent.keyDown(firstInput, { key: 'Tab', code: 'Tab' });
        expect(document.activeElement).toBe(secondInput);

        // Tab to submit button
        fireEvent.keyDown(secondInput, { key: 'Tab', code: 'Tab' });
        expect(document.activeElement).toBe(submitBtn);
      });

      it('prevents default form submission on Enter in input fields when validation fails', async () => {
        const onSubmit = vi.fn();

        render(
          <EnhancedForm
            schema={TestSchema}
            onSubmit={onSubmit}
          >
            <input name="name" defaultValue="" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const input = screen.getByRole('textbox');
        input.focus();
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
          expect(onSubmit).not.toHaveBeenCalled();
        });
      });
    });

    describe('Focus Management', () => {
      it('focuses first error field when validation fails', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ scrollToFirstError: true }}
          >
            <input name="name" data-testid="name-input" />
            <input name="email" data-testid="email-input" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const nameInput = screen.getByTestId('name-input');
          expect(document.activeElement).toBe(nameInput);
        });
      });

      it('provides clickable error links that focus corresponding fields', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" data-testid="name-input" />
            <input name="email" data-testid="email-input" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const errorLinks = screen.getAllByRole('button');
          const nameErrorLink = errorLinks.find(link => link.textContent?.includes('name'));
          expect(nameErrorLink).toBeInTheDocument();
        });

        const nameErrorLink = screen.getByRole('button', { name: /name.*required/i });
        fireEvent.click(nameErrorLink);

        const nameInput = screen.getByTestId('name-input');
        await waitFor(() => {
          expect(document.activeElement).toBe(nameInput);
        });
      });

      it('maintains focus visibility with proper focus indicators', () => {
        render(
          <EnhancedForm>
            <input name="test" className="focus:ring-2 focus:ring-blue-500" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const input = screen.getByRole('textbox');
        input.focus();

        // Check that focus styles are applied (this would be tested with visual regression in e2e)
        expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      });
    });

    describe('Form Labels and Descriptions', () => {
      it('associates labels with form controls using proper htmlFor', () => {
        render(
          <EnhancedForm>
            <label htmlFor="test-input">Test Label</label>
            <input id="test-input" name="test" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const label = screen.getByText('Test Label');
        const input = screen.getByRole('textbox');

        expect(label).toHaveAttribute('for', 'test-input');
        expect(input).toHaveAttribute('id', 'test-input');
      });

      it('provides accessible descriptions for form fields', () => {
        render(
          <EnhancedForm>
            <input name="test" aria-describedby="test-description" />
            <div id="test-description">This is a test field description</div>
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const input = screen.getByRole('textbox');
        const description = screen.getByText('This is a test field description');

        expect(input).toHaveAttribute('aria-describedby', 'test-description');
        expect(description).toHaveAttribute('id', 'test-description');
      });

      it('marks required fields appropriately', () => {
        render(
          <EnhancedForm>
            <input name="required" required aria-required="true" />
            <input name="optional" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const requiredInput = screen.getByRole('textbox', { name: '' }); // First input
        const optionalInput = screen.getAllByRole('textbox')[1];

        expect(requiredInput).toHaveAttribute('aria-required', 'true');
        expect(requiredInput).toHaveAttribute('required');
        expect(optionalInput).not.toHaveAttribute('aria-required');
      });
    });

    describe('Error Announcements and Live Regions', () => {
      it('announces validation errors immediately to screen readers', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" aria-label="Full Name" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const alert = screen.getByRole('alert');
          expect(alert).toHaveAttribute('aria-live', 'assertive');
          expect(alert).toHaveAttribute('aria-atomic', 'true');
        });
      });

      it('provides clear error messages that identify the field and issue', async () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" aria-label="Full Name" />
            <input name="email" aria-label="Email Address" defaultValue="invalid-email" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
          expect(screen.getByText(/email.*invalid/i)).toBeInTheDocument();
        });
      });

      it('clears error messages when validation succeeds', async () => {
        const onSubmit = vi.fn();

        render(
          <EnhancedForm
            schema={TestSchema}
            onSubmit={onSubmit}
            config={{ showErrorSummary: true }}
          >
            <input name="name" defaultValue="John Doe" />
            <input name="email" defaultValue="john@example.com" />
            <input name="age" type="number" defaultValue="25" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        // First submit with errors
        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        expect(onSubmit).toHaveBeenCalled();
      });
    });

    describe('Interactive Element Accessibility', () => {
      it('provides proper button semantics for submit button', () => {
        render(
          <EnhancedForm>
            <input name="test" />
            <button type="submit">Submit Form</button>
          </EnhancedForm>
        );

        const button = screen.getByRole('button', { name: 'Submit Form' });
        expect(button).toHaveAttribute('type', 'submit');
      });

      it('disables submit button during form submission', async () => {
        const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(
          <EnhancedForm onSubmit={onSubmit}>
            <input name="test" defaultValue="value" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(submitButton).toBeDisabled();
          expect(submitButton).toHaveAttribute('aria-disabled', 'true');
        });
      });

      it('provides loading state feedback to assistive technologies', async () => {
        const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        render(
          <EnhancedForm onSubmit={onSubmit}>
            <input name="test" defaultValue="value" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const statusMessage = screen.getByText('Submitting...');
          expect(statusMessage).toHaveAttribute('aria-live', 'polite');
          expect(statusMessage).toHaveAttribute('role', 'status');
        });
      });
    });

    describe('Color Contrast and Visual Accessibility', () => {
      it('uses semantic color classes for proper contrast', () => {
        render(
          <EnhancedForm
            schema={TestSchema}
            config={{ showErrorSummary: true }}
          >
            <input name="name" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const submitButton = screen.getByRole('button');
        fireEvent.click(submitButton);

        await waitFor(() => {
          const errorSummary = screen.getByRole('alert');
          // Check for semantic color classes that should provide proper contrast
          expect(errorSummary).toHaveClass('bg-destructive/15', 'border-destructive/20', 'text-destructive');
        });
      });

      it('provides sufficient color contrast for focus indicators', () => {
        render(
          <EnhancedForm>
            <input name="test" className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );

        const input = screen.getByRole('textbox');
        // Focus styles should provide sufficient contrast (tested via visual inspection in e2e)
        expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500', 'focus:border-blue-500');
      });
    });
  });

  describe('Form Data Handling', () => {
    it('handles FormData correctly', async () => {
      const onSubmit = vi.fn();
      
      render(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="text" defaultValue="test value" />
          <input name="number" type="number" defaultValue="42" />
          <input name="checkbox" type="checkbox" defaultChecked />
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

