// ============================================================================
// ROLLOUT CONTROLS TESTS
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RolloutControls } from '../ui/RolloutControls';
import type { FeatureFlag } from '../types';

vi.mock('../hooks/useFeatureFlags', () => ({
  useUpdateRollout: vi.fn(),
}));

const mockFlag: FeatureFlag = {
  id: '1',
  name: 'test-flag',
  description: 'Test flag',
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

describe('RolloutControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current rollout percentage', () => {
    const { useUpdateRollout } = require('../hooks/useFeatureFlags');
    useUpdateRollout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<RolloutControls flag={mockFlag} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('updates percentage with slider', async () => {
    const { useUpdateRollout } = require('../hooks/useFeatureFlags');
    useUpdateRollout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<RolloutControls flag={mockFlag} />, {
      wrapper: createWrapper(),
    });

    const slider = screen.getByRole('slider');
    await user.clear(slider);
    await user.type(slider, '75');

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows apply button when percentage changes', async () => {
    const { useUpdateRollout } = require('../hooks/useFeatureFlags');
    useUpdateRollout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<RolloutControls flag={mockFlag} />, {
      wrapper: createWrapper(),
    });

    const slider = screen.getByRole('slider');
    await user.clear(slider);
    await user.type(slider, '75');

    expect(screen.getByText('Apply Changes')).toBeInTheDocument();
    expect(screen.getByText(/Current: 50% → New: 75%/)).toBeInTheDocument();
  });

  it('quick set buttons update percentage', async () => {
    const { useUpdateRollout } = require('../hooks/useFeatureFlags');
    useUpdateRollout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const user = userEvent.setup();
    render(<RolloutControls flag={mockFlag} />, {
      wrapper: createWrapper(),
    });

    const button100 = screen.getByRole('button', { name: '100%' });
    await user.click(button100);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls updateRollout when apply is clicked', async () => {
    const mockMutateAsync = vi.fn();
    const { useUpdateRollout } = require('../hooks/useFeatureFlags');
    useUpdateRollout.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<RolloutControls flag={mockFlag} />, {
      wrapper: createWrapper(),
    });

    const slider = screen.getByRole('slider');
    await user.clear(slider);
    await user.type(slider, '75');

    const applyButton = screen.getByText('Apply Changes');
    await user.click(applyButton);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: 'test-flag',
      percentage: 75,
    });
  });
});
