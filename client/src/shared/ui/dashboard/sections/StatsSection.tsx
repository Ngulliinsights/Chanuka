import { TrendingUp, MessageSquare, Award } from 'lucide-react';
import React from 'react';

import { Badge } from '@client/shared/design-system';
import { Card, CardContent } from '@client/shared/design-system';
import { UserDashboardData } from '@client/shared/types/user-dashboard';

interface StatsSectionProps {
  stats: UserDashboardData['stats'] | undefined;
  civicMetrics?: UserDashboardData['civicMetrics'];
  variant?: 'full' | 'compact';
}

export function StatsSection({ stats, civicMetrics, variant = 'full' }: StatsSectionProps) {
  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bills Tracked</p>
                <p className="text-2xl font-bold">{stats?.totalBillsTracked || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comments</p>
                <p className="text-2xl font-bold">{stats?.totalComments || 0}</p>
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
                <p className="text-2xl font-bold">
                  {civicMetrics?.monthlyTrend?.[0]?.activities || 0}
                </p>
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
                <p className="text-2xl font-bold">{civicMetrics?.achievements?.length || 0}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full variant - more detailed stats
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bills Tracked</p>
              <p className="text-2xl font-bold">{stats?.totalBillsTracked || 0}</p>
              <p className="text-xs text-muted-foreground">
                {civicMetrics?.scoreBreakdown?.influence || 0}% influence score
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Comments</p>
              <p className="text-2xl font-bold">{stats?.totalComments || 0}</p>
              <p className="text-xs text-muted-foreground">
                {civicMetrics?.scoreBreakdown?.quality || 0}% quality score
              </p>
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
              <p className="text-2xl font-bold">{stats?.streakDays || 0}</p>
              <p className="text-xs text-muted-foreground">
                {civicMetrics?.scoreBreakdown?.consistency || 0}% consistency
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Civic Score</p>
              <p className="text-2xl font-bold">{civicMetrics?.personalScore || 0}</p>
              <Badge variant="secondary" className="text-xs">
                Top {civicMetrics?.comparisons?.percentile || 0}%
              </Badge>
            </div>
            <Award className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
