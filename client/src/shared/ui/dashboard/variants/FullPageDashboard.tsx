import {
  Settings,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import React from 'react';

import { Button } from '@client/shared/design-system/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system/primitives/tabs';

import { ActivitySection } from '../sections/ActivitySection';
import { BillsSection } from '../sections/BillsSection';
import { StatsSection } from '../sections/StatsSection';
import { useDashboardData } from '../useDashboardData';

interface FullPageDashboardProps {
  className?: string;
}

export function FullPageDashboard({ className = '' }: FullPageDashboardProps) {
  const {
    user,
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    timeFilter,
    hasData,
    filteredEngagementHistory,
    engagementStats,
    refreshDashboard,
    setTimeFilter,
    showPrivacyModal,
    setShowPrivacyModal,
    showExportModal,
    setShowExportModal,
    showPreferencesModal,
    setShowPreferencesModal
  } = useDashboardData({ autoLoad: true });

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground">
            You need to be signed in to view your personalized dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <div className="h-8 w-8 mx-auto">⚠️</div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshDashboard} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const visibleSections = preferences.pinnedSections.filter(
    (section: string) => !preferences.hiddenSections.includes(section)
  );

  return (
    <div className={`chanuka-container space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Civic Dashboard</h1>
          <p className="text-muted-foreground">
            Track legislation, measure your impact, and stay engaged
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferencesModal(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <StatsSection
        stats={dashboardData?.stats}
        civicMetrics={dashboardData?.civicMetrics}
        loading={loading}
        variant="full"
      />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Tracked Bills</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tracked Bills Summary */}
            {visibleSections.includes('tracked-bills') && (
              <BillsSection
                trackedBills={dashboardData?.trackedBills?.slice(0, 5)}
                loading={loading}
                compact={true}
              />
            )}

            {/* Recent Activity */}
            {visibleSections.includes('recent-activity') && privacyControls.showActivity && (
              <ActivitySection
                activities={filteredEngagementHistory.slice(0, 5)}
                loading={loading}
                compact={true}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="bills">
          <BillsSection
            trackedBills={dashboardData?.trackedBills}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivitySection
            activities={filteredEngagementHistory}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="impact">
          <Card>
            <CardHeader>
              <CardTitle>Civic Impact Metrics</CardTitle>
              <CardDescription>
                Your contribution to democratic engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.civicMetrics && (
                <div className="grid lg:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-500">
                      {dashboardData.civicMetrics.personalScore}
                    </p>
                    <p className="text-sm text-muted-foreground">Personal Score</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-500">
                      {dashboardData.civicMetrics.scoreBreakdown.participation}%
                    </p>
                    <p className="text-sm text-muted-foreground">Participation</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-500">
                      {dashboardData.civicMetrics.scoreBreakdown.influence}
                    </p>
                    <p className="text-sm text-muted-foreground">Influence</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Privacy and Export Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
        <div className="flex-1">
          <h3 className="font-medium mb-2">Privacy & Data</h3>
          <p className="text-sm text-muted-foreground">
            Control your privacy settings and export your data
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrivacyModal(true)}
          >
            {privacyControls.profileVisibility === 'private' ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Privacy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            disabled={!privacyControls.allowDataExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
}