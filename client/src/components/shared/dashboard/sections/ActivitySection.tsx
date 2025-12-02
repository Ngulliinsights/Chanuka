import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Activity,
  Eye,
  MessageSquare,
  Bookmark,
  Vote
} from 'lucide-react';
import { EngagementHistoryItem } from '@client/types/user-dashboard';

interface ActivitySectionProps {
  activities: EngagementHistoryItem[];
  loading?: boolean;
  compact?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function ActivitySection({
  activities,
  loading,
  compact = false,
  showViewAll = true,
  onViewAll
}: ActivitySectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {compact ? 'Recent Activity' : 'Engagement History'}
        </CardTitle>
        {!compact && (
          <CardDescription>
            Your complete activity history on the platform
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {activities?.length ? (
          <div className="space-y-4">
            {activities.slice(0, compact ? 5 : undefined).map((activity) => (
              <div key={activity.id} className={`flex items-start gap-3 ${!compact ? 'pb-3 border-b last:border-b-0' : ''}`}>
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {compact
                      ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                      : format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')
                    }
                  </p>
                </div>
              </div>
            ))}
            {compact && showViewAll && activities.length > 5 && (
              <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
                View All Activity
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            {compact ? 'No recent activity to display' : 'No activity history available'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function getActivityIcon(actionType: string) {
  const iconMap = {
    view: <Eye className="h-4 w-4 text-blue-500" />,
    comment: <MessageSquare className="h-4 w-4 text-green-500" />,
    save: <Bookmark className="h-4 w-4 text-yellow-500" />,
    vote: <Vote className="h-4 w-4 text-red-500" />
  };
  return iconMap[actionType as keyof typeof iconMap] || <Activity className="h-4 w-4 text-gray-500" />;
}

function getActivityDescription(activity: EngagementHistoryItem) {
  const actionMap = {
    view: `Viewed ${activity.billId ? 'bill' : 'dashboard'}`,
    comment: `Commented on ${activity.billId ? 'bill' : 'discussion'}`,
    share: `Shared ${activity.billId ? 'bill' : 'item'}`,
    save: `Saved ${activity.billId ? 'bill' : 'item'}`,
    vote: `Voted on ${activity.billId ? 'bill' : 'item'}`,
    expert_contribution: `Made expert contribution`
  };
  return actionMap[activity.type] || `Performed ${activity.type}`;
}