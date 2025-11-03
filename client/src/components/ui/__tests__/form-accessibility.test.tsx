import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Tests for form accessibility components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  ScreenReaderAnnouncement,
  AccessibleFieldset,
  FormSkipLink,
  AccessibleErrorSummary,
  RequiredFieldIndicator,
  AccessibleForm,
  useFormKeyboardNavigation
} from '../form-accessibility';

describe('ScreenReaderAnnouncement', () => {
  it('renders with polite priority by default', () => {
    render(
      <ScreenReaderAnnouncement message="Test announcement" />
    );
    
    const announcement = screen.getByText('Test announcement');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveAttribute('role', 'status');
  });

  it('renders with assertive priority', () => {
    render(
      <ScreenReaderAnnouncement 
        message="Urgent announcement" 
        priority="assertive" 
      />
    );
    
    const announcement = screen.getByText('Urgent announcement');
    expect(announcement).toHaveAttribute('aria-live', 'assertive');
    expect(announcement).toHaveAttribute('role', 'alert');
  });

  it('has screen reader only class', () => {
    render(
      <ScreenReaderAnnouncement message="Hidden announcement" />
    );
    
    const announcement = screen.getByText('Hidden announcement');
    expect(announcement).toHaveClass('sr-only');
  });
});

describe('AccessibleFieldset', () => {
  it('renders fieldset with legend', () => {
    render(
      <AccessibleFieldset legend="Contact Information">
        <input type="email" />
      </AccessibleFieldset>
    );
    
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <AccessibleFieldset legend="Required Fieldset" required>
        <input type="text" />
      </AccessibleFieldset>
    );
    
    expect(screen.getByLabelText('required')).toBeInTheDocument();
  });

  it('includes description when provided', () => {
    render(
      <AccessibleFieldset 
        legend="Personal Info" 
        description="Please provide your personal details"
      >
        <input type="text" />
      </AccessibleFieldset>
    );
    
    expect(screen.getByText('Please provide your personal details')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(
      <AccessibleFieldset 
        legend="Test Fieldset" 
        description="Test description"
      >
        <input type="text" />
      </AccessibleFieldset>
    );
    
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby');
    expect(group).toHaveAttribute('aria-describedby');
  });
});

describe('FormSkipLink', () => {
  it('renders skip link with proper href', () => {
    render(
      <FormSkipLink targetId="main-content">
        Skip to main content
      </FormSkipLink>
    );
    
    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has screen reader only class by default', () => {
    render(
      <FormSkipLink targetId="content">
        Skip link
      </FormSkipLink>
    );
    
    const link = screen.getByText('Skip link');
    expect(link).toHaveClass('sr-only');
  });

  it('becomes visible on focus', () => {
    render(
      <FormSkipLink targetId="content">
        Skip link
      </FormSkipLink>
    );
    
    const link = screen.getByText('Skip link');
    expect(link).toHaveClass('focus:not-sr-only');
  });
});

describe('AccessibleErrorSummary', () => {
  const mockErrors = [
    { field: 'email', message: 'Email is required', fieldId: 'email-input' },
    { field: 'password', message: 'Password is too short' }
  ];

  it('renders error summary with title', () => {
    render(
      <AccessibleErrorSummary errors={mockErrors} />
    );
    
    expect(screen.getByText(/Form contains errors \(2 errors\)/)).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is too short')).toBeInTheDocument();
  });

  it('does not render when no errors', () => {
    const { container } = render(
      <AccessibleErrorSummary errors={[]} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('has proper ARIA attributes', () => {
    render(
      <AccessibleErrorSummary errors={mockErrors} />
    );
    
    const summary = screen.getByRole('alert');
    expect(summary).toHaveAttribute('aria-labelledby', 'error-summary-title');
    expect(summary).toHaveAttribute('tabIndex', '-1');
  });

  it('focuses error fields when clicked', async () => {
    const user = userEvent.setup();
    
    // Create a mock field element
    const mockField = document.createElement('input');
    mockField.id = 'email-input';
    mockField.focus = vi.fn();
    mockField.scrollIntoView = vi.fn();
    document.body.appendChild(mockField);
    
    render(
      <AccessibleErrorSummary errors={mockErrors} />
    );
    
    const errorButton = screen.getByText('Email is required');
    await users.click(errorButton);
    
    expect(mockField.focus).toHaveBeenCalled();
    expect(mockField.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });
    
    document.body.removeChild(mockField);
  });

  it('uses custom title when provided', () => {
    render(
      <AccessibleErrorSummary 
        errors={mockErrors} 
        title="Validation Errors Found"
      />
    );
    
    expect(screen.getByText(/Validation Errors Found \(2 errors\)/)).toBeInTheDocument();
  });
});

describe('RequiredFieldIndicator', () => {
  it('renders required field explanation', () => {
    render(<RequiredFieldIndicator />);
    
    expect(screen.getByText('indicates required fields')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<RequiredFieldIndicator className="custom-class" />);
    
    const indicator = screen.getByText('indicates required fields').parentElement;
    expect(indicator).toHaveClass('custom-class');
  });
});

describe('AccessibleForm', () => {
  it('renders form with title and description', () => {
    render(
      <AccessibleForm 
        title="Registration Form"
        description="Please fill out all required fields"
      >
        <input type="text" />
      </AccessibleForm>
    );
    
    expect(screen.getByText('Registration Form')).toBeInTheDocument();
    expect(screen.getByText('Please fill out all required fields')).toBeInTheDocument();
  });

  it('shows skip link', () => {
    render(
      <AccessibleForm id="test-form">
        <input type="text" />
      </AccessibleForm>
    );
    
    expect(screen.getByText('Skip to form content')).toBeInTheDocument();
  });

  it('shows required field indicator by default', () => {
    render(
      <AccessibleForm>
        <input type="text" />
      </AccessibleForm>
    );
    
    expect(screen.getByText('indicates required fields')).toBeInTheDocument();
  });

  it('hides required field indicator when disabled', () => {
    render(
      <AccessibleForm showRequiredIndicator={false}>
        <input type="text" />
      </AccessibleForm>
    );
    
    expect(screen.queryByText('indicates required fields')).not.toBeInTheDocument();
  });

  it('displays error summary when errors provided', () => {
    const errors = [
      { field: 'email', message: 'Email is required' }
    ];
    
    render(
      <AccessibleForm errors={errors}>
        <input type="text" />
      </AccessibleForm>
    );
    
    expect(screen.getByText(/Form contains errors/)).toBeInTheDocument();
  });

  it('has proper form attributes', () => {
    render(
      <AccessibleForm id="accessible-form">
        <input type="text" />
      </AccessibleForm>
    );
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('noValidate');
    expect(form).toHaveClass('space-y-6');
  });
});

// Test keyboard navigation hook
describe('useFormKeyboardNavigation', () => {
  const TestComponent: React.FC = () => {
    const formRef = React.useRef<HTMLFormElement>(null);
    useFormKeyboardNavigation(formRef);
    
    return (
      <form ref={formRef}>
        <input data-testid="input1" />
        <select data-testid="select1">
          <option value="1">Option 1</option>
        </select>
        <textarea data-testid="textarea1" />
        <button data-testid="button1">Submit</button>
      </form>
    );
  };

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent />);
    
    const input1 = screen.getByTestId('input1');
    const select1 = screen.getByTestId('select1');
    
    // Focus first element
    input1.focus();
    expect(input1).toHaveFocus();
    
    // Press arrow down to move to next element
    await users.keyboard('{ArrowDown}');
    expect(select1).toHaveFocus();
  });

  it('handles Home and End keys with Ctrl', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent />);
    
    const input1 = screen.getByTestId('input1');
    const button1 = screen.getByTestId('button1');
    const textarea1 = screen.getByTestId('textarea1');
    
    // Focus middle element
    textarea1.focus();
    expect(textarea1).toHaveFocus();
    
    // Press Ctrl+Home to go to first element
    await users.keyboard('{Control>}{Home}{/Control}');
    expect(input1).toHaveFocus();
    
    // Press Ctrl+End to go to last element
    await users.keyboard('{Control>}{End}{/Control}');
    expect(button1).toHaveFocus();
  });

  it('wraps around when reaching end of form', async () => {
    const user = userEvent.setup();
    
    render(<TestComponent />);
    
    const input1 = screen.getByTestId('input1');
    const button1 = screen.getByTestId('button1');
    
    // Focus last element
    button1.focus();
    expect(button1).toHaveFocus();
    
    // Press arrow down to wrap to first element
    await users.keyboard('{ArrowDown}');
    expect(input1).toHaveFocus();
  });
});

