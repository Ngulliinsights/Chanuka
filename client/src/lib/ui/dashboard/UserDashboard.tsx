import { formatDistanceToNow } from 'date-fns';
import {
  Settings,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  BarChart3,
  Target,
  Award,
  Star,
} from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import type {
  EngagementHistoryItem as ImportedEngagementHistoryItem,
  UserDashboardData,
  PrivacyControls as ImportedPrivacyControls,
  UserDashboardPreferences as DashboardPreferences,
} from '@client/lib/types/user-dashboard';

import { ActivitySection } from './sections/ActivitySection';
import { BillsSection } from './sections/BillsSection';
import { StatsSection } from './sections/StatsSection';
import { useDashboardData } from './useDashboardData';

// --- Type Definitions ---

export type DashboardVariant = 'full-page' | 'section';

interface BadgeItem {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  earnedAt: string;
}

interface AchievementItem {
  id: string;
  title: string;
  progress: number;
  target: number;
  description: string;
}

// Use imported types with local extensions where needed
type DashboardData = UserDashboardData & {
  achievements?: {
    badges: BadgeItem[];
    milestones: AchievementItem[];
  };
};

type Preferences = DashboardPreferences;
type PrivacyControls = ImportedPrivacyControls;
type EngagementHistoryItem = ImportedEngagementHistoryItem;

interface UserDashboardProps {
  variant: DashboardVariant;
  className?: string;
}

export function UserDashboard({ variant, className = '' }: UserDashboardProps) {
  const {
    user,
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    filteredEngagementHistory,
    refreshDashboard,
    setShowPrivacyModal,
    setShowExportModal,
    setShowPreferencesModal,
  } = useDashboardData({
    autoLoad: true,
    trackEngagement: variant === 'section',
  });

  // Don't render if user is not authenticated
  if (!user) {
    if (variant === 'full-page') {
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
    return null;
  }

  // Loading state
  if (loading && !dashboardData) {
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
  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-8 w-8 mx-auto" />
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

  // At this point we can safely cast dashboardData to DashboardData because of the checks above
  const safeDashboardData = dashboardData as unknown as DashboardData;

  if (variant === 'full-page') {
    return (
      <FullPageDashboard
        dashboardData={safeDashboardData}
        loading={loading}
        preferences={preferences}
        privacyControls={privacyControls}
        filteredEngagementHistory={filteredEngagementHistory}
        refreshDashboard={refreshDashboard}
        setShowPrivacyModal={setShowPrivacyModal}
        setShowExportModal={setShowExportModal}
        setShowPreferencesModal={setShowPreferencesModal}
        className={className}
      />
    );
  }

  return (
    <SectionDashboard
      dashboardData={safeDashboardData}
      loading={loading}
      refreshDashboard={refreshDashboard}
      user={user}
      className={className}
    />
  );
}

// Full Page Dashboard Component
interface FullPageDashboardProps {
  dashboardData: DashboardData;
  loading: boolean;
  preferences: Preferences;
  privacyControls: PrivacyControls;
  filteredEngagementHistory: EngagementHistoryItem[];
  refreshDashboard: () => void;
  setShowPrivacyModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowPreferencesModal: (show: boolean) => void;
  className: string;
}

function FullPageDashboard({
  dashboardData,
  loading,
  preferences,
  privacyControls,
  filteredEngagementHistory,
  refreshDashboard,
  setShowPrivacyModal,
  setShowExportModal,
  setShowPreferencesModal,
  className,
}: FullPageDashboardProps) {
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
          <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowPreferencesModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <StatsSection
        stats={dashboardData?.stats}
        civicMetrics={dashboardData?.civicMetrics}
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
              <CardDescription>Your contribution to democratic engagement</CardDescription>
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
          <Button variant="outline" size="sm" onClick={() => setShowPrivacyModal(true)}>
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

// Section Dashboard Component
interface SectionDashboardProps {
  dashboardData: DashboardData;
  loading: boolean;
  refreshDashboard?: () => void;
  user: UserProfile;
  className: string;
}

function SectionDashboard({ dashboardData, loading, user, className }: SectionDashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback>
              {user.name
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">Engaged citizen working for better governance</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                Civic Score: {dashboardData?.civicMetrics?.personalScore || 0}
              </Badge>
              {user.verified && (
                <Badge variant="default">
                  <Star className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <StatsSection
        stats={dashboardData?.stats}
        civicMetrics={dashboardData?.civicMetrics}
        variant="compact"
      />

      {/* Dashboard Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="saved-bills">Saved Bills</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <ActivitySection
              activities={dashboardData?.recentActivity?.slice(0, 5)}
              loading={loading}
              compact={true}
            />

            {/* Recommended Bills */}
            <BillsSection
              trackedBills={[]}
              recommendations={dashboardData?.recommendations?.slice(0, 3)}
              loading={loading}
              compact={true}
              showRecommendations={true}
            />
          </div>

          {/* Civic Score Trend */}
          {dashboardData?.civicMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Civic Engagement Overview
                </CardTitle>
                <CardDescription>Your civic engagement metrics and progress</CardDescription>
              </CardHeader>
              <CardContent>
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
                    <p className="text-sm text-muted-foreground">Participation Rate</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-500">
                      {dashboardData.civicMetrics.scoreBreakdown.influence}
                    </p>
                    <p className="text-sm text-muted-foreground">Impact Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved-bills" className="space-y-4">
          <BillsSection
            trackedBills={dashboardData?.trackedBills}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivitySection
            activities={dashboardData?.recentActivity}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Badges Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.achievements?.badges?.length ? (
                  <div className="grid grid-cols-2 gap-4">
                    {dashboardData.achievements.badges.map((badge: BadgeItem) => (
                      <div key={badge.id} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl mb-2">{badge.icon}</div>
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned{' '}
                          {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No badges earned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.achievements?.milestones?.length ? (
                  <div className="space-y-4">
                    {dashboardData.achievements.milestones.map((achievement: AchievementItem) => (
                      <div key={achievement.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{achievement.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {achievement.progress}/{achievement.target}
                          </span>
                        </div>
                        <Progress
                          value={(achievement.progress / achievement.target) * 100}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No achievements available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
