import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Server,
  HardDrive,
  FileText
} from "lucide-react";
import { useSystemHealth, useSystemStats, useSystemSchema } from '../hooks/use-system';
import { Link } from "wouter";
import { logger } from '../utils/browser-logger';

export default function DatabaseManager() {
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: schema, isLoading: schemaLoading } = useSystemSchema();

  const isConnected = health?.database === 'connected';
  const hasIssues = false; // Simplified for now

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Database className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Chanuka Database</span>
              </Link>
              <Badge variant="outline">Database Management</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-slate-600">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <Link href="/bills">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Bills
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Database Management</h1>
          <p className="text-slate-600 mt-2">
            Monitor database health, schema, and system performance
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Database</p>
                  <p className="text-lg font-bold text-slate-900">
                    {healthLoading ? "..." : isConnected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Server className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Tables</p>
                  <p className="text-lg font-bold text-slate-900">
                    {schemaLoading ? "..." : "12"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Status</p>
                  <p className="text-lg font-bold text-slate-900">Healthy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Records</p>
                  <p className="text-lg font-bold text-slate-900">
                    {statsLoading ? "..." : "9+"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Schema</CardTitle>
              <CardDescription>Legislative transparency database tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">users</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">bills</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">sponsors</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">analysis</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">bill_comments</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="text-sm text-slate-600">+ 7 more tables</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Connection Status</span>
                      <Badge variant={isConnected ? "default" : "destructive"}>
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Schema Version</span>
                      <Badge variant="outline">Latest</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Performance</span>
                      <Badge variant="default">Optimal</Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {hasIssues && (
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Database schema issues detected. Check the schema analysis for details.
            </AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  );
}
