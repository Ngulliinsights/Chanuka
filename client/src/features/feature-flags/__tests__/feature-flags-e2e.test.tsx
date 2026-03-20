// ============================================================================
// FEATURE FLAGS E2E TESTS
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureFlagsPage } from '../pages/feature-flags';
import { featureFlagsApi } from '../api/feature-flags-api';
import type { FeatureFlag } from '../types';

// Mock the API
vi.mock('../api/feature-flags-api', () => ({
  featureFlagsApi: {
    getAllFlags: vi.fn(),
    getFlag: vi.fn(),
    createFlag: vi.fn(),
    updateFlag: vi.fn(),
    deleteFlag: vi.fn(),
    toggleFlag: vi.fn(),
    updateRollout: vi.fn(),
    getAnalytics: vi.fn(),
  },
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

describe('Feature Flags E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (featureFlagsApi.getAllFlags as any).mockResolvedValue(mockFlags);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays feature flags page', async () => {
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage feature flags, rollouts, and A/B tests')).toBeInTheDocument();
    expect(screen.getByText('Create Flag')).toBeInTheDocument();
  });

  it('displays list of flags', async () => {
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Test flag 1')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('opens create flag modal', async () => {
    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: 'Create Flag' });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Feature Flag')).toBeInTheDocument();
    });
  });

  it('creates a new flag', async () => {
    const newFlag: FeatureFlag = {
      id: '2',
      name: 'new-flag',
      description: 'New test flag',
      enabled: false,
      rolloutPercentage: 0,
      dependencies: [],
      metadata: {
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
        updatedBy: 'admin',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    (featureFlagsApi.createFlag as any).mockResolvedValue(newFlag);
    (featureFlagsApi.getAllFlags as any).mockResolvedValue([...mockFlags, newFlag]);

    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByRole('button', { name: 'Create Flag' });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Feature Flag')).toBeInTheDocument();
    });

    // Fill form
    const nameInput = screen.getByLabelText('Flag Name');
    const descInput = screen.getByLabelText('Description');

    await user.type(nameInput, 'new-flag');
    await user.type(descInput, 'New test flag');

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Create Flag' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(featureFlagsApi.createFlag).toHaveBeenCalled();
    });
  });

  it('opens edit modal for existing flag', async () => {
    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: 'Edit' });
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Feature Flag')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('test-flag-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test flag 1')).toBeInTheDocument();
  });

  it('toggles flag enabled state', async () => {
    const toggledFlag = { ...mockFlags[0], enabled: false };
    (featureFlagsApi.toggleFlag as any).mockResolvedValue(toggledFlag);
    (featureFlagsApi.getAllFlags as any).mockResolvedValue([toggledFlag]);

    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    const disableButton = screen.getByRole('button', { name: 'Disable' });
    await user.click(disableButton);

    await waitFor(() => {
      expect(featureFlagsApi.toggleFlag).toHaveBeenCalledWith('test-flag-1', false);
    });
  });

  it('opens analytics modal', async () => {
    const mockAnalytics = {
      flagName: 'test-flag-1',
      enabled: true,
      rolloutPercentage: 50,
      totalEvaluations: 1000,
      enabledCount: 600,
      disabledCount: 400,
      enabledPercentage: 60,
      metrics: {},
    };

    (featureFlagsApi.getAnalytics as any).mockResolvedValue(mockAnalytics);

    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    const analyticsButton = screen.getByRole('button', { name: 'Analytics' });
    await user.click(analyticsButton);

    await waitFor(() => {
      expect(screen.getByText('Analytics: test-flag-1')).toBeInTheDocument();
    });

    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('deletes a flag with confirmation', async () => {
    global.confirm = vi.fn(() => true);
    (featureFlagsApi.deleteFlag as any).mockResolvedValue(undefined);
    (featureFlagsApi.getAllFlags as any).mockResolvedValue([]);

    const user = userEvent.setup();
    render(<FeatureFlagsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('test-flag-1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(featureFlagsApi.deleteFlag).toHaveBeenCalledWith('test-flag-1');
    });
  });
});
