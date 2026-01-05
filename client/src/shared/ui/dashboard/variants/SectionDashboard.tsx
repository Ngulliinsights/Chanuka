import { formatDistanceToNow } from 'date-fns';
import {
  BarChart3,
  Target,
  Award,
  Star
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/design-system';
import { Badge } from '@/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/design-system';

import { ActivitySection } from '../sections/ActivitySection';
import { BillsSection } from '../sections/BillsSection';
import { StatsSection } from '../sections/StatsSection';
import { useDashboardData } from '../useDashboardData';

// Local interface definition matching the data structure usage in this component
interface DashboardAchievement {
  id: string;
  title: string;
  description: string;
  category: string;
  earnedAt: string;
}

interface SectionDashboardProps {
  className?: string;
}

export function SectionDashboard({ className = '' }: SectionDashboardProps) {
  const {
    user,
    dashboardData,
    loading
  } = useDashboardData({
    autoLoad: true,
    trackEngagement: true
  });

  if (!user) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback>
              {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">
              Engaged citizen working for better governance
            </p>
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
              activities={dashboardData?.recentActivity?.slice(0, 5) || []}
              loading={loading}
              compact={true}
            />

            {/* Recommended Bills */}
            <BillsSection
              trackedBills={[]}
              recommendations={dashboardData?.recommendations?.slice(0, 3) || []}
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
                <CardDescription>
                  Your civic engagement metrics and progress
                </CardDescription>
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
            activities={dashboardData?.recentActivity || []}
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
                {dashboardData?.civicMetrics?.achievements?.length ? (
                  <div className="grid grid-cols-2 gap-4">
                    {(dashboardData.civicMetrics.achievements as DashboardAchievement[]).map((achievement) => (
                      <div key={achievement.id} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl mb-2">🏆</div>
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No achievements earned yet</p>
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
                {dashboardData?.civicMetrics?.achievements?.length ? (
                  <div className="space-y-4">
                    {(dashboardData.civicMetrics.achievements as DashboardAchievement[]).map((achievement) => (
                      <div key={achievement.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{achievement.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {achievement.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {formatDistanceToNow(new Date(achievement.earnedAt), { addSuffix: true })}
                        </p>
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
