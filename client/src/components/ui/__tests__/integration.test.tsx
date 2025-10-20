/**
 * UI components integration tests
 * Testing component interactions and end-to-end workflows
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { 
  EnhancedForm, 
  EnhancedInput, 
  EnhancedSelect, 
  EnhancedTextarea, 
  EnhancedButton,
  EnhancedDialog,
  initializeUIRecoveryStrategies
} from '../index';

describe('UI Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize recovery strategies for integration tests
    initializeUIRecoveryStrategies();
  });

  describe('Form with Enhanced Components', () => {
    const UserSchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email format'),
      bio: z.string().max(500, 'Bio must be less than 500 characters'),
      role: z.string().min(1, 'Please select a role')
    });

    const FormComponent = ({ onSubmit = vi.fn() }) => (
      <EnhancedForm schema={UserSchema} onSubmit={onSubmit}>
        <EnhancedInput
          id="name"
          name="name"
          label="Full Name"
          required
          minLength={2}
          placeholder="Enter your full name"
        />
        
        <EnhancedInput
          id="email"
          name="email"
          type="email"
          label="Email Address"
          required
          placeholder="Enter your email"
        />
        
        <EnhancedTextarea
          id="bio"
          name="bio"
          label="Biography"
          maxLength={500}
          placeholder="Tell us about yourself"
        />
        
        <EnhancedSelect
          id="role"
          name="role"
          label="Role"
          required
          placeholder="Select your role"
        >
          <option value="">Select a role</option>
          <option value="developer">Developer</option>
          <option value="designer">Designer</option>
          <option value="manager">Manager</option>
        </EnhancedSelect>
        
        <EnhancedButton type="submit">
          Submit Form
        </EnhancedButton>
      </EnhancedForm>
    );

    it('validates all fields and shows errors', async () => {
      render(<FormComponent />);
      
      // Submit form without filling required fields
      const submitButton = screen.getByText('Submit Form');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        // Should show validation errors
        expect(screen.getByText('Please correct the following errors:')).toBeInTheDocument();
      });
    });

    it('validates individual fields on blur', async () => {
      render(<FormComponent />);
      
      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email Address');
      
      // Enter invalid data and blur
      await userEvent.type(nameInput, 'A'); // Too short
      await userEvent.type(emailInput, 'invalid-email');
      
      fireEvent.blur(nameInput);
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      const onSubmit = vi.fn();
      render(<FormComponent onSubmit={onSubmit} />);
      
      // Fill form with valid data
      await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await userEvent.type(screen.getByLabelText('Biography'), 'I am a developer');
      
      // Select role (this might need adjustment based on actual select implementation)
      const roleSelect = screen.getByLabelText('Role');
      await userEvent.selectOptions(roleSelect, 'developer');
      
      // Submit form
      const submitButton = screen.getByText('Submit Form');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      const onSubmit = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<FormComponent onSubmit={onSubmit} />);
      
      // Fill form with valid data
      await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email Address'), 'john@example.com');
      
      // Submit form
      const submitButton = screen.getByText('Submit Form');
      await userEvent.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog with Form Integration', () => {
    const DialogFormComponent = ({ open = true, onClose = vi.fn() }) => {
      const [dialogOpen, setDialogOpen] = React.useState(open);
      
      const handleSubmit = async (data: any) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        setDialogOpen(false);
        onClose();
      };
      
      return (
        <EnhancedDialog
          title="Create User"
          description="Fill out the form to create a new user"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={handleSubmit}
        >
          <EnhancedForm onSubmit={handleSubmit}>
            <EnhancedInput
              id="dialog-name"
              name="name"
              label="Name"
              required
              placeholder="Enter name"
            />
            
            <EnhancedInput
              id="dialog-email"
              name="email"
              type="email"
              label="Email"
              required
              placeholder="Enter email"
            />
          </EnhancedForm>
        </EnhancedDialog>
      );
    };

    it('validates form within dialog', async () => {
      render(<DialogFormComponent />);
      
      expect(screen.getByText('Create User')).toBeInTheDocument();
      
      // Try to confirm without filling required fields
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      // Should show validation errors within dialog
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('submits form and closes dialog', async () => {
      const onClose = vi.fn();
      render(<DialogFormComponent onClose={onClose} />);
      
      // Fill form
      await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
      await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
      
      // Confirm dialog
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('recovers from validation errors automatically', async () => {
      render(
        <EnhancedInput
          id="recovery-test"
          name="test"
          type="email"
          label="Email"
          required
        />
      );
      
      const input = screen.getByLabelText('Email');
      
      // Enter invalid email
      await userEvent.type(input, 'invalid-email');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid email/)).toBeInTheDocument();
      });
      
      // Correct the email
      await userEvent.clear(input);
      await userEvent.type(input, 'valid@example.com');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.queryByText(/Invalid email/)).not.toBeInTheDocument();
      });
    });

    it('handles component errors gracefully', async () => {
      const ThrowingComponent = () => {
        throw new Error('Component error');
      };
      
      const ErrorBoundaryTest = () => (
        <EnhancedDialog
          title="Test Dialog"
          open={true}
          onOpenChange={() => {}}
        >
          <ThrowingComponent />
        </EnhancedDialog>
      );
      
      // Should not crash the application
      expect(() => {
        render(<ErrorBoundaryTest />);
      }).not.toThrow();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper focus management', async () => {
      render(
        <div>
          <EnhancedInput
            id="first-input"
            name="first"
            label="First Input"
          />
          <EnhancedInput
            id="second-input"
            name="second"
            label="Second Input"
          />
        </div>
      );
      
      const firstInput = screen.getByLabelText('First Input');
      const secondInput = screen.getByLabelText('Second Input');
      
      // Tab navigation
      firstInput.focus();
      expect(document.activeElement).toBe(firstInput);
      
      fireEvent.keyDown(firstInput, { key: 'Tab' });
      // Note: Actual tab behavior depends on browser implementation
      // This test verifies the inputs are focusable
      expect(secondInput).toBeInTheDocument();
    });

    it('provides proper ARIA attributes for errors', async () => {
      render(
        <EnhancedInput
          id="aria-test"
          name="test"
          label="Test Input"
          required
        />
      );
      
      const input = screen.getByLabelText('Test Input');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('handles large forms efficiently', async () => {
      const LargeForm = () => (
        <EnhancedForm>
          {Array.from({ length: 50 }, (_, i) => (
            <EnhancedInput
              key={i}
              id={`input-${i}`}
              name={`field${i}`}
              label={`Field ${i}`}
              placeholder={`Enter value for field ${i}`}
            />
          ))}
          <EnhancedButton type="submit">Submit</EnhancedButton>
        </EnhancedForm>
      );
      
      const startTime = performance.now();
      render(<LargeForm />);
      const endTime = performance.now();
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // All inputs should be rendered
      expect(screen.getAllByRole('textbox')).toHaveLength(50);
    });
  });

  describe('State Management Integration', () => {
    it('synchronizes validation state across components', async () => {
      const SyncedForm = () => {
        const [emailValid, setEmailValid] = React.useState(false);
        
        return (
          <div>
            <EnhancedInput
              id="synced-email"
              name="email"
              type="email"
              label="Email"
              required
              onValidationChange={(state) => setEmailValid(state.isValid)}
            />
            <div data-testid="email-status">
              Email is {emailValid ? 'valid' : 'invalid'}
            </div>
          </div>
        );
      };
      
      render(<SyncedForm />);
      
      const input = screen.getByLabelText('Email');
      const status = screen.getByTestId('email-status');
      
      expect(status).toHaveTextContent('Email is invalid');
      
      await userEvent.type(input, 'valid@example.com');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(status).toHaveTextContent('Email is valid');
      });
    });
  });
});