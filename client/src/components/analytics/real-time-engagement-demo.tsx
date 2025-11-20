/**
 * Real-Time Engagement Analytics Demo
 * 
 * Demonstrates the Real-Time Engagement Dashboard with mock data
 * and integration examples for development and testing.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { RealTimeEngagementDashboard } from './real-time-engagement-dashboard';
import { generateMockEngagementData } from '@client/hooks/useRealTimeEngagement';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Info,
  Zap,
  Users,
  TrendingUp,
  Award
} from 'lucide-react';
import { cn } from '@client/lib/utils';

interface RealTimeEngagementDemoProps {
  className?: string;
}

export function RealTimeEngagementDemo({ className }: RealTimeEngagementDemoProps) {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | undefined>(undefined);
  const [demoConfig, setDemoConfig] = useState({
    showMockData: true,
    simulateRealTime: false,
    enableNotifications: true
  });

  const mockData = generateMockEngagementData();

  const handleToggleLiveMode = () => {
    setIsLiveMode(!isLiveMode);
  };

  const handleResetDemo = () => {
    setIsLiveMode(false);
    setSelectedBillId(undefined);
    setDemoConfig({
      showMockData: true,
      simulateRealTime: false,
      enableNotifications: true
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Demo Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Real-Time Engagement Analytics Demo
          </h1>
          <p className="text-muted-foreground">
            Interactive demonstration of live civic engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleToggleLiveMode}
            variant={isLiveMode ? 'default' : 'outline'}
            size="sm"
          >
            {isLiveMode ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Demo
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Demo
              </>
            )}
          </Button>
          <Button onClick={handleResetDemo} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Demo Status */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This demo showcases the Real-Time Engagement Analytics Dashboard with {demoConfig.showMockData ? 'mock' : 'live'} data.
          {isLiveMode && ' Live mode is active - metrics will update automatically.'}
        </AlertDescription>
      </Alert>

      {/* Demo Configuration */}
      <Card className="chanuka-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Demo Configuration
          </CardTitle>
          <CardDescription>
            Configure the demo settings and data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Source</label>
              <div className="flex items-center space-x-2">
                <Badge variant={demoConfig.showMockData ? 'default' : 'secondary'}>
                  {demoConfig.showMockData ? 'Mock Data' : 'Live Data'}
                </Badge>
                <Button
                  onClick={() => setDemoConfig(prev => ({ ...prev, showMockData: !prev.showMockData }))}
                  variant="outline"
                  size="sm"
                >
                  Toggle
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Real-Time Updates</label>
              <div className="flex items-center space-x-2">
                <Badge variant={isLiveMode ? 'default' : 'secondary'}>
                  {isLiveMode ? 'Active' : 'Inactive'}
                </Badge>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bill Context</label>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedBillId ? 'default' : 'outline'}>
                  {selectedBillId ? `Bill #${selectedBillId}` : 'Global View'}
                </Badge>
                <Button
                  onClick={() => setSelectedBillId(selectedBillId ? undefined : 12345)}
                  variant="outline"
                  size="sm"
                >
                  Toggle
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notifications</label>
              <div className="flex items-center space-x-2">
                <Badge variant={demoConfig.enableNotifications ? 'default' : 'secondary'}>
                  {demoConfig.enableNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button
                  onClick={() => setDemoConfig(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
                  variant="outline"
                  size="sm"
                >
                  Toggle
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Metrics</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(mockData.liveMetrics.communityApproval * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Community approval with real-time updates
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockData.liveMetrics.totalParticipants.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active community members
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockData.personalScore.totalScore.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Civic engagement score (Rank #{mockData.personalScore.rank})
            </p>
          </CardContent>
        </Card>

        <Card className="chanuka-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expert Support</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(mockData.liveMetrics.expertSupport * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Expert verification and support
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
          <TabsTrigger value="api">API Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <RealTimeEngagementDashboard 
            billId={selectedBillId}
            className="min-h-[600px]"
          />
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card className="chanuka-card">
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                How to integrate the Real-Time Engagement Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Usage</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
{`import { RealTimeEngagementDashboard } from '@/components/analytics';

// Global engagement view
<RealTimeEngagementDashboard />

// Bill-specific engagement view
<RealTimeEngagementDashboard billId={12345} />`}
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">With Custom Hook</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
{`import { useRealTimeEngagement } from '@/hooks/useRealTimeEngagement';

const { data, loading, error, isConnected } = useRealTimeEngagement({
  billId: 12345,
  autoRefresh: true,
  enableRealTime: true
});`}
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">WebSocket Integration</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
{`// Automatic WebSocket subscription for real-time updates
// Handles engagement_update, sentiment_update, expert_update messages
// Graceful fallback to polling when WebSocket unavailable`}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card className="chanuka-card">
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Backend API endpoints for engagement analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Global Analytics</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      GET /api/engagement/analytics
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Bill-Specific Analytics</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      GET /api/engagement/analytics/:billId
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Export Data</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
                      GET /api/engagement/analytics/export?format=csv|json
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">WebSocket Messages</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">
{`// Subscribe to engagement updates
{
  "type": "subscribe",
  "data": {
    "channel": "engagement_analytics",
    "billId": 12345 // optional
  }
}

// Real-time update message
{
  "type": "engagement_update",
  "data": {
    "liveMetrics": { ... },
    "sentiment": { ... }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}`}
                    </code>
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