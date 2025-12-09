import { useState, useEffect } from 'react';

export interface MigrationPhase {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  progress: number;
  description: string;
  tasks: {
    id: string;
    name: string;
    status: 'completed' | 'in-progress' | 'pending';
    assignee?: string;
  }[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'disabled' | 'rolling-out';
  rolloutPercentage?: number;
  lastUpdated: string;
  impact: 'low' | 'medium' | 'high';
}

export interface MigrationMetrics {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  activeAssignees: string[];
  estimatedCompletion: string;
}

export interface MigrationDashboardData {
  phases: MigrationPhase[];
  featureFlags: FeatureFlag[];
  metrics: MigrationMetrics;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useMigrationDashboardData(): MigrationDashboardData & {
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<MigrationDashboardData>({
    phases: [],
    featureFlags: [],
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      activeAssignees: [],
      estimatedCompletion: '',
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchMigrationData = async (): Promise<void> => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // In a real implementation, this would fetch from an API
      // For now, we'll simulate the data based on the current consolidation state

      const mockPhases: MigrationPhase[] = [
        {
          id: 'structural-hygiene',
          name: 'Structural Hygiene',
          status: 'completed',
          progress: 100,
          description: 'Removed migration artifacts and established baseline testing',
          tasks: [
            { id: 'remove-artifacts', name: 'Remove migration artifacts', status: 'completed' },
            { id: 'baseline-tests', name: 'Establish baseline test suite', status: 'completed' },
            { id: 'document-architecture', name: 'Document current architecture', status: 'completed' },
          ],
        },
        {
          id: 'shared-consolidation',
          name: 'Shared Module Consolidation',
          status: 'completed',
          progress: 100,
          description: 'Consolidated caching, observability, and shared infrastructure',
          tasks: [
            { id: 'consolidate-caching', name: 'Consolidate caching infrastructure', status: 'completed' },
            { id: 'consolidate-observability', name: 'Consolidate observability stack', status: 'completed' },
          ],
        },
        {
          id: 'server-repository',
          name: 'Server Repository Pattern',
          status: 'completed',
          progress: 100,
          description: 'Implemented repository pattern and migrated server features',
          tasks: [
            { id: 'repository-pattern', name: 'Implement repository pattern', status: 'completed' },
            { id: 'server-migration', name: 'Migrate server features', status: 'completed' },
          ],
        },
        {
          id: 'client-feature-sliced',
          name: 'Client Feature-Sliced Design',
          status: 'completed',
          progress: 100,
          description: 'Migrated client to feature-sliced architecture',
          tasks: [
            { id: 'feature-sliced-design', name: 'Implement feature-sliced design', status: 'completed' },
            { id: 'component-migration', name: 'Migrate components', status: 'completed' },
          ],
        },
        {
          id: 'integration-boundaries',
          name: 'Integration & Boundaries',
          status: 'in-progress',
          progress: 75,
          description: 'Enable module boundary enforcement and integration testing',
          tasks: [
            { id: 'boundary-enforcement', name: 'Enable module boundary enforcement', status: 'completed', assignee: 'System' },
            { id: 'integration-testing', name: 'Implement integration testing', status: 'completed', assignee: 'System' },
            { id: 'migration-dashboard', name: 'Create migration dashboard', status: 'completed', assignee: 'System' },
            { id: 'final-validation', name: 'Run final validation and documentation', status: 'in-progress', assignee: 'System' },
          ],
        },
      ];

      const mockFeatureFlags: FeatureFlag[] = [
        {
          id: 'new-search-engine',
          name: 'PostgreSQL Search Engine',
          description: 'Use PostgreSQL full-text search instead of multiple engines',
          status: 'enabled',
          lastUpdated: new Date().toISOString(),
          impact: 'medium',
        },
        {
          id: 'feature-sliced-ui',
          name: 'Feature-Sliced UI Architecture',
          description: 'Enable new feature-sliced component organization',
          status: 'enabled',
          lastUpdated: new Date().toISOString(),
          impact: 'high',
        },
        {
          id: 'repository-pattern',
          name: 'Repository Pattern',
          description: 'Use repository pattern for data access',
          status: 'enabled',
          lastUpdated: new Date().toISOString(),
          impact: 'high',
        },
        {
          id: 'boundary-enforcement',
          name: 'Module Boundary Enforcement',
          description: 'Enforce strict module boundaries with ESLint rules',
          status: 'enabled',
          lastUpdated: new Date().toISOString(),
          impact: 'medium',
        },
        {
          id: 'consolidated-caching',
          name: 'Unified Caching Service',
          description: 'Use consolidated caching infrastructure',
          status: 'rolling-out',
          rolloutPercentage: 85,
          lastUpdated: new Date().toISOString(),
          impact: 'low',
        },
      ];

      // Calculate metrics
      const allTasks = mockPhases.flatMap(phase => phase.tasks);
      const completedTasks = allTasks.filter(task => task.status === 'completed').length;
      const blockedTasks = mockPhases.filter(phase => phase.status === 'blocked').length;
      const activeAssignees = [...new Set(allTasks.map(task => task.assignee).filter(Boolean))];

      const mockMetrics: MigrationMetrics = {
        totalTasks: allTasks.length,
        completedTasks,
        blockedTasks,
        activeAssignees: activeAssignees as string[],
        estimatedCompletion: '2024-12-01', // Mock completion date
      };

      setData({
        phases: mockPhases,
        featureFlags: mockFeatureFlags,
        metrics: mockMetrics,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch migration data',
        lastUpdated: new Date(),
      }));
    }
  };

  const refresh = async (): Promise<void> => {
    await fetchMigrationData();
  };

  useEffect(() => {
    fetchMigrationData();
  }, []);

  return {
    ...data,
    refresh,
  };
}