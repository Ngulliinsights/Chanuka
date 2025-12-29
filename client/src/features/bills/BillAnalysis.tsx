import { AlertTriangle, Scale, Users, TrendingUp, Shield, FileText, Star } from 'lucide-react';
import React, { useState } from 'react';

import type { Bill } from '@client/shared/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

interface BillAnalysisProps {
  bill: Bill;
}

/**
 * BillAnalysis - Comprehensive constitutional analysis and expert insights
 * Features: Constitutional analysis panel, expert verification, civic action guidance
 */
function BillAnalysis({ bill }: BillAnalysisProps) {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('overview');

  // Mock expert analyses for demonstration
  const mockExpertAnalyses = [
    {
      id: 'analysis-1',
      expert: {
        id: 'expert-1',
        name: 'Prof. Sarah Johnson',
        avatar: undefined,
        verificationType: 'official' as const,
        credentials: [
          {
            id: 'cred-1',
            type: 'education' as const,
            title: 'PhD in Constitutional Law',
            institution: 'Harvard Law School',
            year: 2010,
            verified: true
          },
          {
            id: 'cred-2',
            type: 'experience' as const,
            title: 'Former Supreme Court Clerk',
            institution: 'Supreme Court of Kenya',
            year: 2015,
            verified: true
          }
        ],
        affiliations: [
          {
            id: 'aff-1',
            organization: 'University of Nairobi',
            role: 'Professor of Constitutional Law',
            type: 'academic' as const,
            current: true,
            verified: true
          }
        ],
        specializations: ['Constitutional Law', 'Healthcare Policy', 'Human Rights'],
        credibilityScore: 0.92,
        contributionCount: 47,
        avgCommunityRating: 4.8,
        verified: true,
        verificationDate: '2024-01-01T00:00:00Z',
        bio: 'Leading constitutional law expert with 15+ years of experience in healthcare policy analysis.'
      },
      analysis: 'The Healthcare Access Reform Act presents a complex constitutional landscape. While the fundamental right to healthcare (Article 43) provides strong constitutional support, the federal-state authority balance raises legitimate concerns under our devolved system. The income-based eligibility criteria require careful scrutiny for equal protection compliance, particularly regarding potential discrimination against vulnerable populations.',
      confidence: 0.85,
      methodology: 'Comprehensive constitutional analysis using precedent review, comparative law analysis, and constitutional interpretation principles.',
      sources: [
        'Constitution of Kenya 2010, Article 43',
        'Okwanda v. Minister of Health [2014] eKLR',
        'Healthcare policy constitutional precedents'
      ],
      lastUpdated: '2024-01-15T10:30:00Z',
      communityValidation: {
        upvotes: 23,
        downvotes: 2,
        comments: 8,
        userVote: null
      },
      tags: ['constitutional-law', 'healthcare', 'equal-protection', 'devolution']
    }
  ];

  // Extract constitutional concerns for civic action guidance
  const constitutionalConcerns = bill.constitutionalFlags?.map(flag => flag.type || 'General') || [];
  const recommendations = [
    'Review income-based eligibility criteria for equal protection compliance',
    'Clarify federal-state authority boundaries in healthcare regulation',
    'Consider adding explicit constitutional basis citations',
    'Strengthen due process protections in eligibility determinations'
  ];

  return (
    <div className="space-y-6">
      {/* Analysis Navigation Tabs */}
      <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs lg:text-sm">
            <Scale className="h-4 w-4 mr-1 lg:mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="flags" className="text-xs lg:text-sm">
            <AlertTriangle className="h-4 w-4 mr-1 lg:mr-2" />
            Flags ({bill.constitutionalFlags?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="experts" className="text-xs lg:text-sm">
            <Shield className="h-4 w-4 mr-1 lg:mr-2" />
            Experts
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs lg:text-sm">
            <Star className="h-4 w-4 mr-1 lg:mr-2" />
            Learn
          </TabsTrigger>
          <TabsTrigger value="action" className="text-xs lg:text-sm">
            <Users className="h-4 w-4 mr-1 lg:mr-2" />
            Take Action
          </TabsTrigger>
        </TabsList>

        {/* Constitutional Analysis Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Constitutional Analysis Overview
              </CardTitle>
              <CardDescription>
                Comprehensive constitutional review and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {bill.constitutionalFlags?.filter(f => f.severity === 'low').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Low Risk</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {bill.constitutionalFlags?.filter(f => f.severity === 'medium').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Medium Risk</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {bill.constitutionalFlags?.filter(f => f.severity === 'high').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">High Risk</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Constitutional Flags Detail */}
        <TabsContent value="flags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Constitutional Flags Analysis
              </CardTitle>
              <CardDescription>
                Detailed analysis of constitutional concerns and their implications
              </CardDescription>
            </CardHeader>
          </Card>

          {bill.constitutionalFlags && bill.constitutionalFlags.length > 0 ? (
            <div className="space-y-4">
              {bill.constitutionalFlags.map((flag, index) => (
                <Card key={flag.id || index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className={`h-5 w-5 ${
                        flag.severity === 'high' ? 'text-red-500' :
                        flag.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                      {flag.type || 'Constitutional Concern'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{flag.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Constitutional Flags</h3>
                <p className="text-muted-foreground">
                  This bill currently has no identified constitutional concerns.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Expert Analysis */}
        <TabsContent value="experts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Expert Constitutional Analysis
              </CardTitle>
              <CardDescription>
                Verified expert analysis with credentials and community validation
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {mockExpertAnalyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle>{analysis.expert.name}</CardTitle>
                  <CardDescription>
                    {analysis.expert.specializations.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed mb-4">{analysis.analysis}</p>
                  <div className="text-xs text-muted-foreground">
                    Confidence: {Math.round(analysis.confidence * 100)}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Placeholder for additional expert analyses */}
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">More Expert Analysis Coming</h3>
              <p className="text-muted-foreground mb-4">
                Additional expert reviews are being prepared for this legislation.
              </p>
              <div className="text-sm text-muted-foreground">
                <strong>Expected:</strong> 2-3 additional expert analyses within 48 hours
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Educational Framework */}
        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                Educational Resources
              </CardTitle>
              <CardDescription>
                Learn about the constitutional principles and legal concepts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Constitutional Context</h4>
                  <p className="text-sm text-blue-800">
                    Understanding the constitutional framework that applies to this legislation.
                  </p>
                </div>
                <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Legal Precedents</h4>
                  <p className="text-sm text-green-800">
                    Historical cases and legal precedents relevant to this bill.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Civic Action Guidance */}
        <TabsContent value="action" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Take Action
              </CardTitle>
              <CardDescription>
                Ways to engage with this legislation and make your voice heard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Contact Representatives</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Reach out to your elected officials about this bill.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Join Discussion</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Participate in community discussions about this legislation.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Key Recommendations</h4>
                  <ul className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BillAnalysis;