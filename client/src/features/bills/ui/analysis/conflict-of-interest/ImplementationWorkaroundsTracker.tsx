/**
 * ImplementationWorkaroundsTracker - Track rejected bill provisions
 *
 * Monitors and analyzes implementation workarounds for rejected
 * bill provisions and their relationship to financial interests.
 */

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  ExternalLink,
  Calendar,
  Target,
} from 'lucide-react';
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { ImplementationWorkaround, ConflictAnalysis } from '@client/features/analysis/types';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

interface ImplementationWorkaroundsTrackerProps {
  conflictAnalysis: ConflictAnalysis;
  workarounds?: ImplementationWorkaround[];
}

export function ImplementationWorkaroundsTracker({
  conflictAnalysis,
  workarounds = [],
}: ImplementationWorkaroundsTrackerProps) {
  // Generate mock workaround data if none provided
  const mockWorkarounds: ImplementationWorkaround[] = useMemo(
    () => [
      {
        id: 'wa-1',
        originalProvision:
          'Mandatory disclosure of pharmaceutical industry investments above $10,000',
        workaroundMethod: 'Alternative regulatory framework through executive order',
        implementationDate: '2024-03-15',
        effectiveness: 0.75,
        relatedInterests: ['Healthcare', 'Pharmaceuticals'],
        description:
          'Implemented through regulatory changes rather than legislative mandate, reducing transparency requirements',
      },
      {
        id: 'wa-2',
        originalProvision: 'Prohibition on lobbying activities for 2 years post-office',
        workaroundMethod: 'Consulting and advisory roles classification',
        implementationDate: '2023-11-20',
        effectiveness: 0.45,
        relatedInterests: ['Government Relations', 'Consulting'],
        description:
          'Reclassified lobbying activities as consulting to circumvent cooling-off period',
      },
      {
        id: 'wa-3',
        originalProvision: 'Public database of all financial conflicts',
        workaroundMethod: 'Limited access portal with restricted search capabilities',
        implementationDate: '2024-01-10',
        effectiveness: 0.6,
        relatedInterests: ['Technology', 'Data Management'],
        description: 'Created database with limited public access and search restrictions',
      },
      {
        id: 'wa-4',
        originalProvision: 'Real-time disclosure of stock transactions',
        workaroundMethod: 'Quarterly reporting with 45-day delay',
        implementationDate: '2023-09-05',
        effectiveness: 0.3,
        relatedInterests: ['Financial Services', 'Securities'],
        description: 'Delayed reporting system reduces real-time transparency',
      },
    ],
    []
  );

  const allWorkarounds = workarounds.length > 0 ? workarounds : mockWorkarounds;

  // Process workaround data for analysis
  const analysisData = useMemo(() => {
    // Group by effectiveness levels
    const effectivenessGroups = {
      high: allWorkarounds.filter(w => w.effectiveness >= 0.7),
      medium: allWorkarounds.filter(w => w.effectiveness >= 0.4 && w.effectiveness < 0.7),
      low: allWorkarounds.filter(w => w.effectiveness < 0.4),
    };

    // Group by related interests
    const interestGroups = allWorkarounds.reduce(
      (acc, workaround) => {
        workaround.relatedInterests.forEach(interest => {
          if (!acc[interest]) {
            acc[interest] = {
              interest,
              workarounds: [],
              avgEffectiveness: 0,
              totalWorkarounds: 0,
            };
          }
          acc[interest].workarounds.push(workaround);
          acc[interest].totalWorkarounds++;
        });
        return acc;
      },
      {} as Record<string, any>
    );

    // Calculate average effectiveness by interest
    Object.values(interestGroups).forEach((group: any) => {
      group.avgEffectiveness =
        group.workarounds.reduce(
          (sum: number, w: ImplementationWorkaround) => sum + w.effectiveness,
          0
        ) / group.workarounds.length;
    });

    // Timeline data
    const timelineData = allWorkarounds
      .sort(
        (a, b) =>
          new Date(a.implementationDate).getTime() - new Date(b.implementationDate).getTime()
      )
      .map((workaround, index) => ({
        index: index + 1,
        date: workaround.implementationDate,
        effectiveness: workaround.effectiveness,
        provision: workaround.originalProvision,
        method: workaround.workaroundMethod,
      }));

    // Risk assessment
    const riskMetrics = {
      totalWorkarounds: allWorkarounds.length,
      avgEffectiveness:
        allWorkarounds.reduce((sum, w) => sum + w.effectiveness, 0) / allWorkarounds.length,
      highRiskWorkarounds: effectivenessGroups.high.length,
      recentWorkarounds: allWorkarounds.filter(w => {
        const monthsAgo =
          (Date.now() - new Date(w.implementationDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAgo <= 12;
      }).length,
    };

    return {
      effectivenessGroups,
      interestGroups: Object.values(interestGroups).sort(
        (a: any, b: any) => b.totalWorkarounds - a.totalWorkarounds
      ),
      timelineData,
      riskMetrics,
    };
  }, [allWorkarounds]);

  // Color schemes
  const effectivenessColors = {
    high: 'hsl(var(--status-critical))',
    medium: 'hsl(var(--status-high))',
    low: 'hsl(var(--civic-expert))',
  };

  // Get effectiveness badge
  const getEffectivenessBadge = (
    effectiveness: number
  ): 'default' | 'secondary' | 'destructive' => {
    if (effectiveness >= 0.7) return 'destructive';
    if (effectiveness >= 0.4) return 'secondary';
    return 'default';
  };

  // Get risk level
  const getRiskLevel = (effectiveness: number): string => {
    if (effectiveness >= 0.7) return 'High Risk';
    if (effectiveness >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Prepare pie chart data
  const pieData = [
    {
      name: 'High Effectiveness',
      value: analysisData.effectivenessGroups.high.length,
      fill: effectivenessColors.high,
    },
    {
      name: 'Medium Effectiveness',
      value: analysisData.effectivenessGroups.medium.length,
      fill: effectivenessColors.medium,
    },
    {
      name: 'Low Effectiveness',
      value: analysisData.effectivenessGroups.low.length,
      fill: effectivenessColors.low,
    },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Workarounds</span>
            </div>
            <div className="text-2xl font-bold">{analysisData.riskMetrics.totalWorkarounds}</div>
            <div className="text-xs text-muted-foreground">Implementation alternatives</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg Effectiveness</span>
            </div>
            <div className="text-2xl font-bold">
              {formatPercentage(analysisData.riskMetrics.avgEffectiveness)}
            </div>
            <div className="text-xs text-muted-foreground">Success rate of workarounds</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">High Risk</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {analysisData.riskMetrics.highRiskWorkarounds}
            </div>
            <div className="text-xs text-muted-foreground">Highly effective workarounds</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recent Activity</span>
            </div>
            <div className="text-2xl font-bold">{analysisData.riskMetrics.recentWorkarounds}</div>
            <div className="text-xs text-muted-foreground">Last 12 months</div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="interests">By Interest</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Effectiveness Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Effectiveness Distribution</CardTitle>
                <CardDescription>Breakdown of workaround effectiveness levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, 'Count']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Analysis of workaround impact on transparency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">High Effectiveness Workarounds</span>
                      <Badge variant="destructive">
                        {analysisData.effectivenessGroups.high.length}
                      </Badge>
                    </div>
                    <Progress
                      value={
                        (analysisData.effectivenessGroups.high.length /
                          analysisData.riskMetrics.totalWorkarounds) *
                        100
                      }
                      className="h-2"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Workarounds that significantly undermine original provisions
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Medium Effectiveness</span>
                      <Badge variant="secondary">
                        {analysisData.effectivenessGroups.medium.length}
                      </Badge>
                    </div>
                    <Progress
                      value={
                        (analysisData.effectivenessGroups.medium.length /
                          analysisData.riskMetrics.totalWorkarounds) *
                        100
                      }
                      className="h-2"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Partial implementation with some transparency loss
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Low Effectiveness</span>
                      <Badge variant="default">{analysisData.effectivenessGroups.low.length}</Badge>
                    </div>
                    <Progress
                      value={
                        (analysisData.effectivenessGroups.low.length /
                          analysisData.riskMetrics.totalWorkarounds) *
                        100
                      }
                      className="h-2"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Limited impact on original transparency goals
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Timeline</CardTitle>
              <CardDescription>Chronological view of workaround implementations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysisData.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="index"
                      label={{
                        value: 'Implementation Order',
                        position: 'insideBottom',
                        offset: -5,
                      }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={value => `${(value * 100).toFixed(0)}%`}
                      label={{ value: 'Effectiveness', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatPercentage(value), 'Effectiveness']}
                      labelFormatter={index => {
                        const item = analysisData.timelineData[index - 1];
                        return item ? `${new Date(item.date).toLocaleDateString()}` : '';
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="effectiveness"
                      stroke="hsl(var(--civic-constitutional))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--civic-constitutional))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Timeline List */}
              <div className="mt-6 space-y-3">
                {analysisData.timelineData.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-sm font-medium">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium mb-1">{item.provision}</div>
                      <div className="text-sm text-muted-foreground mb-2">{item.method}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={getEffectivenessBadge(item.effectiveness)}>
                        {formatPercentage(item.effectiveness)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workarounds by Interest Area</CardTitle>
              <CardDescription>
                Analysis of workarounds grouped by related financial interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisData.interestGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="interest"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'avgEffectiveness')
                          return [formatPercentage(value), 'Avg Effectiveness'];
                        return [value, name];
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <Bar
                      dataKey="totalWorkarounds"
                      fill="hsl(var(--civic-transparency))"
                      name="Total Workarounds"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Interest Details */}
              <div className="mt-6 space-y-3">
                {analysisData.interestGroups.map((group: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{group.interest}</div>
                        <div className="text-sm text-muted-foreground">
                          {group.totalWorkarounds} workarounds implemented
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getEffectivenessBadge(group.avgEffectiveness)}>
                          {formatPercentage(group.avgEffectiveness)}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getRiskLevel(group.avgEffectiveness)}
                        </div>
                      </div>
                    </div>

                    {group.avgEffectiveness > 0.6 && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2 text-red-600" />
                        <span className="text-red-800">
                          High-effectiveness workarounds may significantly impact transparency in
                          this area
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Workaround Analysis</CardTitle>
              <CardDescription>
                Complete list of implementation workarounds with effectiveness ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allWorkarounds
                  .sort((a, b) => b.effectiveness - a.effectiveness)
                  .map((workaround, index) => (
                    <div key={workaround.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium mb-2">Original Provision</div>
                          <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted rounded">
                            {workaround.originalProvision}
                          </div>

                          <div className="font-medium mb-2">Workaround Method</div>
                          <div className="text-sm mb-3">{workaround.workaroundMethod}</div>

                          <div className="text-sm text-muted-foreground">
                            {workaround.description}
                          </div>
                        </div>

                        <div className="flex-shrink-0 ml-4 text-right">
                          <Badge
                            variant={getEffectivenessBadge(workaround.effectiveness)}
                            className="mb-2"
                          >
                            {formatPercentage(workaround.effectiveness)}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {new Date(workaround.implementationDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {workaround.relatedInterests.map((interest, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {getRiskLevel(workaround.effectiveness)}
                        </div>
                      </div>

                      {workaround.effectiveness > 0.7 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <AlertTriangle className="h-4 w-4 inline mr-2 text-red-600" />
                          <span className="text-red-800">
                            High-effectiveness workaround - significant impact on original
                            transparency goals
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
