import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  ExpertBadge, 
  ExpertBadgeGroup,
  CredibilityIndicator,
  CredibilityBreakdown,
  ExpertProfileCard,
  CommunityValidation,
  ValidationSummary,
  VerificationWorkflow,
  ExpertConsensus,
  ConsensusIndicator
} from './index';
import { 
  Expert, 
  CredibilityMetrics, 
  CommunityValidation as CommunityValidationType,
  VerificationWorkflow as VerificationWorkflowType,
  ExpertConsensus as ExpertConsensusType
} from '@client/types/expert';

/**
 * ExpertVerificationDemo - Comprehensive demo of the expert verification system
 * 
 * This component demonstrates all the expert verification features:
 * - Expert badges and credibility scoring
 * - Expert profile cards with credentials
 * - Community validation system
 * - Verification workflows
 * - Expert consensus tracking
 */
export function ExpertVerificationDemo() {
  const [selectedTab, setSelectedTab] = useState('badges');

  // Mock data for demonstration
  const mockExpert: Expert = {
    id: 'expert-001',
    name: 'Dr. Sarah Johnson',
    avatar: undefined,
    verificationType: 'official',
    credentials: [
      {
        id: 'cred-1',
        type: 'education',
        title: 'Ph.D. in Constitutional Law',
        institution: 'Harvard Law School',
        year: 2010,
        verified: true,
        verificationDate: '2023-01-15T00:00:00Z'
      },
      {
        id: 'cred-2',
        type: 'certification',
        title: 'Licensed Attorney',
        institution: 'State Bar of Massachusetts',
        year: 2011,
        verified: true,
        verificationDate: '2023-01-15T00:00:00Z'
      },
      {
        id: 'cred-3',
        type: 'experience',
        title: 'Senior Legal Counsel',
        institution: 'Department of Justice',
        year: 2015,
        verified: true,
        verificationDate: '2023-01-15T00:00:00Z'
      }
    ],
    affiliations: [
      {
        id: 'aff-1',
        organization: 'Harvard Law School',
        role: 'Professor of Constitutional Law',
        type: 'academic',
        current: true,
        verified: true,
        startDate: '2018-09-01T00:00:00Z'
      },
      {
        id: 'aff-2',
        organization: 'American Bar Association',
        role: 'Constitutional Law Committee Member',
        type: 'ngo',
        current: true,
        verified: true,
        startDate: '2020-01-01T00:00:00Z'
      }
    ],
    specializations: ['Constitutional Law', 'Civil Rights', 'Federal Legislation', 'Supreme Court Cases'],
    credibilityScore: 0.92,
    contributionCount: 47,
    avgCommunityRating: 4.7,
    verified: true,
    verificationDate: '2023-01-15T00:00:00Z',
    bio: 'Professor of Constitutional Law at Harvard Law School with expertise in federal legislation analysis and civil rights. Former Senior Legal Counsel at the Department of Justice.',
    contactInfo: {
      email: 'sarah.johnson@harvard.edu',
      website: 'https://hls.harvard.edu/faculty/sarah-johnson',
      linkedin: 'https://linkedin.com/in/sarah-johnson-law'
    }
  };

  const mockCredibilityMetrics: CredibilityMetrics = {
    expertId: 'expert-001',
    overallScore: 0.92,
    components: {
      credentialScore: 0.95,
      affiliationScore: 0.90,
      communityScore: 0.88,
      contributionQuality: 0.94,
      consensusAlignment: 0.91
    },
    methodology: {
      description: 'Credibility scores are calculated using a weighted combination of verified credentials, institutional affiliations, community validation, contribution quality, and alignment with expert consensus.',
      factors: [
        {
          name: 'Verified Credentials',
          weight: 0.25,
          description: 'Education, certifications, and professional experience verified through official channels'
        },
        {
          name: 'Institutional Affiliations',
          weight: 0.20,
          description: 'Current and former positions at recognized institutions and organizations'
        },
        {
          name: 'Community Validation',
          weight: 0.20,
          description: 'Peer recognition and community ratings from other verified experts'
        },
        {
          name: 'Contribution Quality',
          weight: 0.25,
          description: 'Quality, accuracy, and helpfulness of contributions over time'
        },
        {
          name: 'Expert Consensus Alignment',
          weight: 0.10,
          description: 'Alignment with established expert consensus on key issues'
        }
      ]
    },
    lastCalculated: '2024-01-15T10:30:00Z'
  };

  const mockCommunityValidation: CommunityValidationType = {
    upvotes: 127,
    downvotes: 8,
    comments: 23,
    userVote: null,
    validationScore: 0.89
  };

  const mockVerificationWorkflow: VerificationWorkflowType = {
    id: 'workflow-001',
    contributionId: 'contrib-001',
    expertId: 'expert-001',
    reviewerId: 'reviewer-001',
    status: 'in_review',
    reviewNotes: undefined,
    reviewDate: undefined,
    communityFeedback: [
      {
        userId: 'user-001',
        feedback: 'This analysis is thorough and well-sourced. The constitutional references are accurate.',
        vote: 'approve',
        timestamp: '2024-01-14T15:30:00Z'
      },
      {
        userId: 'user-002',
        feedback: 'Good analysis but could benefit from more recent case law examples.',
        vote: 'needs_revision',
        timestamp: '2024-01-14T16:45:00Z'
      }
    ],
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z'
  };

  const mockExpertConsensus: ExpertConsensusType = {
    billId: 1234,
    topic: 'Constitutional implications of federal education funding requirements',
    totalExperts: 15,
    agreementLevel: 0.73,
    majorityPosition: 'The federal funding provisions are consistent with established precedent under South Dakota v. Dole, as they represent conditional spending rather than coercive mandates.',
    minorityPositions: [
      {
        position: 'The funding requirements may exceed federal authority by effectively coercing state compliance through financial pressure.',
        expertCount: 3,
        experts: ['expert-002', 'expert-003', 'expert-004']
      },
      {
        position: 'Additional constitutional review is needed to assess the balance between federal interests and state autonomy.',
        expertCount: 1,
        experts: ['expert-005']
      }
    ],
    controversyLevel: 'medium',
    lastUpdated: '2024-01-15T14:20:00Z'
  };

  const handleVote = async (contributionId: string, vote: 'up' | 'down') => {
    console.log(`Voting ${vote} on contribution ${contributionId}`);
    // In a real implementation, this would call an API
  };

  const handleComment = async (contributionId: string, comment: string) => {
    console.log(`Adding comment to contribution ${contributionId}:`, comment);
    // In a real implementation, this would call an API
  };

  const handleReport = async (contributionId: string, reason: string) => {
    console.log(`Reporting contribution ${contributionId} for:`, reason);
    // In a real implementation, this would call an API
  };

  const handleReview = async (workflowId: string, status: any, notes: string) => {
    console.log(`Reviewing workflow ${workflowId} with status ${status}:`, notes);
    // In a real implementation, this would call an API
  };

  const handleCommunityFeedback = async (workflowId: string, feedback: string, vote: any) => {
    console.log(`Adding community feedback to workflow ${workflowId}:`, { feedback, vote });
    // In a real implementation, this would call an API
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Expert Verification System Demo</CardTitle>
          <CardDescription>
            Comprehensive demonstration of the expert verification and credibility system components.
            This system ensures transparency, builds trust, and enables community validation of expert contributions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="credibility">Credibility</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="consensus">Consensus</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expert Badges</CardTitle>
              <CardDescription>
                Verification badges indicate expert status and credibility levels using existing Chanuka design system classes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Individual Badges</h4>
                <div className="flex flex-wrap gap-4">
                  <ExpertBadge verificationType="official" credibilityScore={0.92} showScore={true} />
                  <ExpertBadge verificationType="domain" credibilityScore={0.78} showScore={true} />
                  <ExpertBadge verificationType="identity" credibilityScore={0.65} showScore={true} />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Badge Groups</h4>
                <ExpertBadgeGroup
                  verificationType="official"
                  credibilityScore={0.92}
                  specializations={['Constitutional Law', 'Civil Rights', 'Federal Legislation']}
                  affiliationType="academic"
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Size Variations</h4>
                <div className="flex items-center gap-4">
                  <ExpertBadge verificationType="official" size="sm" />
                  <ExpertBadge verificationType="official" size="md" />
                  <ExpertBadge verificationType="official" size="lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credibility" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CredibilityScoring metrics={mockCredibilityMetrics} />
            
            <Card>
              <CardHeader>
                <CardTitle>Credibility Indicators</CardTitle>
                <CardDescription>Compact indicators for use in lists and summaries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Different Scores</h4>
                  <div className="space-y-2">
                    <CredibilityIndicator score={0.92} />
                    <CredibilityIndicator score={0.75} />
                    <CredibilityIndicator score={0.58} />
                    <CredibilityIndicator score={0.32} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Size Variations</h4>
                  <div className="space-y-2">
                    <CredibilityIndicator score={0.92} size="sm" />
                    <CredibilityIndicator score={0.92} size="md" />
                    <CredibilityIndicator score={0.92} size="lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ExpertProfileCard 
              expert={mockExpert}
              onViewProfile={(id) => console.log('View profile:', id)}
              onContact={(id) => console.log('Contact expert:', id)}
            />
            
            <ExpertProfileCard 
              expert={mockExpert}
              compact={true}
              onViewProfile={(id) => console.log('View profile:', id)}
            />
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CommunityValidation
              validation={mockCommunityValidation}
              contributionId="contrib-001"
              onVote={handleVote}
              onComment={handleComment}
              onReport={handleReport}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Validation Summaries</CardTitle>
                <CardDescription>Compact validation displays for lists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Different Validation Scores</h4>
                  <div className="space-y-2">
                    <ValidationSummary validation={{ ...mockCommunityValidation, validationScore: 0.89 }} />
                    <ValidationSummary validation={{ ...mockCommunityValidation, upvotes: 45, downvotes: 12, validationScore: 0.65 }} />
                    <ValidationSummary validation={{ ...mockCommunityValidation, upvotes: 15, downvotes: 28, validationScore: 0.32 }} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Compact Version</h4>
                  <CommunityValidation
                    validation={mockCommunityValidation}
                    contributionId="contrib-002"
                    compact={true}
                    onVote={handleVote}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <VerificationWorkflow
            workflow={mockVerificationWorkflow}
            onReview={handleReview}
            onCommunityFeedback={handleCommunityFeedback}
            canReview={true}
            showCommunityFeedback={true}
          />
        </TabsContent>

        <TabsContent value="consensus" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ExpertConsensus consensus={mockExpertConsensus} />
            
            <Card>
              <CardHeader>
                <CardTitle>Consensus Indicators</CardTitle>
                <CardDescription>Compact consensus displays for lists and summaries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Different Agreement Levels</h4>
                  <div className="space-y-2">
                    <ConsensusIndicator 
                      agreementLevel={0.92} 
                      totalExperts={15} 
                      controversyLevel="low" 
                    />
                    <ConsensusIndicator 
                      agreementLevel={0.73} 
                      totalExperts={12} 
                      controversyLevel="medium" 
                    />
                    <ConsensusIndicator 
                      agreementLevel={0.45} 
                      totalExperts={18} 
                      controversyLevel="high" 
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Compact Version</h4>
                  <ExpertConsensus consensus={mockExpertConsensus} compact={true} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">✅ Completed Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Expert badge system with .chanuka-status-badge classes</li>
                <li>• Credibility scoring with methodology transparency</li>
                <li>• Expert profile cards with credentials and affiliations</li>
                <li>• Community validation with upvote/downvote functionality</li>
                <li>• Verification workflow for reviewing contributions</li>
                <li>• Expert consensus tracking and disagreement display</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🔧 Integration Points</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Uses existing Chanuka design system classes</li>
                <li>• Integrates with shadcn/ui components</li>
                <li>• Follows established TypeScript patterns</li>
                <li>• Accessible with ARIA labels and keyboard navigation</li>
                <li>• Responsive design with mobile optimizations</li>
                <li>• Ready for API integration with async handlers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}