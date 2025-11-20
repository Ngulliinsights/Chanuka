/**
 * Community Stats - Displays overall community engagement statistics
 * 
 * Features:
 * - Real-time community metrics
 * - Member activity indicators
 * - Expert contribution tracking
 * - Campaign and petition counts
 * - Responsive layout
 */

import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Users, 
  MessageSquare, 
  Award, 
  Megaphone,
  PenTool,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { CommunityStats as CommunityStatsType } from '@client/types/community';
import { formatDistanceToNow } from 'date-fns';

interface CommunityStatsProps {
  stats: CommunityStatsType;
  className?: string;
}

export function CommunityStats({ stats, className }: CommunityStatsProps) {
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getActivityLevel = (activeToday: number, totalMembers: number) => {
    if (totalMembers === 0) return { level: 'low', color: 'text-gray-500', label: 'No Activity' };
    
    const activityRate = activeToday / totalMembers;
    
    if (activityRate > 0.1) return { level: 'high', color: 'text-green-600', label: 'High Activity' };
    if (activityRate > 0.05) return { level: 'medium', color: 'text-yellow-600', label: 'Moderate Activity' };
    return { level: 'low', color: 'text-gray-500', label: 'Low Activity' };
  };

  const activityLevel = getActivityLevel(stats.activeToday, stats.totalMembers);

  const statItems = [
    {
      icon: Users,
      label: 'Total Members',
      value: stats.totalMembers.toLocaleString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Activity,
      label: 'Active Today',
      value: stats.activeToday.toLocaleString(),
      color: activityLevel.color,
      bgColor: activityLevel.level === 'high' ? 'bg-green-100' : 
                activityLevel.level === 'medium' ? 'bg-yellow-100' : 'bg-gray-100',
      badge: activityLevel.label
    },
    {
      icon: TrendingUp,
      label: 'Active This Week',
      value: stats.activeThisWeek.toLocaleString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      icon: MessageSquare,
      label: 'Total Discussions',
      value: stats.totalDiscussions.toLocaleString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      icon: MessageSquare,
      label: 'Total Comments',
      value: stats.totalComments.toLocaleString(),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    },
    {
      icon: Award,
      label: 'Expert Contributions',
      value: stats.expertContributions.toLocaleString(),
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Megaphone,
      label: 'Active Campaigns',
      value: stats.activeCampaigns.toLocaleString(),
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      icon: PenTool,
      label: 'Active Petitions',
      value: stats.activePetitions.toLocaleString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <Card className={cn('chanuka-card', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Community Overview
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Updated {formatTimeAgo(stats.lastUpdated)}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {statItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <div
                key={index}
                className="flex flex-col items-center p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full mb-2',
                  item.bgColor
                )}>
                  <IconComponent className={cn('h-5 w-5', item.color)} />
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {item.label}
                  </div>
                  
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs mt-1',
                        item.color === 'text-green-600' && 'bg-green-100 text-green-800',
                        item.color === 'text-yellow-600' && 'bg-yellow-100 text-yellow-800',
                        item.color === 'text-gray-500' && 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                activityLevel.level === 'high' ? 'bg-green-500' :
                activityLevel.level === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
              )} />
              <span className="font-medium">Community Activity Level</span>
            </div>
            
            <span className={cn('font-medium', activityLevel.color)}>
              {activityLevel.label}
            </span>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            {stats.activeToday > 0 && stats.totalMembers > 0 && (
              <>
                {((stats.activeToday / stats.totalMembers) * 100).toFixed(1)}% of members 
                were active today
              </>
            )}
            {stats.activeToday === 0 && 'No members active today'}
            {stats.totalMembers === 0 && 'No community members yet'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}