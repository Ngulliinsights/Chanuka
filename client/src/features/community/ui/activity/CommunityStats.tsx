/**
 * Community Stats - Displays overall community engagement statistics
 * 
 * Features:
 * - Real-time community metrics with intelligent activity indicators
 * - Member engagement tracking with percentage calculations
 * - Expert contribution and campaign monitoring
 * - Responsive grid layout that adapts to all screen sizes
 * - Performance-optimized with memoization and efficient rendering
 */

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
import { useEffect, useMemo, memo } from 'react';

import { Badge } from '@client/shared/design-system';
import { Card, CardContent } from '@client/shared/design-system';
import { cn } from '@client/lib/utils';

// Type definitions for better type safety and clarity
interface CommunityStatsType {
  totalMembers?: number;
  activeToday?: number;
  activeThisWeek?: number;
  totalDiscussions?: number;
  totalComments?: number;
  expertContributions?: number;
  activeCampaigns?: number;
  activePetitions?: number;
  lastUpdated?: string;
}

interface CommunityStatsProps {
  stats: CommunityStatsType;
  className?: string;
}

interface ActivityLevel {
  level: 'high' | 'medium' | 'low';
  color: string;
  label: string;
  bgColor: string;
}

const CommunityStatsComponent = ({ stats, className }: CommunityStatsProps) => {
  // Debug logging in development mode to help with troubleshooting
  // This only runs when stats change, not on every render, preventing performance issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CommunityStats] Component rendered with stats:', {
        totalMembers: stats?.totalMembers,
        activeToday: stats?.activeToday,
        activityRate: stats?.totalMembers ? 
          ((stats?.activeToday ?? 0) / stats.totalMembers * 100).toFixed(2) + '%' : 'N/A',
        lastUpdated: stats?.lastUpdated
      });
    }
  }, [stats]);

  // Custom time formatting function that calculates relative time without external dependencies
  // This creates user-friendly labels like "2 minutes ago" or "3 hours ago"
  const formatTimeAgo = useMemo(() => {
    return (timestamp: string): string => {
      if (!timestamp) return 'recently';
      
      try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        }
        
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      } catch (error) {
        console.warn('[CommunityStats] Invalid timestamp format:', timestamp);
        return 'recently';
      }
    };
  }, []);

  // Calculate activity level based on percentage of active members
  // This determines the visual indicators and messaging shown to users
  // We use memoization here to avoid recalculating unless the relevant stats change
  const activityLevel = useMemo((): ActivityLevel => {
    const activeToday = stats.activeToday ?? 0;
    const totalMembers = stats.totalMembers ?? 0;

    // Handle edge case where there are no members yet
    if (totalMembers === 0) {
      return {
        level: 'low',
        color: 'text-gray-500',
        label: 'No Activity',
        bgColor: 'bg-gray-100'
      };
    }

    const activityRate = activeToday / totalMembers;

    // High activity threshold: more than 10% of members active today
    // This indicates a very engaged community
    if (activityRate > 0.1) {
      return {
        level: 'high',
        color: 'text-green-600',
        label: 'High Activity',
        bgColor: 'bg-green-100'
      };
    }

    // Moderate activity threshold: 5-10% of members active today
    // This shows decent engagement but room for growth
    if (activityRate > 0.05) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        label: 'Moderate Activity',
        bgColor: 'bg-yellow-100'
      };
    }

    // Low activity: less than 5% of members active today
    // This suggests the community could benefit from engagement initiatives
    return {
      level: 'low',
      color: 'text-gray-500',
      label: 'Low Activity',
      bgColor: 'bg-gray-100'
    };
  }, [stats.activeToday, stats.totalMembers]);

  // Configuration array for each stat card displayed in the grid
  // Using useMemo prevents this array from being recreated on every render
  // Each stat has an icon, color scheme, and accessibility-friendly description
  const statItems = useMemo(() => [
    {
      icon: Users,
      label: 'Total Members',
      value: (stats.totalMembers ?? 0).toLocaleString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Registered community members'
    },
    {
      icon: Activity,
      label: 'Active Today',
      value: (stats.activeToday ?? 0).toLocaleString(),
      color: activityLevel.color,
      bgColor: activityLevel.bgColor,
      badge: activityLevel.label,
      description: 'Members active in the last 24 hours'
    },
    {
      icon: TrendingUp,
      label: 'Active This Week',
      value: (stats.activeThisWeek ?? 0).toLocaleString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Members active in the last 7 days'
    },
    {
      icon: MessageSquare,
      label: 'Discussions',
      value: (stats.totalDiscussions ?? 0).toLocaleString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Total discussion threads created'
    },
    {
      icon: MessageSquare,
      label: 'Comments',
      value: (stats.totalComments ?? 0).toLocaleString(),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      description: 'Total comments posted'
    },
    {
      icon: Award,
      label: 'Expert Posts',
      value: (stats.expertContributions ?? 0).toLocaleString(),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Contributions from verified experts'
    },
    {
      icon: Megaphone,
      label: 'Campaigns',
      value: (stats.activeCampaigns ?? 0).toLocaleString(),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Currently running campaigns'
    },
    {
      icon: PenTool,
      label: 'Petitions',
      value: (stats.activePetitions ?? 0).toLocaleString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Active petitions accepting signatures'
    }
  ], [stats, activityLevel]);

  // Generate a contextual activity summary message based on current engagement levels
  // This provides users with actionable insights about community health
  const activitySummary = useMemo(() => {
    const activeToday = stats.activeToday ?? 0;
    const totalMembers = stats.totalMembers ?? 0;

    if (totalMembers === 0) {
      return 'No community members yet. Be the first to join!';
    }

    if (activeToday === 0) {
      return 'No members active today. Start a discussion to engage the community!';
    }

    const percentage = ((activeToday / totalMembers) * 100).toFixed(1);
    return `${percentage}% of members were active today`;
  }, [stats.activeToday, stats.totalMembers]);

  return (
    <Card className={cn('shadow-sm hover:shadow-md transition-shadow duration-200', className)}>
      <CardContent className="p-6">
        {/* Header section displaying title and last update time */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Community Overview
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Updated {formatTimeAgo(stats.lastUpdated ?? '')}</span>
          </div>
        </div>

        {/* Responsive grid of stat cards that automatically adjusts columns based on screen size
            Mobile: 2 columns, Tablet: 3 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <div
                key={`stat-${index}`}
                className="flex flex-col items-center p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
                title={item.description}
                role="article"
                aria-label={`${item.label}: ${item.value}`}
              >
                {/* Icon container with colored background that scales slightly on hover */}
                <div className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full mb-3 group-hover:scale-110 transition-transform duration-200',
                  item.bgColor
                )}>
                  <IconComponent className={cn('h-6 w-6', item.color)} aria-hidden="true" />
                </div>
                
                {/* Stat value, label, and optional activity badge */}
                <div className="text-center w-full">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight font-medium">
                    {item.label}
                  </div>
                  
                  {/* Activity level badge shown only for the "Active Today" stat */}
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs mt-2 font-medium',
                        item.color === 'text-green-600' && 'bg-green-100 text-green-800 border-green-200',
                        item.color === 'text-yellow-600' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        item.color === 'text-gray-500' && 'bg-gray-100 text-gray-800 border-gray-200'
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

        {/* Activity summary panel with visual indicator and detailed description */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              {/* Activity level indicator with animated pulsing effect for high activity */}
              <div className="relative">
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  activityLevel.level === 'high' && 'bg-green-500',
                  activityLevel.level === 'medium' && 'bg-yellow-500',
                  activityLevel.level === 'low' && 'bg-gray-400'
                )} 
                aria-hidden="true" />
                {activityLevel.level === 'high' && (
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                )}
              </div>
              <span className="font-medium text-foreground">Community Activity Level</span>
            </div>
            
            <span className={cn('font-semibold', activityLevel.color)}>
              {activityLevel.label}
            </span>
          </div>
          
          {/* Contextual message providing insights about current engagement levels */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activitySummary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(CommunityStatsComponent);