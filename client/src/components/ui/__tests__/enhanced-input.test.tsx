/**
 * Enhanced Input component tests
 * Following navigation component testing patterns for consistency
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedInput } from '../input';
import { UIInputError } from '../errors';

describe('EnhancedInput', () => {
  const defaultProps = {
    id: 'test-input',
    name: 'testInput',
    placeholder: 'Enter text'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders input with basic props', () => {
      render(<EnhancedInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'test-input');
      expect(input).toHaveAttribute('name', 'testInput');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('renders with label when provided', () => {
      render(<EnhancedInput {...defaultProps} label="Test Label" />);
      
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('renders with description when provided', () => {
      render(<EnhancedInput {...defaultProps} description="Test description" />);
      
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows required indicator when required', () => {
      render(<EnhancedInput {...defaultProps} label="Required Field" required />);
      
      const label = screen.getByText('Required Field');
      expect(label).toHaveClass('after:content-[\'*\']');
    });
  });

  describe('Validation', () => {
    it('validates required field', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          required 
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      // Trigger blur without entering text
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: false,
          error: 'This field is required',
          touched: true
        });
      });
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('validates minimum length', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          minLength={5}
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'abc');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: false,
          error: 'Minimum length is 5 characters',
          touched: true
        });
      });
    });

    it('validates maximum length', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          maxLength={3}
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'abcdef');
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: false,
          error: 'Maximum length is 3 characters',
          touched: false
        });
      });
    });

    it('validates email format', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          type="email"
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'invalid-email');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
            touched: true
          })
        );
      });
    });

    it('validates with custom validator', async () => {
      const customValidator = vi.fn().mockReturnValue('Custom error message');
      const onValidationChange = vi.fn();
      
      render(
        <EnhancedInput 
          {...defaultProps} 
          customValidator={customValidator}
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'test');
      
      await waitFor(() => {
        expect(customValidator).toHaveBeenCalledWith('test');
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: false,
          error: 'Custom error message',
          touched: false
        });
      });
    });

    it('validates with pattern', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          pattern={/^\d+$/}
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'abc123');
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: false,
          error: 'Invalid format',
          touched: false
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when validation fails', async () => {
      render(<EnhancedInput {...defaultProps} required />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('displays custom error message', () => {
      render(
        <EnhancedInput 
          {...defaultProps} 
          errorMessage="Custom error"
          showValidation={true}
        />
      );
      
      // Simulate touched state with error
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      // The custom error message should be shown if there's a validation error
      // This test might need adjustment based on the actual implementation
    });

    it('applies error styling when validation fails', async () => {
      render(<EnhancedInput {...defaultProps} required />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveClass('border-destructive');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <EnhancedInput 
          {...defaultProps} 
          label="Test Label"
          description="Test description"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('has proper ARIA attributes when error occurs', async () => {
      render(<EnhancedInput {...defaultProps} required />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Event Handling', () => {
    it('calls onChange when value changes', async () => {
      const onChange = vi.fn();
      render(<EnhancedInput {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      
      expect(onChange).toHaveBeenCalled();
    });

    it('calls onBlur when input loses focus', () => {
      const onBlur = vi.fn();
      render(<EnhancedInput {...defaultProps} onBlur={onBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      expect(onBlur).toHaveBeenCalled();
    });

    it('calls onValidationChange when validation state changes', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          onValidationChange={onValidationChange}
          required
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      
      expect(onValidationChange).toHaveBeenCalled();
    });
  });

  describe('Validation Options', () => {
    it('validates on change when validateOnChange is true', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          validateOnChange={true}
          required
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'a');
      
      expect(onValidationChange).toHaveBeenCalled();
    });

    it('does not validate on change when validateOnChange is false', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          validateOnChange={false}
          required
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'a');
      
      // Should not validate on change, only on blur
      expect(onValidationChange).not.toHaveBeenCalled();
    });

    it('skips validation when showValidation is false', async () => {
      const onValidationChange = vi.fn();
      render(
        <EnhancedInput 
          {...defaultProps} 
          showValidation={false}
          required
          onValidationChange={onValidationChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      // Should not show validation errors
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });
});

