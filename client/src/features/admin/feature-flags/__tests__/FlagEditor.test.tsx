/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
// ============================================================================
// FLAG EDITOR TESTS
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlagEditor } from '../ui/FlagEditor';
import type { FeatureFlag } from '../types';

vi.mock('../hooks/useFeatureFlags', () => ({
  useCreateFlag: vi.fn(),
  useUpdateFlag: vi.fn(),
}));

const mockFlag: FeatureFlag = {
  id: '1',
  name: 'test-flag',
  description: 'Test flag description',
  enabled: true,
  rolloutPercentage: 50,
  dependencies: [],
  metadata: {
    createdBy: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedBy: 'admin',
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('FlagEditor', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode correctly', () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagEditor onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Create Feature Flag')).toBeInTheDocument();
    expect(screen.getByText('Create Flag')).toBeInTheDocument();
  });

  it('renders edit mode correctly', () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagEditor flag={mockFlag} onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Edit Feature Flag')).toBeInTheDocument();
    expect(screen.getByText('Update Flag')).toBeInTheDocument();
  });

  it('populates form with flag data in edit mode', () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagEditor flag={mockFlag} onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue('test-flag')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test flag description')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /enable flag/i })).toBeChecked();
  });

  it('disables name field in edit mode', () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagEditor flag={mockFlag} onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByDisplayValue('test-flag');
    expect(nameInput).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<FlagEditor onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates rollout percentage with slider', async () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<FlagEditor onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    const slider = screen.getByRole('slider');
    await user.clear(slider);
    await user.type(slider, '75');

    expect(screen.getByText('Rollout Percentage: 75%')).toBeInTheDocument();
  });

  it('shows A/B test configuration when enabled', async () => {
    const { useCreateFlag, useUpdateFlag } = require('../hooks/useFeatureFlags');
    useCreateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<FlagEditor onClose={mockOnClose} onSuccess={mockOnSuccess} />, {
      wrapper: createWrapper(),
    });

    const abTestCheckbox = screen.getByRole('checkbox', { name: /A\/B Test Configuration/i });
    await user.click(abTestCheckbox);

    expect(screen.getByPlaceholderText(/control, variant-a, variant-b/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/50, 50/i)).toBeInTheDocument();
  });
});
