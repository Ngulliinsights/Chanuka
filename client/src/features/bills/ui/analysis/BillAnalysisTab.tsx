import { AlertTriangle, Scale, Users, TrendingUp, Shield, FileText, Star } from 'lucide-react';
import React, { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Alert, AlertDescription } from '@client/shared/design-system';
import type { Bill } from '@client/shared/types';

interface BillAnalysisTabProps {
  bill: Bill;
}

interface ExpertAnalysis {
  id: string;
  expert: {
    id: string;
    name: string;
    avatar?: string;
    verificationType: 'official' | 'expert' | 'citizen';
    credentials: Array<{
      id: string;
      type: 'education' | 'experience' | 'certification';
      title: string;
      institution: string;
      year: number;
      verified: boolean;
    }>;
  };
  analysis: {
    summary: string;
    constitutionalConcerns: Array<{
      id: string;
      concern: string;
      severity: 'low' | 'medium' | 'high';
      explanation: string;
    }>;
    recommendation: 'support' | 'oppose' | 'neutral';
    confidence: number;
  };
  engagement: {
    likes: number;
    dislikes: number;
    comments: number;
  };
  timestamp: string;
}

/**
 * BillAnalysisTab - Comprehensive constitutional analysis and expert insights
 * Features: Constitutional analysis panel, expert verification, civic action guidance
 */
function BillAnalysisTab({ bill }: BillAnalysisTabProps) {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('overview');

  // Mock expert analyses for demonstration
  const mockExpertAnalyses: ExpertAnalysis[] = [
    {
      id: 'analysis-1',
      expert: {
        id: 'expert-1',
        name: 'Prof. Sarah Johnson',
        avatar: undefined,
        verificationType: 'official',
        credentials: [
          {
            id: 'cred-1',
            type: 'education',
            title: 'PhD in Constitutional Law',
            institution: 'Harvard Law School',
            year: 2010,
            verified: true,
          },
          {
            id: 'cred-2',
            type: 'experience',
            title: 'Former Supreme Court Clerk',
            institution: 'U.S. Supreme Court',
            year: 2012,
            verified: true,
          },
        ],
      },
      analysis: {
        summary:
          'This bill raises significant constitutional questions regarding federal vs state jurisdiction...',
        constitutionalConcerns: [
          {
            id: 'concern-1',
            concern: 'Commerce Clause Overreach',
            severity: 'high',
            explanation: 'The bill may exceed federal authority under the Commerce Clause...',
          },
        ],
        recommendation: 'oppose',
        confidence: 85,
      },
      engagement: {
        likes: 24,
        dislikes: 3,
        comments: 8,
      },
      timestamp: '2 hours ago',
    },
  ];

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'support':
        return 'text-green-600';
      case 'oppose':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-300 text-red-700';
      case 'medium':
        return 'border-yellow-300 text-yellow-700';
      default:
        return 'border-green-300 text-green-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-500" />
            Constitutional Analysis
          </CardTitle>
          <CardDescription>
            Expert analysis of constitutional implications and legal precedents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="constitutional">Constitutional</TabsTrigger>
              <TabsTrigger value="precedents">Precedents</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Constitutional Score</p>
                        <p className="text-2xl font-bold">7.2/10</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Expert Consensus</p>
                        <p className="text-2xl font-bold">68%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Precedent Strength</p>
                        <p className="text-2xl font-bold">Strong</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This bill contains provisions that may conflict with existing constitutional
                  precedents. Review the Constitutional tab for detailed analysis.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="constitutional" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Constitutional Concerns</h4>
                {mockExpertAnalyses[0].analysis.constitutionalConcerns.map(concern => (
                  <Card key={concern.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium">{concern.concern}</h5>
                        <Badge variant="outline" className={getSeverityColor(concern.severity)}>
                          {concern.severity} severity
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{concern.explanation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="precedents" className="space-y-4">
              <p className="text-muted-foreground">
                Legal precedent analysis would be displayed here...
              </p>
            </TabsContent>

            <TabsContent value="impact" className="space-y-4">
              <p className="text-muted-foreground">Impact assessment would be displayed here...</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Expert Analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Expert Analyses
          </CardTitle>
          <CardDescription>Verified expert opinions and constitutional analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockExpertAnalyses.map(analysis => (
              <Card key={analysis.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{analysis.expert.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {analysis.expert.verificationType}
                        </Badge>
                        <span
                          className={`text-sm font-medium ${getRecommendationColor(analysis.analysis.recommendation)}`}
                        >
                          {analysis.analysis.recommendation.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        {analysis.expert.credentials.map(cred => cred.title).join(' • ')}
                      </div>

                      <p className="text-sm mb-3">{analysis.analysis.summary}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{analysis.timestamp}</span>
                        <span>Confidence: {analysis.analysis.confidence}%</span>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          👍 {analysis.engagement.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-foreground">
                          💬 {analysis.engagement.comments}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Civic Action Guidance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Take Action
          </CardTitle>
          <CardDescription>Ways to engage with this legislation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Contact Representatives</span>
              <span className="text-sm text-muted-foreground">
                Share your views with your elected officials
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Join Discussion</span>
              <span className="text-sm text-muted-foreground">
                Participate in community dialogue
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Share Analysis</span>
              <span className="text-sm text-muted-foreground">
                Help others understand the implications
              </span>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <span className="font-medium">Track Progress</span>
              <span className="text-sm text-muted-foreground">
                Get updates on legislative progress
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillAnalysisTab;
