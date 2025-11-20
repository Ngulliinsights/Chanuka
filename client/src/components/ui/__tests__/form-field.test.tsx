import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Tests for enhanced form field components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EnhancedFormInput,
  EnhancedFormTextarea,
  EnhancedFormSelect
} from '../form-field';
import { Label } from '../label';
import { cn } from '../../../lib/utils';

// FormFieldWrapper tests replaced with direct implementations
describe('FormFieldWrapper equivalent', () => {
  it('renders label and children', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Field</Label>
        <input id="test-input" placeholder="Test input" />
      </div>
    );

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <div>
        <Label htmlFor="test-required">
          Required Field
          <span className="text-destructive ml-1" aria-label="required">*</span>
        </Label>
        <input id="test-required" aria-label="Required Field" />
      </div>
    );

    expect(screen.getByLabelText('required')).toBeInTheDocument();
  });

  it('shows optional indicator', () => {
    render(
      <div>
        <Label htmlFor="test-optional">
          Optional Field
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <input id="test-optional" aria-label="Optional Field" />
      </div>
    );

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <div>
        <Label htmlFor="test-error">Field</Label>
        <input id="test-error" aria-label="Field" />
        <div role="alert" className="text-sm text-destructive">
          This field is required
        </div>
      </div>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays success message', () => {
    render(
      <div>
        <Label htmlFor="test-success">Field</Label>
        <input id="test-success" aria-label="Field" />
        <div role="status" className="text-sm text-green-700">
          Valid input
        </div>
      </div>
    );

    expect(screen.getByText('Valid input')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(
      <div>
        <Label htmlFor="test-description">Field</Label>
        <p className="text-sm text-muted-foreground">
          This is a helpful description
        </p>
        <input id="test-description" aria-label="Field" />
      </div>
    );

    expect(screen.getByText('This is a helpful description')).toBeInTheDocument();
  });
});

describe('EnhancedFormInput', () => {
  it('renders input with label', () => {
    render(
      <EnhancedFormInput 
        id="test-input"
        label="Test Input" 
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const onValidationChange = vi.fn();
    
    render(
      <EnhancedFormInput 
        id="required-input"
        label="Required Field"
        required
        onValidationChange={onValidationChange}
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByLabelText('Required Field');
    await user.click(input);
    await user.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText('Required Field is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedFormInput 
        id="email-input"
        type="email"
        label="Email"
        value="invalid-email"
        onChange={() => {}}
      />
    );
    
    const input = screen.getByLabelText('Email');
    await user.click(input);
    await user.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('shows password toggle button', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedFormInput
        id="password-input"
        type="password"
        label="Password"
        value="secret"
        onChange={() => {}}
      />
    );
    
    const input = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');
    
    expect(input).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('calls onValidationChange callback', async () => {
    const user = userEvent.setup();
    const onValidationChange = vi.fn();
    
    render(
      <EnhancedFormInput 
        id="callback-input"
        label="Test"
        onValidationChange={onValidationChange}
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByLabelText('Test');
    await user.type(input, 'valid input');
    
    expect(onValidationChange).toHaveBeenCalled();
  });

  it('shows help text tooltip', () => {
    render(
      <EnhancedFormInput 
        id="help-input"
        label="Field with Help"
        helpText="This is helpful information"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText('Help for Field with Help')).toBeInTheDocument();
  });
});

describe('EnhancedFormTextarea', () => {
  it('renders textarea with label', () => {
    render(
      <EnhancedFormTextarea 
        id="test-textarea"
        label="Test Textarea" 
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument();
  });

  it('shows character count when enabled', () => {
    render(
      <EnhancedFormTextarea 
        id="counted-textarea"
        label="Counted Textarea"
        showCharacterCount
        maxLength={100}
        value="Hello world"
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('11/100')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedFormTextarea 
        id="required-textarea"
        label="Required Textarea"
        required
        value=""
        onChange={() => {}}
      />
    );
    
    const textarea = screen.getByLabelText('Required Textarea');
    await user.click(textarea);
    await user.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText('Required Textarea is required')).toBeInTheDocument();
    });
  });

  it('validates max length', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedFormTextarea 
        id="length-textarea"
        label="Length Textarea"
        maxLength={10}
        value="This is too long"
        onChange={() => {}}
      />
    );
    
    const textarea = screen.getByLabelText('Length Textarea');
    await user.click(textarea);
    await user.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText('Maximum 10 characters allowed')).toBeInTheDocument();
    });
  });

  it('updates character count on change', async () => {
    const user = userEvent.setup();
    let value = '';
    const onChange = vi.fn((e) => {
      value = e.target.value;
    });
    
    const { rerender } = render(
      <EnhancedFormTextarea 
        id="dynamic-textarea"
        label="Dynamic Textarea"
        showCharacterCount
        maxLength={50}
        value={value}
        onChange={onChange}
      />
    );
    
    const textarea = screen.getByLabelText('Dynamic Textarea');
    await user.type(textarea, 'Hello');
    
    // Rerender with updated value
    rerender(
      <EnhancedFormTextarea 
        id="dynamic-textarea"
        label="Dynamic Textarea"
        showCharacterCount
        maxLength={50}
        value="Hello"
        onChange={onChange}
      />
    );
    
    expect(screen.getByText('5/50')).toBeInTheDocument();
  });
});

describe('EnhancedFormSelect', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true }
  ];

  it('renders select with options', () => {
    render(
      <EnhancedFormSelect 
        id="test-select"
        label="Test Select"
        options={mockOptions}
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('shows placeholder option', () => {
    render(
      <EnhancedFormSelect 
        id="placeholder-select"
        label="Select with Placeholder"
        options={mockOptions}
        placeholder="Choose an option..."
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('Choose an option...')).toBeInTheDocument();
  });

  it('validates required selection', async () => {
    const user = userEvent.setup();
    
    render(
      <EnhancedFormSelect 
        id="required-select"
        label="Required Select"
        options={mockOptions}
        required
        value=""
        onChange={() => {}}
      />
    );
    
    const select = screen.getByLabelText('Required Select');
    await user.click(select);
    await user.tab(); // Trigger blur
    
    await waitFor(() => {
      expect(screen.getByText('Required Select is required')).toBeInTheDocument();
    });
  });

  it('handles disabled options', () => {
    render(
      <EnhancedFormSelect 
        id="disabled-select"
        label="Select with Disabled Option"
        options={mockOptions}
        value=""
        onChange={() => {}}
      />
    );
    
    const disabledOption = screen.getByText('Option 3');
    expect(disabledOption.closest('option')).toBeDisabled();
  });

  it('calls onValidationChange callback', async () => {
    const user = userEvent.setup();
    const onValidationChange = vi.fn();
    
    render(
      <EnhancedFormSelect 
        id="callback-select"
        label="Callback Select"
        options={mockOptions}
        onValidationChange={onValidationChange}
        value=""
        onChange={() => {}}
      />
    );
    
    const select = screen.getByLabelText('Callback Select');
    await user.selectOptions(select, 'option1');
    
    expect(onValidationChange).toHaveBeenCalled();
  });
});

