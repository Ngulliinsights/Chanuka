import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target, 
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useJourneyAnalytics } from '../../hooks/use-journey-tracker';
import { JourneyAnalytics, JourneyOptimization, PathAnalytics, DropOffPoint, ConversionFunnel } from '../../services/UserJourneyTracker';
import { UserRole } from '../../types/navigation';
import { logger } from '@/utils/browser-logger';

interface JourneyAnalyticsDashboardProps {
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function JourneyAnalyticsDashboard({ className }: JourneyAnalyticsDashboardProps) {
  const { getAnalytics, getOptimizations, getGoalCompletionRate, exportData } = useJourneyAnalytics();
  const [analytics, setAnalytics] = useState<JourneyAnalytics | null>(null);
  const [optimizations, setOptimizations] = useState<JourneyOptimization[]>([]);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | 'all'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(false);

  /**
   * Calculate date range
   */
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case '30d':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
      case '90d':
        return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
      default:
        return { start: undefined, end: undefined };
    }
  };

  /**
   * Load analytics data
   */
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const userRole = selectedUserRole === 'all' ? undefined : selectedUserRole;
      
      const analyticsData = getAnalytics(start, end, userRole);
      const optimizationData = getOptimizations(start, end);
      
      setAnalytics(analyticsData);
      setOptimizations(optimizationData);
    } catch (error) {
      logger.error('Failed to load analytics:', { component: 'Chanuka' }, error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export analytics data
   */
  const handleExport = (format: 'json' | 'csv') => {
    const data = exportData(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journey-analytics-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Format time duration
   */
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Get priority color
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadAnalytics();
  }, [selectedUserRole, dateRange]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Journey Analytics</h2>
          <p className="text-muted-foreground">
            Track user journeys and optimize navigation flows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedUserRole} onValueChange={(value: UserRole | 'all') => setSelectedUserRole(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="citizen">Citizen</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadAnalytics} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Journeys</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalJourneys.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedJourneys} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.completionRate * 100).toFixed(1)}%
            </div>
            <Progress value={analytics.completionRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analytics.averageTimeSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.averageJourneyLength.toFixed(1)} pages avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.bounceRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Single page visits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="paths" className="space-y-4">
        <TabsList>
          <TabsTrigger value="paths">Popular Paths</TabsTrigger>
          <TabsTrigger value="dropoffs">Drop-off Points</TabsTrigger>
          <TabsTrigger value="funnels">Conversion Funnels</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
        </TabsList>

        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular User Paths</CardTitle>
              <CardDescription>
                Common navigation patterns and their completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.popularPaths.slice(0, 10).map((path: PathAnalytics, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {path.path.join(' → ')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {path.frequency} users • {formatDuration(path.averageCompletionTime)} avg time
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={path.completionRate > 0.7 ? 'default' : 'secondary'}>
                        {(path.completionRate * 100).toFixed(1)}% completion
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dropoffs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drop-off Analysis</CardTitle>
              <CardDescription>
                Pages where users commonly exit the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.dropOffPoints.map((dropOff: DropOffPoint, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{dropOff.pageId}</div>
                      <Badge variant={dropOff.dropOffRate > 0.5 ? 'destructive' : 'default'}>
                        {(dropOff.dropOffRate * 100).toFixed(1)}% drop-off
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Avg time before exit: {formatDuration(dropOff.averageTimeBeforeExit)}
                    </div>
                    {dropOff.improvementSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Suggestions:</div>
                        {dropOff.improvementSuggestions.map((suggestion: string, idx: number) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-4">
          <div className="grid gap-4">
            {analytics.conversionFunnels.map((funnel: ConversionFunnel, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{funnel.name} Funnel</CardTitle>
                  <CardDescription>
                    {funnel.totalConversions} total conversions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {funnel.steps.map((step: string, stepIndex: number) => (
                      <div key={stepIndex} className="flex items-center space-x-4">
                        <div className="w-32 text-sm font-medium truncate">
                          {step}
                        </div>
                        <div className="flex-1">
                          <Progress 
                            value={funnel.conversionRates[stepIndex] * 100} 
                            className="h-2"
                          />
                        </div>
                        <div className="w-16 text-sm text-right">
                          {(funnel.conversionRates[stepIndex] * 100).toFixed(1)}%
                        </div>
                        {funnel.dropOffPoints[stepIndex] > 0.1 && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-generated suggestions to improve user journeys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((optimization, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{optimization.pageId}</div>
                        <div className="text-sm text-muted-foreground">
                          {optimization.optimizationType.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(optimization.priority)}>
                          {optimization.priority}
                        </Badge>
                        <Badge variant="outline">
                          {(optimization.expectedImpact * 100).toFixed(0)}% impact
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{optimization.description}</p>
                    <div className="text-xs text-muted-foreground">
                      Implementation effort: {optimization.implementationEffort}
                    </div>
                  </div>
                ))}
                {optimizations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No optimization recommendations available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}