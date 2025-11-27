import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Tests for enhanced form layout components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  FormSection, 
  FormStepIndicator, 
  FormFieldGroup, 
  FormValidationSummary,
  FormSuccessIndicator,
  FormHelpText 
} from '@client/form-layout';

describe('FormSection', () => {
  it('renders with title and children', () => {
    render(
      <FormSection title="Test Section">
        <div>Section content</div>
      </FormSection>
    );
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormSection title="Required Section" required>
        <div>Content</div>
      </FormSection>
    );
    
    expect(screen.getByLabelText('required')).toBeInTheDocument();
  });

  it('shows error state styling', () => {
    render(
      <FormSection title="Error Section" error>
        <div>Content</div>
      </FormSection>
    );
    
    const section = screen.getByText('Error Section').closest('div');
    expect(section).toHaveClass('border-destructive');
  });

  it('shows completed state styling', () => {
    render(
      <FormSection title="Completed Section" completed>
        <div>Content</div>
      </FormSection>
    );
    
    expect(screen.getByLabelText('Section completed')).toBeInTheDocument();
  });

  it('handles collapsible functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <FormSection title="Collapsible Section" collapsible defaultOpen={false}>
        <div>Hidden content</div>
      </FormSection>
    );
    
    // Content should be hidden initially
    expect(screen.queryByText('Hidden content')).not.toBeVisible();
    
    // Click expand button
    const expandButton = screen.getByRole('button');
    await users.click(expandButton);
    
    // Content should now be visible
    expect(screen.getByText('Hidden content')).toBeVisible();
  });

  it('calls onToggle when collapsed/expanded', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    
    render(
      <FormSection title="Toggle Section" collapsible onToggle={onToggle}>
        <div>Content</div>
      </FormSection>
    );
    
    const toggleButton = screen.getByRole('button');
    await users.click(toggleButton);
    
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});

describe('FormStepIndicator', () => {
  const mockSteps = [
    { id: 'step1', title: 'Step 1', completed: true },
    { id: 'step2', title: 'Step 2', completed: false },
    { id: 'step3', title: 'Step 3', completed: false, error: true }
  ];

  it('renders all steps', () => {
    render(
      <FormStepIndicator 
        steps={mockSteps} 
        currentStep="step2" 
      />
    );
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    render(
      <FormStepIndicator 
        steps={mockSteps} 
        currentStep="step2" 
      />
    );
    
    const currentStepButton = screen.getByLabelText(/Step 2: Step 2/);
    expect(currentStepButton).toHaveClass('bg-primary');
  });

  it('shows completed steps', () => {
    render(
      <FormStepIndicator 
        steps={mockSteps} 
        currentStep="step2" 
      />
    );
    
    const completedStep = screen.getByLabelText(/Step 1: Step 1 \(completed\)/);
    expect(completedStep).toHaveClass('bg-green-600');
  });

  it('shows error steps', () => {
    render(
      <FormStepIndicator 
        steps={mockSteps} 
        currentStep="step2" 
      />
    );
    
    const errorStep = screen.getByLabelText(/Step 3: Step 3 \(has errors\)/);
    expect(errorStep).toHaveClass('bg-destructive');
  });

  it('calls onStepClick when step is clicked', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    
    render(
      <FormStepIndicator 
        steps={mockSteps} 
        currentStep="step2" 
        onStepClick={onStepClick}
      />
    );
    
    const step1Button = screen.getByLabelText(/Step 1: Step 1/);
    await users.click(step1Button);
    
    expect(onStepClick).toHaveBeenCalledWith('step1');
  });
});

describe('FormValidationSummary', () => {
  const mockErrors = [
    { field: 'email', message: 'Email is required', section: 'Personal' },
    { field: 'phone', message: 'Invalid phone format', section: 'Contact' }
  ];

  it('renders error list', () => {
    render(
      <FormValidationSummary errors={mockErrors} />
    );
    
    expect(screen.getByText(/Please correct the following 2 errors/)).toBeInTheDocument();
    expect(screen.getByText('Personal: Email is required')).toBeInTheDocument();
    expect(screen.getByText('Contact: Invalid phone format')).toBeInTheDocument();
  });

  it('does not render when no errors', () => {
    const { container } = render(
      <FormValidationSummary errors={[]} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('calls onErrorClick when error is clicked', async () => {
    const user = userEvent.setup();
    const onErrorClick = vi.fn();
    
    render(
      <FormValidationSummary 
        errors={mockErrors} 
        onErrorClick={onErrorClick}
      />
    );
    
    const errorButton = screen.getByText('Personal: Email is required');
    await users.click(errorButton);
    
    expect(onErrorClick).toHaveBeenCalledWith('email');
  });

  it('has proper ARIA attributes', () => {
    render(
      <FormValidationSummary errors={mockErrors} />
    );
    
    const summary = screen.getByRole('alert');
    expect(summary).toHaveAttribute('aria-labelledby', 'form-errors-heading');
  });
});

describe('FormSuccessIndicator', () => {
  it('renders success message', () => {
    render(
      <FormSuccessIndicator 
        message="Form submitted successfully!" 
        details="Thank you for your submission."
      />
    );
    
    expect(screen.getByText('Form submitted successfully!')).toBeInTheDocument();
    expect(screen.getByText('Thank you for your submission.')).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    const user = userEvent.setup();
    const mockAction = vi.fn();
    
    render(
      <FormSuccessIndicator 
        message="Success!"
        actions={[
          { label: 'Continue', onClick: mockAction }
        ]}
      />
    );
    
    const button = screen.getByText('Continue');
    await users.click(button);
    
    expect(mockAction).toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    render(
      <FormSuccessIndicator message="Success!" />
    );
    
    const indicator = screen.getByRole('alert');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });
});

describe('FormFieldGroup', () => {
  it('renders children with vertical layout by default', () => {
    render(
      <FormFieldGroup>
        <div>Field 1</div>
        <div>Field 2</div>
      </FormFieldGroup>
    );
    
    const group = screen.getByText('Field 1').parentElement;
    expect(group).toHaveClass('flex-col');
  });

  it('renders children with horizontal layout', () => {
    render(
      <FormFieldGroup orientation="horizontal">
        <div>Field 1</div>
        <div>Field 2</div>
      </FormFieldGroup>
    );
    
    const group = screen.getByText('Field 1').parentElement;
    expect(group).toHaveClass('flex-row');
  });

  it('applies correct spacing classes', () => {
    render(
      <FormFieldGroup spacing="lg">
        <div>Field 1</div>
        <div>Field 2</div>
      </FormFieldGroup>
    );
    
    const group = screen.getByText('Field 1').parentElement;
    expect(group).toHaveClass('space-y-6');
  });
});

describe('FormHelpText', () => {
  it('renders help text with info icon', () => {
    render(
      <FormHelpText>
        This is helpful information
      </FormHelpText>
    );
    
    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
    // Info icon should be present
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});

