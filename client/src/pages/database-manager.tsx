import { 
import React from 'react';

  Database, 
  Activity, 
  HardDrive, 
  Users, 
  FileText, 
  RefreshCw, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

interface DatabaseStats {
  totalRecords: number;
  bills: number;
  users: number;
  comments: number;
  analyses: number;
  storageUsed: number;
  storageTotal: number;
  lastBackup: string;
  uptime: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  disk: number;
  connections: number;
  maxConnections: number;
}

export default function DatabaseManager() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    
    // Mock data - in real app, this would come from API
    const mockStats: DatabaseStats = {
      totalRecords: 1247893,
      bills: 2847,
      users: 45623,
      comments: 18934,
      analyses: 1456,
      storageUsed: 2.4,
      storageTotal: 10,
      lastBackup: '2024-01-20T02:00:00Z',
      uptime: '15 days, 8 hours'
    };

    const mockHealth: SystemHealth = {
      status: 'healthy',
      cpu: 23,
      memory: 67,
      disk: 24,
      connections: 45,
      maxConnections: 100
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setStats(mockStats);
    setHealth(mockHealth);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading database information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Database Manager</h1>
          <p className="text-muted-foreground">Monitor and manage database operations</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Alert */}
      {health && health.status !== 'healthy' && (
        <Alert className={`mb-6 ${
          health.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Database system is showing {health.status} status. Please review system metrics below.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats?.totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">{stats?.storageUsed}GB</p>
                <p className="text-xs text-muted-foreground">of {stats?.storageTotal}GB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {health && getHealthIcon(health.status)}
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className={`text-lg font-bold capitalize ${health && getHealthColor(health.status)}`}>
                  {health?.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold">{stats?.uptime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Data Distribution</CardTitle>
                <CardDescription>Records by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Bills</span>
                    </div>
                    <span className="font-medium">{stats?.bills.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Users</span>
                    </div>
                    <span className="font-medium">{stats?.users.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Comments</span>
                    </div>
                    <span className="font-medium">{stats?.comments.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Analyses</span>
                    </div>
                    <span className="font-medium">{stats?.analyses.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Disk space utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Used Space</span>
                      <span className="text-sm text-muted-foreground">
                        {stats?.storageUsed}GB / {stats?.storageTotal}GB
                      </span>
                    </div>
                    <Progress 
                      value={stats ? (stats.storageUsed / stats.storageTotal) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="font-bold text-blue-600">
                        {stats ? (stats.storageTotal - stats.storageUsed).toFixed(1) : 0}GB
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Usage</p>
                      <p className="font-bold text-green-600">
                        {stats ? ((stats.storageUsed / stats.storageTotal) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>Real-time performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">{health?.cpu}%</span>
                  </div>
                  <Progress value={health?.cpu || 0} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">{health?.memory}%</span>
                  </div>
                  <Progress value={health?.memory || 0} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Disk I/O</span>
                    <span className="text-sm text-muted-foreground">{health?.disk}%</span>
                  </div>
                  <Progress value={health?.disk || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Connection Pool */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool</CardTitle>
                <CardDescription>Database connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {health?.connections}/{health?.maxConnections}
                    </div>
                    <p className="text-sm text-muted-foreground">Active Connections</p>
                  </div>
                  
                  <Progress 
                    value={health ? (health.connections / health.maxConnections) * 100 : 0} 
                    className="h-2"
                  />
                  
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-bold">
                        {health ? health.maxConnections - health.connections : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Utilization</p>
                      <p className="font-bold">
                        {health ? ((health.connections / health.maxConnections) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Status */}
            <Card>
              <CardHeader>
                <CardTitle>Backup Status</CardTitle>
                <CardDescription>Automated backup information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Last Backup</p>
                      <p className="text-sm text-muted-foreground">
                        {stats && new Date(stats.lastBackup).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Success</Badge>
                </div>

                <div className="space-y-3">
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Create Manual Backup
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Backup Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Backup Schedule</CardTitle>
                <CardDescription>Automated backup configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Backup</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Full Backup</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Retention Period</span>
                    <span className="text-sm text-muted-foreground">30 days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Storage Location</span>
                    <span className="text-sm text-muted-foreground">Cloud Storage</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Tasks</CardTitle>
                <CardDescription>Database optimization and cleanup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Optimize Tables
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Rebuild Indexes
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Trash className="h-4 w-4 mr-2" />
                    Clean Temporary Data
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Update Statistics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>System events and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Backup completed successfully</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span>Index optimization completed</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>High connection usage detected</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span>Scheduled maintenance in 2 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>System settings and parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Database configuration changes require administrator privileges and may require system restart.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Connection Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Connections:</span>
                        <span className="font-medium">100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connection Timeout:</span>
                        <span className="font-medium">30s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Query Timeout:</span>
                        <span className="font-medium">300s</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold">Performance Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Buffer Pool Size:</span>
                        <span className="font-medium">1GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Size:</span>
                        <span className="font-medium">256MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Log File Size:</span>
                        <span className="font-medium">100MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

