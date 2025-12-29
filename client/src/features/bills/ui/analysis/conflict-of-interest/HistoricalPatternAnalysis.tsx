/**
 * HistoricalPatternAnalysis - Voting correlation with financial interests
 * 
 * Analyzes historical voting patterns and their correlation with
 * financial interests and organizational connections.
 */

import { TrendingUp, Vote, Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

import { VotingPattern, ConflictAnalysis } from '@client/features/analysis/types';

import { Badge } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';



interface HistoricalPatternAnalysisProps {
  conflictAnalysis: ConflictAnalysis;
}

export function HistoricalPatternAnalysis({ conflictAnalysis }: HistoricalPatternAnalysisProps) {
  // Process voting patterns for analysis
  const analysisData = useMemo(() => {
    const { votingPatterns, financialInterests } = conflictAnalysis;

    // Group votes by year and calculate correlations
    const votesByYear = votingPatterns.reduce((acc, vote) => {
      const year = new Date(vote.date).getFullYear();
      if (!acc[year]) {
        acc[year] = {
          year,
          votes: [],
          avgCorrelation: 0,
          highCorrelationVotes: 0,
          totalVotes: 0,
          yesVotes: 0,
          noVotes: 0,
          abstainVotes: 0,
          absentVotes: 0
        };
      }
      
      acc[year].votes.push(vote);
      acc[year].totalVotes++;
      acc[year][`${vote.vote}Votes`]++;
      
      return acc;
    }, {} as Record<number, any>);

    // Calculate average correlations and patterns
    Object.values(votesByYear).forEach((yearData: any) => {
      const correlations = yearData.votes.map((v: VotingPattern) => Math.abs(v.financialCorrelation));
      yearData.avgCorrelation = correlations.reduce((sum: number, c: number) => sum + c, 0) / correlations.length;
      yearData.highCorrelationVotes = yearData.votes.filter((v: VotingPattern) => Math.abs(v.financialCorrelation) > 0.5).length;
    });

    // Industry-specific voting patterns
    const industryPatterns = financialInterests.reduce((acc, interest) => {
      if (!acc[interest.industry]) {
        acc[interest.industry] = {
          industry: interest.industry,
          totalAmount: 0,
          relatedVotes: [],
          avgCorrelation: 0,
          favorableVotes: 0,
          unfavorableVotes: 0
        };
      }
      
      acc[interest.industry].totalAmount += interest.amount;
      
      // Find votes related to this industry
      const relatedVotes = votingPatterns.filter(vote => 
        vote.relatedIndustries.includes(interest.industry)
      );
      
      acc[interest.industry].relatedVotes = relatedVotes;
      
      if (relatedVotes.length > 0) {
        acc[interest.industry].avgCorrelation = 
          relatedVotes.reduce((sum, vote) => sum + vote.financialCorrelation, 0) / relatedVotes.length;
        
        acc[interest.industry].favorableVotes = 
          relatedVotes.filter(vote => vote.financialCorrelation > 0.2).length;
        
        acc[interest.industry].unfavorableVotes = 
          relatedVotes.filter(vote => vote.financialCorrelation < -0.2).length;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Correlation timeline data
    const correlationTimeline = votingPatterns
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((vote, index) => ({
        index: index + 1,
        date: vote.date,
        correlation: vote.financialCorrelation,
        billTitle: vote.billTitle,
        vote: vote.vote,
        industries: vote.relatedIndustries
      }));

    // Risk assessment
    const riskMetrics = {
      highCorrelationPercentage: (votingPatterns.filter(v => Math.abs(v.financialCorrelation) > 0.5).length / votingPatterns.length) * 100,
      consistentPatternRisk: Object.values(industryPatterns).filter((p: any) => p.avgCorrelation > 0.3 && p.relatedVotes.length >= 3).length,
      recentTrendRisk: correlationTimeline.slice(-10).filter(v => Math.abs(v.correlation) > 0.4).length
    };

    return {
      yearlyData: Object.values(votesByYear).sort((a: any, b: any) => a.year - b.year),
      industryPatterns: Object.values(industryPatterns).sort((a: any, b: any) => b.totalAmount - a.totalAmount),
      correlationTimeline,
      riskMetrics,
      totalVotes: votingPatterns.length,
      avgOverallCorrelation: votingPatterns.reduce((sum, vote) => sum + Math.abs(vote.financialCorrelation), 0) / votingPatterns.length
    };
  }, [conflictAnalysis]);

  // Get correlation color
  const getCorrelationColor = (correlation: number): string => {
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.7) return 'hsl(var(--status-critical))';
    if (absCorr > 0.5) return 'hsl(var(--status-high))';
    if (absCorr > 0.3) return 'hsl(var(--status-moderate))';
    return 'hsl(var(--civic-expert))';
  };

  // Get risk level badge
  const getRiskBadge = (percentage: number): 'default' | 'secondary' | 'destructive' => {
    if (percentage > 30) return 'destructive';
    if (percentage > 15) return 'secondary';
    return 'default';
  };

  // Format correlation value
  const formatCorrelation = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Vote className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Votes</span>
            </div>
            <div className="text-2xl font-bold">{analysisData.totalVotes}</div>
            <div className="text-xs text-muted-foreground">
              Analyzed voting records
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg Correlation</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCorrelation(analysisData.avgOverallCorrelation)}
            </div>
            <div className="text-xs text-muted-foreground">
              Financial interest correlation
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">High Risk Votes</span>
            </div>
            <div className="text-2xl font-bold">
              {analysisData.riskMetrics.highCorrelationPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Correlation &gt; 50%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pattern Risk</span>
            </div>
            <div className="text-2xl font-bold">
              <Badge variant={getRiskBadge(analysisData.riskMetrics.consistentPatternRisk * 10)}>
                {analysisData.riskMetrics.consistentPatternRisk > 2 ? 'HIGH' : 
                 analysisData.riskMetrics.consistentPatternRisk > 0 ? 'MEDIUM' : 'LOW'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Consistent patterns detected
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="industry">By Industry</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Trends</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Map</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voting Correlation Timeline</CardTitle>
              <CardDescription>
                Financial correlation of votes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysisData.correlationTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="index"
                      label={{ value: 'Vote Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      domain={[-1, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      label={{ value: 'Correlation', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCorrelation(value), 'Correlation']}
                      labelFormatter={(index) => {
                        const vote = analysisData.correlationTimeline[index - 1];
                        return vote ? `${vote.billTitle} (${new Date(vote.date).toLocaleDateString()})` : '';
                      }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="correlation"
                      stroke="hsl(var(--civic-constitutional))"
                      fill="hsl(var(--civic-constitutional))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent High-Risk Votes */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">Recent High-Correlation Votes</h4>
                <div className="space-y-2">
                  {analysisData.correlationTimeline
                    .filter(vote => Math.abs(vote.correlation) > 0.4)
                    .slice(-5)
                    .map((vote, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{vote.billTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(vote.date).toLocaleDateString()} • Vote: {vote.vote}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Industries: {vote.industries.join(', ')}
                        </div>
                      </div>
                      <Badge 
                        variant={Math.abs(vote.correlation) > 0.7 ? 'destructive' : 'secondary'}
                        style={{ color: getCorrelationColor(vote.correlation) }}
                      >
                        {formatCorrelation(vote.correlation)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry-Specific Voting Patterns</CardTitle>
              <CardDescription>
                Voting correlations by industry with financial interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisData.industryPatterns
                  .filter((pattern: any) => pattern.relatedVotes.length > 0)
                  .map((pattern: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{pattern.industry}</div>
                        <div className="text-sm text-muted-foreground">
                          Financial exposure: ${pattern.totalAmount.toLocaleString()} • 
                          {pattern.relatedVotes.length} related votes
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={Math.abs(pattern.avgCorrelation) > 0.5 ? 'destructive' : 
                                  Math.abs(pattern.avgCorrelation) > 0.3 ? 'secondary' : 'default'}
                        >
                          {formatCorrelation(pattern.avgCorrelation)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">{pattern.favorableVotes}</div>
                        <div className="text-xs text-muted-foreground">Favorable</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">
                          {pattern.relatedVotes.length - pattern.favorableVotes - pattern.unfavorableVotes}
                        </div>
                        <div className="text-xs text-muted-foreground">Neutral</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-medium">{pattern.unfavorableVotes}</div>
                        <div className="text-xs text-muted-foreground">Unfavorable</div>
                      </div>
                    </div>

                    {Math.abs(pattern.avgCorrelation) > 0.4 && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-600" />
                        <span className="text-yellow-800">
                          High correlation detected - voting pattern may align with financial interests
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Yearly Voting Trends</CardTitle>
              <CardDescription>
                Annual patterns in voting behavior and correlations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisData.yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'avgCorrelation') return [formatCorrelation(value), 'Avg Correlation'];
                        return [value, name];
                      }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)'
                      }}
                    />
                    <Bar yAxisId="left" dataKey="totalVotes" fill="hsl(var(--civic-constitutional))" name="Total Votes" />
                    <Bar yAxisId="left" dataKey="highCorrelationVotes" fill="hsl(var(--status-high))" name="High Correlation" />
                    <Line yAxisId="right" type="monotone" dataKey="avgCorrelation" stroke="hsl(var(--status-critical))" name="Avg Correlation" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Yearly Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisData.yearlyData.map((yearData: any) => (
                  <div key={yearData.year} className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">{yearData.year}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Votes:</span>
                        <span>{yearData.totalVotes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Correlation:</span>
                        <span>{formatCorrelation(yearData.avgCorrelation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Risk:</span>
                        <span>{yearData.highCorrelationVotes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Distribution</CardTitle>
              <CardDescription>
                Distribution of financial correlation across all votes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={analysisData.correlationTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number"
                      dataKey="index"
                      domain={[1, analysisData.correlationTimeline.length]}
                      label={{ value: 'Vote Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      type="number"
                      dataKey="correlation"
                      domain={[-1, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      label={{ value: 'Correlation', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCorrelation(value), 'Correlation']}
                      labelFormatter={(index) => {
                        const vote = analysisData.correlationTimeline[index - 1];
                        return vote ? vote.billTitle : '';
                      }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)'
                      }}
                    />
                    <Scatter 
                      dataKey="correlation" 
                      fill="hsl(var(--civic-transparency))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Assessment */}
              <div className="mt-6 p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Risk Assessment Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-red-600">
                      {analysisData.riskMetrics.highCorrelationPercentage.toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground">High Correlation Votes</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-orange-600">
                      {analysisData.riskMetrics.consistentPatternRisk}
                    </div>
                    <div className="text-muted-foreground">Industries with Patterns</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-lg font-bold text-yellow-600">
                      {analysisData.riskMetrics.recentTrendRisk}
                    </div>
                    <div className="text-muted-foreground">Recent High-Risk Votes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}