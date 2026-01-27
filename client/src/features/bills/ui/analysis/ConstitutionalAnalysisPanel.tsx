import {
  Scale,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Shield,
  Gavel,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { Badge } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Separator } from '@client/lib/design-system';
import type { Bill } from '@client/lib/types';

type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

interface ConstitutionalFlag {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  article: string;
  precedents: string[];
  recommendation: string;
}

interface ConstitutionalAnalysisData {
  billId: string;
  overallAssessment: {
    constitutionalityScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    summary: string;
    keyFindings: string[];
  };
  flags: ConstitutionalFlag[];
  precedentAnalysis: {
    supportingCases: Array<{
      name: string;
      year: number;
      relevance: number;
      summary: string;
    }>;
    challengingCases: Array<{
      name: string;
      year: number;
      relevance: number;
      summary: string;
    }>;
  };
  expertConsensus: {
    supportPercentage: number;
    totalExperts: number;
    confidence: number;
  };
}

interface ConstitutionalAnalysisPanelProps {
  bill: Bill;
}

/**
 * ConstitutionalAnalysisPanel - Main constitutional analysis overview
 * Features: Severity indicators, expert analysis display, constitutional compatibility assessment
 */
export function ConstitutionalAnalysisPanel({ bill }: ConstitutionalAnalysisPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // Mock constitutional analysis data
  const analysisData: ConstitutionalAnalysisData = {
    billId: bill.id,
    overallAssessment: {
      constitutionalityScore: 0.75,
      riskLevel: 'medium',
      summary: `${bill.title} shows strong constitutional foundation but raises moderate concerns regarding federal-state authority balance and implementation requirements.`,
      keyFindings: [
        'Strong constitutional basis under Commerce Clause',
        'Potential federal overreach concerns in state jurisdiction',
        'Equal protection considerations require careful implementation',
        'Implementation timeline aligns with constitutional requirements',
      ],
    },
    flags: [
      {
        id: 'flag-1',
        severity: 'moderate',
        title: 'Federal-State Authority Balance',
        description:
          'This provision may exceed federal authority under the current constitutional framework',
        article: 'Article I, Section 8',
        precedents: ['United States v. Lopez (1995)', 'NFIB v. Sebelius (2012)'],
        recommendation:
          'Consider state implementation partnerships to address jurisdictional concerns',
      },
      {
        id: 'flag-2',
        severity: 'low',
        title: 'Equal Protection Implementation',
        description: 'Income-based eligibility criteria may require equal protection analysis',
        article: '14th Amendment',
        precedents: ['San Antonio v. Rodriguez (1973)', 'Plyler v. Doe (1982)'],
        recommendation: 'Ensure clear, objective criteria for eligibility determinations',
      },
    ],
    precedentAnalysis: {
      supportingCases: [
        {
          name: 'Wickard v. Filburn',
          year: 1942,
          relevance: 85,
          summary: 'Established broad interpretation of Commerce Clause authority',
        },
        {
          name: 'Heart of Atlanta Motel v. United States',
          year: 1964,
          relevance: 78,
          summary: 'Upheld federal regulation of local activities affecting interstate commerce',
        },
      ],
      challengingCases: [
        {
          name: 'United States v. Lopez',
          year: 1995,
          relevance: 72,
          summary: 'Limited federal authority under Commerce Clause for non-economic activities',
        },
      ],
    },
    expertConsensus: {
      supportPercentage: 68,
      totalExperts: 25,
      confidence: 82,
    },
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Info className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-500" />
            Constitutional Analysis Overview
          </CardTitle>
          <CardDescription>
            Comprehensive constitutional compatibility assessment for {bill.billNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Score and Risk Level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div
                  className={`text-3xl font-bold ${getScoreColor(analysisData.overallAssessment.constitutionalityScore)}`}
                >
                  {Math.round(analysisData.overallAssessment.constitutionalityScore * 100)}%
                </div>
                <div className="text-sm text-blue-800">Constitutionality Score</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {analysisData.expertConsensus.supportPercentage}%
                </div>
                <div className="text-sm text-purple-800">Expert Support</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analysisData.expertConsensus.confidence}%
                </div>
                <div className="text-sm text-green-800">Analysis Confidence</div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-muted-foreground leading-relaxed">
                {analysisData.overallAssessment.summary}
              </p>
            </div>

            {/* Key Findings */}
            <div>
              <h4 className="font-medium mb-3">Key Findings</h4>
              <ul className="space-y-2">
                {analysisData.overallAssessment.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constitutional Flags */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('flags')}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Constitutional Concerns ({analysisData.flags.length})
            </div>
            {expandedSections.has('flags') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>

        {expandedSections.has('flags') && (
          <CardContent>
            <div className="space-y-4">
              {analysisData.flags.map(flag => (
                <Card key={flag.id} className={`border ${getSeverityColor(flag.severity)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(flag.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium">{flag.title}</h5>
                          <Badge variant="outline" className={getSeverityColor(flag.severity)}>
                            {flag.severity}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{flag.description}</p>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Constitutional Basis:</span>{' '}
                            {flag.article}
                          </div>

                          <div>
                            <span className="font-medium">Relevant Precedents:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {flag.precedents.map((precedent, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {precedent}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                            <span className="font-medium text-blue-800">Recommendation:</span>
                            <p className="text-blue-700 text-sm mt-1">{flag.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Precedent Analysis */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('precedents')}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-purple-500" />
              Legal Precedent Analysis
            </div>
            {expandedSections.has('precedents') ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>

        {expandedSections.has('precedents') && (
          <CardContent>
            <div className="space-y-6">
              {/* Supporting Cases */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Supporting Precedents
                </h4>
                <div className="space-y-3">
                  {analysisData.precedentAnalysis.supportingCases.map((case_, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800">
                          {case_.name} ({case_.year})
                        </span>
                        <Badge variant="outline" className="text-green-700">
                          {case_.relevance}% relevant
                        </Badge>
                      </div>
                      <p className="text-sm text-green-700">{case_.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Challenging Cases */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Challenging Precedents
                </h4>
                <div className="space-y-3">
                  {analysisData.precedentAnalysis.challengingCases.map((case_, index) => (
                    <div key={index} className="p-3 bg-orange-50 rounded border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-orange-800">
                          {case_.name} ({case_.year})
                        </span>
                        <Badge variant="outline" className="text-orange-700">
                          {case_.relevance}% relevant
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-700">{case_.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Expert Consensus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Expert Consensus
          </CardTitle>
          <CardDescription>
            Constitutional law expert opinions and analysis confidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Expert Support</span>
                  <span className="text-sm text-muted-foreground">
                    {analysisData.expertConsensus.supportPercentage}%
                  </span>
                </div>
                <Progress value={analysisData.expertConsensus.supportPercentage} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Analysis Confidence</span>
                  <span className="text-sm text-muted-foreground">
                    {analysisData.expertConsensus.confidence}%
                  </span>
                </div>
                <Progress value={analysisData.expertConsensus.confidence} className="h-2" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Based on analysis from {analysisData.expertConsensus.totalExperts} constitutional law
              experts
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConstitutionalAnalysisPanel;
