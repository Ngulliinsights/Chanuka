/**
 * Integration Monitoring Dashboard Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntegrationMonitoringDashboard } from '../ui/IntegrationMonitoringDashboard';
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

describe('IntegrationMonitoringDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(monitoringApi.getDashboardData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<IntegrationMonitoringDashboard />, { wrapper: createWrapper() });
    
    expect(screen.getByText(/loading monitoring dashboard/i)).toBeInTheDocument();
  });

  it('renders dashboard with data', async () => {
    const mockData = {
      features: [
        {
          id: 'feature-1',
          name: 'test-feature',
          displayName: 'Test Feature',
          enabled: true,
          healthStatus: 'healthy' as const,
          activeAlerts: 0,
          recentMetrics: {
            id: 'metric-1',
            featureId: 'feature-1',
            timestamp: new Date(),
            activeUsers: 100,
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            avgResponseTime: '150',
            p95ResponseTime: '250',
            p99ResponseTime: '350',
            errorRate: '0.05',
            errorCount: 50,
          },
        },
      ],
      systemHealth: {
        totalFeatures: 1,
        healthyFeatures: 1,
        degradedFeatures: 0,
        downFeatures: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
      },
    };

    vi.mocked(monitoringApi.getDashboardData).mockResolvedValue(mockData);

    render(<IntegrationMonitoringDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Integration Monitoring')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total features
  });

  it('renders error state when API fails', async () => {
    vi.mocked(monitoringApi.getDashboardData).mockRejectedValue(
      new Error('API Error')
    );

    render(<IntegrationMonitoringDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('displays system health metrics', async () => {
    const mockData = {
      features: [],
      systemHealth: {
        totalFeatures: 10,
        healthyFeatures: 7,
        degradedFeatures: 2,
        downFeatures: 1,
        totalAlerts: 5,
        criticalAlerts: 2,
      },
    };

    vi.mocked(monitoringApi.getDashboardData).mockResolvedValue(mockData);

    render(<IntegrationMonitoringDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total features
    });

    expect(screen.getByText('7')).toBeInTheDocument(); // Healthy
    expect(screen.getByText('3')).toBeInTheDocument(); // Degraded + Down
    expect(screen.getByText('5')).toBeInTheDocument(); // Total alerts
  });
});
