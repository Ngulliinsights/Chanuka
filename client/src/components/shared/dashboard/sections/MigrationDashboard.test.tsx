import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MigrationDashboard } from './MigrationDashboard';

const mockData = {
  phases: [
    {
      id: 'integration-boundaries',
      name: 'Integration & Boundaries',
      status: 'in-progress' as const,
      progress: 75,
      description: 'Enable module boundary enforcement and integration testing',
      tasks: [
        {
          id: 'boundary-enforcement',
          name: 'Enable module boundary enforcement',
          status: 'completed' as const,
          assignee: 'System'
        },
        {
          id: 'integration-testing',
          name: 'Implement integration testing',
          status: 'completed' as const,
          assignee: 'System'
        },
        {
          id: 'migration-dashboard',
          name: 'Create migration dashboard',
          status: 'in-progress' as const,
          assignee: 'System'
        },
      ],
    },
  ],
  featureFlags: [
    {
      id: 'boundary-enforcement',
      name: 'Module Boundary Enforcement',
      description: 'Enforce strict module boundaries with ESLint rules',
      status: 'enabled' as const,
      lastUpdated: new Date().toISOString(),
      impact: 'medium' as const,
    },
  ],
  metrics: {
    totalTasks: 3,
    completedTasks: 2,
    blockedTasks: 0,
    activeAssignees: ['System'],
    estimatedCompletion: '2024-12-01',
  },
};

describe('MigrationDashboard', () => {
  it('renders migration dashboard with phases and metrics', () => {
    render(
      <MigrationDashboard
        phases={mockData.phases}
        featureFlags={mockData.featureFlags}
        metrics={mockData.metrics}
      />
    );

    expect(screen.getByText('Migration Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Integration & Boundaries')).toBeInTheDocument();
    expect(screen.getByText('Module Boundary Enforcement')).toBeInTheDocument();
    expect(screen.getByText('2 of 3 tasks completed')).toBeInTheDocument();
  });

  it('displays progress information correctly', () => {
    render(
      <MigrationDashboard
        phases={mockData.phases}
        featureFlags={mockData.featureFlags}
        metrics={mockData.metrics}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Completed tasks
    expect(screen.getByText('1')).toBeInTheDocument(); // Active assignees
  });

  it('shows feature flag status', () => {
    render(
      <MigrationDashboard
        phases={mockData.phases}
        featureFlags={mockData.featureFlags}
        metrics={mockData.metrics}
      />
    );

    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    expect(screen.getByText('enabled')).toBeInTheDocument();
    expect(screen.getByText('medium impact')).toBeInTheDocument();
  });
});