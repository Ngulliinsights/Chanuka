import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  AlertTriangle, 
  GitBranch, 
  TrendingUp, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Download,
  Shield,
  Play,
  FilePlus,
  Edit,
  Activity,
  Server,
  HardDrive
} from "lucide-react";
import { cn, formatRelativeTime, getStatusColor, getStatusBgColor } from "@/lib/utils";
import DatabaseStatus from "@/components/database-status";
import MigrationManager from "@/components/migration-manager";
import EnvironmentSetup from "@/components/environment-setup";
import SystemHealth from "@/components/system-health";

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

interface Migration {
  name: string;
  status: string;
  appliedAt?: string;
  conflicts?: number;
  enhanced?: boolean;
}

export default function DatabaseManager() {
  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DatabaseStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 30000,
  });

  const { data: schemaCheck, isLoading: schemaLoading } = useQuery<SchemaCheck>({
    queryKey: ['/api/schema/check'],
    refetchInterval: 60000,
  });

  const { data: migrations, isLoading: migrationsLoading } = useQuery<{migrations: Migration[]}>({
    queryKey: ['/api/migrations'],
    refetchInterval: 30000,
  });

  const { data: environment } = useQuery({
    queryKey: ['/api/environment'],
    refetchInterval: 60000,
  });

  const { data: activity } = useQuery({
    queryKey: ['/api/activity'],
    refetchInterval: 30000,
  });

  const isConnected = health?.status === 'healthy';
  const hasIssues = schemaCheck && schemaCheck.totalIssues > 0;
  const pendingMigrations = migrations?.migrations.filter(m => m.status === 'pending' || m.status === 'ready').length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Chanuka Database Manager</h1>
                <p className="text-sm text-muted-foreground">Development Environment Setup & Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={cn("w-3 h-3 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="material-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Database Status</h3>
                  <p className={cn("text-sm font-medium", getStatusColor(health?.status || 'disconnected'))}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="material-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Schema Issues</h3>
                  <p className="text-sm font-medium text-yellow-600">
                    {schemaCheck?.totalIssues || 0} Issues
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="material-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <GitBranch className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Migrations</h3>
                  <p className="text-sm font-medium text-green-600">
                    {pendingMigrations} Pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="material-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold">Performance</h3>
                  <p className="text-sm font-medium text-green-600">Optimal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Analysis & Setup */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">Schema Analysis</TabsTrigger>
                <TabsTrigger value="migrations">Migrations</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6">
                <DatabaseStatus 
                  health={health} 
                  stats={stats} 
                  schemaCheck={schemaCheck} 
                  isLoading={healthLoading || statsLoading || schemaLoading}
                />
              </TabsContent>

              <TabsContent value="migrations" className="space-y-6">
                <MigrationManager 
                  migrations={migrations?.migrations || []} 
                  isLoading={migrationsLoading}
                />
              </TabsContent>

              <TabsContent value="environment" className="space-y-6">
                <EnvironmentSetup 
                  environment={environment}
                  health={health}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Tools & Monitoring */}
          <div className="space-y-6">
            <SystemHealth 
              health={health}
              stats={stats}
              environment={environment}
              activity={activity}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Chanuka Database Manager v1.0.0
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary">Documentation</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary">Support</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
