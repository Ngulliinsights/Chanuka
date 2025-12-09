import { AlertTriangle, Scale, Users, TrendingUp, Shield, FileText, Star } from 'lucide-react';
import React, { useState } from 'react';

import { Bill } from '@/core/api/types';

import { EducationalFramework } from '../education/EducationalFramework';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UnifiedAccordionGroup, UnifiedToolbar, UnifiedToolbarButton, UnifiedToolbarSeparator } from '../ui/unified-components';


import { CivicActionGuidance } from './CivicActionGuidance';
import { ConstitutionalAnalysisPanel } from './ConstitutionalAnalysisPanel';
import { ConstitutionalFlagCard } from './ConstitutionalFlagCard';
import { ExpertAnalysisCard } from './ExpertAnalysisCard';


interface BillAnalysisTabProps {
  bill: Bill;
}

/**
 * BillAnalysisTab - Comprehensive constitutional analysis and expert insights
 * Features: Constitutional analysis panel, expert verification, civic action guidance
 */
function BillAnalysisTab({ bill }: BillAnalysisTabProps) {
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
  const constitutionalConcerns = bill.constitutionalFlags.map(flag => flag.type || 'General');
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
            Flags ({bill.constitutionalFlags.length})
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
          <ConstitutionalAnalysisPanel bill={bill} />
        </TabsContent>

        {/* Constitutional Flags Detail */}
        <TabsContent value="flags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--status-moderate))' }} />
                Constitutional Flags Analysis
              </CardTitle>
              <CardDescription>
                Detailed analysis of constitutional concerns and their implications
              </CardDescription>
            </CardHeader>
          </Card>

          {bill.constitutionalFlags.length > 0 ? (
            <div className="space-y-4">
              {bill.constitutionalFlags.map((flag, index) => (
                <ConstitutionalFlagCard
                  key={flag.id || index}
                  flag={{
                    id: String(flag.id || `flag-${index}`),
                    severity: flag.severity === 'medium' ? 'moderate' : flag.severity,
                    category: flag.type || 'General',
                    description: flag.description
                  }}
                  expandable={true}
                  showExpertAnalysis={true}
                />
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
                <Shield className="h-5 w-5" style={{ color: 'hsl(var(--civic-expert))' }} />
                Expert Constitutional Analysis
              </CardTitle>
              <CardDescription>
                Verified expert analysis with credentials and community validation
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {mockExpertAnalyses.map((analysis) => (
              <ExpertAnalysisCard
                key={analysis.id}
                analysis={analysis}
                showCommunityValidation={true}
                compact={false}
              />
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
          <EducationalFramework bill={bill} />
        </TabsContent>

        {/* Civic Action Guidance */}
        <TabsContent value="action" className="space-y-6">
          <CivicActionGuidance
            billId={bill.id.toString()}
            billTitle={bill.title}
            constitutionalConcerns={constitutionalConcerns}
            recommendations={recommendations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BillAnalysisTab;