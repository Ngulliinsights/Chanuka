/**
 * TransparencyScoring - Algorithmic transparency assessment
 *
 * Displays transparency scores with methodology explanation
 * and detailed scoring breakdowns.
 */

import { Eye, Info, ChevronDown, ChevronUp, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { TransparencyScore, ConflictAnalysis } from '@client/features/analysis/types';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';

interface TransparencyScoringProps {
  conflictAnalysis: ConflictAnalysis;
}

export function TransparencyScoring({ conflictAnalysis }: TransparencyScoringProps) {
  const [showMethodology, setShowMethodology] = React.useState(false);

  // Calculate detailed scoring breakdown
  const scoringBreakdown = useMemo(() => {
    const { transparencyScore, financialInterests, organizationalConnections, votingPatterns } =
      conflictAnalysis;

    // Normalize transparencyScore to object format
    const scoreObj = typeof transparencyScore === 'number' 
      ? { overall: transparencyScore, financialDisclosure: 0, votingHistory: 0, industryConnections: 0 }
      : transparencyScore;

    // Financial Disclosure Score (0-100)
    const financialScore = {
      score: scoreObj?.financialDisclosure ?? 0,
      factors: [
        {
          name: 'Disclosure Completeness',
          score: Math.min(
            100,
            ((financialInterests?.filter(f => f.verified).length ?? 0) /
              Math.max(1, financialInterests?.length ?? 1)) *
              100
          ),
          weight: 0.4,
          description: 'Percentage of financial interests that are verified and complete',
        },
        {
          name: 'Timeliness',
          score: Math.min(
            100,
            ((financialInterests?.filter(f => {
              const daysSinceDisclosure =
                (Date.now() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceDisclosure <= 90; // Within 90 days
            }).length ?? 0) /
              Math.max(1, financialInterests?.length ?? 1)) *
              100
          ),
          weight: 0.3,
          description: 'How recently financial interests were disclosed',
        },
        {
          name: 'Detail Level',
          score: Math.min(
            100,
            ((financialInterests?.filter(f => f.description && f.description.length > 20).length ?? 0) /
              Math.max(1, financialInterests?.length ?? 1)) *
              100
          ),
          weight: 0.3,
          description: 'Quality and detail of financial interest descriptions',
        },
      ],
    };

    // Voting History Score (0-100)
    const votingScore = {
      score: scoreObj?.votingHistory ?? 0,
      factors: [
        {
          name: 'Vote Consistency',
          score: Math.min(
            100,
            ((votingPatterns?.filter(v => Math.abs(v.financialCorrelation ?? 0) < 0.3).length ?? 0) /
              Math.max(1, votingPatterns?.length ?? 1)) *
              100
          ),
          weight: 0.5,
          description: 'Votes that show low correlation with financial interests',
        },
        {
          name: 'Explanation Provided',
          score: 85, // Mock score - would be calculated from actual vote explanations
          weight: 0.3,
          description: 'Percentage of votes with public explanations',
        },
        {
          name: 'Attendance Rate',
          score: Math.min(
            100,
            ((votingPatterns?.filter(v => v.vote !== 'abstain').length ?? 0) /
              Math.max(1, votingPatterns?.length ?? 1)) *
              100
          ),
          weight: 0.2,
          description: 'Attendance rate for relevant votes',
        },
      ],
    };

    // Industry Connections Score (0-100)
    const connectionsScore = {
      score: scoreObj?.industryConnections ?? 0,
      factors: [
        {
          name: 'Connection Disclosure',
          score: Math.min(
            100,
            ((organizationalConnections?.filter(c => c.verified).length ?? 0) /
              Math.max(1, organizationalConnections?.length ?? 1)) *
              100
          ),
          weight: 0.4,
          description: 'Percentage of organizational connections that are verified',
        },
        {
          name: 'Conflict Management',
          score: Math.min(
            100,
            ((organizationalConnections?.filter(c => c.endDate !== undefined).length ?? 0) /
              Math.max(1, organizationalConnections?.length ?? 1)) *
              100
          ),
          weight: 0.4,
          description: 'Evidence of managing potential conflicts',
        },
        {
          name: 'Transparency Proactivity',
          score: 75, // Mock score - would be calculated from proactive disclosures
          weight: 0.2,
          description: 'Proactive disclosure beyond legal requirements',
        },
      ],
    };

    return {
      overall: scoreObj?.overall ?? 0,
      financial: financialScore,
      voting: votingScore,
      connections: connectionsScore,
      lastUpdated: scoreObj?.lastUpdated ?? new Date().toISOString(),
    };
  }, [conflictAnalysis]);

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'hsl(var(--civic-expert))'; // Green
    if (score >= 60) return 'hsl(var(--status-moderate))'; // Yellow
    if (score >= 40) return 'hsl(var(--status-high))'; // Orange
    return 'hsl(var(--status-critical))'; // Red
  };

  // Get score badge variant
  const getScoreBadge = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 70) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  // Get score interpretation
  const getScoreInterpretation = (
    score: number
  ): { level: string; description: string; icon: React.ReactNode } => {
    if (score >= 80) {
      return {
        level: 'Excellent',
        description: 'High transparency with comprehensive disclosure and accountability',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      };
    }
    if (score >= 60) {
      return {
        level: 'Good',
        description: 'Adequate transparency with room for improvement in some areas',
        icon: <Shield className="h-4 w-4 text-blue-600" />,
      };
    }
    if (score >= 40) {
      return {
        level: 'Fair',
        description: 'Basic transparency requirements met but significant gaps exist',
        icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      };
    }
    return {
      level: 'Poor',
      description: 'Limited transparency with major disclosure gaps and accountability concerns',
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    };
  };

  // Prepare data for radial chart
  const radialData = [
    {
      name: 'Overall',
      score: scoringBreakdown.overall,
      fill: getScoreColor(scoringBreakdown.overall),
    },
  ];

  // Prepare data for breakdown chart
  const breakdownData = [
    {
      category: 'Financial Disclosure',
      score: scoringBreakdown.financial.score,
      fill: getScoreColor(scoringBreakdown.financial.score),
    },
    {
      category: 'Voting History',
      score: scoringBreakdown.voting.score,
      fill: getScoreColor(scoringBreakdown.voting.score),
    },
    {
      category: 'Industry Connections',
      score: scoringBreakdown.connections.score,
      fill: getScoreColor(scoringBreakdown.connections.score),
    },
  ];

  const overallInterpretation = getScoreInterpretation(scoringBreakdown.overall);

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" style={{ color: 'hsl(var(--civic-transparency))' }} />
            Transparency Assessment
          </CardTitle>
          <CardDescription>
            Algorithmic assessment of transparency and accountability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radial Score Display */}
            <div className="flex flex-col items-center">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    data={radialData}
                  >
                    <RadialBar
                      dataKey="score"
                      cornerRadius={10}
                      fill={getScoreColor(scoringBreakdown.overall)}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <div className="text-4xl font-bold">{scoringBreakdown.overall}</div>
                <div className="text-sm text-muted-foreground">out of 100</div>
                <Badge variant={getScoreBadge(scoringBreakdown.overall)} className="mt-2">
                  {overallInterpretation.level}
                </Badge>
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                {overallInterpretation.icon}
                <div>
                  <div className="font-medium">{overallInterpretation.level} Transparency</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {overallInterpretation.description}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Score Breakdown:</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Financial Disclosure</span>
                    <Badge variant={getScoreBadge(scoringBreakdown.financial.score)}>
                      {scoringBreakdown.financial.score}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Voting History</span>
                    <Badge variant={getScoreBadge(scoringBreakdown.voting.score)}>
                      {scoringBreakdown.voting.score}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Industry Connections</span>
                    <Badge variant={getScoreBadge(scoringBreakdown.connections.score)}>
                      {scoringBreakdown.connections.score}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(scoringBreakdown.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Score Analysis</CardTitle>
          <CardDescription>Component scores and contributing factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Breakdown Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value}/100`, 'Score']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Factor Breakdown */}
            <div className="space-y-4">
              {/* Financial Disclosure Factors */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    Financial Disclosure ({scoringBreakdown.financial.score}/100)
                  </h4>
                  <Badge variant={getScoreBadge(scoringBreakdown.financial.score)}>
                    {getScoreInterpretation(scoringBreakdown.financial.score).level}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {scoringBreakdown.financial.factors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{factor.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {factor.score.toFixed(1)} (weight: {(factor.weight * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={factor.score} className="h-2" />
                      <div className="text-xs text-muted-foreground">{factor.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voting History Factors */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    Voting History ({scoringBreakdown.voting.score}/100)
                  </h4>
                  <Badge variant={getScoreBadge(scoringBreakdown.voting.score)}>
                    {getScoreInterpretation(scoringBreakdown.voting.score).level}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {scoringBreakdown.voting.factors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{factor.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {factor.score.toFixed(1)} (weight: {(factor.weight * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={factor.score} className="h-2" />
                      <div className="text-xs text-muted-foreground">{factor.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry Connections Factors */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    Industry Connections ({scoringBreakdown.connections.score}/100)
                  </h4>
                  <Badge variant={getScoreBadge(scoringBreakdown.connections.score)}>
                    {getScoreInterpretation(scoringBreakdown.connections.score).level}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {scoringBreakdown.connections.factors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{factor.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {factor.score.toFixed(1)} (weight: {(factor.weight * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={factor.score} className="h-2" />
                      <div className="text-xs text-muted-foreground">{factor.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <Collapsible open={showMethodology} onOpenChange={setShowMethodology}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Scoring Methodology</span>
                </div>
                {showMethodology ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Overall Score Calculation</h4>
                  <p className="text-muted-foreground">
                    The overall transparency score is calculated as a weighted average of three
                    component scores:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li>Financial Disclosure (40% weight)</li>
                    <li>Voting History (35% weight)</li>
                    <li>Industry Connections (25% weight)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Financial Disclosure Score</h4>
                  <p className="text-muted-foreground">
                    Evaluates the completeness, timeliness, and detail level of financial interest
                    disclosures. Higher scores indicate more comprehensive and timely disclosure
                    practices.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Voting History Score</h4>
                  <p className="text-muted-foreground">
                    Assesses voting consistency relative to financial interests, explanation
                    quality, and attendance. Higher scores indicate voting patterns that show
                    independence from financial conflicts.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Industry Connections Score</h4>
                  <p className="text-muted-foreground">
                    Measures disclosure of organizational connections, conflict management
                    practices, and proactive transparency. Higher scores indicate better management
                    and disclosure of potential conflicts.
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> This scoring system is designed to promote transparency
                    and accountability. Scores are calculated using publicly available information
                    and may not reflect all relevant factors. Regular updates ensure accuracy as new
                    information becomes available.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </div>
  );
}
