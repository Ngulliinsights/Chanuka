/**
 * Civic Metrics Section Component
 *
 * Displays personal civic engagement scoring, achievements, and impact comparisons.
 */

import { format } from 'date-fns';
import {
  TrendingUp,
  Award,
  Users,
  Target,
  BarChart3,
  Trophy,
  Star,
  ExternalLink,
  Info,
  Calendar,
} from 'lucide-react';

import { Badge } from '@client/shared/design-system/feedback/Badge.tsx';
import { Progress } from '@client/shared/design-system/feedback/Progress.tsx';
import { Button } from '@client/shared/design-system/interactive/Button.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system/typography/Card.tsx';
import { CivicImpactMetrics } from '@client/shared/types/user-dashboard';

import styles from './DashboardSections.module.css';

interface CivicMetricsSectionProps {
  metrics: CivicImpactMetrics | undefined;
  loading?: boolean;
  compact?: boolean;
}

export function CivicMetricsSection({
  metrics,
  loading = false,
  compact = false,
}: CivicMetricsSectionProps) {
  const getScoreClass = (score: number) => {
    if (score >= 80) return styles.scoreExcellent;
    if (score >= 60) return styles.scoreGood;
    if (score >= 40) return styles.scoreFair;
    return styles.scorePoor;
  };

  const getProgressClass = (score: number) => {
    if (score >= 80) return styles.progressExcellent;
    if (score >= 60) return styles.progressGood;
    if (score >= 40) return styles.progressFair;
    return styles.progressPoor;
  };

  const getAchievementClass = (category: string) => {
    switch (category) {
      case 'participation':
        return styles.achievementEngagement;
      case 'quality':
        return styles.achievementExpertise;
      case 'influence':
        return styles.achievementImpact;
      case 'consistency':
        return styles.achievementParticipation;
      default:
        return styles.achievementEngagement;
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'participation':
        return <Users className="h-4 w-4" />;
      case 'quality':
        return <Star className="h-4 w-4" />;
      case 'influence':
        return <TrendingUp className="h-4 w-4" />;
      case 'consistency':
        return <Target className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Civic Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-2 bg-muted rounded flex-1"></div>
                    <div className="h-4 bg-muted rounded w-8"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Civic Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No metrics available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start engaging with legislation to build your civic impact score.
            </p>
            <Button variant="outline" size="sm">
              Learn About Scoring
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Civic Impact
            <Badge variant="outline" className={getScoreClass(metrics.personalScore)}>
              {getScoreLabel(metrics.personalScore)}
            </Badge>
          </CardTitle>
          {!compact && (
            <Button variant="outline" size="sm">
              <Info className="h-4 w-4 mr-2" />
              How It Works
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`${styles.scoreDisplay} ${getScoreClass(metrics.personalScore)}`}>
            {metrics.personalScore}
          </div>
          <p className="text-sm text-muted-foreground">Your Civic Engagement Score</p>

          {/* Percentile comparison */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>You&apos;re in the top {100 - metrics.comparisons.percentile}%</span>
              <span className="font-medium">{metrics.comparisons.percentile}th percentile</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Average user score: {metrics.comparisons.averageUser}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Score Breakdown</h4>

          {Object.entries(metrics.scoreBreakdown).map(([category, score]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize font-medium">{category}</span>
                <span className="font-mono">{score}</span>
              </div>
              <Progress value={score} className={`h-2 ${getProgressClass(score)}`} />
            </div>
          ))}
        </div>

        {/* Recent Achievements */}
        {metrics.achievements.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Recent Achievements
            </h4>

            <div className="space-y-3">
              {metrics.achievements.slice(0, compact ? 2 : 5).map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div
                    className={`${styles.largeIconContainer} ${getAchievementClass(achievement.category)}`}
                  >
                    {getAchievementIcon(achievement.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm">{achievement.title}</h5>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {achievement.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {!compact && metrics.monthlyTrend.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monthly Progress
            </h4>

            <div className="space-y-3">
              {metrics.monthlyTrend.slice(-3).map(month => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="text-sm">
                    {format(new Date(month.month + '-01'), 'MMMM yyyy')}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{month.score}</div>
                    <div className="text-xs text-muted-foreground">
                      {month.activities} activities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {!compact && (
          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-3">Improve Your Score</h4>
            <div className="space-y-2">
              {metrics.scoreBreakdown.participation < 70 && (
                <div className="text-sm text-muted-foreground">
                  • Engage with more bills to improve participation
                </div>
              )}
              {metrics.scoreBreakdown.quality < 70 && (
                <div className="text-sm text-muted-foreground">
                  • Write more detailed comments to improve quality
                </div>
              )}
              {metrics.scoreBreakdown.consistency < 70 && (
                <div className="text-sm text-muted-foreground">
                  • Engage regularly to improve consistency
                </div>
              )}
              {metrics.scoreBreakdown.influence < 70 && (
                <div className="text-sm text-muted-foreground">
                  • Share insights to increase your influence
                </div>
              )}
            </div>
          </div>
        )}

        {compact && (
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Detailed Metrics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
