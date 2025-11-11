/**
 * Engagement Metrics Chart Component
 * 
 * Displays temporal analytics with interactive charts showing engagement trends,
 * user activity patterns, and real-time metrics visualization.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  MessageSquare,
  Eye,
  Share2,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface LiveMetrics {
  activeUsers: number;
  totalEngagement: number;
  commentsToday: number;
  billsViewed: number;
  expertContributions: number;
  communityScore: number;
  sentimentScore: number;
  trendingTopics: number;
}

interface EngagementMetricsChartProps {
  timeRange: 'hour' | 'day' | 'week' | 'month';
  metrics: LiveMetrics;
  className?: string;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

interface MetricSeries {
  name: string;
  data: ChartDataPoint[];
  color: string;
  icon: React.ComponentType<any>;
}

export function EngagementMetricsChart({ 
  timeRange, 
  metrics,
  className 
}: EngagementMetricsChartProps) {
  const [activeChart, setActiveChart] = useState<'line' | 'bar' | 'area'>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['activeUsers', 'comments', 'views']);
  
  // Generate mock time series data based on current metrics and time range
  const chartData = useMemo(() => {
    const generateTimePoints = () => {
      const now = new Date();
      const points: Date[] = [];
      
      switch (timeRange) {
        case 'hour':
          // Last 60 minutes, every 5 minutes
          for (let i = 11; i >= 0; i--) {
            points.push(new Date(now.getTime() - i * 5 * 60 * 1000));
          }
          break;
        case 'day':
          // Last 24 hours, every 2 hours
          for (let i = 11; i >= 0; i--) {
            points.push(new Date(now.getTime() - i * 2 * 60 * 60 * 1000));
          }
          break;
        case 'week':
          // Last 7 days
          for (let i = 6; i >= 0; i--) {
            points.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
          }
          break;
        case 'month':
          // Last 30 days, every 3 days
          for (let i = 9; i >= 0; i--) {
            points.push(new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000));
          }
          break;
      }
      
      return points;
    };

    const timePoints = generateTimePoints();
    
    // Generate realistic data with some variance
    const generateDataSeries = (baseValue: number, variance: number = 0.3): ChartDataPoint[] => {
      return timePoints.map((time, index) => {
        // Add some realistic patterns (lower activity at night, weekends, etc.)
        const hour = time.getHours();
        const dayOfWeek = time.getDay();
        
        let multiplier = 1;
        
        // Lower activity during night hours (11 PM - 6 AM)
        if (hour >= 23 || hour <= 6) {
          multiplier *= 0.3;
        }
        // Peak hours (9 AM - 5 PM)
        else if (hour >= 9 && hour <= 17) {
          multiplier *= 1.2;
        }
        
        // Lower activity on weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          multiplier *= 0.7;
        }
        
        // Add some random variance
        const randomVariance = 1 + (Math.random() - 0.5) * variance;
        
        // Trend upward slightly over time
        const trendMultiplier = 1 + (index * 0.02);
        
        const value = Math.round(baseValue * multiplier * randomVariance * trendMultiplier);
        
        return {
          timestamp: time.toISOString(),
          value: Math.max(0, value),
          label: timeRange === 'hour' 
            ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : timeRange === 'day'
            ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : time.toLocaleDateString([], { month: 'short', day: 'numeric' })
        };
      });
    };

    const series: MetricSeries[] = [
      {
        name: 'activeUsers',
        data: generateDataSeries(metrics.activeUsers, 0.4),
        color: '#3b82f6',
        icon: Users
      },
      {
        name: 'comments',
        data: generateDataSeries(metrics.commentsToday, 0.6),
        color: '#10b981',
        icon: MessageSquare
      },
      {
        name: 'views',
        data: generateDataSeries(metrics.billsViewed, 0.5),
        color: '#8b5cf6',
        icon: Eye
      },
      {
        name: 'shares',
        data: generateDataSeries(Math.floor(metrics.billsViewed * 0.1), 0.8),
        color: '#f59e0b',
        icon: Share2
      },
      {
        name: 'expertContributions',
        data: generateDataSeries(metrics.expertContributions, 0.7),
        color: '#ef4444',
        icon: TrendingUp
      }
    ];

    return series;
  }, [timeRange, metrics]);

  // Simple SVG chart renderer
  const renderLineChart = (series: MetricSeries[]) => {
    const filteredSeries = series.filter(s => selectedMetrics.includes(s.name));
    if (filteredSeries.length === 0) return null;

    const width = 400;
    const height = 200;
    const padding = 40;
    
    // Find max value across all series
    const maxValue = Math.max(...filteredSeries.flatMap(s => s.data.map(d => d.value)));
    const minValue = 0;
    
    const xStep = (width - 2 * padding) / (filteredSeries[0].data.length - 1);
    
    return (
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height + 60} className="min-w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - padding - ratio * (height - 2 * padding);
            const value = Math.round(minValue + ratio * (maxValue - minValue));
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {value}
                </text>
              </g>
            );
          })}
          
          {/* Data lines */}
          {filteredSeries.map((serie, serieIndex) => {
            const points = serie.data.map((point, index) => {
              const x = padding + index * xStep;
              const y = height - padding - ((point.value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <g key={serie.name}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={serie.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data points */}
                {serie.data.map((point, index) => {
                  const x = padding + index * xStep;
                  const y = height - padding - ((point.value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={serie.color}
                      className="hover:r-4 transition-all cursor-pointer"
                    >
                      <title>{`${serie.name}: ${point.value} at ${point.label}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {filteredSeries[0].data.map((point, index) => {
            if (index % Math.ceil(filteredSeries[0].data.length / 6) === 0) {
              const x = padding + index * xStep;
              return (
                <text
                  key={index}
                  x={x}
                  y={height + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {point.label}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    );
  };

  const renderBarChart = (series: MetricSeries[]) => {
    const filteredSeries = series.filter(s => selectedMetrics.includes(s.name));
    if (filteredSeries.length === 0) return null;

    const width = 400;
    const height = 200;
    const padding = 40;
    
    const maxValue = Math.max(...filteredSeries.flatMap(s => s.data.map(d => d.value)));
    const barWidth = (width - 2 * padding) / (filteredSeries[0].data.length * filteredSeries.length + filteredSeries[0].data.length);
    const groupWidth = barWidth * filteredSeries.length;
    
    return (
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height + 60} className="min-w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - padding - ratio * (height - 2 * padding);
            const value = Math.round(ratio * maxValue);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {value}
                </text>
              </g>
            );
          })}
          
          {/* Bars */}
          {filteredSeries[0].data.map((_, dataIndex) => {
            const groupX = padding + dataIndex * (groupWidth + barWidth);
            
            return filteredSeries.map((serie, serieIndex) => {
              const point = serie.data[dataIndex];
              const barHeight = (point.value / maxValue) * (height - 2 * padding);
              const x = groupX + serieIndex * barWidth;
              const y = height - padding - barHeight;
              
              return (
                <rect
                  key={`${dataIndex}-${serieIndex}`}
                  x={x}
                  y={y}
                  width={barWidth - 2}
                  height={barHeight}
                  fill={serie.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${serie.name}: ${point.value} at ${point.label}`}</title>
                </rect>
              );
            });
          })}
          
          {/* X-axis labels */}
          {filteredSeries[0].data.map((point, index) => {
            if (index % Math.ceil(filteredSeries[0].data.length / 6) === 0) {
              const x = padding + index * (groupWidth + barWidth) + groupWidth / 2;
              return (
                <text
                  key={index}
                  x={x}
                  y={height + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {point.label}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    );
  };

  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricName)
        ? prev.filter(m => m !== metricName)
        : [...prev, metricName]
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Engagement Trends
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {timeRange === 'hour' ? 'Hourly' : 
               timeRange === 'day' ? 'Daily' : 
               timeRange === 'week' ? 'Weekly' : 'Monthly'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Type Selector */}
        <Tabs value={activeChart} onValueChange={(value) => setActiveChart(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="line" className="flex items-center gap-1">
              <LineChart className="h-4 w-4" />
              Line
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Bar
            </TabsTrigger>
            <TabsTrigger value="area" className="flex items-center gap-1">
              <PieChart className="h-4 w-4" />
              Area
            </TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="space-y-4">
            {renderLineChart(chartData)}
          </TabsContent>

          <TabsContent value="bar" className="space-y-4">
            {renderBarChart(chartData)}
          </TabsContent>

          <TabsContent value="area" className="space-y-4">
            {renderLineChart(chartData)}
          </TabsContent>
        </Tabs>

        {/* Metric Selectors */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Metrics to Display</h4>
          <div className="flex flex-wrap gap-2">
            {chartData.map((serie) => {
              const Icon = serie.icon;
              const isSelected = selectedMetrics.includes(serie.name);
              
              return (
                <Button
                  key={serie.name}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMetric(serie.name)}
                  className="flex items-center gap-1"
                  style={isSelected ? { backgroundColor: serie.color, borderColor: serie.color } : {}}
                >
                  <Icon className="h-3 w-3" />
                  <span className="capitalize">
                    {serie.name.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {chartData.filter(s => selectedMetrics.includes(s.name)).map((serie) => {
            const Icon = serie.icon;
            const currentValue = serie.data[serie.data.length - 1]?.value || 0;
            const previousValue = serie.data[serie.data.length - 2]?.value || 0;
            const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
            
            return (
              <div key={serie.name} className="text-center p-2 rounded-md border">
                <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: serie.color }} />
                <div className="text-lg font-bold">{currentValue.toLocaleString()}</div>
                <div className={cn(
                  "text-xs flex items-center justify-center gap-1",
                  change >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                  {Math.abs(change).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default EngagementMetricsChart;