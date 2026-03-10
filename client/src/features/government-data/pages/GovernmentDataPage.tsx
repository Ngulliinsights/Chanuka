/**
 * Government Data Page
 * Main page for government data management with overview and list
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { 
  Database, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  RefreshCw,
  Settings,
  BarChart3,
  FileText,
  ExternalLink
} from 'lucide-react';
import { GovernmentDataList } from '../ui/GovernmentDataList';
import { 
  useGovernmentDataStatistics, 
  useGovernmentDataHealth,
  useGovernmentDataSyncLogs 
} from '../hooks';
import { GovernmentData, GovernmentDataFilters } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const GovernmentDataPage: React.FC = () => {
  const [selectedData, setSelectedData] = useState<GovernmentData | null>(null);
  const [filters, setFilters] = useState<GovernmentDataFilters>({});

  // Fetch overview data
  const { data: statisticsResponse, isLoading: statsLoading } = useGovernmentDataStatistics();
  const { data: healthResponse, isLoading: healthLoading } = useGovernmentDataHealth();
  const { data: syncLogsResponse, isLoading: syncLoading } = useGovernmentDataSyncLogs(undefined, 5);

  const statistics = statisticsResponse?.data;
  const health = healthResponse?.data;
  const syncLogs = syncLogsResponse?.data || [];

  const handleDataSelect = (data: GovernmentData) => {
    setSelectedData(data);
    // TODO: Navigate to detail page or open modal
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Government Data</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor government data integration and synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Records */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : (statistics?.total || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all data sources
            </p>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : Object.keys(statistics?.bySource || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active integration sources
            </p>
          </CardContent>
        </Card>

        {/* Data Types */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : Object.keys(statistics?.byDataType || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Different content types
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getHealthStatusColor(health?.status || 'unknown')}>
                {healthLoading ? '...' : (health?.status || 'Unknown')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.lastSync 
                ? `Last sync ${formatDistanceToNow(health.lastSync, { addSuffix: true })}`
                : 'No recent sync'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sync">Synchronization</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <GovernmentDataList
            filters={filters}
            onFiltersChange={setFilters}
            onDataSelect={handleDataSelect}
            showActions={true}
            pageSize={20}
          />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Data Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(statistics?.byDataType || {})
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{type}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${statistics?.total ? (count / statistics.total) * 100 : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                              {count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Source Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(statistics?.bySource || {})
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{source}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${statistics?.total ? (count / statistics.total) * 100 : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                              {count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Synchronization Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Synchronization Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {syncLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No synchronization logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge className={getSyncStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <div>
                          <p className="font-medium">{log.source}</p>
                          <p className="text-sm text-gray-600">{log.operation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {log.records_processed} processed
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDistanceToNow(log.created_at, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Status</span>
                      <Badge className={getHealthStatusColor(health?.status || 'unknown')}>
                        {health?.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database</span>
                        <Badge variant={health?.checks.database ? 'default' : 'destructive'}>
                          {health?.checks.database ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cache</span>
                        <Badge variant={health?.checks.cache ? 'default' : 'destructive'}>
                          {health?.checks.cache ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">External APIs</span>
                        <Badge variant={health?.checks.externalAPIs ? 'default' : 'destructive'}>
                          {health?.checks.externalAPIs ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Health Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Records</span>
                      <span className="font-medium">
                        {(health?.totalRecords || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Sync</span>
                      <span className="font-medium">
                        {health?.lastSync 
                          ? formatDistanceToNow(health.lastSync, { addSuffix: true })
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};