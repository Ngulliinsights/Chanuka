import { Calendar, TrendingUp, Users, AlertTriangle, Download } from 'lucide-react';
import { useState } from 'react';

import { useAnalyticsDashboard } from '@client/context';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

import type { AnalyticsFilters } from '@client/types';

// Type definitions for dashboard data structure
interface DashboardSummary {
  totalBills: number;
  totalEngagement: number;
  averageEngagementRate: number;
  conflictsDetected: number;
  trendingTopics: string[];
  topStakeholderGroups: string[];
}

interface BillEngagement {
  views: number;
  comments: number;
}

interface TopBill {
  id: string;
  title: string;
  status: string;
  engagement: BillEngagement;
}

interface RecentActivity {
  user_id: string;
  totalEngagement: number;
  activityScore: number;
  lastActive: string;
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  created_at: string;
  acknowledged: boolean;
}

interface DashboardData {
  summary: DashboardSummary;
  topBills: TopBill[];
  recentActivity: RecentActivity[];
  alerts: Alert[];
}

export function AnalyticsDashboard() {
  const [filters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    }
  });

  // Hook to fetch dashboard data
  const { data: dashboard, isLoading, error } = useAnalyticsDashboard(filters);

  // Export handlers (commented out - implement when export mutation is available)
  const handleExport = (format: 'csv' | 'json') => {
    console.log(`Exporting as ${format}`, filters);
    // TODO: Implement export functionality
    // exportMutation.mutate({ filters, format });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load analytics data. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, topBills, recentActivity, alerts } = dashboard as DashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track engagement, conflicts, and stakeholder impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBills.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active legislative items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEngagement.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summary.averageEngagementRate.toFixed(1)}% avg. rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.conflictsDetected}</div>
            <p className="text-xs text-muted-foreground">
              Potential issues identified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Top Bills</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.trendingTopics.slice(0, 5).map((topic: string, index: number) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="text-sm">{topic}</span>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stakeholder Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.topStakeholderGroups.slice(0, 5).map((group: string, index: number) => (
                    <div key={group} className="flex items-center justify-between">
                      <span className="text-sm">{group}</span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Engaged Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topBills.slice(0, 10).map((bill: TopBill, index: number) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{bill.title}</h3>
                        <p className="text-sm text-muted-foreground">{bill.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {bill.engagement.views} views
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bill.engagement.comments} comments
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.slice(0, 10).map((activity: RecentActivity) => (
                  <div key={activity.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">User Activity</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.totalEngagement} total engagements
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        Score: {activity.activityScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last active: {new Date(activity.lastActive).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground">No active alerts</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert: Alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <h3 className="font-medium">{alert.title}</h3>
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button variant="outline" size="sm">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;