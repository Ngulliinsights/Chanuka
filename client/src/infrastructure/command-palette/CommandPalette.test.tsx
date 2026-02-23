/**
 * CommandPalette Component Tests
 *
 * Tests for command palette functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CommandPalette } from './CommandPalette';
import type { Command } from './types';

// Mock the Modal component since it uses createPortal
vi.mock('./Modal', () => ({
  Modal: ({ isOpen, children, onClose }: any) =>
    isOpen ? (
      <div data-testid="modal" onClick={onClose}>
        {children}
      </div>
    ) : null,
}));

// Mock the design system components
vi.mock('../../lib/design-system/interactive/Command', () => ({
  Command: ({ children, className }: any) => (
    <div data-testid="command" className={className}>
      {children}
    </div>
  ),
  CommandInput: ({ placeholder, value, onValueChange }: any) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={e => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="command-group">
      {heading && <div data-testid="group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, disabled }: any) => (
    <button data-testid="command-item" onClick={onSelect} disabled={disabled}>
      {children}
    </button>
  ),
  CommandShortcut: ({ children }: any) => <span data-testid="command-shortcut">{children}</span>,
  CommandSeparator: () => <hr data-testid="command-separator" />,
}));

// Mock the cn utility
vi.mock('../../lib/design-system/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('CommandPalette', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCommandExecute = vi.fn();

  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    onCommandExecute: mockOnCommandExecute,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders when open', () => {
    render(<CommandPalette {...defaultProps} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('command')).toBeInTheDocument();
    expect(screen.getByTestId('command-input')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CommandPalette {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    render(<CommandPalette {...defaultProps} />);

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();
  });

  it('displays custom placeholder text', () => {
    const customConfig = {
      placeholder: 'Custom placeholder',
    };

    render(<CommandPalette {...defaultProps} config={customConfig} />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('displays default navigation commands', () => {
    render(<CommandPalette {...defaultProps} />);

    expect(screen.getByText('Go to Home')).toBeInTheDocument();
    expect(screen.getByText('Go to Bills')).toBeInTheDocument();
    expect(screen.getByText('Go to Search')).toBeInTheDocument();
  });

  it('displays custom commands', () => {
    const customCommands: Command[] = [
      {
        id: 'custom-1',
        label: 'Custom Command',
        description: 'A custom command',
        action: vi.fn(),
        keywords: ['custom'],
        section: 'custom',
      },
    ];

    render(<CommandPalette {...defaultProps} customCommands={customCommands} />);

    expect(screen.getByText('Custom Command')).toBeInTheDocument();
  });

  it('filters commands based on search query', async () => {
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByTestId('command-input');
    fireEvent.change(input, { target: { value: 'home' } });

    await waitFor(() => {
      expect(screen.getByText('Go to Home')).toBeInTheDocument();
      expect(screen.queryByText('Go to Bills')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no commands match', async () => {
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByTestId('command-input');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByTestId('command-empty')).toBeInTheDocument();
      expect(screen.getByText('No commands found.')).toBeInTheDocument();
    });
  });

  it('executes command when clicked', async () => {
    const mockAction = vi.fn();
    const customCommands: Command[] = [
      {
        id: 'test-command',
        label: 'Test Command',
        action: mockAction,
        keywords: ['test'],
        section: 'test',
      },
    ];

    render(<CommandPalette {...defaultProps} customCommands={customCommands} />);

    const commandItem = screen.getByText('Test Command').closest('button');
    fireEvent.click(commandItem!);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalled();
      expect(mockOnCommandExecute).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not execute disabled commands', () => {
    const mockAction = vi.fn();
    const customCommands: Command[] = [
      {
        id: 'disabled-command',
        label: 'Disabled Command',
        action: mockAction,
        keywords: ['disabled'],
        section: 'test',
        disabled: true,
      },
    ];

    render(<CommandPalette {...defaultProps} customCommands={customCommands} />);

    const commandItem = screen.getByText('Disabled Command').closest('button');
    expect(commandItem).toBeDisabled();
  });

  it('displays keyboard shortcuts', () => {
    render(<CommandPalette {...defaultProps} />);

    // Check for shortcut hints in footer
    expect(screen.getByText('↑↓ Navigate • ↵ Select • Esc Close')).toBeInTheDocument();
    expect(screen.getByText('⌘K to open')).toBeInTheDocument();
  });

  it('groups commands by section', () => {
    render(<CommandPalette {...defaultProps} />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Go to Page')).toBeInTheDocument();
  });

  it('calls onOpenChange when modal is closed', () => {
    render(<CommandPalette {...defaultProps} />);

    const modal = screen.getByTestId('modal');
    fireEvent.click(modal);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
