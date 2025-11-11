import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { GitBranch, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { logger } from '../utils/logger';

interface Migration {
  name: string;
  status: string;
  appliedAt?: string;
  conflicts?: number;
  enhanced?: boolean;
}

interface MigrationManagerProps {
  migrations: Migration[];
  isLoading: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'applied':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'ready':
      return <FileText className="h-4 w-4 text-info" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'applied':
      return <Badge className="bg-success text-success-foreground hover:bg-success/80">Applied</Badge>;
    case 'pending':
      return <Badge className="bg-warning text-warning-foreground hover:bg-warning/80">Pending</Badge>;
    case 'ready':
      return <Badge className="bg-info text-info-foreground hover:bg-info/80">Ready</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function MigrationManager({ migrations, isLoading }: MigrationManagerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingMigrations = migrations.filter(m => m.status === 'pending' || m.status === 'ready');
  const appliedMigrations = migrations.filter(m => m.status === 'applied');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <GitBranch className="h-5 w-5 mr-2 text-primary" />
          Migration Management
        </CardTitle>
        <CardDescription>
          Manage database schema migrations and track changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {migrations.map((migration, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                  {getStatusIcon(migration.status)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{migration.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusBadge(migration.status)}
                    {migration.conflicts && migration.conflicts > 0 && (
                      <Badge variant="destructive">
                        {migration.conflicts} Conflicts
                      </Badge>
                    )}
                    {migration.enhanced && (
                      <Badge className="bg-accent text-accent-foreground hover:bg-accent/80">
                        Enhanced
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {migration.appliedAt 
                      ? `Applied ${formatRelativeTime(migration.appliedAt)}`
                      : migration.status === 'pending'
                        ? 'Pending - Conflicts detected'
                        : 'Ready to apply'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {migration.status === 'pending' && (
                  <Button variant="outline" size="sm">
                    Review
                  </Button>
                )}
                {migration.status === 'ready' && (
                  <Button size="sm">
                    Apply
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <Button className="flex-1" size="lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                Run Migrations ({pendingMigrations.length})
              </Button>
              <Button variant="outline" className="flex-1" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Create Migration
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

