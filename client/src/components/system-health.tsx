import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Download, 
  Database, 
  Shield,
  Activity,
  Clock,
  Server,
  HardDrive,
  Settings
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { logger } from '@/utils/browser-logger';

interface SystemHealthProps {
  health?: any;
  stats?: any;
  environment?: any;
  activity?: any;
}

export default function SystemHealth({ health, stats, environment, activity }: SystemHealthProps) {
  const isConnected = health?.status === 'healthy';

  const quickActions = [
    { icon: RefreshCw, label: 'Refresh Schema', variant: 'default' as const },
    { icon: Download, label: 'Export Schema', variant: 'outline' as const },
    { icon: Database, label: 'Seed Database', variant: 'outline' as const },
    { icon: Shield, label: 'Backup Database', variant: 'outline' as const },
  ];

  const healthMetrics = [
    {
      label: 'Database Connection',
      value: isConnected ? 'Healthy' : 'Disconnected',
      status: isConnected ? 'success' : 'error',
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: 'Active Connections',
      value: '12/20',
      status: 'success',
      icon: <Server className="h-4 w-4" />,
    },
    {
      label: 'Query Performance',
      value: '45ms avg',
      status: 'success',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: 'Memory Usage',
      value: '68%',
      status: 'warning',
      icon: <HardDrive className="h-4 w-4" />,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="w-full justify-start"
              size="sm"
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Real-time system monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthMetrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn("p-1 rounded", getStatusColor(metric.status))}>
                  {metric.icon}
                </div>
                <span className="text-sm text-gray-600">{metric.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={cn("w-2 h-2 rounded-full", getStatusDot(metric.status))} />
                <span className={cn("text-sm font-medium", getStatusColor(metric.status))}>
                  {metric.value}
                </span>
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Health Check</span>
            <span className="text-sm text-gray-500">
              {health?.timestamp ? formatRelativeTime(health.timestamp) : '2 minutes ago'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activity?.recentUsers?.slice(0, 3).map((user: any, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div>
                  <p className="text-sm text-gray-900">New user: {user.name}</p>
                  <p className="text-xs text-gray-500">
                    {user.createdAt ? formatRelativeTime(user.createdAt) : '2 minutes ago'}
                  </p>
                </div>
              </div>
            ))}

            {activity?.recentBills?.slice(0, 2).map((bill: any, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm text-gray-900">New bill: {bill.title}</p>
                  <p className="text-xs text-gray-500">
                    {bill.createdAt ? formatRelativeTime(bill.createdAt) : '5 minutes ago'}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="text-sm text-gray-900">Database connection established</p>
                <p className="text-xs text-gray-500">10 minutes ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {environment && Object.entries(environment).slice(0, 4).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{key}</span>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  value === 'Set' || (typeof value === 'string' && value !== 'Not set') 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                )} />
                <span className="text-xs font-medium text-gray-900">
                  {typeof value === 'string' && value !== 'Set' ? value : 
                   value === 'Set' ? 'Set' : 'Not Set'}
                </span>
              </div>
            </div>
          ))}

          <Separator />

          <Button variant="outline" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Edit Variables
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}