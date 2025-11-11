/**
 * Civic Score Card Component
 * 
 * Displays personal civic engagement scoring with transparent methodology,
 * level progression, and achievement tracking.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import {
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Info,
  Star,
  Award,
  Calendar,
  Flame
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PersonalCivicScore {
  totalScore: number;
  level: string;
  nextLevelProgress: number;
  breakdown: {
    participation: number;
    quality: number;
    consistency: number;
    impact: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  streaks: {
    current: number;
    longest: number;
    type: 'daily' | 'weekly';
  };
}

interface CivicScoreCardProps {
  score: PersonalCivicScore;
  className?: string;
  showMethodology?: boolean;
}

export function CivicScoreCard({ 
  score, 
  className,
  showMethodology = false 
}: CivicScoreCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Civic Champion':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'Civic Advocate':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'Civic Participant':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'Civic Observer':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Civic Champion':
        return Trophy;
      case 'Civic Advocate':
        return Award;
      case 'Civic Participant':
        return Target;
      case 'Civic Observer':
        return Star;
      default:
        return Zap;
    }
  };

  const getScoreIcon = (category: string) => {
    switch (category) {
      case 'participation':
        return Target;
      case 'quality':
        return Star;
      case 'consistency':
        return Calendar;
      case 'impact':
        return TrendingUp;
      default:
        return Zap;
    }
  };

  const getScoreDescription = (category: string) => {
    switch (category) {
      case 'participation':
        return 'Active engagement in discussions and bill tracking';
      case 'quality':
        return 'Thoughtful contributions and expert interactions';
      case 'consistency':
        return 'Regular participation over time';
      case 'impact':
        return 'Influence on community discussions and outcomes';
      default:
        return '';
    }
  };

  const LevelIcon = getLevelIcon(score.level);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <LevelIcon className="h-5 w-5" />
            Your Civic Score
          </span>
          {showMethodology && (
            <Button variant="ghost" size="sm" className="text-xs">
              <Info className="h-4 w-4 mr-1" />
              Methodology
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="text-4xl font-bold text-primary">
              {score.totalScore}
            </div>
            <div className="text-sm text-muted-foreground">
              out of 100
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn("px-3 py-1 text-sm font-medium", getLevelColor(score.level))}
          >
            <LevelIcon className="h-4 w-4 mr-1" />
            {score.level}
          </Badge>
        </div>

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to next level</span>
            <span>{score.nextLevelProgress}%</span>
          </div>
          <Progress value={score.nextLevelProgress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {score.nextLevelProgress < 100 
              ? `${100 - score.nextLevelProgress}% more to reach the next level`
              : 'Maximum level achieved!'
            }
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Score Breakdown</h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(score.breakdown).map(([category, value]) => {
              const IconComponent = getScoreIcon(category);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">
                      {category}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {getScoreDescription(category)}
                      </span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streaks */}
        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-sm font-medium">
                {score.streaks.current} {score.streaks.type} streak
              </div>
              <div className="text-xs text-muted-foreground">
                Longest: {score.streaks.longest} {score.streaks.type}s
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Active
          </Badge>
        </div>

        {/* Recent Achievements */}
        {score.achievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Achievements</h4>
            <div className="space-y-2">
              {score.achievements.slice(0, 3).map((achievement) => (
                <div 
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-yellow-50 rounded-md border border-yellow-200"
                >
                  <Award className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{achievement.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {achievement.description}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(achievement.earnedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {score.achievements.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all {score.achievements.length} achievements
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Methodology (if shown) */}
        {showMethodology && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Scoring Methodology
            </h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>Participation (25%):</strong> Comments, discussions, bill saves, and shares
              </p>
              <p>
                <strong>Quality (25%):</strong> Expert interactions, community validation, and content depth
              </p>
              <p>
                <strong>Consistency (25%):</strong> Regular engagement patterns and streak maintenance
              </p>
              <p>
                <strong>Impact (25%):</strong> Influence on discussions, campaign participation, and community outcomes
              </p>
              <p className="pt-2 border-t border-blue-300">
                Scores are updated in real-time and reflect your civic engagement over the past 30 days.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-1" />
            View History
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Target className="h-4 w-4 mr-1" />
            Set Goals
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CivicScoreCard;