/**
 * Alert Management Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertManagement } from '../ui/AlertManagement';
import * as monitoringApi from '../api/monitoring-api';

// Mock the API
vi.mock('../api/monitoring-api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AlertManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(monitoringApi.getFeatureAlerts).mockImplementation(
      () => new Promise(() => {})
    );

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('renders alerts list', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        featureId: 'test-feature',
        severity: 'high' as const,
        type: 'error_rate',
        title: 'High Error Rate',
        message: 'Error rate exceeded threshold',
        triggered: true,
        acknowledged: false,
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue(mockAlerts);

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('High Error Rate')).toBeInTheDocument();
    });

    expect(screen.getByText('Error rate exceeded threshold')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('handles acknowledge alert', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        featureId: 'test-feature',
        severity: 'high' as const,
        type: 'error_rate',
        title: 'High Error Rate',
        message: 'Error rate exceeded threshold',
        triggered: true,
        acknowledged: false,
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(monitoringApi.acknowledgeAlert).mockResolvedValue();

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('High Error Rate')).toBeInTheDocument();
    });

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(monitoringApi.acknowledgeAlert).toHaveBeenCalledWith('alert-1');
    });
  });

  it('handles resolve alert', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        featureId: 'test-feature',
        severity: 'high' as const,
        type: 'error_rate',
        title: 'High Error Rate',
        message: 'Error rate exceeded threshold',
        triggered: true,
        acknowledged: true,
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(monitoringApi.resolveAlert).mockResolvedValue();

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('High Error Rate')).toBeInTheDocument();
    });

    const resolveButton = screen.getByText('Resolve');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(monitoringApi.resolveAlert).toHaveBeenCalledWith('alert-1');
    });
  });

  it('displays empty state when no alerts', async () => {
    vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue([]);

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument();
    });
  });

  it('filters resolved alerts', async () => {
    vi.mocked(monitoringApi.getFeatureAlerts).mockResolvedValue([]);

    render(<AlertManagement featureId="test-feature" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /show resolved/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(monitoringApi.getFeatureAlerts).toHaveBeenCalledWith('test-feature', undefined);
    });
  });
});
