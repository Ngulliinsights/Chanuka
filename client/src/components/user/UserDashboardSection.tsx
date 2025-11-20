/**
 * User Dashboard Section
 * Consolidates dashboard functionality with civic engagement metrics
 * Preserves strengths from UserDashboard.tsx
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { useUserDashboardStore } from '@client/store/slices/userDashboardSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { 
  BookmarkIcon, 
  TrendingUp, 
  MessageSquare, 
  Award, 
  Activity,
  BarChart3,
  Target,
  Star,
  Eye,
  Vote
} from 'lucide-react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';

export function UserDashboardSection() {
  const { user } = useAuth();
  const {
    dashboardData,
    loading: isLoading,
    error,
    addEngagementItem
  } = useUserDashboardStore();

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Track dashboard view
    if (user) {
      addEngagementItem({
        id: Date.now(),
        type: 'view',
        billId: undefined,
        timestamp: new Date().toISOString(),
        metadata: { section: 'dashboard', tab: activeTab }
      });
    }
  }, [activeTab, user]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback>
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">
              Engaged citizen working for better governance
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                Civic Score: {dashboardData?.civicMetrics?.overallScore || 0}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bills Tracked</p>
                <p className="text-2xl font-bold">{dashboardData?.stats?.totalBillsTracked || 0}</p>
              </div>
              <BookmarkIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comments</p>
                <p className="text-2xl font-bold">{dashboardData?.stats?.totalComments || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Streak Days</p>
                <p className="text-2xl font-bold">{dashboardData?.civicMetrics?.streakDays || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Badges</p>
                <p className="text-2xl font-bold">{dashboardData?.achievements?.badges?.length || 0}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="saved-bills">Saved Bills</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : dashboardData?.recentActivity?.length ? (
                  <div className="space-y-4">
                    {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            {getActivityDescription(activity)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="#" onClick={() => setActiveTab('activity')}>
                        View All Activity
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent activity to display
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trending Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommended Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : dashboardData?.recommendations?.length ? (
                  <div className="space-y-4">
                    {dashboardData.recommendations.slice(0, 3).map((recommendation) => (
                      <div key={recommendation.bill.id} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-1">{recommendation.bill.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {recommendation.bill.billNumber} • {recommendation.bill.status}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" size="sm">
                            {recommendation.bill.urgencyLevel}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/bills/${recommendation.bill.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recommendations available
                  </p>
                )}
              </CardContent>
            </Card>
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
                      {dashboardData?.civicMetrics?.communityScore || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Community Score</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-500">
                      {dashboardData?.civicMetrics?.participationRate || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Participation Rate</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-500">
                      {dashboardData?.civicMetrics?.impactScore || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Impact Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved-bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Bills ({dashboardData?.trackedBills?.length || 0})</CardTitle>
              <CardDescription>
                Bills you've saved for tracking and future reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : dashboardData?.trackedBills?.length ? (
                <div className="space-y-4">
                  {dashboardData.trackedBills.map((trackedBill) => (
                    <div key={trackedBill.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{trackedBill.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {trackedBill.billNumber} • {trackedBill.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last updated {formatDistanceToNow(new Date(trackedBill.lastStatusChange), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/bills/${trackedBill.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookmarkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Saved Bills</h3>
                  <p className="text-muted-foreground mb-4">
                    Start saving bills to track their progress and stay informed.
                  </p>
                  <Button asChild>
                    <Link to="/bills">Browse Bills</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement History</CardTitle>
              <CardDescription>
                Your complete activity history on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : dashboardData?.recentActivity?.length ? (
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{getActivityDescription(activity)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No activity history available
                </p>
              )}
            </CardContent>
          </Card>
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
                    {dashboardData.achievements.badges.map((badge) => (
                      <div key={badge.id} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl mb-2">{badge.icon}</div>
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
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
                    {dashboardData.achievements.milestones.map((achievement) => (
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

// Helper functions
function getActivityIcon(actionType: string) {
  const iconMap = {
    view: <Eye className="h-4 w-4 text-blue-500" />,
    comment: <MessageSquare className="h-4 w-4 text-green-500" />,
    save: <BookmarkIcon className="h-4 w-4 text-yellow-500" />,
    vote: <Vote className="h-4 w-4 text-red-500" />
  };
  return iconMap[actionType as keyof typeof iconMap] || <Activity className="h-4 w-4 text-gray-500" />;
}

function getActivityDescription(activity: any) {
  const actionMap = {
    view: `Viewed ${activity.billId ? 'bill' : 'dashboard'}`,
    comment: `Commented on ${activity.billId ? 'bill' : 'discussion'}`,
    save: `Saved ${activity.billId ? 'bill' : 'item'}`,
    vote: `Voted on ${activity.billId ? 'bill' : 'item'}`
  };
  return actionMap[activity.type as keyof typeof actionMap] || `Performed ${activity.type}`;
}

export default UserDashboardSection;