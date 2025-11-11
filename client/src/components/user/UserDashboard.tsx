/**
 * User Dashboard Component
 * Personalized dashboard showing user profile, saved bills, engagement history, and recommendations
 */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { userBackendService } from '../../services/user-backend-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  User, 
  BookmarkIcon, 
  TrendingUp, 
  MessageSquare, 
  Award, 
  Activity,
  Settings,
  Bell,
  Calendar,
  BarChart3,
  Target,
  Star,
  Clock,
  Eye,
  Heart,
  Share2,
  Vote,
  FileText
} from 'lucide-react';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';

interface UserDashboardProps {
  className?: string;
}

export function UserDashboard({ className }: UserDashboardProps) {
  const { user, isAuthenticated } = useAuth();
  const {
    profile,
    preferences,
    savedBills,
    engagementHistory,
    badges,
    achievements,
    dashboardData,
    fetchDashboardData,
    fetchSavedBills,
    fetchEngagementHistory,
    fetchAchievements,
    trackEngagement,
    clearError
  } = useUserStore();

  const isLoading = useUserStore(userSelectors.isLoading);
  const error = useUserStore(userSelectors.getError);

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isAuthenticated && user) {
      // Load dashboard data from backend
      loadDashboardData();

      // Track dashboard view
      trackEngagement({
        action_type: 'view',
        entity_type: 'dashboard',
        entity_id: 'user-dashboard',
        metadata: { tab: activeTab }
      });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Track tab changes
    if (activeTab !== 'overview') {
      trackEngagement({
        action_type: 'view',
        entity_type: 'dashboard',
        entity_id: `dashboard-${activeTab}`,
        metadata: { tab: activeTab }
      });
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      if (!user?.id) return;
      
      // Load dashboard data from backend
      const dashboardData = await userBackendService.getDashboardData(user.id);
      useUserDashboardStore.getState().setDashboardData(dashboardData);
      
      // Load user profile
      const userProfile = await userBackendService.getUserProfile(user.id);
      
      // Update profile in store if needed
      if (userProfile) {
        // You could update a profile store here if you have one
        logger.info('User profile loaded', { userId: user.id });
      }
    } catch (error) {
      logger.error('Failed to load dashboard data', { error });
      
      // Fallback to mock data for development
      try {
        const mockData = await generateMockDashboardData();
        useUserDashboardStore.getState().setDashboardData(mockData);
        logger.warn('Using mock data as fallback');
      } catch (mockError) {
        clearError();
        // Set error through the store
        useUserStore.getState().setError?.(error instanceof Error ? error.message : 'Failed to load dashboard');
      }
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to access your personalized dashboard.
              </p>
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={() => {
          clearError();
          fetchDashboardData();
        }}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} alt={profile?.name || user.name} />
            <AvatarFallback>
              {(profile?.name || user.name)?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || user.name}</h1>
            <p className="text-muted-foreground">
              {profile?.bio || 'Engaged citizen working for better governance'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                Civic Score: {profile?.civic_engagement_score || 0}
              </Badge>
              {profile?.verification_status === 'verified' && (
                <Badge variant="default">
                  <Star className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bills Tracked</p>
                <p className="text-2xl font-bold">{profile?.activity_summary?.bills_tracked || 0}</p>
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
                <p className="text-2xl font-bold">{profile?.activity_summary?.comments_posted || 0}</p>
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
                <p className="text-2xl font-bold">{profile?.activity_summary?.streak_days || 0}</p>
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
                <p className="text-2xl font-bold">{badges?.length || 0}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="saved-bills">Saved Bills</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                ) : dashboardData?.recent_activity?.length ? (
                  <div className="space-y-4">
                    {dashboardData.recent_activity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.action_type)}
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
                  Trending Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : dashboardData?.trending_bills?.length ? (
                  <div className="space-y-4">
                    {dashboardData.trending_bills.slice(0, 3).map((bill) => (
                      <div key={bill.id} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-1">{bill.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {bill.bill_number} • {bill.status}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" size="sm">
                            {bill.urgency_level}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/bills/${bill.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No trending bills available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Civic Score Trend */}
          {dashboardData?.civic_score_trend && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Civic Engagement Trend
                </CardTitle>
                <CardDescription>
                  Your civic engagement score over the past 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  {/* Placeholder for chart - would integrate with a charting library */}
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chart visualization would go here</p>
                    <p className="text-xs">Current Score: {profile?.civic_engagement_score || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved-bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Bills ({savedBills?.length || 0})</CardTitle>
              <CardDescription>
                Bills you've saved for tracking and future reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : savedBills?.length ? (
                <div className="space-y-4">
                  {savedBills.map((savedBill) => (
                    <div key={savedBill.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{savedBill.bill.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {savedBill.bill.bill_number} • {savedBill.bill.status}
                          </p>
                          {savedBill.notes && (
                            <p className="text-sm mb-2">{savedBill.notes}</p>
                          )}
                          {savedBill.tags?.length > 0 && (
                            <div className="flex gap-1 mb-2">
                              {savedBill.tags.map((tag) => (
                                <Badge key={tag} variant="outline" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Saved {formatDistanceToNow(new Date(savedBill.saved_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/bills/${savedBill.bill_id}`}>View</Link>
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
              ) : engagementHistory?.length ? (
                <div className="space-y-4">
                  {engagementHistory.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.action_type)}
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
                {badges?.length ? (
                  <div className="grid grid-cols-2 gap-4">
                    {badges.map((badge) => (
                      <div key={badge.id} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl mb-2">{badge.icon}</div>
                        <h4 className="font-medium text-sm">{badge.name}</h4>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Earned {formatDistanceToNow(new Date(badge.earned_at), { addSuffix: true })}
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
                {achievements?.length ? (
                  <div className="space-y-4">
                    {achievements.map((achievement) => (
                      <div key={achievement.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{achievement.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {achievement.progress}/{achievement.max_progress}
                          </span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.max_progress) * 100} 
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

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Engagement Analytics
              </CardTitle>
              <CardDescription>
                Detailed insights into your civic engagement patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">
                    {profile?.activity_summary?.community_score || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Community Score</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {profile?.activity_summary?.votes_cast || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Votes Cast</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-purple-500">
                    {profile?.activity_summary?.expert_contributions || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Expert Contributions</p>
                </div>
              </div>
              
              <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Detailed analytics charts would go here</p>
                  <p className="text-xs">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
    share: <Share2 className="h-4 w-4 text-purple-500" />,
    vote: <Vote className="h-4 w-4 text-red-500" />,
    track: <Bell className="h-4 w-4 text-orange-500" />
  };
  return iconMap[actionType as keyof typeof iconMap] || <Activity className="h-4 w-4 text-gray-500" />;
}

function getActivityDescription(activity: any) {
  const actionMap = {
    view: `Viewed ${activity.entity_type}`,
    comment: `Commented on ${activity.entity_type}`,
    save: `Saved ${activity.entity_type}`,
    share: `Shared ${activity.entity_type}`,
    vote: `Voted on ${activity.entity_type}`,
    track: `Started tracking ${activity.entity_type}`
  };
  return actionMap[activity.action_type as keyof typeof actionMap] || `Performed ${activity.action_type} on ${activity.entity_type}`;
}

export default UserDashboard;