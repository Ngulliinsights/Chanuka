/**
 * Smart Dashboard Component
 * 
 * Provides personalized, progressive disclosure-based dashboard
 * that adapts to user skill level and engagement patterns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Progress } from '@client/components/ui/progress';
import { 
  TrendingUp, 
  Bell, 
  BookOpen, 
  Target, 
  Users, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Eye,
  MessageSquare,
  Share2,
  Filter,
  Zap,
  Heart,
  Globe
} from 'lucide-react';
import { useAppStore, useUserPreferences, useSavedBills } from '@client/store/unified-state-manager';
import { copySystem } from '@client/content/copy-system';

interface SmartDashboardProps {
  className?: string;
}

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  priority: number;
  userLevels: Array<'novice' | 'intermediate' | 'expert'>;
  requiredData?: string[];
}

// Personalized Welcome Messages
const getWelcomeMessage = (userLevel: string, timeOfDay: string, recentActivity: any[]) => {
  const hasRecentActivity = recentActivity.length > 0;
  
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

  return messages[userLevel as keyof typeof messages]?.[timeOfDay as keyof typeof messages.novice] || 
         "Welcome to your civic engagement dashboard!";
};

// Impact Metrics Component
function ImpactMetrics({ userLevel }: { userLevel: string }) {
  const savedBills = useSavedBills();
  const recentActivity = useAppStore(state => state.user.recentActivity);
  
  const metrics = {
    billsTracked: savedBills.size,
    commentsPosted: recentActivity.filter(a => a.type === 'comment_posted').length,
    analysisViewed: recentActivity.filter(a => a.type === 'analysis_viewed').length,
    civicScore: Math.min(100, (savedBills.size * 10) + (recentActivity.length * 2))
  };

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

  const currentLevel = levelMessages[userLevel as keyof typeof levelMessages] || levelMessages.novice;

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
function QuickActions({ userLevel }: { userLevel: string }) {
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

  const currentActions = actions[userLevel as keyof typeof actions] || actions.novice;

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
              <Button
                key={index}
                variant="ghost"
                className="justify-start h-auto p-3 hover:bg-accent"
                asChild
              >
                <a href={action.href}>
                  <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </a>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Activity Component
function RecentActivity({ userLevel }: { userLevel: string }) {
  const recentActivity = useAppStore(state => state.user.recentActivity.slice(0, 5));

  if (recentActivity.length === 0) {
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
            <Button asChild>
              <a href="/bills">
                Explore Bills
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bill_saved': return <Heart className="w-4 h-4 text-red-500" />;
      case 'bill_viewed': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'comment_posted': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'analysis_viewed': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityMessage = (activity: any) => {
    switch (activity.type) {
      case 'bill_saved': return `Saved bill ${activity.metadata.billId}`;
      case 'bill_viewed': return `Viewed bill ${activity.metadata.billId}`;
      case 'comment_posted': return `Posted comment on ${activity.metadata.billId}`;
      case 'analysis_viewed': return `Viewed analysis for ${activity.metadata.billId}`;
      default: return 'Unknown activity';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
              {getActivityIcon(activity.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getActivityMessage(activity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Smart Dashboard Component
export function SmartDashboard({ className }: SmartDashboardProps) {
  const user = useAppStore(state => state.user.user);
  const preferences = useUserPreferences();
  const recentActivity = useAppStore(state => state.user.recentActivity);
  
  const userLevel = user?.persona || 'novice';
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                   new Date().getHours() < 17 ? 'afternoon' : 'evening';

  const welcomeMessage = getWelcomeMessage(userLevel, timeOfDay, recentActivity);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Personalized Welcome */}
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back{user?.name ? `, ${user.name}` : ''}!
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

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Primary Actions */}
        <div className="lg:col-span-2 space-y-6">
          <ImpactMetrics userLevel={userLevel} />
          
          {/* Contextual Content Based on User Level */}
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
                  New to civic engagement? We'll guide you through understanding how legislation works.
                </p>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  Start Learning Journey
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {userLevel === 'expert' && (
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
                  Review Pending Verifications
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Quick Actions & Activity */}
        <div className="space-y-6">
          <QuickActions userLevel={userLevel} />
          <RecentActivity userLevel={userLevel} />
        </div>
      </div>
    </div>
  );
}