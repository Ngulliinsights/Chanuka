/**
 * Pretext Detection Page
 * 
 * Main page for the pretext detection feature
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import { PretextDetectionPanel } from '../ui/PretextDetectionPanel';
import { usePretextAlerts, usePretextAnalytics } from '../hooks/usePretextDetectionApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';
import { analyticsService } from '@client/infrastructure/analytics/service';

/**
 * Pretext Detection Page Component
 */
export function PretextDetectionPage() {
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Fetch alerts and analytics
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = usePretextAlerts();
  const { data: analytics, isLoading: analyticsLoading } = usePretextAnalytics();

  // Calculate stats
  const pendingAlerts = alerts?.filter(a => a.status === 'pending').length || 0;
  const highRiskAlerts = alerts?.filter(a => a.score > 70).length || 0;

  // Track page view on mount
  useEffect(() => {
    analyticsService.trackPageView({
      path: '/pretext-detection',
      title: 'Pretext Detection',
    });
  }, []);

  // Track tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    analyticsService.trackUserAction({
      action: 'tab_change',
      category: 'pretext_detection',
      label: tab,
    });
  };

  return (
    <>
      <Helmet>
        <title>Pretext Detection - Chanuka</title>
        <meta 
          name="description" 
          content="Detect and analyze potential pretext bills using advanced pattern recognition and network analysis." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Pretext Detection</h1>
            </div>
            <p className="text-gray-600">
              Identify potential pretext bills using advanced pattern recognition, timing analysis, and network mapping.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {analyticsLoading ? '...' : analytics?.totalAnalyses || 0}
                  </span>
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{pendingAlerts}</span>
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">High Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{highRiskAlerts}</span>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {analyticsLoading ? '...' : Math.round(analytics?.averageScore || 0)}
                  </span>
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts
                {pendingAlerts > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>How Pretext Detection Works</CardTitle>
                  <CardDescription>
                    Our system analyzes bills using multiple indicators to identify potential pretext legislation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Timing Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Detects bills introduced shortly after crisis events or coordinated with media coverage
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Beneficiary Mismatch</h3>
                        <p className="text-sm text-gray-600">
                          Identifies discrepancies between stated purpose and actual beneficiaries
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Network Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Maps connections between sponsors, beneficiaries, and financial interests
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Scope Creep Detection</h3>
                        <p className="text-sm text-gray-600">
                          Analyzes bill text for broad powers or vague language beyond stated purpose
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts">
              {alertsLoading ? (
                <LoadingStateManager type="content" state="loading" message="Loading alerts..." />
              ) : alertsError ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-600">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <p>Failed to load alerts. Please try again later.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Card key={alert.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Bill {alert.billId}</CardTitle>
                          <Badge
                            variant={
                              alert.status === 'pending'
                                ? 'default'
                                : alert.status === 'approved'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {alert.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Risk Score: {alert.score}/100 • Created {new Date(alert.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {alert.detections.map((detection, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Badge variant="outline" className="mt-0.5">
                                {detection.severity}
                              </Badge>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{detection.type}</p>
                                <p className="text-sm text-gray-600">{detection.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-2" />
                      <p>No alerts found. All bills are clear!</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detections by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <LoadingStateManager type="content" state="loading" message="Loading analytics..." />
                    ) : analytics?.detectionsByType ? (
                      <div className="space-y-2">
                        {Object.entries(analytics.detectionsByType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm">{type}</span>
                            <Badge>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alerts by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <LoadingStateManager type="content" state="loading" message="Loading analytics..." />
                    ) : analytics?.alertsByStatus ? (
                      <div className="space-y-2">
                        {Object.entries(analytics.alertsByStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{status}</span>
                            <Badge>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default PretextDetectionPage;
