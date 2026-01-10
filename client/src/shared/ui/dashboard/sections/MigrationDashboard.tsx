import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  Network as GitBranch, // Using Network as GitBranch replacement
  Shield,
  Database,
  LayoutGrid as Layers, // Using LayoutGrid as Layers replacement
  RefreshCw,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';

interface MigrationPhase {
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

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'disabled' | 'rolling-out';
  rolloutPercentage?: number;
  lastUpdated: string;
  impact: 'low' | 'medium' | 'high';
}

interface MigrationMetrics {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  activeAssignees: string[];
  estimatedCompletion: string;
}

interface MigrationDashboardProps {
  phases: MigrationPhase[];
  featureFlags: FeatureFlag[];
  metrics: MigrationMetrics;
  onRefresh?: () => void;
  loading?: boolean;
}

export function MigrationDashboard({
  phases,
  featureFlags,
  metrics,
  onRefresh,
  loading = false,
}: MigrationDashboardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default' as const,
      'in-progress': 'secondary' as const,
      pending: 'outline' as const,
      blocked: 'destructive' as const,
      enabled: 'default' as const,
      disabled: 'secondary' as const,
      'rolling-out': 'outline' as const,
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getPhaseIcon = (phaseId: string) => {
    const icons = {
      'structural-hygiene': <Settings className="h-5 w-5" />,
      'shared-consolidation': <Layers className="h-5 w-5" />,
      'server-repository': <Database className="h-5 w-5" />,
      'client-feature-sliced': <GitBranch className="h-5 w-5" />,
      'integration-boundaries': <Shield className="h-5 w-5" />,
    };
    return icons[phaseId as keyof typeof icons] || <Settings className="h-5 w-5" />;
  };

  const overallProgress =
    metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Migration Dashboard</h2>
          <p className="text-muted-foreground">
            Track consolidation progress and feature flag status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {metrics.completedTasks} of {metrics.totalTasks} tasks completed
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {phases.filter(p => p.status === 'in-progress').length}
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{metrics.blockedTasks}</div>
                <div className="text-xs text-muted-foreground">Blocked</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.activeAssignees.length}
                </div>
                <div className="text-xs text-muted-foreground">Active Contributors</div>
              </div>
            </div>

            {metrics.estimatedCompletion && (
              <div className="text-sm text-muted-foreground">
                Estimated completion: {metrics.estimatedCompletion}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Migration Phases */}
      <div className="grid gap-4 md:grid-cols-2">
        {phases.map(phase => (
          <Card key={phase.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon(phase.id)}
                  {phase.name}
                </div>
                {getStatusBadge(phase.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{phase.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(phase.progress)}%</span>
                </div>
                <Progress value={phase.progress} className="h-2" />
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Tasks</h4>
                {phase.tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="truncate">{task.name}</span>
                    </div>
                    {task.assignee && (
                      <Badge variant="outline" className="text-xs">
                        {task.assignee}
                      </Badge>
                    )}
                  </div>
                ))}
                {phase.tasks.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{phase.tasks.length - 3} more tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featureFlags.map(flag => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{flag.name}</h4>
                    {getStatusBadge(flag.status)}
                    <Badge
                      variant={
                        flag.impact === 'high'
                          ? 'destructive'
                          : flag.impact === 'medium'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="text-xs"
                    >
                      {flag.impact} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Last updated: {new Date(flag.lastUpdated).toLocaleDateString()}</span>
                    {flag.rolloutPercentage !== undefined && (
                      <span>Rollout: {flag.rolloutPercentage}%</span>
                    )}
                  </div>
                </div>

                {flag.status === 'rolling-out' && flag.rolloutPercentage !== undefined && (
                  <div className="ml-4 w-24">
                    <Progress value={flag.rolloutPercentage} className="h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
