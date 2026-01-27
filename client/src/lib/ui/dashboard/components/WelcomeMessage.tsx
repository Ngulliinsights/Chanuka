/**
 * Welcome Message Component
 *
 * Displays personalized welcome message with quick stats and tips.
 */

import { formatDistanceToNow } from 'date-fns';
import { X, TrendingUp, MessageSquare, Award, Calendar, BookOpen, Sparkles } from 'lucide-react';
import React from 'react';

import { User } from '@client/core/auth/types';
import { Badge } from '@client/lib/design-system/feedback/Badge';
import { Button } from '@client/lib/design-system/interactive/Button';
import { Card, CardContent } from '@client/lib/design-system/typography/Card';
import { UserDashboardData } from '@client/lib/types/user-dashboard';

interface WelcomeMessageProps {
  user: User;
  stats: UserDashboardData['stats'] | undefined;
  onDismiss: () => void;
}

export function WelcomeMessage({ user, stats, onDismiss }: WelcomeMessageProps) {
  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getPersonalizedTip = () => {
    if (!stats) return null;

    if (stats.totalBillsTracked === 0) {
      return {
        icon: <BookOpen className="h-4 w-4" />,
        text: 'Start by tracking a few bills that interest you to get personalized updates.',
        action: 'Browse Bills',
      };
    }

    if (stats.totalComments === 0) {
      return {
        icon: <MessageSquare className="h-4 w-4" />,
        text: "Join the conversation by commenting on bills you're tracking.",
        action: 'View Discussions',
      };
    }

    if (stats.streakDays < 7) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        text: 'Build your civic engagement streak by checking in regularly.',
        action: 'View Activity',
      };
    }

    return {
      icon: <Award className="h-4 w-4" />,
      text: "You're doing great! Keep engaging to improve your civic impact score.",
      action: 'View Metrics',
    };
  };

  const tip = getPersonalizedTip();

  return (
    <Card className="bg-gradient-to-r from-civic-community/10 to-civic-expert/10 border-civic-community/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Greeting */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-civic-community" />
              <h2 className="text-lg font-semibold">
                {getTimeOfDayGreeting()}, {user.name}!
              </h2>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {stats && (
                <>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {stats.totalBillsTracked} bills tracked
                  </Badge>

                  <Badge variant="outline" className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {stats.totalComments} comments
                  </Badge>

                  {stats.streakDays > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stats.streakDays} day streak
                    </Badge>
                  )}

                  {stats.joinedDate && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Member {formatDistanceToNow(new Date(stats.joinedDate), { addSuffix: true })}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Personalized Tip */}
            {tip && (
              <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                <div className="text-civic-community mt-0.5">{tip.icon}</div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">{tip.text}</p>
                  <Button variant="outline" size="sm">
                    {tip.action}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
