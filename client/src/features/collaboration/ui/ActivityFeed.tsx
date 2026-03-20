import React, { useEffect, useState } from 'react';
import { Activity, FileText, MessageSquare, UserPlus, UserMinus, FolderPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { activityService, ActivityItem } from '@client/features/collaboration/services/activity-service';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  workspaceId: string;
}

const activityIcons = {
  bill_added: FileText,
  comment_added: MessageSquare,
  member_joined: UserPlus,
  member_left: UserMinus,
  collection_created: FolderPlus,
  workspace_updated: Activity,
};

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setActivities(activityService.getActivity(workspaceId));
  }, [workspaceId]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>{' '}
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
