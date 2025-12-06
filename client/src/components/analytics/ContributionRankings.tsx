/**
 * Contribution Rankings Component
 * 
 * Displays community contribution rankings with gamification elements,
 * leaderboards, achievement tracking, and engagement metrics.
 */

import { Trophy, Medal, Award, TrendingUp, Users, MessageSquare } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import
 { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Progress } from '@/components/ui/progress';

interface ContributionData {
  id: string;
  username: string;
  avatar?: string;
  totalContributions: number;
  billsTracked: number;
  commentsPosted: number;
  votesReceived: number;
  rank: number;
  level: string;
  badges: string[];
  weeklyGrowth: number;
}

interface ContributionRankingsProps {
  timeframe?: 'week' | 'month' | 'year' | 'all';
  limit?: number;
  showBadges?: boolean;
  showGrowth?: boolean;
}

const mockContributors: ContributionData[] = [
  {
    id: '1',
    username: 'CivicChampion',
    totalContributions: 1250,
    billsTracked: 45,
    commentsPosted: 89,
    votesReceived: 234,
    rank: 1,
    level: 'Expert',
    badges: ['Top Contributor', 'Bill Tracker', 'Community Leader'],
    weeklyGrowth: 15.2
  },
  {
    id: '2',
    username: 'PolicyWatcher',
    totalContributions: 980,
    billsTracked: 38,
    commentsPosted: 67,
    votesReceived: 189,
    rank: 2,
    level: 'Advanced',
    badges: ['Consistent Contributor', 'Insightful Comments'],
    weeklyGrowth: 8.7
  },
  {
    id: '3',
    username: 'DemocracyAdvocate',
    totalContributions: 756,
    billsTracked: 29,
    commentsPosted: 52,
    votesReceived: 145,
    rank: 3,
    level: 'Intermediate',
    badges: ['Rising Star', 'Community Helper'],
    weeklyGrowth: 12.3
  }
];

export function ContributionRankings({
  timeframe = 'month',
  limit = 10,
  showBadges = true,
  showGrowth = true
}: ContributionRankingsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  const sortedContributors = useMemo(() => {
    return mockContributors
      .sort((a, b) => b.totalContributions - a.totalContributions)
      .slice(0, limit);
  }, [limit]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert':
        return 'bg-purple-100 text-purple-800';
      case 'Advanced':
        return 'bg-blue-100 text-blue-800';
      case 'Intermediate':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contribution Rankings
          </CardTitle>
          <div className="flex gap-2">
            {(['week', 'month', 'year', 'all'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedTimeframe === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeframe(period)}
                className="capitalize"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedContributors.map((contributor) => (
            <div
              key={contributor.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10">
                  {getRankIcon(contributor.rank)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{contributor.username}</h3>
                    <Badge className={getLevelColor(contributor.level)}>
                      {contributor.level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {contributor.totalContributions} contributions
                    </span>
                    <span>{contributor.billsTracked} bills tracked</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {contributor.commentsPosted} comments
                    </span>
                  </div>
                  
                  {showBadges && contributor.badges.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {contributor.badges.slice(0, 3).map((badge) => (
                        <Badge key={badge} variant="secondary" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                      {contributor.badges.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{contributor.badges.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold">
                  {contributor.totalContributions.toLocaleString()}
                </div>
                {showGrowth && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{contributor.weeklyGrowth}% this week
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <div className="text-center">
            <Button variant="outline" className="w-full">
              View Full Leaderboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}