/**
 * Dashboard Stats Component
 *
 * Displays key statistics and metrics overview for the user dashboard.
 */

import { formatDistanceToNow } from 'date-fns';
import { BookOpen, MessageSquare, TrendingUp, Calendar, Award, Target } from 'lucide-react';
import React from 'react';

import { Badge } from '@client/shared/design-system/feedback/Badge';
import { Card, CardContent } from '@client/shared/design-system/typography/Card';
import { UserDashboardData, CivicImpactMetrics } from '@client/shared/types/user-dashboard';

import styles from './DashboardStats.module.css';

interface DashboardStatsProps {
  stats: UserDashboardData['stats'] | undefined;
  engagementStats: {
    totalActivities: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
    saveCount: number;
  };
  civicMetrics: CivicImpactMetrics | undefined;
  loading?: boolean;
}

export function DashboardStats({
  stats,
  engagementStats,
  civicMetrics,
  loading = false,
}: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-12 mb-2"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Bills Tracked',
      value: stats?.totalBillsTracked || 0,
      icon: <BookOpen className="h-4 w-4" />,
      color: 'hsl(var(--civic-constitutional))',
      description: "Active legislation you're following",
    },
    {
      title: 'Civic Score',
      value: civicMetrics?.personalScore || 0,
      icon: <Award className="h-4 w-4" />,
      color: 'hsl(var(--civic-expert))',
      description: 'Your engagement impact rating',
    },
    {
      title: 'Comments',
      value: stats?.totalComments || 0,
      icon: <MessageSquare className="h-4 w-4" />,
      color: 'hsl(var(--civic-community))',
      description: 'Total comments posted',
    },
    {
      title: 'Streak Days',
      value: stats?.streakDays || 0,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'hsl(var(--civic-transparency))',
      description: 'Consecutive days active',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(stat => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${styles.statValue}`} data-color={stat.color}>
                      {stat.value}
                    </p>
                    {stat.title === 'Civic Score' && civicMetrics && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${styles.badge}`}
                        data-border-color={stat.color}
                      >
                        {civicMetrics.comparisons.percentile}th %ile
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${styles.iconContainer}`}
                  data-bg-color={stat.color}
                >
                  <div className={styles.icon} data-color={stat.color}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Recent Activity Summary</h3>
            {stats?.joinedDate && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Member since {formatDistanceToNow(new Date(stats.joinedDate), { addSuffix: true })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-civic-transparency">
                {engagementStats.viewCount}
              </div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-civic-community">
                {engagementStats.commentCount}
              </div>
              <div className="text-xs text-muted-foreground">Comments</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-civic-community">
                {engagementStats.shareCount}
              </div>
              <div className="text-xs text-muted-foreground">Shares</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-civic-urgent">
                {engagementStats.saveCount}
              </div>
              <div className="text-xs text-muted-foreground">Saves</div>
            </div>
          </div>

          {/* Civic Impact Highlight */}
          {civicMetrics && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-civic-expert" />
                  <span className="text-sm font-medium">Impact Breakdown</span>
                </div>
                <Badge variant="outline">Top {100 - civicMetrics.comparisons.percentile}%</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {Object.entries(civicMetrics.scoreBreakdown).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className="text-sm font-medium">{score}</div>
                    <div className="text-xs text-muted-foreground capitalize">{category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
