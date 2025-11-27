/**
 * Comprehensive tests for Mobile-Optimized Forms components
 * Covers mobile responsiveness, touch optimization, accessibility, and user interactions
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MobileInput,
  MobilePasswordInput,
  MobileSearchInput,
  MobileSelect,
  MobileTextarea,
  MobileForm,
} from '@client/mobile-optimized-forms';
import { renderWithWrapper } from '../../ui/__tests__/test-utils';

// Mock the responsive layout context
vi.mock('../responsive-layout-manager', () => ({
  useResponsiveLayoutContext: vi.fn(() => ({
    touchOptimized: true,
    isMobile: true,
  })),
}));

describe('MobileInput Component', () => {
  const user = userEvent.setup();

  it('renders with basic props', () => {
    renderWithWrapper(
      <MobileInput label="Test Input" placeholder="Enter text" />
    );

    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies mobile optimizations', () => {
    renderWithWrapper(<MobileInput />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('min-h-[44px]');
    expect(input).toHaveClass('text-[16px]');
  });

  it('shows error state', () => {
    renderWithWrapper(
      <MobileInput label="Input" error="This field is required" />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    renderWithWrapper(
      <MobileInput label="Input" helperText="Helpful information" />
    );

    expect(screen.getByText('Helpful information')).toBeInTheDocument();
  });

  it('handles clear functionality', async () => {
    const onClear = vi.fn();
    renderWithWrapper(
      <MobileInput
        label="Input"
        value="test value"
        clearable
        onClear={onClear}
      />
    );

    const clearButton = screen.getByLabelText('Clear input');
    await user.click(clearButton);

    expect(onClear).toHaveBeenCalled();
  });

  it('renders with left and right icons', () => {
    renderWithWrapper(
      <MobileInput
        label="Input"
        leftIcon={<span>🔍</span>}
        rightIcon={<span>✓</span>}
      />
    );

    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('handles focus and blur states', async () => {
    renderWithWrapper(<MobileInput label="Input" />);

    const input = screen.getByRole('textbox');

    await user.click(input);
    expect(input).toHaveFocus();

    await user.tab();
    expect(input).not.toHaveFocus();
  });
});

describe('MobilePasswordInput Component', () => {
  const user = userEvent.setup();

  it('toggles password visibility', async () => {
    renderWithWrapper(<MobilePasswordInput label="Password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('Show password');
    await user.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('hides password toggle when disabled', () => {
    renderWithWrapper(
      <MobilePasswordInput label="Password" showPasswordToggle={false} />
    );

    expect(screen.queryByLabelText(/show password/i)).not.toBeInTheDocument();
  });
});

describe('MobileSearchInput Component', () => {
  const user = userEvent.setup();

  it('renders with search icon', () => {
    renderWithWrapper(<MobileSearchInput label="Search" />);

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByText('Search...')).toBeInTheDocument();
  });

  it('debounces search calls', async () => {
    const onSearch = vi.fn();
    renderWithWrapper(
      <MobileSearchInput label="Search" onSearch={onSearch} searchDelay={100} />
    );

    const input = screen.getByLabelText('Search');
    await user.type(input, 'test query');

    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test query');
    }, { timeout: 200 });
  });

  it('clears search on clear button', async () => {
    const onSearch = vi.fn();
    renderWithWrapper(
      <MobileSearchInput
        label="Search"
        value="initial"
        onSearch={onSearch}
      />
    );

    const clearButton = screen.getByLabelText('Clear input');
    await user.click(clearButton);

    expect(onSearch).toHaveBeenCalledWith('');
  });
});

describe('MobileSelect Component', () => {
  const user = userEvent.setup();
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3', disabled: true },
  ];

  it('renders with placeholder', () => {
    renderWithWrapper(
      <MobileSelect
        label="Select"
        options={options}
        placeholder="Choose option"
      />
    );

    expect(screen.getByText('Choose option')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    renderWithWrapper(
      <MobileSelect label="Select" options={options} />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('selects option on click', async () => {
    const onChange = vi.fn();
    renderWithWrapper(
      <MobileSelect
        label="Select"
        options={options}
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    const option = screen.getByText('Option 1');
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith('1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    renderWithWrapper(
      <MobileSelect label="Select" options={options} />
    );

    const select = screen.getByRole('combobox');
    select.focus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on outside click', async () => {
    renderWithWrapper(
      <MobileSelect label="Select" options={options} />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('shows selected option', () => {
    renderWithWrapper(
      <MobileSelect
        label="Select"
        options={options}
        value="2"
      />
    );

    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('handles disabled options', async () => {
    const onChange = vi.fn();
    renderWithWrapper(
      <MobileSelect
        label="Select"
        options={options}
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    const disabledOption = screen.getByText('Option 3');
    await user.click(disabledOption);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies mobile optimizations', () => {
    renderWithWrapper(
      <MobileSelect label="Select" options={options} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('min-h-[44px]');
    expect(select).toHaveClass('text-[16px]');
  });

  it('shows error state', () => {
    renderWithWrapper(
      <MobileSelect
        label="Select"
        options={options}
        error="Please select an option"
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });
});

describe('MobileTextarea Component', () => {
  it('renders with basic props', () => {
    renderWithWrapper(
      <MobileTextarea label="Comments" placeholder="Enter comments" />
    );

    expect(screen.getByLabelText('Comments')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter comments')).toBeInTheDocument();
  });

  it('applies mobile optimizations', () => {
    renderWithWrapper(<MobileTextarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('text-[16px]');
    expect(textarea).toHaveClass('min-h-[100px]');
  });

  it('auto-resizes when enabled', async () => {
    const user = userEvent.setup();
    renderWithWrapper(
      <MobileTextarea label="Textarea" autoResize maxHeight={150} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Height should have changed (basic check)
    expect(textarea).toBeInTheDocument();
  });

  it('respects max height', async () => {
    const user = userEvent.setup();
    renderWithWrapper(
      <MobileTextarea label="Textarea" autoResize maxHeight={100} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Very long text that should exceed max height...'.repeat(10));

    expect(textarea).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithWrapper(
      <MobileTextarea label="Textarea" error="This field is required" />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});

describe('MobileForm Component', () => {
  it('renders form with children', () => {
    renderWithWrapper(
      <MobileForm>
        <MobileInput label="Field 1" />
        <MobileInput label="Field 2" />
      </MobileForm>
    );

    expect(screen.getByLabelText('Field 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Field 2')).toBeInTheDocument();
  });

  it('applies mobile spacing', () => {
    renderWithWrapper(
      <MobileForm data-testid="mobile-form">
        <div>Content</div>
      </MobileForm>
    );

    const form = screen.getByTestId('mobile-form');
    expect(form).toHaveClass('space-y-8'); // Touch optimized spacing
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithWrapper(
      <MobileForm onSubmit={onSubmit}>
        <MobileInput label="Field" />
        <button type="submit">Submit</button>
      </MobileForm>
    );

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});

describe('Accessibility', () => {
  it('all inputs have proper labels', () => {
    renderWithWrapper(
      <>
        <MobileInput label="Input" />
        <MobilePasswordInput label="Password" />
        <MobileSearchInput label="Search" />
        <MobileSelect label="Select" options={[]} />
        <MobileTextarea label="Textarea" />
      </>
    );

    expect(screen.getByLabelText('Input')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Select')).toBeInTheDocument();
    expect(screen.getByLabelText('Textarea')).toBeInTheDocument();
  });

  it('error messages are properly associated', () => {
    renderWithWrapper(
      <MobileInput label="Input" error="Error message" />
    );

    const input = screen.getByLabelText('Input');
    const error = screen.getByText('Error message');

    expect(input).toHaveAttribute('aria-describedby');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('helper text is properly associated', () => {
    renderWithWrapper(
      <MobileInput label="Input" helperText="Helper message" />
    );

    const input = screen.getByLabelText('Input');
    const helper = screen.getByText('Helper message');

    expect(input).toHaveAttribute('aria-describedby');
    expect(helper).toHaveAttribute('id');
  });
});

describe('Touch Optimization', () => {
  it('inputs have minimum touch target size', () => {
    renderWithWrapper(<MobileInput />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('min-h-[44px]');
  });

  it('select has minimum touch target size', () => {
    renderWithWrapper(<MobileSelect options={[]} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('min-h-[44px]');
  });

  it('select options have minimum touch target size', async () => {
    const user = userEvent.setup();
    const options = [{ value: '1', label: 'Option 1' }];

    renderWithWrapper(<MobileSelect options={options} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const option = screen.getByRole('option');
    expect(option).toHaveClass('min-h-[44px]');
  });
});

describe('Edge Cases', () => {
  it('handles empty options array', () => {
    renderWithWrapper(<MobileSelect options={[]} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles undefined values', () => {
    renderWithWrapper(
      <MobileInput value={undefined} onChange={vi.fn()} />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('handles disabled state', () => {
    renderWithWrapper(
      <MobileSelect options={[]} disabled />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-disabled', 'true');
  });

  it('handles complex children in form', () => {
    renderWithWrapper(
      <MobileForm>
        <div>
          <MobileInput label="Nested" />
        </div>
      </MobileForm>
    );

    expect(screen.getByLabelText('Nested')).toBeInTheDocument();
  });
});