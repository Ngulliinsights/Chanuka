/**
 * Temporal Analytics Component
 * 
 * Provides detailed temporal analysis with hourly, daily, and weekly trend views,
 * activity pattern recognition, and predictive insights.
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Users,
  MessageSquare,
  Zap,
  Sun,
  Moon,
  Coffee
} from 'lucide-react';
import { cn } from '@client/lib/utils';

interface ActivityData {
  timestamp: string;
  type: string;
  bill_id?: number;
  discussion_id?: string;
}

interface TemporalAnalyticsProps {
  timeRange: 'hour' | 'day' | 'week' | 'month';
  activityData: ActivityData[];
  className?: string;
}

interface TimePattern {
  hour: number;
  count: number;
  percentage: number;
  label: string;
}

interface DayPattern {
  day: number;
  dayName: string;
  count: number;
  percentage: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  confidence: number;
  description: string;
}

interface PeakPeriod {
  start: string;
  end: string;
  type: 'peak' | 'valley';
  intensity: number;
  description: string;
}

export function TemporalAnalytics({ 
  timeRange, 
  activityData,
  className 
}: TemporalAnalyticsProps) {
  const [activeView, setActiveView] = useState<'patterns' | 'trends' | 'predictions'>('patterns');

  // Analyze hourly patterns
  const hourlyPatterns = useMemo((): TimePattern[] => {
    const hourCounts = new Array(24).fill(0);
    
    activityData.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour]++;
    });

    const total = activityData.length;
    
    return hourCounts.map((count, hour) => ({
      hour,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      label: `${hour.toString().padStart(2, '0')}:00`
    }));
  }, [activityData]);

  // Analyze daily patterns
  const dailyPatterns = useMemo((): DayPattern[] => {
    const dayCounts = new Array(7).fill(0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    activityData.forEach(activity => {
      const day = new Date(activity.timestamp).getDay();
      dayCounts[day]++;
    });

    const total = activityData.length;
    
    return dayCounts.map((count, day) => ({
      day,
      dayName: dayNames[day],
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }, [activityData]);

  // Analyze trends
  const trendAnalysis = useMemo((): TrendAnalysis => {
    if (activityData.length < 10) {
      return {
        direction: 'stable',
        percentage: 0,
        confidence: 0,
        description: 'Insufficient data for trend analysis'
      };
    }

    // Split data into two halves and compare
    const midPoint = Math.floor(activityData.length / 2);
    const firstHalf = activityData.slice(0, midPoint);
    const secondHalf = activityData.slice(midPoint);
    
    const firstHalfRate = firstHalf.length;
    const secondHalfRate = secondHalf.length;
    
    if (firstHalfRate === 0) {
      return {
        direction: 'up',
        percentage: 100,
        confidence: 90,
        description: 'Strong upward trend from zero activity'
      };
    }
    
    const changePercentage = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100;
    const absChange = Math.abs(changePercentage);
    
    let direction: 'up' | 'down' | 'stable';
    let confidence: number;
    let description: string;
    
    if (absChange < 5) {
      direction = 'stable';
      confidence = 85;
      description = 'Activity levels remain consistent';
    } else if (changePercentage > 0) {
      direction = 'up';
      confidence = Math.min(95, 60 + absChange);
      description = `Activity increasing by ${absChange.toFixed(1)}%`;
    } else {
      direction = 'down';
      confidence = Math.min(95, 60 + absChange);
      description = `Activity decreasing by ${absChange.toFixed(1)}%`;
    }
    
    return {
      direction,
      percentage: absChange,
      confidence,
      description
    };
  }, [activityData]);

  // Identify peak periods
  const peakPeriods = useMemo((): PeakPeriod[] => {
    const peaks: PeakPeriod[] = [];
    
    // Find peak hours
    const maxHourlyActivity = Math.max(...hourlyPatterns.map(p => p.count));
    const avgHourlyActivity = hourlyPatterns.reduce((sum, p) => sum + p.count, 0) / 24;
    
    hourlyPatterns.forEach((pattern, index) => {
      if (pattern.count > avgHourlyActivity * 1.5) {
        const nextHour = (index + 1) % 24;
        peaks.push({
          start: pattern.label,
          end: `${nextHour.toString().padStart(2, '0')}:00`,
          type: 'peak',
          intensity: (pattern.count / maxHourlyActivity) * 100,
          description: `High activity period (${pattern.count} activities)`
        });
      } else if (pattern.count < avgHourlyActivity * 0.3) {
        const nextHour = (index + 1) % 24;
        peaks.push({
          start: pattern.label,
          end: `${nextHour.toString().padStart(2, '0')}:00`,
          type: 'valley',
          intensity: (pattern.count / maxHourlyActivity) * 100,
          description: `Low activity period (${pattern.count} activities)`
        });
      }
    });
    
    return peaks.slice(0, 6); // Limit to top 6 periods
  }, [hourlyPatterns]);

  // Generate predictions
  const predictions = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    // Predict next hour activity
    const nextHour = (currentHour + 1) % 24;
    const nextHourPattern = hourlyPatterns[nextHour];
    const currentHourPattern = hourlyPatterns[currentHour];
    
    const nextHourPrediction = {
      period: `${nextHour.toString().padStart(2, '0')}:00`,
      expectedActivity: Math.round(nextHourPattern.count * 1.1), // Slight adjustment
      confidence: 75,
      trend: nextHourPattern.count > currentHourPattern.count ? 'increasing' : 'decreasing'
    };
    
    // Predict tomorrow's activity
    const tomorrowDay = (currentDay + 1) % 7;
    const tomorrowPattern = dailyPatterns[tomorrowDay];
    const todayPattern = dailyPatterns[currentDay];
    
    const tomorrowPrediction = {
      period: tomorrowPattern.dayName,
      expectedActivity: Math.round(tomorrowPattern.count * 1.05),
      confidence: 70,
      trend: tomorrowPattern.count > todayPattern.count ? 'increasing' : 'decreasing'
    };
    
    return {
      nextHour: nextHourPrediction,
      tomorrow: tomorrowPrediction
    };
  }, [hourlyPatterns, dailyPatterns]);

  const renderHourlyChart = () => {
    const maxCount = Math.max(...hourlyPatterns.map(p => p.count));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-1">
          {hourlyPatterns.map((pattern) => {
            const height = maxCount > 0 ? (pattern.count / maxCount) * 100 : 0;
            const isCurrentHour = new Date().getHours() === pattern.hour;
            
            return (
              <div key={pattern.hour} className="flex flex-col items-center">
                <div className="h-24 w-full flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-300",
                      isCurrentHour 
                        ? "bg-blue-500" 
                        : height > 70 
                        ? "bg-green-400" 
                        : height > 40 
                        ? "bg-yellow-400" 
                        : "bg-gray-300"
                    )}
                    style={{ height: `${height}%` }}
                    title={`${pattern.label}: ${pattern.count} activities (${pattern.percentage.toFixed(1)}%)`}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {pattern.hour % 4 === 0 ? pattern.label : ''}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span>High Activity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded" />
            <span>Medium Activity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded" />
            <span>Low Activity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Current Hour</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDailyChart = () => {
    const maxCount = Math.max(...dailyPatterns.map(p => p.count));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {dailyPatterns.map((pattern) => {
            const height = maxCount > 0 ? (pattern.count / maxCount) * 100 : 0;
            const isToday = new Date().getDay() === pattern.day;
            
            return (
              <div key={pattern.day} className="flex flex-col items-center">
                <div className="h-32 w-full flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-300",
                      isToday 
                        ? "bg-blue-500" 
                        : height > 70 
                        ? "bg-green-400" 
                        : height > 40 
                        ? "bg-yellow-400" 
                        : "bg-gray-300"
                    )}
                    style={{ height: `${height}%` }}
                    title={`${pattern.dayName}: ${pattern.count} activities (${pattern.percentage.toFixed(1)}%)`}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {pattern.dayName.slice(0, 3)}
                </div>
                <div className="text-xs font-medium">
                  {pattern.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return BarChart3;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600 bg-green-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Temporal Analytics
          </span>
          <Badge variant="outline" className="text-xs">
            {activityData.length} activities analyzed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns">Activity Patterns</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-6">
            {/* Hourly Patterns */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hourly Activity Patterns
              </h4>
              {renderHourlyChart()}
            </div>

            {/* Daily Patterns */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Daily Activity Patterns
              </h4>
              {renderDailyChart()}
            </div>

            {/* Peak Periods */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Peak Activity Periods</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {peakPeriods.map((period, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-md border",
                      period.type === 'peak' 
                        ? "bg-green-50 border-green-200" 
                        : "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {period.start} - {period.end}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          period.type === 'peak' 
                            ? "text-green-700 bg-green-100" 
                            : "text-blue-700 bg-blue-100"
                        )}
                      >
                        {period.type === 'peak' ? 'Peak' : 'Valley'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {period.description}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Intensity</span>
                        <span>{period.intensity.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full",
                            period.type === 'peak' ? "bg-green-500" : "bg-blue-500"
                          )}
                          style={{ width: `${period.intensity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Overall Trend */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Overall Activity Trend</h4>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {React.createElement(getTrendIcon(trendAnalysis.direction), {
                      className: cn("h-5 w-5", getTrendColor(trendAnalysis.direction).split(' ')[0])
                    })}
                    <span className="font-medium capitalize">
                      {trendAnalysis.direction} Trend
                    </span>
                  </div>
                  <Badge className={getTrendColor(trendAnalysis.direction)}>
                    {trendAnalysis.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {trendAnalysis.description}
                </p>
                <div className="flex justify-between text-xs">
                  <span>Confidence Level</span>
                  <span>{trendAnalysis.confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${trendAnalysis.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Activity Type Breakdown */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Activity Type Trends</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['comment', 'bill_save', 'discussion'].map((type) => {
                  const typeActivities = activityData.filter(a => a.type === type);
                  const percentage = activityData.length > 0 ? (typeActivities.length / activityData.length) * 100 : 0;
                  
                  return (
                    <div key={type} className="p-3 rounded-md border">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-2xl font-bold">{typeActivities.length}</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% of total activity
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            {/* Short-term Predictions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Activity Predictions
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Next Hour */}
                <div className="p-4 rounded-lg border bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Next Hour</span>
                    <Badge variant="outline" className="text-xs">
                      {predictions.nextHour.confidence}% confidence
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {predictions.nextHour.expectedActivity}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Expected activities at {predictions.nextHour.period}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {predictions.nextHour.trend === 'increasing' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={predictions.nextHour.trend === 'increasing' ? 'text-green-600' : 'text-red-600'}>
                      {predictions.nextHour.trend}
                    </span>
                  </div>
                </div>

                {/* Tomorrow */}
                <div className="p-4 rounded-lg border bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Tomorrow</span>
                    <Badge variant="outline" className="text-xs">
                      {predictions.tomorrow.confidence}% confidence
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {predictions.tomorrow.expectedActivity}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Expected activities on {predictions.tomorrow.period}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {predictions.tomorrow.trend === 'increasing' ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={predictions.tomorrow.trend === 'increasing' ? 'text-green-600' : 'text-red-600'}>
                      {predictions.tomorrow.trend}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Optimization Recommendations</h4>
              <div className="space-y-2">
                <div className="p-3 rounded-md border bg-yellow-50 border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Peak Hours</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Schedule important announcements during 9 AM - 5 PM for maximum engagement
                  </p>
                </div>
                
                <div className="p-3 rounded-md border bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Off-Peak Strategy</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use evening hours (6 PM - 10 PM) for community discussions and expert Q&A
                  </p>
                </div>
                
                <div className="p-3 rounded-md border bg-orange-50 border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Weekend Engagement</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Focus on educational content and bill summaries during weekends
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default TemporalAnalytics;