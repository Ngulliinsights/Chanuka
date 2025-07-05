import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GitBranch, 
  CheckCircle, 
  Clock, 
  FileText,
  Play,
  FilePlus,
  AlertTriangle
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

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
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'ready':
      return <FileText className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'applied':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Applied</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
    case 'ready':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Ready</Badge>;
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
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
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
                <Play className="h-4 w-4 mr-2" />
                Run Migrations ({pendingMigrations.length})
              </Button>
              <Button variant="outline" className="flex-1" size="lg">
                <FilePlus className="h-4 w-4 mr-2" />
                Create Migration
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
