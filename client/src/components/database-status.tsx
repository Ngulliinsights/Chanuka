import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Search, AlertCircle, AlertTriangle, Info, Settings, ArrowLeft } from 'lucide-react';
import { cn, getStatusColor, getStatusBgColor } from '../lib/utils';

interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
  userCount: number;
}

interface DatabaseStats {
  users: number;
  bills: number;
  comments: number;
  activeSessions: number;
  lastUpdated: string;
}

interface SchemaIssue {
  type: string;
  severity: string;
  message: string;
  table?: string;
  column?: string;
}

interface SchemaCheck {
  issues: SchemaIssue[];
  totalIssues: number;
  critical: number;
  warnings: number;
  checkedAt: string;
}

interface DatabaseStatusProps {
  health?: HealthStatus;
  stats?: DatabaseStats;
  schemaCheck?: SchemaCheck;
  isLoading: boolean;
}

const getSeverityIcon = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Warning</Badge>;
    default:
      return <Badge variant="secondary">Medium</Badge>;
  }
};

export default function DatabaseStatus({ health, stats, schemaCheck, isLoading }: DatabaseStatusProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-primary" />
            Database Overview
          </CardTitle>
          <CardDescription>
            Current database status and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats?.users || 0}</div>
              <div className="text-sm text-muted-foreground">Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats?.bills || 0}</div>
              <div className="text-sm text-muted-foreground">Bills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats?.comments || 0}</div>
              <div className="text-sm text-muted-foreground">Comments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats?.activeSessions || 0}</div>
              <div className="text-sm text-muted-foreground">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema Consistency Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-primary" />
            Schema Consistency Analysis
          </CardTitle>
          <CardDescription>
            Identified issues and recommendations for schema optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schemaCheck?.issues.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No schema issues detected. Your database schema is consistent.
                </AlertDescription>
              </Alert>
            ) : (
              schemaCheck?.issues.map((issue, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start space-x-3 p-4 rounded-lg border",
                    getStatusBgColor(issue.severity)
                  )}
                >
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {issue.type.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{issue.message}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      {getSeverityBadge(issue.severity)}
                      {issue.table && (
                        <span className="text-xs text-gray-500">
                          Table: {issue.table}
                          {issue.column && ` | Column: ${issue.column}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Fix
                  </Button>
                </div>
              ))
            )}

            {(schemaCheck?.totalIssues ?? 0) > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <Button className="w-full" size="lg">
                  <Settings className="h-4 w-4 mr-2" />
                  Auto-Fix All Issues
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { logger } from '../utils/logger';

export function useDatabaseStatus() {
  // Updated database status endpoint to match refactored routes
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['database-status'],
    queryFn: async () => {
      const response = await fetch('/api/system/database/status');
      if (!response.ok) {
        throw new Error('Failed to fetch database status');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  return { data, isLoading, error, refetch };
}

