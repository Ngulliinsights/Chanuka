/**
 * Monitoring Dashboard E2E Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('Monitoring Dashboard E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays dashboard and allows feature selection', async () => {
    const mockData = {
      features: [
        {
          id: 'feature-1',
          name: 'test-feature',
          displayName: 'Test Feature',
          enabled: true,
          healthStatus: 'healthy' as const,
          activeAlerts: 2,
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
        totalAlerts: 2,
        criticalAlerts: 1,
      },
    };

    const mockMetrics = [
      {
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
    ];

    vi.mocked(monitoringApi.getDashboardData).mockResolvedValue(mockData);
    vi.mocked(monitoringApi.getFeatureMetrics).mockResolvedValue(mockMetrics);

    render(<IntegrationMonitoringDashboard />, { wrapper: createWrapper() });

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Integration Monitoring')).toBeInTheDocument();
    });

    // Verify system health metrics are displayed
    expect(screen.getByText('1')).toBeInTheDocument(); // Total features
    expect(screen.getByText('2')).toBeInTheDocument(); // Active alerts

    // Verify feature is displayed
    expect(screen.getByText('Test Feature')).toBeInTheDocument();

    // Click on feature to open detail modal
    const featureRow = screen.getByText('Test Feature').closest('div');
    if (featureRow) {
      fireEvent.click(featureRow);
    }

    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('handles refresh action', async () => {
    const mockData = {
      features: [],
      systemHealth: {
        totalFeatures: 0,
        healthyFeatures: 0,
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

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Verify API was called again
    await waitFor(() => {
      expect(monitoringApi.getDashboardData).toHaveBeenCalledTimes(2);
    });
  });
});
