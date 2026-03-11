// ============================================================================
// FLAG LIST TESTS
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlagList } from '../ui/FlagList';
import type { FeatureFlag } from '../types';

// Mock the hooks
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  useToggleFlag: vi.fn(),
  useDeleteFlag: vi.fn(),
}));

const mockFlags: FeatureFlag[] = [
  {
    id: '1',
    name: 'test-flag-1',
    description: 'Test flag 1',
    enabled: true,
    rolloutPercentage: 50,
    dependencies: [],
    metadata: {
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      updatedBy: 'admin',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    name: 'test-flag-2',
    description: 'Test flag 2',
    enabled: false,
    rolloutPercentage: 0,
    dependencies: [],
    abTestConfig: {
      variants: ['control', 'variant-a'],
      distribution: [50, 50],
      metrics: [],
    },
    metadata: {
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      updatedBy: 'admin',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  },
];

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

describe('FlagList', () => {
  const mockOnEdit = vi.fn();
  const mockOnViewAnalytics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const { useFeatureFlags } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Loading feature flags...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const { useFeatureFlags } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Failed to load feature flags')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    const { useFeatureFlags } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/No feature flags found/)).toBeInTheDocument();
  });

  it('renders flag list', () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    expect(screen.getByText('Test flag 1')).toBeInTheDocument();
    expect(screen.getByText('test-flag-2')).toBeInTheDocument();
    expect(screen.getByText('Test flag 2')).toBeInTheDocument();
  });

  it('displays flag status correctly', () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    const enabledBadges = screen.getAllByText('Enabled');
    const disabledBadges = screen.getAllByText('Disabled');
    
    expect(enabledBadges).toHaveLength(1);
    expect(disabledBadges).toHaveLength(1);
  });

  it('displays rollout percentage', () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Rollout: 50%')).toBeInTheDocument();
    expect(screen.getByText('Rollout: 0%')).toBeInTheDocument();
  });

  it('displays A/B test indicator', () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('A/B Test: 2 variants')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockFlags[0]);
  });

  it('calls onViewAnalytics when analytics button is clicked', async () => {
    const { useFeatureFlags, useToggleFlag, useDeleteFlag } = require('../hooks/useFeatureFlags');
    useFeatureFlags.mockReturnValue({
      data: mockFlags,
      isLoading: false,
      error: null,
    });
    useToggleFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteFlag.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<FlagList onEdit={mockOnEdit} onViewAnalytics={mockOnViewAnalytics} />, {
      wrapper: createWrapper(),
    });

    const analyticsButtons = screen.getAllByText('Analytics');
    await user.click(analyticsButtons[0]);

    expect(mockOnViewAnalytics).toHaveBeenCalledWith(mockFlags[0]);
  });
});
