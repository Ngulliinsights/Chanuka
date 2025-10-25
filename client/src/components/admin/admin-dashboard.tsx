import { useState } from 'react';
import { 
  Users, 
  FileText, 
  MessageCircle, 
  TrendingUp, 
  Shield, 
  Settings, 
  Database, 
  Activity,
  Monitor
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MonitoringDashboard } from '../monitoring/monitoring-dashboard';
import AuthenticatedAPI from '../../utils/authenticated-api';
import { logger } from '../../utils/browser-logger';

// Enhanced type definitions for better type safety
interface UserRoleData {
  role: string;
  count: number;
}

interface BillStatusData {
  status: string;
  count: number;
}

interface AdminStats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    byRole: UserRoleData[];
  };
  bills: {
    total: number;
    byStatus: BillStatusData[];
    newThisWeek: number;
  };
  engagement: {
    totalComments: number;
    totalAnalyses: number;
    activeUsers: number;
  };
  system: {
    databaseHealth: boolean;
    errorRate: number;
  };
}

interface SystemHealth {
  database: boolean;
  memory: number;
  diskSpace: number;
  uptime: number;
}

// Custom hook for fetching admin stats with enhanced security and race condition prevention
const useAdminStats = () => {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async ({ signal }) => {
      const result = await AuthenticatedAPI.adminGet<AdminStats>('/api/admin/dashboard/stats', {
        signal, // Add AbortController support for race condition prevention
        timeout: 15000, // 15 second timeout
        retries: 2 // Retry failed requests
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
    retry: 1, // Let AuthenticatedAPI handle retries
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Custom hook for system health monitoring with enhanced security
const useSystemHealth = () => {
  return useQuery<SystemHealth>({
    queryKey: ['admin', 'health'],
    queryFn: async ({ signal }) => {
      const result = await AuthenticatedAPI.adminGet<SystemHealth>('/api/admin/health', {
        signal, // Add AbortController support for race condition prevention
        timeout: 10000, // 10 second timeout
        retries: 1 // Retry once for health checks
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 8000, // Consider data stale after 8 seconds
    retry: 1, // Let AuthenticatedAPI handle retries
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Use our custom hooks for better separation of concerns
  const { data: stats, isLoading, error: statsError } = useAdminStats();
  const { data: systemHealth, error: healthError } = useSystemHealth();

  // Enhanced color palette for better visual distinction
  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Utility function with better time formatting
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Enhanced error handling with specific error messages
  if (statsError || healthError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <Shield className="h-5 w-5" />
              <span>Failed to load dashboard data. Please try refreshing the page.</span>
            </div>
            {statsError && (
              <p className="text-sm text-red-600 mt-2">
                Stats Error: {statsError.message}
              </p>
            )}
            {healthError && (
              <p className="text-sm text-red-600 mt-2">
                Health Error: {healthError.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enhanced loading state with skeleton-like appearance
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Helper function to determine system health status
  const getSystemHealthStatus = (): { variant: "default" | "destructive", text: string } => {
    const isHealthy = systemHealth?.database && 
                     (systemHealth?.memory || 0) < 90 && 
                     (systemHealth?.diskSpace || 0) < 90;
    
    return {
      variant: isHealthy ? 'default' : 'destructive',
      text: isHealthy ? 'System Healthy' : 'System Issues'
    };
  };

  const healthStatus = getSystemHealthStatus();

  return (
    <div className="p-6 space-y-6">
      {/* Header section with enhanced status indication */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={healthStatus.variant}>
            {healthStatus.text}
          </Badge>
          {systemHealth?.uptime && (
            <Badge variant="outline">
              Uptime: {formatUptime(systemHealth.uptime)}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats with improved default handling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.users.newThisWeek ?? 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bills.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.bills.newThisWeek ?? 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.active ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.engagement.activeUsers ?? 0} engaged this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.database ? '100%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Error rate: {((stats?.system.errorRate ?? 0) * 100).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics with improved type safety */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Roles Distribution with fixed TypeScript types */}
            <Card>
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats?.users.byRole ?? []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, count }: UserRoleData) => `${role}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(stats?.users.byRole ?? []).map((entry: UserRoleData, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bill Status Distribution with enhanced styling */}
            <Card>
              <CardHeader>
                <CardTitle>Bill Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.bills.byStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Registered Users</span>
                  <Badge variant="outline">{stats?.users.total ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Users</span>
                  <Badge variant="outline">{stats?.users.active ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>New This Week</span>
                  <Badge variant="outline">{stats?.users.newThisWeek ?? 0}</Badge>
                </div>
                <Button className="w-full" onClick={() => logger.info('Navigate to user management', { component: 'Chanuka' }, )}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Bills</span>
                  <Badge variant="outline">{stats?.bills.total ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Comments</span>
                  <Badge variant="outline">{stats?.engagement.totalComments ?? 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Analyses</span>
                  <Badge variant="outline">{stats?.engagement.totalAnalyses ?? 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => console.log('Review flagged content')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Review Flagged Content
                </Button>
                <Button variant="outline" className="w-full" onClick={() => console.log('Moderate comments')}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Moderate Comments
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Database</span>
                    <Badge variant={systemHealth?.database ? 'default' : 'destructive'}>
                      {systemHealth?.database ? 'Healthy' : 'Error'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <span>{systemHealth?.memory ?? 0}%</span>
                  </div>
                  <Progress value={systemHealth?.memory ?? 0} className="w-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Disk Usage</span>
                    <span>{systemHealth?.diskSpace ?? 0}%</span>
                  </div>
                  <Progress value={systemHealth?.diskSpace ?? 0} className="w-full" />
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span>{formatUptime(systemHealth?.uptime ?? 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => console.log('Open system settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
                <Button variant="outline" className="w-full" onClick={() => console.log('Open database management')}>
                  <Database className="h-4 w-4 mr-2" />
                  Database Management
                </Button>
                <Button variant="outline" className="w-full" onClick={() => console.log('View system logs')}>
                  <Activity className="h-4 w-4 mr-2" />
                  View System Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <MonitoringDashboard />
        </TabsContent>
      </Tabs>
    </div>);
};

export default AdminDashboard;