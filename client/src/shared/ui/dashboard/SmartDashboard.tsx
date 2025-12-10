/**
 * Smart Dashboard Component
 * 
 * Provides personalized, progressive disclosure-based dashboard
 * that adapts to user skill level and engagement patterns.
 * 
 * This component uses React Query for efficient server state management,
 * automatically handling caching, refetching, and loading states for
 * user data, saved bills, and activity history.
 */

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Eye,
  Filter,
  Globe,
  Heart,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';

// Type Definitions
interface SmartDashboardProps {
  className?: string;
}

interface Activity {
  id: string;
  type: 'bill_saved' | 'bill_viewed' | 'comment_posted' | 'analysis_viewed';
  metadata: {
    billId: string;
    billTitle?: string;
  };
  timestamp: string;
}

interface User {
  id: string;
  name?: string;
  email: string;
  persona: 'novice' | 'intermediate' | 'expert';
}

interface SavedBill {
  id: string;
  billId: string;
  savedAt: string;
}

// API Functions - These would be in a separate api.ts file in production
const fetchSavedBills = async (): Promise<SavedBill[]> => {
  const response = await fetch('/api/user/saved-bills');
  if (!response.ok) throw new Error('Failed to fetch saved bills');
  return response.json();
};

const fetchRecentActivity = async (): Promise<Activity[]> => {
  const response = await fetch('/api/user/activity?limit=10');
  if (!response.ok) throw new Error('Failed to fetch activity');
  return response.json();
};

// Personalized Welcome Messages
// This function generates contextual greetings based on the user's experience level,
// time of day, and whether they have recent activity to review
const getWelcomeMessage = (
  userLevel: User['persona'],
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  hasRecentActivity: boolean
): string => {
  const messages = {
    novice: {
      morning: hasRecentActivity 
        ? "Good morning! Ready to continue exploring how legislation affects your community?"
        : "Good morning! Let's start by finding bills that matter to you.",
      afternoon: hasRecentActivity
        ? "Welcome back! Here's what's new with the bills you're following."
        : "Good afternoon! Discover legislation that could impact your daily life.",
      evening: hasRecentActivity
        ? "Evening! Catch up on today's legislative developments."
        : "Good evening! A few minutes of civic engagement can make a real difference."
    },
    intermediate: {
      morning: "Good morning! Your civic engagement dashboard is ready with today's key developments.",
      afternoon: "Welcome back! Here are the policy updates and community discussions you've been following.",
      evening: "Evening briefing: Legislative updates and community insights await your review."
    },
    expert: {
      morning: "Good morning! Your professional legislative intelligence briefing is ready.",
      afternoon: "Welcome back! Constitutional analysis updates and policy intelligence await.",
      evening: "Evening intelligence: Critical legislative developments and expert analysis."
    }
  };

  return messages[userLevel][timeOfDay];
};

// Impact Metrics Component
// Displays the user's engagement statistics and civic score,
// with messaging tailored to their experience level
function ImpactMetrics({ userLevel }: { userLevel: User['persona'] }) {
  // React Query hooks for fetching saved bills and activity
  // These automatically handle loading states, caching, and refetching
  const { data: savedBills = [] } = useQuery({
    queryKey: ['savedBills'],
    queryFn: fetchSavedBills,
  });
  
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: fetchRecentActivity,
  });
  
  // Calculate engagement metrics from the fetched data
  const metrics = {
    billsTracked: savedBills.length,
    commentsPosted: recentActivity.filter(a => a.type === 'comment_posted').length,
    analysisViewed: recentActivity.filter(a => a.type === 'analysis_viewed').length,
    // Civic score combines quantity and diversity of engagement
    civicScore: Math.min(100, (savedBills.length * 10) + (recentActivity.length * 2))
  };

  // Different messaging for different user levels helps users understand
  // their progress in terms that resonate with their experience
  const levelMessages = {
    novice: {
      title: "Your Civic Journey",
      description: "Every action you take makes democracy more transparent"
    },
    intermediate: {
      title: "Civic Engagement Impact", 
      description: "Your active participation strengthens democratic discourse"
    },
    expert: {
      title: "Professional Civic Contribution",
      description: "Your expertise enhances community understanding of governance"
    }
  };

  const currentLevel = levelMessages[userLevel];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-red-500" />
          {currentLevel.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{currentLevel.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.billsTracked}</div>
            <div className="text-xs text-muted-foreground">Bills Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.civicScore}</div>
            <div className="text-xs text-muted-foreground">Civic Score</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Civic Engagement Level</span>
            <span>{metrics.civicScore}%</span>
          </div>
          <Progress value={metrics.civicScore} className="h-2" />
        </div>

        {/* Progressive disclosure: Show helpful hints to novices with low engagement */}
        {userLevel === 'novice' && metrics.civicScore < 30 && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Next step:</strong> Save your first bill to start tracking legislation that matters to you!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Actions Component
// Provides context-appropriate action buttons based on user expertise
function QuickActions({ userLevel }: { userLevel: User['persona'] }) {
  // Different user levels see different actions that match their needs
  // Novices get guided learning, experts get advanced analysis tools
  const actions = {
    novice: [
      { icon: BookOpen, label: "Learn About Bills", href: "/civic-education", color: "bg-green-500" },
      { icon: Target, label: "Find Relevant Bills", href: "/bills?guided=true", color: "bg-blue-500" },
      { icon: Users, label: "Join Community", href: "/community", color: "bg-purple-500" }
    ],
    intermediate: [
      { icon: Filter, label: "Advanced Search", href: "/search", color: "bg-blue-500" },
      { icon: MessageSquare, label: "Join Discussions", href: "/community", color: "bg-green-500" },
      { icon: TrendingUp, label: "View Analytics", href: "/analytics", color: "bg-purple-500" }
    ],
    expert: [
      { icon: AlertTriangle, label: "Workaround Analysis", href: "/bill-sponsorship-analysis", color: "bg-red-500" },
      { icon: CheckCircle, label: "Expert Verification", href: "/expert-verification", color: "bg-green-500" },
      { icon: Globe, label: "Professional Network", href: "/expert-network", color: "bg-blue-500" }
    ]
  };

  const currentActions = actions[userLevel];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {currentActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <a
                key={index}
                href={action.href}
                className="flex items-center justify-start h-auto p-3 rounded-md hover:bg-accent transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3 shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">{action.label}</span>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0" />
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Activity Component
// Shows the user's recent interactions with the platform
function RecentActivity({ userLevel }: { userLevel: User['persona'] }) {
  // Fetch recent activity using React Query
  const { data: recentActivity = [], isLoading } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: fetchRecentActivity,
  });

  // Show a welcoming empty state when there's no activity yet
  if (!isLoading && recentActivity.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Get Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {userLevel === 'novice' 
                ? "Start your civic journey by exploring bills that affect your community"
                : "Begin engaging with legislation and community discussions"
              }
            </p>
            <a href="/bills" className="inline-block">
              <Button>
                Explore Bills
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get the appropriate icon for each activity type
  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      bill_saved: <Heart className="w-4 h-4 text-red-500" />,
      bill_viewed: <Eye className="w-4 h-4 text-blue-500" />,
      comment_posted: <MessageSquare className="w-4 h-4 text-green-500" />,
      analysis_viewed: <TrendingUp className="w-4 h-4 text-purple-500" />,
    };
    return icons[type] || <CheckCircle className="w-4 h-4 text-gray-500" />;
  };

  // Generate human-readable activity messages
  const getActivityMessage = (activity: Activity) => {
    const messages = {
      bill_saved: `Saved ${activity.metadata.billTitle || `bill ${activity.metadata.billId}`}`,
      bill_viewed: `Viewed ${activity.metadata.billTitle || `bill ${activity.metadata.billId}`}`,
      comment_posted: `Posted comment on ${activity.metadata.billTitle || activity.metadata.billId}`,
      analysis_viewed: `Viewed analysis for ${activity.metadata.billTitle || activity.metadata.billId}`,
    };
    return messages[activity.type] || 'Unknown activity';
  };

  // Format timestamps in a user-friendly way
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading activity...</div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Smart Dashboard Component
// This is the orchestrator that brings together all the sub-components
// and provides the overall dashboard experience
export function SmartDashboard({ className }: SmartDashboardProps) {
  // Default user level for now
  const userLevel = 'novice';
  
  // Determine time of day for contextual greeting
  const hour = new Date().getHours();
  const timeOfDay: 'morning' | 'afternoon' | 'evening' = 
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Mock recent activity  
  const recentActivity: Activity[] = [];
  
  const welcomeMessage = getWelcomeMessage(userLevel, timeOfDay, recentActivity.length > 0);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Personalized Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back!
              </h1>
              <p className="text-blue-100 text-lg">{welcomeMessage}</p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Grid - Responsive layout that adapts to screen size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Primary engagement metrics and contextual content */}
        <div className="lg:col-span-2 space-y-6">
          <ImpactMetrics userLevel={userLevel} />
          
          {/* Progressive disclosure: Show different content based on user level */}
          {userLevel === 'novice' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <BookOpen className="w-5 h-5" />
                  Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  New to civic engagement? We&apos;ll guide you through understanding how legislation works.
                </p>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  <a href="/civic-education" className="flex items-center">
                    Start Learning Journey
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {userLevel !== 'novice' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <CheckCircle className="w-5 h-5" />
                  Expert Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-700 mb-4">
                  Your expertise helps the community understand complex legislation. Thank you for contributing!
                </p>
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                  <a href="/expert-verification" className="flex items-center">
                    Review Pending Verifications
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick actions and activity feed */}
        <div className="space-y-6">
          <QuickActions userLevel={userLevel} />
          <RecentActivity userLevel={userLevel} />
        </div>
      </div>
    </div>
  );
}