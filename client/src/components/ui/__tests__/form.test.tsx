/**
 * Comprehensive tests for Form components
 * Covers form fields, validation, accessibility, and enhanced form features
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
  EnhancedForm,
} from '../form';
import { renderWithWrapper, spyOnConsole } from './test-utils';

// Mock dependencies
vi.mock('../../../lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}));

vi.mock('../../../utils/browser-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../recovery', () => ({
  attemptUIRecovery: vi.fn(),
  getUIRecoverySuggestions: vi.fn()
}));

vi.mock('../errors', () => ({
  UIFormError: class UIFormError extends Error {
    constructor(formName: string, errors: Record<string, string>, details?: any) {
      super('Form validation error');
      this.name = 'UIFormError';
    }
  }
}));

// Test component that uses react-hook-form
const TestFormComponent = ({ children }: { children: React.ReactNode }) => {
  const form = useForm({
    defaultValues: {
      name: '',
      email: ''
    }
  });

  return (
    <Form {...form}>
      {children}
    </Form>
  );
};

describe('Form Component', () => {
  it('renders FormProvider correctly', () => {
    const form = useForm();
    render(
      <Form {...form}>
        <div>Form content</div>
      </Form>
    );

    expect(screen.getByText('Form content')).toBeInTheDocument();
  });
});

describe('FormField Component', () => {
  it('provides context to render function', () => {
    const TestChild = () => {
      const field = useFormField();
      return <div data-testid="field-name">{field.name}</div>;
    };

    render(
      <TestFormComponent>
        <FormField
          name="testField"
          render={() => <TestChild />}
        />
      </TestFormComponent>
    );

    expect(screen.getByTestId('field-name')).toHaveTextContent('testField');
  });

  it('throws error when useFormField used outside FormField', () => {
    const TestChild = () => {
      expect(() => useFormField()).toThrow('useFormField should be used within <FormField>');
      return null;
    };

    // This will throw during render
    expect(() => render(<TestChild />)).toThrow();
  });
});

describe('FormItem Component', () => {
  it('provides id context', () => {
    const TestChild = () => {
      const field = useFormField();
      return <div data-testid="item-id">{field.formItemId}</div>;
    };

    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <TestChild />
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    const itemId = screen.getByTestId('item-id').textContent;
    expect(itemId).toMatch(/^.*-form-item$/);
  });

  it('applies default className', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem data-testid="form-item">Content</FormItem>
        </FormField>
      </TestFormComponent>
    );

    const item = screen.getByTestId('form-item');
    expect(item).toHaveClass('space-y-2');
  });

  it('merges className', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem className="custom-class" data-testid="form-item">Content</FormItem>
        </FormField>
      </TestFormComponent>
    );

    const item = screen.getByTestId('form-item');
    expect(item).toHaveClass('space-y-2', 'custom-class');
  });
});

describe('FormLabel Component', () => {
  it('renders label with correct htmlFor', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <FormLabel>Test Label</FormLabel>
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('htmlFor');
    expect(label.getAttribute('htmlFor')).toMatch(/^.*-form-item$/);
  });

  it('applies error styling when field has error', () => {
    const form = useForm({
      defaultValues: { test: '' },
      errors: { test: { message: 'Required', type: 'required' } }
    });

    render(
      <Form {...form}>
        <FormField name="test">
          <FormItem>
            <FormLabel>Test Label</FormLabel>
          </FormItem>
        </FormField>
      </Form>
    );

    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('text-destructive');
  });
});

describe('FormControl Component', () => {
  it('renders with correct id and aria attributes', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <FormControl>
              <input type="text" />
            </FormControl>
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id');
    expect(input.getAttribute('id')).toMatch(/^.*-form-item$/);
    expect(input).toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid when field has error', () => {
    const form = useForm({
      defaultValues: { test: '' },
      errors: { test: { message: 'Required', type: 'required' } }
    });

    render(
      <Form {...form}>
        <FormField name="test">
          <FormItem>
            <FormControl>
              <input type="text" />
            </FormControl>
          </FormItem>
        </FormField>
      </Form>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('includes formMessageId in aria-describedby when error exists', () => {
    const form = useForm({
      defaultValues: { test: '' },
      errors: { test: { message: 'Required', type: 'required' } }
    });

    render(
      <Form {...form}>
        <FormField name="test">
          <FormItem>
            <FormControl>
              <input type="text" />
            </FormControl>
          </FormItem>
        </FormField>
      </Form>
    );

    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toMatch(/.*-form-item-message$/);
  });
});

describe('FormDescription Component', () => {
  it('renders with correct id', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <FormDescription>Description text</FormDescription>
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    const desc = screen.getByText('Description text');
    expect(desc).toHaveAttribute('id');
    expect(desc.getAttribute('id')).toMatch(/^.*-form-item-description$/);
    expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
  });
});

describe('FormMessage Component', () => {
  it('renders error message when field has error', () => {
    const form = useForm({
      defaultValues: { test: '' },
      errors: { test: { message: 'Required field', type: 'required' } }
    });

    render(
      <Form {...form}>
        <FormField name="test">
          <FormItem>
            <FormMessage />
          </FormItem>
        </FormField>
      </Form>
    );

    const message = screen.getByText('Required field');
    expect(message).toHaveClass('text-sm', 'font-medium', 'text-destructive');
    expect(message).toHaveAttribute('id');
  });

  it('renders custom children when no error', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <FormMessage>Custom message</FormMessage>
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('does not render when no error and no children', () => {
    render(
      <TestFormComponent>
        <FormField name="test">
          <FormItem>
            <FormMessage />
          </FormItem>
        </FormField>
      </TestFormComponent>
    );

    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});

describe('Form Integration', () => {
  it('works with complete form structure', () => {
    const form = useForm({
      defaultValues: { name: '', email: '' }
    });

    render(
      <Form {...form}>
        <FormField name="name">
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <input type="text" />
            </FormControl>
            <FormDescription>Enter your full name</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>
      </Form>
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const form = useForm({
      defaultValues: { name: 'John Doe' }
    });

    render(
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField name="name">
            <FormItem>
              <FormControl>
                <input type="text" {...form.register('name')} />
              </FormControl>
            </FormItem>
          </FormField>
          <button type="submit">Submit</button>
        </form>
      </Form>
    );

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' }, expect.any(Object));
  });
});

describe('EnhancedForm Component', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = spyOnConsole();
  });

  afterEach(() => {
    consoleSpy.restore();
    vi.clearAllMocks();
  });

  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email')
  });

  it('renders with basic props', () => {
    renderWithWrapper(
      <EnhancedForm>
        <input name="test" />
      </EnhancedForm>
    );

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('noValidate');
    expect(form).toHaveClass('space-y-6');
  });

  it('renders title as screen reader heading', () => {
    renderWithWrapper(
      <EnhancedForm title="Test Form">
        <input name="test" />
      </EnhancedForm>
    );

    const title = screen.getByText('Test Form');
    expect(title).toHaveClass('sr-only');
    expect(title.tagName).toBe('H2');
  });

  it('includes live region for announcements', () => {
    renderWithWrapper(
      <EnhancedForm>
        <input name="test" />
      </EnhancedForm>
    );

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('sr-only');
  });

  describe('Validation', () => {
    it('validates form data with schema on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onValidationError = vi.fn();

      renderWithWrapper(
        <EnhancedForm
          schema={testSchema}
          onSubmit={onSubmit}
          onValidationError={onValidationError}
        >
          <input name="name" defaultValue="" />
          <input name="email" defaultValue="invalid-email" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('calls onSubmit with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithWrapper(
        <EnhancedForm
          schema={testSchema}
          onSubmit={onSubmit}
        >
          <input name="name" defaultValue="John Doe" />
          <input name="email" defaultValue="john@example.com" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com'
        });
      });
    });

    it('shows error summary when validation fails', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <EnhancedForm schema={testSchema}>
          <input name="name" defaultValue="" />
          <input name="email" defaultValue="invalid" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/please correct the following errors/i)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('focuses first error field', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <EnhancedForm schema={testSchema}>
          <input name="name" defaultValue="" />
          <input name="email" defaultValue="invalid" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('');
        expect(nameInput).toHaveFocus();
      });
    });
  });

  describe('Submission States', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithWrapper(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByText('Submitting...').parentElement).toHaveAttribute('aria-live', 'polite');
    });

    it('disables submit button during submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithWrapper(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-label', 'Submitting form, please wait');
    });
  });

  describe('Error Recovery', () => {
    it('attempts recovery on validation errors', async () => {
      const user = userEvent.setup();
      const mockRecovery = vi.fn().mockResolvedValue({ success: true });

      vi.mocked(require('../recovery').attemptUIRecovery).mockImplementation(mockRecovery);

      renderWithWrapper(
        <EnhancedForm schema={testSchema}>
          <input name="name" defaultValue="" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(mockRecovery).toHaveBeenCalledWith('enhanced-form', expect.any(Object), 0);
    });

    it('retries on recovery failure', async () => {
      const user = userEvent.setup();
      const mockRecovery = vi.fn()
        .mockResolvedValueOnce({ success: false, shouldRetry: true })
        .mockResolvedValueOnce({ success: true });

      vi.mocked(require('../recovery').attemptUIRecovery).mockImplementation(mockRecovery);

      renderWithWrapper(
        <EnhancedForm schema={testSchema}>
          <input name="name" defaultValue="" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(mockRecovery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithWrapper(
        <EnhancedForm title="Test Form">
          <input name="test" />
        </EnhancedForm>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-labelledby');
      expect(form).toHaveAttribute('role', 'form');
    });

    it('announces status changes via live region', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

      renderWithWrapper(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('Form is being submitted');
    });

    it('provides error summary navigation', async () => {
      const user = userEvent.setup();

      renderWithWrapper(
        <EnhancedForm schema={testSchema}>
          <input name="name" defaultValue="" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        const errorButton = screen.getByRole('button', { name: /focus on name field/i });
        expect(errorButton).toBeInTheDocument();
      });
    });
  });

  describe('Configuration', () => {
    it('respects validation config', () => {
      renderWithWrapper(
        <EnhancedForm
          config={{
            validateOnSubmit: false,
            showErrorSummary: false
          }}
        >
          <input name="test" />
        </EnhancedForm>
      );

      // Should not show error summary by default
      expect(screen.queryByText(/please correct/i)).not.toBeInTheDocument();
    });

    it('handles invalid config gracefully', () => {
      renderWithWrapper(
        <EnhancedForm config={{ invalidProp: true } as any}>
          <input name="test" />
        </EnhancedForm>
      );

      // Should use default config
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('integrates with react-hook-form for complex form scenarios', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const ComplexForm = () => {
        const form = useForm({
          defaultValues: {
            personal: { name: '', email: '' },
            preferences: { newsletter: false, theme: 'light' }
          }
        });

        return (
          <Form {...form}>
            <FormField name="personal.name">
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <input {...form.register('personal.name')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="personal.email">
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <input type="email" {...form.register('personal.email')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="preferences.newsletter">
              <FormItem>
                <FormControl>
                  <input type="checkbox" {...form.register('preferences.newsletter')} />
                </FormControl>
                <FormLabel>Subscribe to newsletter</FormLabel>
              </FormItem>
            </FormField>

            <button type="submit" onClick={form.handleSubmit(onSubmit)}>
              Submit Complex Form
            </button>
          </Form>
        );
      };

      render(<ComplexForm />);

      // Fill out the form
      await user.type(screen.getByLabelText('Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.click(screen.getByLabelText('Subscribe to newsletter'));

      await user.click(screen.getByRole('button', { name: /submit complex form/i }));

      expect(onSubmit).toHaveBeenCalledWith({
        personal: { name: 'John Doe', email: 'john@example.com' },
        preferences: { newsletter: true, theme: 'light' }
      });
    });

    it('handles form validation with cross-field dependencies', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const DependentForm = () => {
        const form = useForm({
          defaultValues: { password: '', confirmPassword: '' }
        });

        return (
          <Form {...form}>
            <FormField name="password">
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <input type="password" {...form.register('password')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="confirmPassword">
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <input
                    type="password"
                    {...form.register('confirmPassword', {
                      validate: (value) => {
                        const password = form.getValues('password');
                        return value === password || 'Passwords do not match';
                      }
                    })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <button type="submit" onClick={form.handleSubmit(onSubmit)}>
              Create Account
            </button>
          </Form>
        );
      };

      render(<DependentForm />);

      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      // Fix the confirmation
      await user.clear(screen.getByLabelText('Confirm Password'));
      await user.type(screen.getByLabelText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(onSubmit).toHaveBeenCalledWith({
        password: 'password123',
        confirmPassword: 'password123'
      });
    });

    it('integrates with external validation libraries', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const ZodValidatedForm = () => {
        const schema = z.object({
          username: z.string().min(3, 'Username must be at least 3 characters'),
          age: z.number().min(18, 'Must be 18 or older'),
        });

        return (
          <EnhancedForm
            schema={schema}
            onSubmit={onSubmit}
          >
            <input name="username" defaultValue="jo" />
            <input name="age" type="number" defaultValue="16" />
            <button type="submit">Submit</button>
          </EnhancedForm>
        );
      };

      renderWithWrapper(<ZodValidatedForm />);

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/please correct the following errors/i)).toBeInTheDocument();
        expect(screen.getByText(/username.*at least 3 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/must be 18 or older/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('handles async form validation and submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const onValidationError = vi.fn();

      const AsyncValidatedForm = () => {
        const asyncValidate = async (value: string) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 50));
          if (value === 'taken') {
            throw new Error('Username already taken');
          }
          return true;
        };

        return (
          <EnhancedForm
            schema={z.object({
              username: z.string().refine(asyncValidate)
            })}
            onSubmit={onSubmit}
            onValidationError={onValidationError}
          >
            <input name="username" defaultValue="available" />
            <button type="submit">Register</button>
          </EnhancedForm>
        );
      };

      renderWithWrapper(<AsyncValidatedForm />);

      await user.click(screen.getByRole('button', { name: /register/i }));

      // Should show loading state
      expect(screen.getByText('Submitting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ username: 'available' });
      });

      expect(onValidationError).not.toHaveBeenCalled();
    });

    it('maintains form state across component re-renders', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const StatefulForm = () => {
        const [counter, setCounter] = React.useState(0);

        return (
          <div>
            <button onClick={() => setCounter(c => c + 1)}>Increment: {counter}</button>
            <EnhancedForm onSubmit={onSubmit}>
              <input name="field1" defaultValue="value1" />
              <input name="field2" defaultValue="value2" />
              <button type="submit">Submit</button>
            </EnhancedForm>
          </div>
        );
      };

      renderWithWrapper(<StatefulForm />);

      // Change form values
      await user.clear(screen.getByDisplayValue('value1'));
      await user.type(screen.getByDisplayValue(''), 'updated1');

      // Trigger re-render
      await user.click(screen.getByText('Increment: 0'));

      // Form values should persist
      expect(screen.getByDisplayValue('updated1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('value2')).toBeInTheDocument();

      // Submit should work
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(onSubmit).toHaveBeenCalledWith({
        field1: 'updated1',
        field2: 'value2'
      });
    });

    it('handles form reset and recovery scenarios', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const ResettableForm = () => {
        const [resetKey, setResetKey] = React.useState(0);

        return (
          <div>
            <button onClick={() => setResetKey(k => k + 1)}>Reset Form</button>
            <EnhancedForm key={resetKey} onSubmit={onSubmit}>
              <input name="field" defaultValue="initial" />
              <button type="submit">Submit</button>
            </EnhancedForm>
          </div>
        );
      };

      renderWithWrapper(<ResettableForm />);

      // Modify form
      await user.clear(screen.getByDisplayValue('initial'));
      await user.type(screen.getByDisplayValue(''), 'modified');

      // Reset form
      await user.click(screen.getByText('Reset Form'));

      // Form should be reset
      expect(screen.getByDisplayValue('initial')).toBeInTheDocument();

      // Submit with reset value
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(onSubmit).toHaveBeenCalledWith({ field: 'initial' });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing schema', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithWrapper(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(onSubmit).toHaveBeenCalled();
    });

    it('handles submit button prop', () => {
      renderWithWrapper(
        <EnhancedForm submitButton={<button type="submit">Custom Submit</button>}>
          <input name="test" />
        </EnhancedForm>
      );

      expect(screen.getByRole('button', { name: /custom submit/i })).toBeInTheDocument();
    });

    it('handles complex children', () => {
      renderWithWrapper(
        <EnhancedForm>
          <div>
            <input name="test" />
            <span>Nested content</span>
          </div>
        </EnhancedForm>
      );

      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });

    it('prevents default form submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithWrapper(
        <EnhancedForm onSubmit={onSubmit}>
          <input name="test" defaultValue="value" />
          <button type="submit">Submit</button>
        </EnhancedForm>
      );

      const form = screen.getByRole('form');
      const preventDefaultSpy = vi.fn();
      form.addEventListener('submit', (e) => {
        e.preventDefault = preventDefaultSpy;
      });

      await user.click(screen.getByRole('button', { name: /submit/i }));

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});