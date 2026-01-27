/**
 * Expert Verification Page
 * Displays expert verification system and analysis
 */

import { Shield, Users, CheckCircle, Clock, Star, Award, FileText } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { ExpertBadge } from '@client/features/users/ui/verification/ExpertBadge';
import { ExpertConsensus } from '@client/features/users/ui/verification/ExpertConsensus';
import { ExpertProfileCard } from '@client/features/users/ui/verification/ExpertProfileCard';
import { ExpertVerificationDemo } from '@client/features/users/ui/verification/ExpertVerificationDemo';
import { VerificationWorkflow } from '@client/features/users/ui/verification/VerificationWorkflow';
import { Badge } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';

export default function ExpertVerification() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const verificationStats = {
    totalExperts: 127,
    pendingApplications: 23,
    verifiedAnalyses: 1847,
    averageCredibilityScore: 87.3,
  };

  const featuredExperts = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      title: 'Constitutional Law Professor',
      institution: 'University of Nairobi',
      credibilityScore: 94,
      specializations: ['Constitutional Law', 'Human Rights'],
      verificationType: 'official' as const,
      affiliationType: 'academic' as const,
      recentAnalyses: 12,
    },
    {
      id: 2,
      name: 'Prof. Michael Chen',
      title: 'Public Policy Expert',
      institution: 'Kenya Institute of Public Policy',
      credibilityScore: 91,
      specializations: ['Public Policy', 'Economic Analysis'],
      verificationType: 'domain' as const,
      affiliationType: 'government' as const,
      recentAnalyses: 8,
    },
    {
      id: 3,
      name: 'Hon. Justice Mary Wanjiku',
      title: 'Retired High Court Judge',
      institution: 'Kenya Judiciary (Retired)',
      credibilityScore: 96,
      specializations: ['Judicial Review', 'Constitutional Interpretation'],
      verificationType: 'official' as const,
      affiliationType: 'judicial' as const,
      recentAnalyses: 15,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Expert Verification System
          </h1>
          <p className="text-gray-600 mt-2">
            Verified expert analysis and constitutional review for legislative transparency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {verificationStats.totalExperts} Verified Experts
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Experts</p>
                <p className="text-2xl font-bold text-gray-900">{verificationStats.totalExperts}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verificationStats.pendingApplications}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Analyses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verificationStats.verifiedAnalyses.toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Credibility</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verificationStats.averageCredibilityScore}%
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experts">Featured Experts</TabsTrigger>
          <TabsTrigger value="verification">Verification Process</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Verification Standards
                </CardTitle>
                <CardDescription>Our rigorous expert verification process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Academic Credentials</h4>
                    <p className="text-sm text-gray-600">
                      Advanced degrees from recognized institutions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Professional Experience</h4>
                    <p className="text-sm text-gray-600">Minimum 5 years in relevant field</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Peer Review</h4>
                    <p className="text-sm text-gray-600">Validated by existing expert community</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Ongoing Assessment</h4>
                    <p className="text-sm text-gray-600">Continuous credibility monitoring</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Expert Categories
                </CardTitle>
                <CardDescription>Different types of verified experts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExpertBadge verificationType="official" size="sm" showTooltip={false} />
                    <div>
                      <h4 className="font-medium">Official Experts</h4>
                      <p className="text-sm text-gray-600">Government officials, judges, MPs</p>
                    </div>
                  </div>
                  <Badge variant="secondary">47</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExpertBadge verificationType="domain" size="sm" showTooltip={false} />
                    <div>
                      <h4 className="font-medium">Domain Experts</h4>
                      <p className="text-sm text-gray-600">Academics, researchers, professionals</p>
                    </div>
                  </div>
                  <Badge variant="secondary">63</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExpertBadge verificationType="identity" size="sm" showTooltip={false} />
                    <div>
                      <h4 className="font-medium">Identity Verified</h4>
                      <p className="text-sm text-gray-600">Experienced practitioners, advocates</p>
                    </div>
                  </div>
                  <Badge variant="secondary">17</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experts" className="space-y-6">
          <div className="grid gap-6">
            {featuredExperts.map(expert => (
              <ExpertProfileCard
                key={expert.id}
                expert={{
                  id: expert.id.toString(),
                  name: expert.name,
                  title: expert.title,
                  institution: expert.institution,
                  credentials: [
                    {
                      id: '1',
                      type: 'degree',
                      title: 'PhD in Constitutional Law',
                      institution: expert.institution,
                      year: 2010,
                      verified: true,
                    },
                  ],
                  affiliations: [
                    {
                      id: '1',
                      type: expert.affiliationType,
                      organization: expert.institution,
                      role: expert.title,
                      startDate: '2015-01-01',
                      verified: true,
                    },
                  ],
                  specializations: expert.specializations,
                  verificationType: expert.verificationType,
                  credibilityScore: expert.credibilityScore,
                  contributions: [],
                  bio: `Experienced ${expert.title.toLowerCase()} with extensive background in ${expert.specializations.join(' and ')}.`,
                  contactInfo: {
                    email: `${expert.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                    website: `https://example.com/experts/${expert.id}`,
                  },
                  verificationDate: new Date().toISOString(),
                  lastActive: new Date().toISOString(),
                }}
                showFullProfile={false}
                onViewProfile={() => window.open(`/experts/${expert.id}`, '_blank')}
                onViewContributions={() => window.open(`/experts/${expert.id}/analyses`, '_blank')}
              />
            ))}
          </div>

          {/* Expert Consensus Example */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Expert Consensus Analysis
              </CardTitle>
              <CardDescription>How experts reach consensus on legislative analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpertConsensus
                consensus={{
                  id: 'consensus-123',
                  billId: 'bill-456',
                  topic: 'Constitutional Compliance of Healthcare Bill 2024',
                  totalExperts: 12,
                  participatingExperts: 9,
                  agreementLevel: 78,
                  positions: [
                    {
                      stance: 'support',
                      count: 7,
                      percentage: 78,
                      reasoning: 'Aligns with constitutional healthcare provisions',
                    },
                    {
                      stance: 'oppose',
                      count: 2,
                      percentage: 22,
                      reasoning: 'Potential conflicts with existing legislation',
                    },
                  ],
                  keyPoints: [
                    'Constitutional compliance verified',
                    'Budget allocation concerns raised',
                    'Implementation timeline feasible',
                  ],
                  lastUpdated: new Date().toISOString(),
                }}
                showDetails={true}
                onViewDetails={() => console.log('View consensus details')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Workflow</CardTitle>
              <CardDescription>How expert applications are reviewed and approved</CardDescription>
            </CardHeader>
            <CardContent>
              <VerificationWorkflow
                workflow={{
                  id: 'demo-workflow',
                  contributionId: 'contribution-123',
                  expertId: 'expert-123',
                  status: 'pending',
                  communityFeedback: [
                    {
                      userId: 'user-123',
                      feedback: 'Dr. Smith has excellent credentials and published work',
                      vote: 'approve' as const,
                      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                  ],
                  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString(),
                }}
                onReview={async (workflowId, status, notes) => {
                  console.log('Review action:', workflowId, status, notes);
                }}
                onCommunityFeedback={async (workflowId, feedback, vote) => {
                  console.log('Community feedback:', workflowId, feedback, vote);
                }}
                canReview={true}
                showCommunityFeedback={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Expert Verification Demo</CardTitle>
              <CardDescription>
                Interactive demonstration of the expert verification system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpertVerificationDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
