/**
 * Expert Verification Page
 * Displays expert verification system and analysis
 */

import { useState } from 'react';
import { ExpertVerificationDemo } from '@client/components/verification/ExpertVerificationDemo';
import { VerificationWorkflow } from '@client/components/verification/VerificationWorkflow';
import { ExpertBadge, ExpertBadgeGroup } from '@client/components/verification/ExpertBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import {
  Shield,
  Users,
  CheckCircle,
  Clock,
  Star,
  Award,
  FileText,
  Eye
} from 'lucide-react';

export default function ExpertVerification() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const verificationStats = {
    totalExperts: 127,
    pendingApplications: 23,
    verifiedAnalyses: 1847,
    averageCredibilityScore: 87.3
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
      recentAnalyses: 12
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
      recentAnalyses: 8
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
      recentAnalyses: 15
    }
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
                <p className="text-2xl font-bold text-gray-900">{verificationStats.pendingApplications}</p>
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
                <p className="text-2xl font-bold text-gray-900">{verificationStats.verifiedAnalyses.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900">{verificationStats.averageCredibilityScore}%</p>
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
                    <p className="text-sm text-gray-600">Advanced degrees from recognized institutions</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Featured Experts</CardTitle>
              <CardDescription>Top-rated experts contributing to legislative analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {featuredExperts.map((expert) => (
                  <div key={expert.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{expert.name}</h3>
                          <ExpertBadgeGroup
                            verificationType={expert.verificationType}
                            credibilityScore={expert.credibilityScore}
                            specializations={expert.specializations}
                            affiliationType={expert.affiliationType}
                            size="sm"
                            maxSpecializations={2}
                          />
                        </div>
                        <p className="text-gray-600 mb-1">{expert.title}</p>
                        <p className="text-sm text-gray-500">{expert.institution}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {expert.credibilityScore}% Credibility
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {expert.recentAnalyses} Recent Analyses
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Navigate to expert profile page
                          window.open(`/experts/${expert.id}`, '_blank');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          // Navigate to expert's analyses
                          window.open(`/experts/${expert.id}/analyses`, '_blank');
                        }}
                      >
                        View Analyses
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
                      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                    }
                  ],
                  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date().toISOString()
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
              <CardDescription>Interactive demonstration of the expert verification system</CardDescription>
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

