/**
 * Label Component Unit Tests
 * Tests form label accessibility and association
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label Component', () => {
  describe('Rendering', () => {
    it('should render label element', () => {
      render(<Label>Label text</Label>);
      expect(screen.getByText('Label text')).toBeInTheDocument();
    });

    it('should render as HTML label tag', () => {
      const { container } = render(<Label>Test Label</Label>);
      expect(container.querySelector('label')).toBeInTheDocument();
    });

    it('should render with children content', () => {
      render(
        <Label>
          <span>Child content</span>
        </Label>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render with mixed content', () => {
      render(
        <Label>
          Name <span className="required">*</span>
        </Label>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with multiple children', () => {
      render(
        <Label>
          <span>Required</span>
          <span>:</span>
        </Label>
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText(':')).toBeInTheDocument();
    });
  });

  describe('htmlFor Association', () => {
    it('should associate with input via htmlFor', () => {
      const { container } = render(
        <>
          <Label htmlFor="input-id">Label</Label>
          <input id="input-id" />
        </>
      );
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'input-id');
    });

    it('should work with input that has same id', () => {
      const { container } = render(
        <>
          <Label htmlFor="email">Email Address</Label>
          <input id="email" type="email" />
        </>
      );
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'email');
    });

    it('should support dynamic htmlFor', () => {
      const { rerender, container } = render(
        <Label htmlFor="field-1">Label 1</Label>
      );
      expect(container.querySelector('label')).toHaveAttribute('for', 'field-1');

      rerender(<Label htmlFor="field-2">Label 2</Label>);
      expect(container.querySelector('label')).toHaveAttribute('for', 'field-2');
    });

    it('should work with textarea', () => {
      const { container } = render(
        <>
          <Label htmlFor="textarea-id">Message</Label>
          <textarea id="textarea-id" />
        </>
      );
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'textarea-id');
    });

    it('should work with select', () => {
      const { container } = render(
        <>
          <Label htmlFor="select-id">Options</Label>
          <select id="select-id">
            <option>Option 1</option>
          </select>
        </>
      );
      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'select-id');
    });
  });

  describe('Styling', () => {
    it('should accept className prop', () => {
      render(
        <Label className="custom-label">Label</Label>
      );
      const label = screen.getByText('Label').closest('label');
      expect(label).toHaveClass('custom-label');
    });

    it('should apply multiple classes', () => {
      render(
        <Label className="font-bold text-lg">Bold Label</Label>
      );
      const label = screen.getByText('Bold Label').closest('label');
      expect(label).toHaveClass('font-bold', 'text-lg');
    });

    it('should support custom styles', () => {
      render(
        <Label style={{ color: 'red' }}>Styled Label</Label>
      );
      const label = screen.getByText('Styled Label').closest('label');
      expect(label).toHaveStyle({ color: 'red' });
    });
  });

  describe('Accessibility', () => {
    it('should be semantic label element', () => {
      const { container } = render(
        <Label htmlFor="input">Test</Label>
      );
      expect(container.querySelector('label')).toBeInTheDocument();
    });

    it('should create accessible form field pairing', () => {
      const { container } = render(
        <>
          <Label htmlFor="username">Username</Label>
          <input id="username" aria-required="true" />
        </>
      );
      const label = container.querySelector('label');
      const input = container.querySelector('input');
      expect(label).toHaveAttribute('for', 'username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('should support aria-required on associated input', () => {
      const { container } = render(
        <>
          <Label htmlFor="required-field">Required Field</Label>
          <input id="required-field" aria-required="true" />
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should support aria-label when no visible text', () => {
      render(
        <Label htmlFor="input" aria-label="Email address">
          <span className="sr-only">Email</span>
        </Label>
      );
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    });

    it('should not have redundant aria-labelledby', () => {
      const { container } = render(
        <>
          <Label htmlFor="input-id">Label Text</Label>
          <input id="input-id" />
        </>
      );
      const label = container.querySelector('label');
      expect(label).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('Required Field Indicators', () => {
    it('should display required indicator', () => {
      render(
        <Label htmlFor="field">
          Email
          <span className="required">*</span>
        </Label>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should support aria-required', () => {
      const { container } = render(
        <>
          <Label htmlFor="field" aria-required="true">
            Field Label
          </Label>
          <input id="field" required />
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('required');
    });

    it('should work with required form fields', () => {
      const { container } = render(
        <>
          <Label htmlFor="required-input">Name *</Label>
          <input id="required-input" required />
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('required');
      expect(screen.getByText('Name *')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should support aria-invalid for error state', () => {
      const { container } = render(
        <>
          <Label htmlFor="field" className="text-red-600">
            Invalid Field
          </Label>
          <input id="field" aria-invalid="true" />
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support aria-describedby for error messages', () => {
      const { container } = render(
        <>
          <Label htmlFor="field">Password</Label>
          <input id="field" aria-describedby="error" />
          <span id="error" className="text-red-600">Password is required</span>
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-describedby', 'error');
    });

    it('should apply error styling class', () => {
      render(
        <Label className="text-red-600" htmlFor="field">
          Error Label
        </Label>
      );
      const label = screen.getByText('Error Label').closest('label');
      expect(label).toHaveClass('text-red-600');
    });
  });

  describe('Help Text', () => {
    it('should work with help text below', () => {
      render(
        <>
          <Label htmlFor="field">Field</Label>
          <input id="field" aria-describedby="help" />
          <small id="help">Enter your value here</small>
        </>
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'help');
    });

    it('should associate with descriptive text', () => {
      const { container } = render(
        <>
          <Label htmlFor="password">Password</Label>
          <input id="password" type="password" aria-describedby="pwd-hint" />
          <p id="pwd-hint">Must be at least 8 characters</p>
        </>
      );
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('aria-describedby', 'pwd-hint');
    });
  });

  describe('Form Integration', () => {
    it('should work within form groups', () => {
      render(
        <div className="form-group">
          <Label htmlFor="name">Name</Label>
          <input id="name" type="text" />
        </div>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should support multiple labels for related inputs', () => {
      render(
        <>
          <Label htmlFor="first-name">First Name</Label>
          <input id="first-name" />
          <Label htmlFor="last-name">Last Name</Label>
          <input id="last-name" />
        </>
      );
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
    });

    it('should work with checkbox labels', () => {
      const { container } = render(
        <Label htmlFor="remember">
          <input id="remember" type="checkbox" />
          Remember me
        </Label>
      );
      const label = container.querySelector('label');
      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(label).toHaveAttribute('for', 'remember');
      expect(checkbox).toHaveAttribute('id', 'remember');
    });

    it('should work with radio button labels', () => {
      const { container } = render(
        <Label htmlFor="option1">
          <input id="option1" type="radio" name="options" />
          Option 1
        </Label>
      );
      const label = container.querySelector('label');
      const radio = container.querySelector('input[type="radio"]');
      expect(label).toHaveAttribute('for', 'option1');
      expect(radio).toHaveAttribute('id', 'option1');
    });
  });

  describe('Content Variations', () => {
    it('should support text only', () => {
      render(<Label>Simple Text</Label>);
      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    it('should support elements and text mixed', () => {
      render(
        <Label>
          Email <em>(required)</em>
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('(required)')).toBeInTheDocument();
    });

    it('should handle whitespace correctly', () => {
      render(
        <Label htmlFor="field">
          {' '}
          Label with spacing{' '}
        </Label>
      );
      const label = screen.getByText(/Label with spacing/);
      expect(label).toBeInTheDocument();
    });

    it('should support icon and text together', () => {
      render(
        <Label htmlFor="field">
          <span className="icon">📧</span>
          Email
        </Label>
      );
      expect(screen.getByText('📧')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render empty label', () => {
      const { container } = render(<Label />);
      expect(container.querySelector('label')).toBeInTheDocument();
    });

    it('should handle very long label text', () => {
      const longText = 'A'.repeat(500);
      render(<Label>{longText}</Label>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(<Label>Field & Label #1 (Test)</Label>);
      expect(screen.getByText('Field & Label #1 (Test)')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(<Label>字段标签 🏷️</Label>);
      expect(screen.getByText('字段标签 🏷️')).toBeInTheDocument();
    });

    it('should support htmlFor with dynamic values', () => {
      const { container, rerender } = render(
        <Label htmlFor="id-1">Label 1</Label>
      );
      expect(container.querySelector('label')).toHaveAttribute('for', 'id-1');

      rerender(<Label htmlFor="id-2">Label 2</Label>);
      expect(container.querySelector('label')).toHaveAttribute('for', 'id-2');
    });
  });
});
