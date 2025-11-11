import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
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
  ChevronUp
} from 'lucide-react';
import { Bill } from '../../store/slices/billsSlice';
import { ConstitutionalAnalysisData, SeverityLevel } from '../../types/constitutional';

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
      summary: 'The Healthcare Access Reform Act shows strong constitutional foundation under Article 43 (Right to Health), but raises moderate concerns regarding federal-state authority balance and equal protection implementation.',
      keyFindings: [
        'Strong constitutional basis under Article 43 (Right to Health)',
        'Potential federal overreach concerns under devolved system',
        'Income-based eligibility may require equal protection review',
        'Implementation timeline aligns with constitutional requirements'
      ]
    },
    flags: bill.constitutionalFlags.map(flag => ({
      ...flag,
      affectedProvisions: [
        {
          id: 'provision-1',
          sectionNumber: '3(a)',
          title: 'Eligibility Criteria',
          content: 'Healthcare coverage shall be provided to individuals with household income below 200% of federal poverty level...',
          constitutionalConcerns: ['Equal Protection', 'Due Process']
        }
      ],
      constitutionalReference: [
        {
          id: 'ref-1',
          article: 'Article 43',
          section: '1(a)',
          title: 'Right to Health',
          fullText: 'Every person has the right to the highest attainable standard of health, which includes the right to health care services...',
          interpretation: 'Establishes positive obligation for state to provide healthcare access',
          relevance: 'direct' as const,
          historicalContext: 'Adopted in 2010 Constitution as fundamental socio-economic right'
        }
      ]
    })),
    precedents: [
      {
        id: 'precedent-1',
        caseName: 'Okwanda v. Minister of Health',
        court: 'High Court of Kenya',
        year: 2014,
        citation: '[2014] eKLR',
        summary: 'Court held that the right to health under Article 43 creates justiciable obligations for the state to provide healthcare services.',
        relevanceScore: 0.9,
        outcome: 'upheld',
        keyPrinciples: ['Justiciability of socio-economic rights', 'State obligation to provide healthcare'],
        applicability: 'direct'
      }
    ],
    expertConsensus: {
      agreementLevel: 0.78,
      majorityPosition: 'Constitutionally sound with moderate implementation concerns',
      minorityPositions: [
        {
          position: 'Requires significant constitutional amendments',
          supportingExperts: 2
        }
      ]
    },
    civicActions: [],
    lastUpdated: new Date().toISOString()
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

  const getSeverityColor = (severity: SeverityLevel): string => {
    switch (severity) {
      case 'critical':
        return 'hsl(var(--status-critical))';
      case 'high':
        return 'hsl(var(--status-high))';
      case 'moderate':
        return 'hsl(var(--status-moderate))';
      case 'low':
        return 'hsl(var(--status-low))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'moderate':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical':
        return 'hsl(var(--status-critical))';
      case 'high':
        return 'hsl(var(--status-high))';
      case 'medium':
        return 'hsl(var(--status-moderate))';
      case 'low':
        return 'hsl(var(--status-low))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Constitutional Assessment */}
      <Card className="chanuka-card">
        <CardHeader 
          className="chanuka-card-header cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6" style={{ color: 'hsl(var(--civic-constitutional))' }} />
              <div>
                <CardTitle className="text-xl">Constitutional Analysis Overview</CardTitle>
                <CardDescription>
                  Comprehensive constitutional compatibility assessment
                </CardDescription>
              </div>
            </div>
            {expandedSections.has('overview') ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedSections.has('overview') && (
          <CardContent className="chanuka-card-content space-y-6">
            {/* Constitutionality Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Constitutional Compatibility Score</h4>
                <Badge 
                  className="chanuka-status-badge"
                  style={{ 
                    backgroundColor: getRiskLevelColor(analysisData.overallAssessment.riskLevel),
                    color: 'white'
                  }}
                >
                  {Math.round(analysisData.overallAssessment.constitutionalityScore * 100)}%
                </Badge>
              </div>
              <Progress 
                value={analysisData.overallAssessment.constitutionalityScore * 100} 
                className="h-3"
              />
              <p className="text-sm text-muted-foreground">
                Based on constitutional precedent analysis, expert review, and legal framework compatibility
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold">Executive Summary</h4>
              <p className="text-sm leading-relaxed">
                {analysisData.overallAssessment.summary}
              </p>
            </div>

            {/* Key Findings */}
            <div className="space-y-3">
              <h4 className="font-semibold">Key Constitutional Findings</h4>
              <ul className="space-y-2">
                {analysisData.overallAssessment.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Constitutional Flags Summary */}
      <Card className="chanuka-card">
        <CardHeader 
          className="chanuka-card-header cursor-pointer"
          onClick={() => toggleSection('flags')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" style={{ color: 'hsl(var(--status-moderate))' }} />
              <div>
                <CardTitle>Constitutional Flags ({bill.constitutionalFlags.length})</CardTitle>
                <CardDescription>
                  Identified constitutional concerns requiring attention
                </CardDescription>
              </div>
            </div>
            {expandedSections.has('flags') ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedSections.has('flags') && (
          <CardContent className="chanuka-card-content">
            {bill.constitutionalFlags.length > 0 ? (
              <div className="space-y-4">
                {bill.constitutionalFlags.map((flag, index) => (
                  <div 
                    key={flag.id || index}
                    className="flex items-start gap-3 p-4 rounded-lg border"
                    style={{ borderColor: getSeverityColor(flag.severity) + '40' }}
                  >
                    <div style={{ color: getSeverityColor(flag.severity) }}>
                      {getSeverityIcon(flag.severity)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{flag.category}</h5>
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: getSeverityColor(flag.severity),
                            color: getSeverityColor(flag.severity)
                          }}
                        >
                          {flag.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {flag.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold mb-2">No Constitutional Flags</h3>
                <p className="text-muted-foreground">
                  This bill currently has no identified constitutional concerns.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Expert Consensus */}
      <Card className="chanuka-card">
        <CardHeader 
          className="chanuka-card-header cursor-pointer"
          onClick={() => toggleSection('consensus')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" style={{ color: 'hsl(var(--civic-expert))' }} />
              <div>
                <CardTitle>Expert Consensus</CardTitle>
                <CardDescription>
                  Constitutional law expert agreement analysis
                </CardDescription>
              </div>
            </div>
            {expandedSections.has('consensus') ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedSections.has('consensus') && (
          <CardContent className="chanuka-card-content space-y-4">
            {/* Agreement Level */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Expert Agreement Level</h4>
                <Badge className="chanuka-status-badge chanuka-status-info">
                  {Math.round(analysisData.expertConsensus.agreementLevel * 100)}%
                </Badge>
              </div>
              <Progress 
                value={analysisData.expertConsensus.agreementLevel * 100} 
                className="h-3"
              />
            </div>

            {/* Majority Position */}
            <div className="space-y-2">
              <h4 className="font-semibold">Majority Expert Position</h4>
              <p className="text-sm text-muted-foreground">
                {analysisData.expertConsensus.majorityPosition}
              </p>
            </div>

            {/* Minority Positions */}
            {analysisData.expertConsensus.minorityPositions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Alternative Viewpoints</h4>
                {analysisData.expertConsensus.minorityPositions.map((position, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="font-medium">{position.supportingExperts} expert(s):</span>
                      <span className="ml-1">{position.position}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Legal Precedents Summary */}
      <Card className="chanuka-card">
        <CardHeader 
          className="chanuka-card-header cursor-pointer"
          onClick={() => toggleSection('precedents')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6" style={{ color: 'hsl(var(--civic-transparency))' }} />
              <div>
                <CardTitle>Legal Precedents ({analysisData.precedents.length})</CardTitle>
                <CardDescription>
                  Relevant case law and judicial interpretations
                </CardDescription>
              </div>
            </div>
            {expandedSections.has('precedents') ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedSections.has('precedents') && (
          <CardContent className="chanuka-card-content">
            <div className="space-y-4">
              {analysisData.precedents.map((precedent) => (
                <div key={precedent.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium">{precedent.caseName}</h5>
                    <Badge 
                      variant="outline"
                      className="text-xs"
                    >
                      {Math.round(precedent.relevanceScore * 100)}% relevant
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {precedent.court} ({precedent.year}) - {precedent.citation}
                  </div>
                  <p className="text-sm mb-3">{precedent.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {precedent.keyPrinciples.map((principle, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {principle}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}